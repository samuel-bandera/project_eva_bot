<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify } from 'quasar';
import * as ticketsApi from '../../api/tickets.api.js';
import { useAuthStore } from '../../stores/auth.store.js';

const auth = useAuthStore();
const cargando = ref(true);
const tickets = ref([]);
const filtroEstado = ref('todos');
const busqueda = ref('');

const modalDetalle = ref(false);
const ticketSeleccionado = ref(null);
const detalleActual = ref(null);
const nuevaRespuesta = ref('');

const esAdmin = computed(() => ['admin', 'coordinador'].includes(auth.user?.tipo));

const estados = [
  { value: 'todos', label: 'Todos' },
  { value: 'abierto', label: 'Abiertos' },
  { value: 'en_proceso', label: 'En proceso' },
  { value: 'resuelto', label: 'Resueltos' },
  { value: 'cerrado', label: 'Cerrados' },
];

const filtrados = computed(() => {
  let arr = tickets.value;
  if (filtroEstado.value !== 'todos') arr = arr.filter(t => t.estado === filtroEstado.value);
  const q = busqueda.value.trim().toLowerCase();
  if (q) {
    arr = arr.filter(t =>
      (t.asunto || '').toLowerCase().includes(q) ||
      (t.alumno_nombre || '').toLowerCase().includes(q) ||
      (t.alumno_apellido || '').toLowerCase().includes(q)
    );
  }
  return arr;
});

function estadoColor(e) {
  return { abierto: 'warning', en_proceso: 'info', resuelto: 'positive', cerrado: 'grey-6' }[e] || 'grey-5';
}

function estadoLabel(e) {
  return { abierto: 'Abierto', en_proceso: 'En proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' }[e] || e;
}

function prioridadColor(p) {
  return { alta: 'negative', media: 'warning', baja: 'info' }[p] || 'grey-5';
}

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

async function cargar() {
  cargando.value = true;
  try {
    tickets.value = esAdmin.value
      ? await ticketsApi.getTodosLosTickets()
      : await ticketsApi.getTicketsParaMi();
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar tickets', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

async function abrirDetalle(t) {
  try {
    const d = await ticketsApi.getTicket(t.id);
    detalleActual.value = d;
    ticketSeleccionado.value = t;
    nuevaRespuesta.value = '';
    modalDetalle.value = true;
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar', position: 'top' });
  }
}

async function responder() {
  if (!nuevaRespuesta.value.trim()) return;
  try {
    await ticketsApi.responderTicket(ticketSeleccionado.value.id, nuevaRespuesta.value);
    Notify.create({ type: 'positive', message: 'Respuesta enviada', position: 'top' });
    nuevaRespuesta.value = '';
    const d = await ticketsApi.getTicket(ticketSeleccionado.value.id);
    detalleActual.value = d;
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

async function cambiarEstado(nuevoEstado) {
  try {
    await ticketsApi.cambiarEstadoTicket(ticketSeleccionado.value.id, nuevoEstado);
    Notify.create({ type: 'positive', message: `Estado: ${estadoLabel(nuevoEstado)}`, position: 'top' });
    const d = await ticketsApi.getTicket(ticketSeleccionado.value.id);
    detalleActual.value = d;
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">{{ esAdmin ? 'Tickets (todos)' : 'Tickets recibidos' }}</div>
        <div class="text-caption text-grey-7">Gestión de consultas de alumnos</div>
      </div>
    </div>

    <div class="row q-col-gutter-sm q-mb-md">
      <div class="col-12 col-md-6">
        <q-input v-model="busqueda" outlined dense clearable placeholder="Buscar por asunto o alumno...">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </div>
      <div class="col-12 col-md-3">
        <q-select v-model="filtroEstado" :options="estados" option-value="value" option-label="label" emit-value map-options outlined dense label="Estado" />
      </div>
    </div>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !filtrados.length" flat bordered>
      <q-card-section class="text-center text-grey-7 q-pa-xl">
        <q-icon name="inbox" size="48px" color="positive" class="q-mb-sm" />
        <div>Sin tickets para mostrar</div>
      </q-card-section>
    </q-card>

    <div v-else class="column q-gutter-y-sm">
      <q-card v-for="t in filtrados" :key="t.id" flat bordered class="cursor-pointer ticket-card" @click="abrirDetalle(t)">
        <q-card-section>
          <div class="row items-center q-gutter-sm q-mb-xs">
            <q-badge :color="estadoColor(t.estado)" :label="estadoLabel(t.estado)" />
            <q-badge :color="prioridadColor(t.prioridad)" :label="`Prioridad ${t.prioridad}`" />
            <q-badge v-if="t.num_respuestas > 0" color="primary" :label="`${t.num_respuestas} respuesta(s)`" />
          </div>
          <div class="text-subtitle1 text-weight-medium">{{ t.asunto }}</div>
          <div class="text-caption text-grey-7 q-mt-xs">
            <q-icon name="person" size="14px" class="q-mr-xs" />
            {{ t.alumno_nombre }} {{ t.alumno_apellido }} ({{ t.alumno_email }})
            · {{ formatearFecha(t.creado_en) }}
            <span v-if="t.materia_nombre"> · {{ t.materia_nombre }}</span>
          </div>
          <div class="text-body2 text-grey-8 q-mt-sm" style="white-space: pre-wrap; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
            {{ t.descripcion }}
          </div>
        </q-card-section>
      </q-card>
    </div>

    <q-dialog v-model="modalDetalle">
      <q-card style="width: 680px; max-width: 95vw; max-height: 90vh;">
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
          <div class="text-caption text-grey-7 q-mb-xs">
            Alumno: <strong>{{ detalleActual?.ticket?.alumno_nombre }} {{ detalleActual?.ticket?.alumno_apellido }}</strong>
            ({{ detalleActual?.ticket?.alumno_email }})
          </div>
          <div class="row q-gutter-xs q-mb-md">
            <q-badge :color="estadoColor(detalleActual?.ticket?.estado)" :label="estadoLabel(detalleActual?.ticket?.estado)" />
            <q-badge :color="prioridadColor(detalleActual?.ticket?.prioridad)" :label="`Prioridad ${detalleActual?.ticket?.prioridad}`" />
          </div>
          <q-banner rounded class="bg-grey-2">
            <div class="text-body2" style="white-space: pre-wrap;">{{ detalleActual?.ticket?.descripcion }}</div>
          </q-banner>

          <div class="row q-gutter-sm q-mt-md">
            <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Cambiar estado:</div>
          </div>
          <div class="row q-gutter-xs q-mt-xs">
            <q-btn v-for="e in ['abierto', 'en_proceso', 'resuelto', 'cerrado']" :key="e"
              size="sm" no-caps
              :color="detalleActual?.ticket?.estado === e ? estadoColor(e) : 'grey-4'"
              :text-color="detalleActual?.ticket?.estado === e ? 'white' : 'black'"
              :unelevated="detalleActual?.ticket?.estado === e"
              :outline="detalleActual?.ticket?.estado !== e"
              :label="estadoLabel(e)"
              @click="cambiarEstado(e)"
            />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section style="max-height: 300px; overflow-y: auto;">
          <div class="text-caption text-uppercase text-grey-7 text-weight-bold q-mb-sm">Conversación</div>
          <div v-if="!detalleActual?.respuestas?.length" class="text-grey-7 text-caption q-py-md text-center">
            Sin respuestas aún
          </div>
          <div v-for="r in (detalleActual?.respuestas || [])" :key="r.id" class="q-mb-md">
            <div class="row items-center q-gutter-xs q-mb-xs">
              <q-avatar size="24px" :color="r.autor_tipo === 'alumno' ? 'grey-5' : 'primary'" text-color="white">
                <span style="font-size: 10px">{{ (r.autor_nombre?.[0] || '') + (r.autor_apellido?.[0] || '') }}</span>
              </q-avatar>
              <span class="text-caption text-weight-bold">{{ r.autor_nombre }} {{ r.autor_apellido }}</span>
              <q-badge outline color="grey-6" :label="r.autor_tipo" />
              <span class="text-caption text-grey-6">· {{ formatearFecha(r.creado_en) }}</span>
            </div>
            <div class="text-body2 q-pl-lg" style="white-space: pre-wrap;">{{ r.mensaje }}</div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section v-if="detalleActual?.ticket?.estado !== 'cerrado'">
          <q-input v-model="nuevaRespuesta" outlined type="textarea" rows="3" placeholder="Escribí una respuesta..." maxlength="5000" />
          <div class="row justify-end q-mt-sm">
            <q-btn unelevated no-caps color="primary" icon="send" label="Responder" :disable="!nuevaRespuesta.trim()" @click="responder" />
          </div>
        </q-card-section>
        <q-card-section v-else class="text-center text-grey-7">
          <q-icon name="lock" /> Ticket cerrado
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.ticket-card { transition: border-color 0.15s, transform 0.15s; }
.ticket-card:hover { border-color: var(--primary); transform: translateY(-1px); }
</style>
