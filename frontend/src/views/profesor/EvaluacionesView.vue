<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import SkeletonLoader from '../../components/SkeletonLoader.vue';
import EstadoVacio from '../../components/EstadoVacio.vue';
import * as evalApi from '../../api/evaluacion.api.js';

const router = useRouter();

const cargando = ref(true);
const error = ref('');
const evaluaciones = ref([]);
const filtro = ref('todas');
const busqueda = ref('');

const filtradas = computed(() => {
  let arr = evaluaciones.value;

  if (filtro.value !== 'todas') {
    arr = arr.filter(e => e.estado === filtro.value);
  }

  if (busqueda.value.trim()) {
    const q = busqueda.value.toLowerCase();
    arr = arr.filter(e =>
      e.titulo?.toLowerCase().includes(q) ||
      (e.materia_nombre || '').toLowerCase().includes(q)
    );
  }

  return arr;
});

const totalPorEstado = computed(() => {
  const conteo = { todas: evaluaciones.value.length };
  for (const e of evaluaciones.value) {
    conteo[e.estado] = (conteo[e.estado] || 0) + 1;
  }
  return conteo;
});

const stats = computed(() => [
  {
    label: 'Total',
    valor: evaluaciones.value.length,
    icono: 'quiz',
    color: 'primary',
  },
  {
    label: 'Publicadas',
    valor: evaluaciones.value.filter(e => e.estado === 'publicada' || e.estado === 'abierta').length,
    icono: 'campaign',
    color: 'positive',
  },
  {
    label: 'Por corregir',
    valor: evaluaciones.value
      .filter(e => e.estado === 'cerrada' || e.estado === 'publicada')
      .reduce((s, e) => s + (e.rendiciones_sin_corregir || 0), 0),
    icono: 'pending_actions',
    color: 'warning',
  },
  {
    label: 'Borradores',
    valor: evaluaciones.value.filter(e => e.estado === 'borrador').length,
    icono: 'edit_note',
    color: 'grey-7',
  },
]);

const tabs = [
  { id: 'todas',      label: 'Todas',      icon: 'list' },
  { id: 'borrador',   label: 'Borradores', icon: 'edit_note' },
  { id: 'publicada',  label: 'Publicadas', icon: 'campaign' },
  { id: 'abierta',    label: 'Abiertas',   icon: 'play_circle' },
  { id: 'cerrada',    label: 'Cerradas',   icon: 'lock_clock' },
  { id: 'corregida',  label: 'Corregidas', icon: 'done_all' },
];

function fechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function estadoColor(estado) {
  return {
    borrador:   'grey-7',
    publicada:  'primary',
    abierta:    'positive',
    cerrada:    'warning',
    corregida:  'info',
  }[estado] || 'grey-7';
}

function estadoTexto(estado) {
  return {
    borrador:  'Borrador',
    publicada: 'Publicada',
    abierta:   'Abierta',
    cerrada:   'Cerrada',
    corregida: 'Corregida',
  }[estado] || estado;
}

function tipoTexto(tipo) {
  return {
    parcial:        'Parcial',
    tp:             'Trabajo Práctico',
    recuperatorio:  'Recuperatorio',
    final:          'Final',
  }[tipo] || tipo;
}

async function cargar() {
  cargando.value = true;
  error.value = '';
  try {
    const datos = await evalApi.listarMisEvaluacionesProfesor();
    evaluaciones.value = datos || [];
  } catch (e) {
    error.value = 'No se pudieron cargar las evaluaciones';
    Notify.create({
      message: error.value,
      color: 'negative',
      icon: 'error',
      position: 'top-right',
    });
  } finally {
    cargando.value = false;
  }
}

function crearNueva(pro = false) {
  router.push(pro ? '/docente/evaluaciones/crear_evaluacion' : '/docente/evaluaciones/crear');
}

function verMonitoreo(id) {
  router.push(`/docente/evaluaciones/${id}/monitoreo`);
}

function irACorregir(id) {
  router.push(`/docente/evaluaciones/${id}/corregir`);
}

function editarEvaluacion(id) {
  Notify.create({
    message: 'Edición completa disponible en el wizard (próximamente)',
    color: 'info',
    icon: 'info',
    position: 'top-right',
    timeout: 4000,
  });
}

async function publicarEvaluacion(id) {
  if (!confirm('¿Publicar esta evaluación? Los alumnos podrán verla.')) return;
  try {
    await evalApi.publicarEvaluacion(id);
    Notify.create({ message: 'Evaluación publicada', color: 'positive', icon: 'campaign' });
    cargar();
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al publicar', color: 'negative' });
  }
}

async function abrirEvaluacion(id) {
  if (!confirm('¿Abrir esta evaluación para que los alumnos puedan rendirla?')) return;
  try {
    await evalApi.abrirEvaluacion(id);
    Notify.create({ message: 'Evaluación abierta', color: 'positive', icon: 'play_circle' });
    cargar();
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al abrir', color: 'negative' });
  }
}

async function cerrarEvaluacion(id) {
  if (!confirm('¿Cerrar esta evaluación? Los alumnos no podrán seguir rindiendo.')) return;
  try {
    await evalApi.cerrarEvaluacion(id);
    Notify.create({ message: 'Evaluación cerrada', color: 'info', icon: 'lock' });
    cargar();
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al cerrar', color: 'negative' });
  }
}

async function despublicarEvaluacion(id) {
  if (!confirm('¿Despublicar esta evaluación? Volverá a estado borrador.')) return;
  try {
    await evalApi.despublicarEvaluacion(id);
    Notify.create({ message: 'Evaluación despublicada', color: 'info', icon: 'undo' });
    cargar();
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al despublicar', color: 'negative' });
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="eval-page">
    <div class="eval-content">

      <header class="page-heading">
        <div class="heading-left">
          <q-btn
            flat round dense
            icon="arrow_back"
            color="primary"
            aria-label="Volver al panel"
            @click="router.push('/docente')"
          />
          <div class="heading-text">
            <div class="eyebrow">PANEL DEL PROFESOR</div>
            <h1>Mis evaluaciones</h1>
            <p>Creá, publicá y monitoreá las evaluaciones de tus materias.</p>
          </div>
        </div>

        <div class="heading-right">
          <q-btn
            unelevated no-caps
            color="primary"
            icon="add"
            label="Crear evaluación"
            class="btn-crear"
            @click="crearNueva(false)"
          />
        </div>
      </header>

      <div v-if="!cargando && evaluaciones.length" class="stats-grid">
        <q-card
          v-for="s in stats"
          :key="s.label"
          flat bordered
          class="stat-card"
        >
          <q-card-section>
            <div class="stat-top">
              <span>{{ s.label }}</span>
              <q-icon :name="s.icono" size="20px" :color="s.color" />
            </div>
            <div class="stat-value">{{ s.valor }}</div>
          </q-card-section>
        </q-card>
      </div>

      <div class="filtros-bar">
        <div class="filtros-tabs">
          <q-btn
            v-for="t in tabs"
            :key="t.id"
            :label="t.label"
            :icon="t.icon"
            no-caps
            dense
            :unelevated="filtro === t.id"
            :flat="filtro !== t.id"
            :color="filtro === t.id ? 'primary' : 'grey-7'"
            class="tab-btn"
            @click="filtro = t.id"
          >
            <q-badge
              v-if="(totalPorEstado[t.id] || 0) > 0"
              :color="filtro === t.id ? 'white' : 'grey-5'"
              :text-color="filtro === t.id ? 'primary' : 'white'"
              class="tab-badge"
            >
              {{ totalPorEstado[t.id] }}
            </q-badge>
          </q-btn>
        </div>

        <q-input
          v-model="busqueda"
          outlined dense
          placeholder="Buscar por título o materia…"
          class="buscador"
          clearable
        >
          <template #prepend>
            <q-icon name="search" size="18px" />
          </template>
        </q-input>
      </div>

      <div v-if="cargando" class="skeleton-container">
        <SkeletonLoader tipo="stats" :cantidad="4" />
        <div class="skeleton-grid">
          <SkeletonLoader tipo="card" :cantidad="6" />
        </div>
      </div>

      <q-banner v-else-if="error" class="banner-error" rounded dense>
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action>
          <q-btn flat no-caps dense label="Reintentar" @click="cargar" />
        </template>
      </q-banner>

      <EstadoVacio
        v-else-if="!filtradas.length"
        :icono="busqueda ? 'search_off' : (filtro !== 'todas' ? 'filter_list_off' : 'quiz')"
        :titulo="busqueda ? 'Sin resultados' : (filtro !== 'todas' ? 'Sin evaluaciones en este estado' : 'Sin evaluaciones todavía')"
        :descripcion="busqueda ? `No hay evaluaciones que coincidan con '${busqueda}'` : (filtro !== 'todas' ? `Probá otro filtro o creá una nueva evaluación` : 'Creá tu primera evaluación para empezar a monitorear a tus alumnos.')"
        :accion-texto="busqueda ? 'Limpiar búsqueda' : 'Crear evaluación'"
        :accion-icono="busqueda ? 'clear' : 'add'"
        @accion="busqueda ? (busqueda = '') : (filtro === 'abierta' ? (filtro = 'publicada') : crearNueva())"
      />

      <div v-else class="eval-grid">
        <q-card
          v-for="e in filtradas"
          :key="e.id"
          flat bordered
          class="eval-card"
        >
          <q-card-section class="card-head">
            <div class="head-left">
              <q-badge
                :color="estadoColor(e.estado)"
                text-color="white"
                :label="estadoTexto(e.estado)"
                class="badge-estado"
              />
              <span class="badge-tipo">{{ tipoTexto(e.tipo) }}</span>
            </div>

            <q-btn
              flat round dense
              icon="more_vert"
              size="sm"
              color="grey-7"
            >
              <q-menu>
                <q-list style="min-width: 200px">
                  <q-item
                    clickable v-close-popup
                    @click="verMonitoreo(e.id)"
                  >
                    <q-item-section avatar>
                      <q-icon name="visibility" />
                    </q-item-section>
                    <q-item-section>Ver en vivo</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup>
                    <q-item-section avatar>
                      <q-icon name="edit" />
                    </q-item-section>
                    <q-item-section>Editar</q-item-section>
                  </q-item>
                  <q-item clickable v-close-popup>
                    <q-item-section avatar>
                      <q-icon name="content_copy" />
                    </q-item-section>
                    <q-item-section>Duplicar</q-item-section>
                  </q-item>
                </q-list>
              </q-menu>
            </q-btn>
          </q-card-section>

          <q-card-section class="card-body">
            <h3 class="card-titulo">{{ e.titulo }}</h3>
            <div class="card-materia">
              <q-icon name="menu_book" size="14px" />
              {{ e.materia_nombre }}
              <span v-if="e.materia_codigo" class="card-codigo">{{ e.materia_codigo }}</span>
            </div>
          </q-card-section>

          <q-separator class="card-sep" />

          <q-card-section class="card-meta">
            <div class="meta-item">
              <q-icon name="event" size="15px" />
              <div>
                <span>Apertura</span>
                <strong>{{ fechaCorta(e.fecha_apertura) }}</strong>
              </div>
            </div>
            <div class="meta-item">
              <q-icon name="event_busy" size="15px" />
              <div>
                <span>Cierre</span>
                <strong>{{ fechaCorta(e.fecha_cierre) }}</strong>
              </div>
            </div>
            <div class="meta-item">
              <q-icon name="groups" size="15px" />
              <div>
                <span>Rendiciones</span>
                <strong>{{ e.total_rendiciones || 0 }}</strong>
              </div>
            </div>
          </q-card-section>

          <q-card-section class="card-footer">
            <template v-if="e.estado === 'borrador'">
              <q-btn unelevated no-caps color="primary" icon="edit" label="Editar"
                     class="btn-accion" @click="editarEvaluacion(e.id)" />
              <q-btn outline no-caps color="positive" icon="campaign" label="Publicar"
                     class="btn-accion" @click="publicarEvaluacion(e.id)" />
            </template>

            <template v-else-if="e.estado === 'publicada'">
              <q-btn unelevated no-caps color="positive" icon="play_circle" label="Abrir"
                     class="btn-accion" @click="abrirEvaluacion(e.id)" />
              <q-btn outline no-caps color="primary" icon="edit" label="Editar"
                     class="btn-accion" @click="editarEvaluacion(e.id)" />
              <q-btn flat no-caps color="grey-7" icon="undo" label="Despublicar"
                     class="btn-accion" @click="despublicarEvaluacion(e.id)" />
            </template>

            <template v-else-if="e.estado === 'abierta'">
              <q-btn unelevated no-caps color="primary" icon="podcasts" label="Monitoreo en vivo"
                     class="btn-accion" @click="verMonitoreo(e.id)" />
              <q-btn outline no-caps color="primary" icon="edit_document" label="Corregir"
                     class="btn-accion" @click="irACorregir(e.id)" />
              <q-btn outline no-caps color="negative" icon="lock" label="Cerrar"
                     class="btn-accion" @click="cerrarEvaluacion(e.id)" />
            </template>

            <template v-else-if="e.estado === 'cerrada'">
              <q-btn unelevated no-caps color="primary" icon="analytics" label="Ver resultados"
                     class="btn-accion" @click="verMonitoreo(e.id)" />
              <q-btn outline no-caps color="primary" icon="edit_document" label="Corregir"
                     class="btn-accion" @click="irACorregir(e.id)" />
            </template>

            <template v-else-if="e.estado === 'corregida'">
              <q-btn unelevated no-caps color="primary" icon="analytics" label="Ver resultados"
                     class="btn-accion" @click="verMonitoreo(e.id)" />
              <q-btn outline no-caps color="primary" icon="edit_document" label="Re-corregir"
                     class="btn-accion" @click="irACorregir(e.id)" />
            </template>

            <template v-else>
              <q-btn unelevated no-caps color="primary" icon="visibility" label="Ver"
                     class="btn-accion" @click="verMonitoreo(e.id)" />
            </template>
          </q-card-section>
        </q-card>
      </div>

    </div>
  </q-page>
</template>

<style scoped>
.eval-page {
  background: var(--bg);
  min-height: calc(100vh - 68px);
}

.eval-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 34px 34px 60px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 26px;
  flex-wrap: wrap;
}

.heading-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.heading-text .eyebrow {
  color: var(--primary);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.5px;
}

.heading-text h1 {
  margin: 6px 0 4px;
  color: var(--text);
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 750;
  letter-spacing: -1px;
  line-height: 1.1;
}

.heading-text p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.btn-crear {
  text-transform: none;
  font-weight: 600;
  border-radius: 10px;
  min-height: 40px;
  box-shadow: 0 4px 12px rgba(114, 47, 55, 0.2);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}

.stat-card {
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 12px;
}

.stat-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
}

.stat-value {
  margin-top: 14px;
  font-size: 28px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -1px;
  line-height: 1;
}

.filtros-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}

.filtros-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tab-btn {
  text-transform: none;
  font-weight: 600;
  border-radius: 9px;
  font-size: 12px;
  min-height: 36px;
  padding: 6px 14px;
}

.tab-badge {
  margin-left: 6px;
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
}

.buscador {
  min-width: 260px;
  max-width: 340px;
}

.buscador :deep(.q-field__control) {
  border-radius: 10px;
  background: var(--bg-elevated);
}

.skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.skeleton-grid {
  margin-top: 4px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 20px;
  color: var(--text-muted);
}

.banner-error {
  background: var(--error-bg);
  color: var(--error);
  border: 1px solid var(--error);
  font-size: 13px;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 20px;
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 14px;
  text-align: center;
}

.empty-card > .q-icon {
  color: var(--primary);
  margin-bottom: 6px;
}

.empty-titulo {
  font-size: 16px;
  font-weight: 750;
  color: var(--text);
}

.empty-card p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.empty-acciones {
  margin-top: 14px;
}

.empty-acciones .q-btn {
  text-transform: none;
  font-weight: 600;
  border-radius: 10px;
}

.eval-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.eval-card {
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
  overflow: hidden;
}

.eval-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 14px 16px 0;
}

.head-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.badge-estado {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 6px;
}

.badge-tipo {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.card-body {
  padding: 12px 16px 14px;
}

.card-titulo {
  margin: 0 0 8px;
  font-size: 15.5px;
  font-weight: 750;
  color: var(--text);
  letter-spacing: -0.3px;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-materia {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

.card-materia .q-icon { color: var(--primary); }

.card-codigo {
  margin-left: 4px;
  padding: 1px 6px;
  background: var(--bg-hover);
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-secondary);
  letter-spacing: 0.05em;
}

.card-sep {
  background: var(--border-subtle);
}

.card-meta {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;
  padding: 12px 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.meta-item .q-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.meta-item > div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.meta-item span {
  font-size: 9.5px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}

.meta-item strong {
  font-size: 11.5px;
  color: var(--text);
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  padding: 12px 16px 14px;
  margin-top: auto;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-accion {
  flex: 1;
  min-width: 100px;
  text-transform: none;
  font-weight: 600;
  border-radius: 10px;
  min-height: 38px;
  font-size: 11.5px;
}

@media (max-width: 960px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .eval-content {
    padding: 20px 16px 40px;
  }

  .page-heading {
    flex-direction: column;
    margin-bottom: 20px;
  }

  .heading-right {
    width: 100%;
  }

  .btn-crear {
    width: 100%;
  }

  .filtros-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .filtros-tabs {
    gap: 4px;
  }

  .tab-btn {
    flex: 1;
    min-width: 0;
    padding: 6px 8px;
  }

  .buscador {
    min-width: 0;
    max-width: 100%;
  }

  .eval-grid {
    grid-template-columns: 1fr;
  }

  .card-meta {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
