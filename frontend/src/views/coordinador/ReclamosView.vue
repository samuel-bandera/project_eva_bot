<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import * as coordApi from '../../api/coordinador.api.js';

const $q = useQuasar();
const router = useRouter();
const cargando = ref(true);
const reclamos = ref([]);
const filtro = ref('pendientes');

const filtrados = computed(() => {
  if (filtro.value === 'todos') return reclamos.value;
  return reclamos.value.filter(r => r.estado === 'pendiente' || !r.estado);
});

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

async function cargar() {
  cargando.value = true;
  try {
    const data = await coordApi.listarReclamosPendientes?.() || [];
    reclamos.value = data || [];
  } catch (e) {
    reclamos.value = [];
  } finally {
    cargando.value = false;
  }
}

async function resolver(reclamo) {
  $q.dialog({
    title: 'Resolver reclamo',
    message: `${reclamo.titulo || 'Reclamo'} - ${reclamo.alumno_nombre || ''}`,
    prompt: { model: '', label: 'Respuesta al alumno', outlined: true, type: 'textarea' },
    cancel: true, persistent: true,
  }).onOk(async (respuesta) => {
    try {
      await coordApi.resolverReclamo(reclamo.id, { respuesta, estado: 'resuelto' });
      $q.notify({ type: 'positive', message: 'Reclamo resuelto' });
      await cargar();
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al resolver' });
    }
  });
}

function irAPrueba(r) {
  if (!r?.evaluacion_id) return;
  router.push(`/coordinador/reclamos/${r.id}`);
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md reclamos-page">
    <div class="page-head q-mb-md">
      <div>
        <h1 class="page-title">Reclamos</h1>
        <p class="page-sub">{{ filtrados.length }} reclamo(s) {{ filtro === 'todos' ? 'totales' : 'pendientes' }}</p>
      </div>
    </div>

    <q-card flat bordered class="toolbar-card q-mb-md">
      <q-card-section>
        <q-btn-toggle
          v-model="filtro" spread no-caps unelevated
          :options="[
            { label: 'Pendientes', value: 'pendientes' },
            { label: 'Todos', value: 'todos' },
          ]"
          color="grey-3" text-color="grey-8"
          toggle-color="primary" toggle-text-color="white"
        />
      </q-card-section>
    </q-card>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !filtrados.length" flat bordered class="empty-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="report_problem" size="56px" color="grey-5" class="q-mb-sm" />
        <div class="text-h6">Sin reclamos</div>
        <div class="text-caption text-grey-7">No hay reclamos {{ filtro === 'todos' ? '' : 'pendientes' }}</div>
      </q-card-section>
    </q-card>

    <div v-else class="column q-gutter-md">
      <q-card v-for="r in filtrados" :key="r.id" flat bordered class="reclamo-card">
        <q-card-section>
          <div class="row items-center justify-between q-mb-sm">
            <q-badge color="warning" label="pendiente" v-if="!r.estado || r.estado === 'pendiente'" />
            <q-badge color="positive" :label="r.estado || 'resuelto'" v-else />
            <span class="text-caption text-grey-7">{{ formatearFecha(r.creado_en) }}</span>
          </div>
          <div class="reclamo-titulo">{{ r.titulo || 'Reclamo de calificación' }}</div>
          <div class="reclamo-desc">{{ r.descripcion || r.motivo || '' }}</div>
          <div class="reclamo-meta">
            <q-icon name="person" size="13px" />
            {{ r.alumno_nombre || '' }} {{ r.alumno_apellido || '' }}
            <span v-if="r.evaluacion_titulo"> · {{ r.evaluacion_titulo }}</span>
          </div>
        </q-card-section>
        <q-card-actions v-if="!r.estado || r.estado === 'pendiente'">
          <q-btn
            unelevated no-caps color="primary"
            icon="check" label="Resolver"
            class="full-width"
            @click="resolver(r)"
          />
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped>
.reclamos-page { max-width: 1000px; margin: 0 auto; }
.page-head { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 26px; font-weight: 800; margin: 0; color: var(--text); letter-spacing: -0.02em; }
.page-sub { margin: 4px 0 0 0; color: var(--text-muted); font-size: 13px; }
.toolbar-card, .empty-card { border-radius: 14px; }
.reclamo-card { border-radius: 14px; }
.reclamo-titulo { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
.reclamo-desc { font-size: 13px; color: var(--text-secondary); line-height: 1.5; white-space: pre-wrap; }
.reclamo-meta {
  display: flex; align-items: center; gap: 4px;
  margin-top: 10px; padding-top: 10px;
  border-top: 1px solid var(--border-subtle);
  font-size: 12px; color: var(--text-muted);
}
</style>
