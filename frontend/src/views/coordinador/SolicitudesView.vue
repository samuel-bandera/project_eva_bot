<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import * as coordApi from '../../api/coordinador.api.js';

const $q = useQuasar();

const cargando = ref(true);
const solicitudes = ref([]);
const filtroEstado = ref('pendiente');

const filtradas = computed(() => solicitudes.value);

function iniciales(n, a) { return `${n?.[0] || ''}${a?.[0] || ''}`.toUpperCase(); }

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

async function cargar() {
  cargando.value = true;
  try {
    solicitudes.value = await coordApi.listarTodasLasSolicitudes(filtroEstado.value);
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al cargar solicitudes' });
  } finally {
    cargando.value = false;
  }
}

async function cambiarEstado(estado) {
  filtroEstado.value = estado;
  await cargar();
}

function resolver(solicitud, aceptar) {
  $q.dialog({
    title: aceptar ? 'Aceptar solicitud' : 'Rechazar solicitud',
    message: `${solicitud.alumno_nombre} ${solicitud.alumno_apellido} — ${solicitud.materia_nombre}`,
    prompt: {
      model: '',
      label: 'Respuesta (opcional)',
      outlined: true,
      type: 'textarea',
    },
    cancel: true,
    persistent: true,
  }).onOk(async (respuesta) => {
    try {
      await coordApi.resolverSolicitud(solicitud.id, {
        estado: aceptar ? 'aceptada' : 'rechazada',
        respuesta: respuesta || null,
      });
      $q.notify({ type: 'positive', message: `Solicitud ${aceptar ? 'aceptada' : 'rechazada'}` });
      await cargar();
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al procesar' });
    }
  });
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md coord-page">
    <div class="page-head q-mb-md">
      <div>
        <h1 class="page-title">Solicitudes</h1>
        <p class="page-sub">{{ filtradas.length }} solicitudes {{ filtroEstado }}s</p>
      </div>
    </div>

    <q-card flat bordered class="toolbar-card q-mb-md">
      <q-card-section>
        <q-btn-toggle
          :model-value="filtroEstado"
          @update:model-value="cambiarEstado"
          spread no-caps unelevated
          :options="[
            { label: 'Pendientes', value: 'pendiente' },
            { label: 'Aceptadas', value: 'aceptada' },
            { label: 'Rechazadas', value: 'rechazada' },
          ]"
          color="grey-3"
          text-color="grey-8"
          toggle-color="primary"
          toggle-text-color="white"
        />
      </q-card-section>
    </q-card>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !filtradas.length" flat bordered class="empty-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="assignment_turned_in" size="56px" color="grey-5" class="q-mb-sm" />
        <div class="text-h6">Sin solicitudes</div>
        <div class="text-caption text-grey-7">No hay solicitudes {{ filtroEstado }}s</div>
      </q-card-section>
    </q-card>

    <q-card v-else flat bordered class="table-card">
      <q-markup-table flat separator="horizontal">
        <thead>
          <tr>
            <th class="text-left">Alumno</th>
            <th class="text-left gt-xs">Materia</th>
            <th class="text-center gt-sm">Fecha</th>
            <th class="text-center">Estado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="s in filtradas" :key="s.id">
            <td>
              <div class="row items-center">
                <q-avatar color="primary" text-color="white" size="36px" class="q-mr-sm">
                  {{ iniciales(s.alumno_nombre, s.alumno_apellido) }}
                </q-avatar>
                <div>
                  <div class="text-weight-medium">{{ s.alumno_nombre }} {{ s.alumno_apellido }}</div>
                  <div class="text-caption text-grey-7">{{ s.alumno_email || '' }}</div>
                </div>
              </div>
            </td>
            <td class="gt-xs">{{ s.materia_nombre || '—' }}</td>
            <td class="text-center gt-sm text-caption text-grey-7">{{ formatearFecha(s.creado_en) }}</td>
            <td class="text-center">
              <q-badge
                :color="s.estado === 'pendiente' ? 'warning' : s.estado === 'aceptada' ? 'positive' : 'negative'"
                :label="s.estado"
              />
            </td>
            <td class="text-right">
              <template v-if="s.estado === 'pendiente'">
                <q-btn flat dense round icon="check" color="positive" @click="resolver(s, true)">
                  <q-tooltip>Aceptar</q-tooltip>
                </q-btn>
                <q-btn flat dense round icon="close" color="negative" @click="resolver(s, false)">
                  <q-tooltip>Rechazar</q-tooltip>
                </q-btn>
              </template>
            </td>
          </tr>
        </tbody>
      </q-markup-table>
    </q-card>
  </q-page>
</template>

<style scoped>
.coord-page { max-width: 1280px; margin: 0 auto; }
.page-head { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--text); }
.page-sub { margin: 4px 0 0 0; color: var(--text-muted); font-size: 13px; }
.toolbar-card { border-radius: 14px; }
.table-card { border-radius: 14px; overflow: hidden; }
.empty-card { border-radius: 14px; }
thead th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 700;
}
</style>
