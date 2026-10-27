<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify } from 'quasar';
import * as ticketsApi from '../../api/tickets.api.js';

const cargando = ref(true);
const tickets = ref([]);
const profesores = ref([]);
const busqueda = ref('');

const modalNuevo = ref(false);
const modalDetalle = ref(false);
const ticketSeleccionado = ref(null);
const detalleActual = ref(null);
const nuevaRespuesta = ref('');

const nuevoTicket = ref({
  destinatario: 'admin',
  profesorId: null,
  materiaId: null,
  asunto: '',
  descripcion: '',
  prioridad: 'media',
});

const filtrados = computed(() => {
  const consulta = busqueda.value.trim().toLowerCase();
  if (!consulta) return tickets.value;
  return tickets.value.filter(ticket =>
    (ticket.asunto || '').toLowerCase().includes(consulta) ||
    (ticket.descripcion || '').toLowerCase().includes(consulta)
  );
});

function colorEstado(estado) {
  return { abierto: 'warning', en_proceso: 'info', resuelto: 'positive', cerrado: 'grey-6' }[estado] || 'grey-5';
}

function etiquetaEstado(estado) {
  return { abierto: 'Abierto', en_proceso: 'En proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }[estado] || estado;
}

function colorPrioridad(prioridad) {
  return { alta: 'negative', media: 'warning', baja: 'info' }[prioridad] || 'grey-5';
}

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function etiquetaDestinatario(ticket) {
  if (ticket.destinatario === 'admin') return 'Administración';
  return `Prof. ${ticket.profesor_nombre || ''} ${ticket.profesor_apellido || ''}`;
}

async function cargarTickets() {
  cargando.value = true;
  try {
    const [listaTickets, listaProfesores] = await Promise.all([
      ticketsApi.getMisTickets(),
      ticketsApi.getProfesoresDisponibles(),
    ]);
    tickets.value = listaTickets || [];
    profesores.value = listaProfesores || [];
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar tickets', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

function abrirModalNuevo() {
  nuevoTicket.value = { destinatario: 'admin', profesorId: null, materiaId: null, asunto: '', descripcion: '', prioridad: 'media' };
  modalNuevo.value = true;
}

async function crearTicket() {
  if (!nuevoTicket.value.asunto.trim() || !nuevoTicket.value.descripcion.trim()) {
    Notify.create({ type: 'warning', message: 'Completá asunto y descripción', position: 'top' });
    return;
  }
  if (nuevoTicket.value.destinatario === 'docente' && !nuevoTicket.value.profesorId) {
    Notify.create({ type: 'warning', message: 'Elegí un docente', position: 'top' });
    return;
  }
  try {
    await ticketsApi.crearTicket({
      destinatario: nuevoTicket.value.destinatario,
      profesorId: nuevoTicket.value.profesorId,
      asunto: nuevoTicket.value.asunto,
      descripcion: nuevoTicket.value.descripcion,
      prioridad: nuevoTicket.value.prioridad,
    });
    Notify.create({ type: 'positive', message: 'Ticket creado', position: 'top' });
    modalNuevo.value = false;
    await cargarTickets();
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.error || 'Error al crear ticket',
      position: 'top',
    });
  }
}

async function abrirDetalle(ticket) {
  try {
    const detalle = await ticketsApi.getTicket(ticket.id);
    detalleActual.value = detalle;
    ticketSeleccionado.value = ticket;
    nuevaRespuesta.value = '';
    modalDetalle.value = true;
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar detalle', position: 'top' });
  }
}

async function responderTicket() {
  if (!nuevaRespuesta.value.trim()) return;
  try {
    await ticketsApi.responderTicket(ticketSeleccionado.value.id, nuevaRespuesta.value);
    Notify.create({ type: 'positive', message: 'Respuesta enviada', position: 'top' });
    nuevaRespuesta.value = '';
    const detalle = await ticketsApi.getTicket(ticketSeleccionado.value.id);
    detalleActual.value = detalle;
    await cargarTickets();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

onMounted(cargarTickets);
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Mis tickets</div>
        <div class="text-caption text-grey-7">Consultas y reclamos a docentes o administración</div>
      </div>
      <q-btn unelevated no-caps color="primary" icon="add" label="Nuevo ticket" @click="abrirModalNuevo" />
    </div>

    <q-input v-model="busqueda" outlined dense clearable placeholder="Buscar por asunto o descripción..." class="q-mb-md">
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !filtrados.length" flat bordered>
      <q-card-section class="text-center text-grey-7 q-pa-xl">
        <q-icon name="confirmation_number" size="48px" class="q-mb-sm" />
        <div>No tenés tickets {{ busqueda ? 'con esa búsqueda' : 'creados' }}</div>
        <q-btn unelevated no-caps color="primary" class="q-mt-md" label="Crear el primero" @click="abrirModalNuevo" />
      </q-card-section>
    </q-card>

    <div v-else class="column q-gutter-y-sm">
      <q-card v-for="ticket in filtrados" :key="ticket.id" flat bordered class="cursor-pointer ticket-card" @click="abrirDetalle(ticket)">
        <q-card-section>
          <div class="row items-center q-gutter-sm q-mb-xs">
            <q-badge :color="colorEstado(ticket.estado)" :label="etiquetaEstado(ticket.estado)" />
            <q-badge :color="colorPrioridad(ticket.prioridad)" :label="`Prioridad ${ticket.prioridad}`" />
            <q-badge v-if="ticket.num_respuestas > 0" color="primary" :label="`${ticket.num_respuestas} respuesta(s)`" />
          </div>
          <div class="text-subtitle1 text-weight-medium">{{ ticket.asunto }}</div>
          <div class="text-caption text-grey-7 q-mt-xs">
            Para: {{ etiquetaDestinatario(ticket) }}
            <span v-if="ticket.materia_nombre"> · {{ ticket.materia_nombre }}</span>
            · {{ formatearFecha(ticket.creado_en) }}
          </div>
          <div class="text-body2 text-grey-8 q-mt-sm descripcion-clamp">
            {{ ticket.descripcion }}
          </div>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="modalNuevo" persistent>
      <q-card class="modal-nuevo">
        <q-card-section>
          <div class="text-h6">Nuevo ticket</div>
        </q-card-section>
        <q-separator />
        <q-card-section class="column q-gutter-md">
          <div>
            <div class="text-caption text-grey-7 q-mb-xs">¿A quién va dirigido?</div>
            <q-btn-toggle
              v-model="nuevoTicket.destinatario"
              :options="[
                { label: 'Administración', value: 'admin' },
                { label: 'Docente', value: 'docente' },
              ]"
              no-caps unelevated toggle-color="primary" color="grey-3" text-color="black"
              class="full-width"
            />
          </div>

          <q-select
            v-if="nuevoTicket.destinatario === 'docente'"
            v-model="nuevoTicket.profesorId"
            :options="profesores"
            option-value="id"
            :option-label="p => `${p.nombre} ${p.apellido} — ${p.materias || 'sin materias'}`"
            emit-value map-options outlined
            label="Docente destinatario"
          />

          <q-input v-model="nuevoTicket.asunto" outlined label="Asunto" placeholder="Resumen breve del problema" maxlength="200" counter />
          <q-input v-model="nuevoTicket.descripcion" outlined type="textarea" rows="5" label="Descripción detallada" maxlength="5000" counter />
          <q-select
            v-model="nuevoTicket.prioridad"
            :options="[
              { label: 'Baja', value: 'baja' },
              { label: 'Media', value: 'media' },
              { label: 'Alta', value: 'alta' },
            ]"
            emit-value map-options outlined label="Prioridad"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="modalNuevo = false" />
          <q-btn unelevated no-caps label="Crear ticket" color="primary" icon="send" @click="crearTicket" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="modalDetalle">
      <q-card class="modal-detalle">
        <q-card-section class="row items-center justify-between">
          <div class="col">
            <div class="text-h6">{{ ticketSeleccionado?.asunto }}</div>
            <div class="text-caption text-grey-7 q-mt-xs">
              Ticket #{{ ticketSeleccionado?.id }} · {{ formatearFecha(ticketSeleccionado?.creado_en) }}
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="modalDetalle = false" />
        </q-card-section>

        <q-card-section class="q-pt-none">
          <div class="row q-gutter-xs q-mb-md">
            <q-badge :color="estadoColor(detalleActual?.ticket?.estado)" :label="estadoLabel(detalleActual?.ticket?.estado)" />
            <q-badge :color="prioridadColor(detalleActual?.ticket?.prioridad)" :label="`Prioridad ${detalleActual?.ticket?.prioridad}`" />
          </div>
          <q-banner rounded class="bg-grey-2">
            <div class="text-body2 texto-pre">{{ detalleActual?.ticket?.descripcion }}</div>
          </q-banner>
        </q-card-section>

        <q-separator />

        <q-card-section class="conversacion-scroll">
          <div class="text-caption text-uppercase text-grey-7 text-weight-bold q-mb-sm">Conversación</div>
          <div v-if="!detalleActual?.respuestas?.length" class="text-grey-7 text-caption q-py-md text-center">
            Sin respuestas aún
          </div>
          <div v-for="respuesta in (detalleActual?.respuestas || [])" :key="respuesta.id" class="q-mb-md">
            <div class="row items-center q-gutter-xs q-mb-xs">
              <q-avatar size="24px" :color="respuesta.autor_tipo === 'alumno' ? 'grey-5' : 'primary'" text-color="white">
                <span class="avatar-iniciales-mini">{{ (respuesta.autor_nombre?.[0] || '') + (respuesta.autor_apellido?.[0] || '') }}</span>
              </q-avatar>
              <span class="text-caption text-weight-bold">{{ respuesta.autor_nombre }} {{ respuesta.autor_apellido }}</span>
              <q-badge outline color="grey-6" :label="respuesta.autor_tipo" />
              <span class="text-caption text-grey-6">· {{ formatearFecha(respuesta.creado_en) }}</span>
            </div>
            <div class="text-body2 q-pl-lg texto-pre">{{ respuesta.mensaje }}</div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section v-if="detalleActual?.ticket?.estado !== 'cerrado'">
          <q-input
            v-model="nuevaRespuesta"
            outlined type="textarea" rows="3"
            placeholder="Escribí una respuesta..."
            maxlength="5000"
          />
          <div class="row justify-end q-mt-sm">
            <q-btn unelevated no-caps color="primary" icon="send" label="Enviar" :disable="!nuevaRespuesta.trim()" @click="responderTicket" />
          </div>
        </q-card-section>
        <q-card-section v-else class="text-center text-grey-7">
          <q-icon name="lock" /> Este ticket está cerrado
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.ticket-card {
  transition: border-color 0.15s, transform 0.15s;
}
.ticket-card:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}

.descripcion-clamp {
  white-space: pre-wrap;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.modal-nuevo {
  width: 560px;
  max-width: 95vw;
}
.modal-detalle {
  width: 640px;
  max-width: 95vw;
  max-height: 90vh;
}
.texto-pre {
  white-space: pre-wrap;
}
.conversacion-scroll {
  max-height: 350px;
  overflow-y: auto;
}
.avatar-iniciales-mini {
  font-size: 10px;
}
</style>
