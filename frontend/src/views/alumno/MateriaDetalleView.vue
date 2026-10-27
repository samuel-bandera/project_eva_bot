<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as alumnoApi from '../../api/alumno.api.js';

const route = useRoute();
const router = useRouter();
const materiaId = Number(route.params.id);

const cargando = ref(true);
const materia = ref(null);
const materiales = ref([]);
const tareas = ref([]);
const foro = ref([]);
const tabActiva = ref('contenido');

const tabs = computed(() => [
  { id: 'contenido', label: 'Contenido', icon: 'library_books', count: tareas.value.length + materiales.value.length },
  { id: 'foro',      label: 'Foro',      icon: 'forum',         count: foro.value.length },
]);

async function cargar() {
  cargando.value = true;
  try {
    const [mat, mats, tars, f] = await Promise.all([
      alumnoApi.getDetalleMateria(materiaId),
      alumnoApi.getMaterialesDeMateria(materiaId).catch(() => []),
      alumnoApi.getTareasDeMateria(materiaId).catch(() => []),
      alumnoApi.getForoDeMateria(materiaId).catch(() => []),
    ]);
    materia.value = mat;
    materiales.value = mats || [];
    tareas.value = tars || [];
    foro.value = f || [];
  } catch (e) {
    console.error(e);
  } finally {
    cargando.value = false;
  }
}

function tipoIcono(tipo) {
  return {
    apunte: 'description', video: 'videocam', link: 'link', ejercicio: 'edit_note', otro: 'attach_file',
  }[tipo] || 'description';
}

function estadoColor(estado) {
  return {
    borrador: 'grey-6', publicada: 'primary', cerrada: 'negative',
    pendiente: 'warning', entregada: 'positive'
  }[estado] || 'grey-5';
}

function fechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' });
}

onMounted(cargar);
</script>

<template>
  <q-page class="materia-page">
    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <template v-if="!cargando && materia">
      <header class="page-header">
        <q-btn flat round dense icon="arrow_back" color="primary" class="back-btn" @click="router.push('/alumno/materias')" />
        <div class="header-content">
          <div class="badge-codigo">{{ materia.codigo }}</div>
          <h1 class="page-title">{{ materia.nombre }}</h1>
        </div>
      </header>

      <div class="info-grid">
        <div class="info-card">
          <div class="info-icon"><q-icon name="meeting_room" size="20px" /></div>
          <div><div class="info-label">Aula</div><div class="info-value">{{ materia.aula || 'No asignada' }}</div></div>
        </div>
        <div class="info-card">
          <div class="info-icon"><q-icon name="schedule" size="20px" /></div>
          <div><div class="info-label">Horario</div><div class="info-value">{{ materia.horario || 'No asignado' }}</div></div>
        </div>
        <div class="info-card">
          <div class="info-icon"><q-icon name="person" size="20px" /></div>
          <div><div class="info-label">Profesor</div><div class="info-value">{{ materia.profesor_nombre || 'Sin asignar' }}</div></div>
        </div>
      </div>

      <div class="tabs-container">
        <button v-for="t in tabs" :key="t.id" :class="['tab-btn', { 'tab-btn--active': tabActiva === t.id }]" @click="tabActiva = t.id">
          <q-icon :name="t.icon" size="18px" />
          {{ t.label }}
          <span class="tab-count">{{ t.count }}</span>
        </button>
      </div>

      <div v-show="tabActiva === 'contenido'" class="content-wrapper">

        <div class="section-header">
          <div class="section-title"><q-icon name="assignment" size="18px" /> Tareas</div>
        </div>

        <div v-if="!tareas.length" class="empty-state empty-state--small">
          <p class="empty-desc">No hay tareas asignadas todavía.</p>
        </div>
        <div v-else class="card-list q-mb-lg">
          <div v-for="t in tareas" :key="t.id" class="list-card">
            <div class="list-card__icon text-primary"><q-icon name="assignment" size="24px" /></div>
            <div class="list-card__content">
              <div class="list-card__title">{{ t.titulo }}</div>
              <div class="list-card__meta">
                <span><q-icon name="event" size="14px" /> Vence: {{ fechaCorta(t.fecha_entrega) }}</span>
              </div>
            </div>
            <div class="list-card__action">
              <q-btn unelevated rounded no-caps color="primary" label="Entregar" size="sm" class="q-px-md" @click="router.push('/alumno/tareas')" />
            </div>
          </div>
        </div>

        <div class="section-header">
          <div class="section-title"><q-icon name="folder" size="18px" /> Material de Estudio</div>
        </div>

        <div v-if="!materiales.length" class="empty-state empty-state--small">
          <p class="empty-desc">El profesor aún no subió apuntes o archivos.</p>
        </div>
        <div v-else class="card-list">
          <div v-for="m in materiales" :key="m.id" class="list-card">
            <div class="list-card__icon text-info"><q-icon :name="tipoIcono(m.tipo)" size="24px" /></div>
            <div class="list-card__content">
              <div class="list-card__title">{{ m.titulo }}</div>
              <div class="list-card__meta">
                <span style="text-transform: capitalize"><q-icon name="label" size="14px" /> {{ m.tipo }}</span>
                <span><q-icon name="calendar_today" size="14px" /> {{ fechaCorta(m.fecha) }}</span>
              </div>
            </div>
            <div class="list-card__action">
              <q-btn flat round dense icon="download" color="primary" />
            </div>
          </div>
        </div>
      </div>

      <div v-show="tabActiva === 'foro'" class="content-wrapper">
        <div v-if="!foro.length" class="empty-state">
          <div class="empty-illustration"><q-icon name="forum" size="40px" /></div>
          <h3 class="empty-titulo">Foro vacío</h3>
          <p class="empty-desc">No hay temas de discusión en esta materia todavía.</p>
        </div>
        <div v-else class="card-list">
          <div v-for="f in foro" :key="f.id" class="list-card">
            <div class="list-card__icon text-primary"><q-icon name="forum" size="24px" /></div>
            <div class="list-card__content">
              <div class="list-card__title">{{ f.titulo }}</div>
              <div class="list-card__meta">
                <span>{{ f.autor_nombre }} {{ f.autor_apellido }}</span>
                <span>{{ fechaCorta(f.fecha) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </q-page>
</template>

<style scoped>
.materia-page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 24px; }
.back-btn { margin-top: 4px; }
.header-content { flex: 1; }
.badge-codigo { font-size: 11px; font-weight: 800; color: var(--primary); background: var(--primary-soft); padding: 3px 10px; border-radius: 8px; display: inline-block; margin-bottom: 6px; }
.page-title { font-size: 26px; font-weight: 800; letter-spacing: -0.02em; margin: 0; line-height: 1.1; color: var(--text); }
.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
.info-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: var(--bg-elevated); border-radius: 16px; border: 1px solid var(--border); }
.info-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--bg-hover); display: grid; place-items: center; color: var(--text-muted); }
.info-label { font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.info-value { font-size: 14px; font-weight: 600; color: var(--text); margin-top: 2px; }
.tabs-container { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
.tab-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: transparent; border: none; font-size: 14px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all 0.2s; }
.tab-btn:hover { color: var(--primary); }
.tab-btn--active { color: var(--primary); }
.tab-count { background: var(--primary-soft); color: var(--primary); padding: 2px 8px; border-radius: 100px; font-size: 11px; font-weight: 800; }
.section-header { margin-bottom: 12px; }
.section-title { font-size: 15px; font-weight: 800; color: var(--text); display: flex; align-items: center; gap: 6px; }
.section-title .q-icon { color: var(--primary); }
.content-wrapper { animation: fadeIn 0.3s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
.card-list { display: flex; flex-direction: column; gap: 10px; }
.list-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-elevated); border-radius: 16px; border: 1px solid var(--border); transition: all 0.2s; }
.list-card:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.06); border-color: var(--primary-soft); }
.list-card__icon { width: 44px; height: 44px; border-radius: 12px; background: var(--bg-hover); display: grid; place-items: center; flex-shrink: 0; }
.list-card__content { flex: 1; min-width: 0; }
.list-card__title { font-size: 15px; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-card__meta { display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); margin-top: 4px; }
.list-card__meta span { display: flex; align-items: center; gap: 4px; }
.empty-state { display: flex; flex-direction: column; align-items: center; padding: 40px 24px; text-align: center; }
.empty-state--small { padding: 16px; background: var(--bg-hover); border-radius: 16px; }
.empty-desc { font-size: 13px; color: var(--text-muted); margin: 0; }
.empty-illustration { display: grid; place-items: center; width: 80px; height: 80px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); margin-bottom: 16px; }
.empty-titulo { font-size: 16px; font-weight: 800; margin: 0 0 4px; color: var(--text); }
</style>
