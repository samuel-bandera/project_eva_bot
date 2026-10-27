<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify, Dialog } from 'quasar';
import * as adminApi from '../../api/admin.api.js';

const cargando = ref(true);
const tabActual = ref('solicitudes');

const solicitudes = ref([]);
const matriculas = ref([]);
const busqueda = ref('');

const solicitudesFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return solicitudes.value;
  return solicitudes.value.filter(s =>
    (s.alumno_nombre || '').toLowerCase().includes(q) ||
    (s.alumno_apellido || '').toLowerCase().includes(q) ||
    (s.materia_nombre || '').toLowerCase().includes(q) ||
    (s.alumno_email || '').toLowerCase().includes(q)
  );
});

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

async function cargarSolicitudes() {
  cargando.value = true;
  try {
    solicitudes.value = await adminApi.listarTodasLasSolicitudes();
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar solicitudes', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

async function cargarMatriculas() {
  cargando.value = true;
  try {
    const resultado = await adminApi.listarMatriculas({ limit: 100 });
    matriculas.value = Array.isArray(resultado) ? resultado : (resultado?.matriculas || []);
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar matrículas', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

async function cargar() {
  if (tabActual.value === 'solicitudes') await cargarSolicitudes();
  else await cargarMatriculas();
}

async function resolver(solicitud, aprobada) {
  const titulo = aprobada ? 'Aprobar solicitud' : 'Rechazar solicitud';
  const color = aprobada ? 'positive' : 'negative';
  const mensaje = aprobada
    ? `¿Aprobar la matrícula de ${solicitud.alumno_nombre} ${solicitud.alumno_apellido} en ${solicitud.materia_nombre}?`
    : `¿Rechazar la matrícula de ${solicitud.alumno_nombre} ${solicitud.alumno_apellido}?`;

  const respuesta = await new Promise((resolve) => {
    Dialog.create({
      title: titulo,
      message: mensaje,
      prompt: {
        model: '',
        type: 'textarea',
        label: aprobada ? 'Comentario (opcional)' : 'Motivo del rechazo',
      },
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: aprobada ? 'Aprobar' : 'Rechazar', color, unelevated: true },
      persistent: true,
    })
      .onOk((data) => resolve(data || ''))
      .onCancel(() => resolve(null))
      .onDismiss(() => resolve(null));
  });

  if (respuesta === null) return;

  try {
    await adminApi.resolverSolicitud(solicitud.id, {
      estado: aprobada ? 'aprobada' : 'rechazada',
      respuesta: respuesta || null,
    });
    Notify.create({
      type: 'positive',
      message: aprobada ? 'Solicitud aprobada' : 'Solicitud rechazada',
      position: 'top',
    });
    await cargar();
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.error || 'Error al procesar',
      position: 'top',
    });
  }
}

function estadoColor(estado) {
  return {
    activa: 'primary', aprobada: 'positive',
    reprobada: 'negative', abandonada: 'grey-6',
  }[estado] || 'grey-5';
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Matrículas</div>
        <div class="text-caption text-grey-7">Gestión de inscripciones y solicitudes</div>
      </div>
    </div>

    <div class="row q-gutter-sm q-mb-md">
      <q-btn
        label="Solicitudes pendientes"
        icon="pending_actions"
        no-caps
        :unelevated="tabActual === 'solicitudes'"
        :flat="tabActual !== 'solicitudes'"
        :color="tabActual === 'solicitudes' ? 'primary' : 'grey-7'"
        @click="tabActual = 'solicitudes'; cargar()"
      >
        <q-badge v-if="solicitudes.length > 0" color="warning" class="q-ml-sm">
          {{ solicitudes.length }}
        </q-badge>
      </q-btn>
      <q-btn
        label="Todas las matrículas"
        icon="assignment_ind"
        no-caps
        :unelevated="tabActual === 'matriculas'"
        :flat="tabActual !== 'matriculas'"
        :color="tabActual === 'matriculas' ? 'primary' : 'grey-7'"
        @click="tabActual = 'matriculas'; cargar()"
      />
    </div>

    <q-input
      v-model="busqueda"
      outlined dense clearable
      placeholder="Buscar por alumno o materia..."
      class="q-mb-md"
    >
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <template v-if="tabActual === 'solicitudes'">
      <q-card v-if="!cargando && !solicitudesFiltradas.length" flat bordered>
        <q-card-section class="text-center text-grey-7 q-pa-xl">
          <q-icon name="check_circle" size="48px" color="positive" class="q-mb-sm" />
          <div>¡No hay solicitudes pendientes!</div>
        </q-card-section>
      </q-card>

      <div v-else class="column q-gutter-y-sm">
        <q-card v-for="s in solicitudesFiltradas" :key="s.id" flat bordered>
          <q-card-section>
            <div class="row items-center q-col-gutter-md">
              <div class="col">
                <div class="row items-center q-gutter-sm">
                  <q-avatar color="primary" text-color="white" size="40px">
                    {{ (s.alumno_nombre?.[0] || '') + (s.alumno_apellido?.[0] || '') }}
                  </q-avatar>
                  <div>
                    <div class="text-subtitle1 text-weight-medium">
                      {{ s.alumno_nombre }} {{ s.alumno_apellido }}
                    </div>
                    <div class="text-caption text-grey-7">{{ s.alumno_email || '—' }}</div>
                  </div>
                </div>
                <div class="q-mt-sm">
                  <q-icon name="menu_book" size="16px" class="q-mr-xs" />
                  <strong>{{ s.materia_nombre }}</strong>
                  <span class="text-caption text-grey-6 q-ml-sm">{{ s.materia_codigo }}</span>
                </div>
                <div v-if="s.mensaje" class="text-body2 text-grey-8 q-mt-xs">
                  <q-icon name="chat_bubble_outline" size="14px" class="q-mr-xs" />
                  {{ s.mensaje }}
                </div>
                <div class="text-caption text-grey-6 q-mt-sm">
                  Solicitada: {{ formatearFecha(s.creado_en) }}
                </div>
              </div>
              <div class="col-auto">
                <div class="row q-gutter-sm">
                  <q-btn
                    unelevated no-caps color="positive" icon="check"
                    label="Aprobar"
                    @click="resolver(s, true)"
                  />
                  <q-btn
                    outline no-caps color="negative" icon="close"
                    label="Rechazar"
                    @click="resolver(s, false)"
                  />
                </div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </template>

    <template v-else>
      <q-card v-if="!cargando && !matriculas.length" flat bordered>
        <q-card-section class="text-center text-grey-7 q-pa-xl">
          <q-icon name="assignment" size="48px" class="q-mb-sm" />
          <div>No hay matrículas registradas</div>
        </q-card-section>
      </q-card>

      <q-card v-else flat bordered>
        <q-markup-table flat separator="horizontal">
          <thead>
            <tr>
              <th class="text-left">Alumno</th>
              <th class="text-left">Materia</th>
              <th class="text-center">Estado</th>
              <th class="text-center">Nota final</th>
              <th class="text-center">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="m in matriculas" :key="m.id">
              <td>
                <div class="text-weight-medium">{{ m.alumno_nombre }} {{ m.alumno_apellido }}</div>
                <div class="text-caption text-grey-7">{{ m.alumno_email || '—' }}</div>
              </td>
              <td>
                <div class="text-weight-medium">{{ m.materia_nombre }}</div>
                <div class="text-caption text-grey-7">{{ m.materia_codigo }}</div>
              </td>
              <td class="text-center">
                <q-badge :color="estadoColor(m.estado)" :label="m.estado" />
              </td>
              <td class="text-center">
                <span v-if="m.nota_final !== null && m.nota_final !== undefined"
                  class="text-weight-bold"
                  :class="Number(m.nota_final) >= 6 ? 'text-positive' : 'text-negative'">
                  {{ Number(m.nota_final).toFixed(1) }}
                </span>
                <span v-else class="text-grey-6">—</span>
              </td>
              <td class="text-center text-caption">{{ formatearFecha(m.fecha || m.creado_en) }}</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card>
    </template>
  </q-page>
</template>
