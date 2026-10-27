<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import * as coordApi from '../../api/coordinador.api.js';

const $q = useQuasar();

const cargando = ref(true);
const docentes = ref([]);
const busqueda = ref('');
const filtroEstado = ref('todos');

const filtrados = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  return docentes.value.filter(d => {
    const coincideTexto = !q
      || (d.nombre || '').toLowerCase().includes(q)
      || (d.apellido || '').toLowerCase().includes(q)
      || (d.email || '').toLowerCase().includes(q)
      || (d.usuario || '').toLowerCase().includes(q);
    const coincideEstado = filtroEstado.value === 'todos'
      || (filtroEstado.value === 'activo' && d.activo && d.aprobado)
      || (filtroEstado.value === 'pendiente' && !d.aprobado)
      || (filtroEstado.value === 'inactivo' && !d.activo);
    return coincideTexto && coincideEstado;
  });
});

function iniciales(n, a) { return `${n?.[0] || ''}${a?.[0] || ''}`.toUpperCase(); }

function estadoBadge(d) {
  if (!d.activo) return { color: 'grey-6', label: 'Inactivo' };
  if (!d.aprobado) return { color: 'warning', label: 'Pendiente' };
  return { color: 'positive', label: 'Activo' };
}

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY');
}

async function cargar() {
  cargando.value = true;
  try {
    docentes.value = await coordApi.listarUsuarios({ tipo: 'docente', limit: 500 });
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al cargar docentes' });
  } finally {
    cargando.value = false;
  }
}

async function aprobar(d) {
  try {
    await coordApi.aprobarUsuario(d.id);
    $q.notify({ type: 'positive', message: `Docente ${d.nombre} aprobado` });
    await cargar();
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al aprobar' });
  }
}

function abrirRechazo(d) {
  $q.dialog({
    title: 'Rechazar docente',
    message: `¿Rechazar a ${d.nombre} ${d.apellido}?`,
    prompt: { model: '', label: 'Motivo (opcional)', outlined: true },
    cancel: true,
    persistent: true,
  }).onOk(async (motivo) => {
    try {
      await coordApi.rechazarUsuario(d.id, motivo || null);
      $q.notify({ type: 'positive', message: 'Docente rechazado' });
      await cargar();
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al rechazar' });
    }
  });
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md coord-page">
    <div class="page-head q-mb-md">
      <div>
        <h1 class="page-title">Docentes</h1>
        <p class="page-sub">{{ filtrados.length }} en total · {{ docentes.length }} registrados</p>
      </div>
    </div>

    <q-card flat bordered class="toolbar-card q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-6">
          <q-input v-model="busqueda" outlined dense clearable placeholder="Buscar por nombre, email o usuario">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-6">
          <q-btn-toggle
            v-model="filtroEstado"
            spread no-caps unelevated
            :options="[
              { label: 'Todos', value: 'todos' },
              { label: 'Activos', value: 'activo' },
              { label: 'Pendientes', value: 'pendiente' },
              { label: 'Inactivos', value: 'inactivo' },
            ]"
            color="grey-3"
            text-color="grey-8"
            toggle-color="primary"
            toggle-text-color="white"
          />
        </div>
      </q-card-section>
    </q-card>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !filtrados.length" flat bordered class="empty-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="groups" size="56px" color="grey-5" class="q-mb-sm" />
        <div class="text-h6">Sin docentes</div>
        <div class="text-caption text-grey-7">No hay docentes que coincidan con el filtro</div>
      </q-card-section>
    </q-card>

    <q-card v-else flat bordered class="table-card">
      <q-markup-table flat separator="horizontal" class="doc-table">
        <thead>
          <tr>
            <th class="text-left">Docente</th>
            <th class="text-left gt-xs">Email</th>
            <th class="text-center">Estado</th>
            <th class="text-center gt-sm">Registrado</th>
            <th class="text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="d in filtrados" :key="d.id">
            <td>
              <div class="row items-center">
                <q-avatar color="primary" text-color="white" size="36px" class="q-mr-sm">
                  {{ iniciales(d.nombre, d.apellido) }}
                </q-avatar>
                <div>
                  <div class="text-weight-medium">{{ d.nombre }} {{ d.apellido }}</div>
                  <div class="text-caption text-grey-7">@{{ d.usuario }}</div>
                </div>
              </div>
            </td>
            <td class="gt-xs">{{ d.email }}</td>
            <td class="text-center">
              <q-badge :color="estadoBadge(d).color" :label="estadoBadge(d).label" />
            </td>
            <td class="text-center gt-sm text-caption text-grey-7">{{ formatearFecha(d.creado_en) }}</td>
            <td class="text-right">
              <q-btn v-if="!d.aprobado && d.activo" flat dense round icon="check" color="positive" @click="aprobar(d)">
                <q-tooltip>Aprobar</q-tooltip>
              </q-btn>
              <q-btn v-if="!d.aprobado && d.activo" flat dense round icon="close" color="negative" @click="abrirRechazo(d)">
                <q-tooltip>Rechazar</q-tooltip>
              </q-btn>
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
.doc-table thead th {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  font-weight: 700;
}
</style>
