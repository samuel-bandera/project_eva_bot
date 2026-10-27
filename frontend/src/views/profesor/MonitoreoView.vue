<template>
  <q-page class="monitoreo-page">
    <div class="content">
      <header class="page-heading flex justify-between items-end">
        <div>
          <h1>Monitoreo en vivo</h1>
          <p class="subtitle">{{ evaluacion?.titulo || 'Cargando...' }}</p>
        </div>
        <div class="flex gap-sm">
          <q-btn outline no-caps color="primary" icon="refresh" label="Actualizar" class="apple-btn-secondary" @click="cargarDatos" :loading="cargando" />
          <q-btn flat no-caps icon="arrow_back" label="Volver" class="apple-btn-secondary" @click="$router.push('/docente/evaluaciones')" />
        </div>
      </header>

      <div class="layout">
        <aside class="panel lista-panel">
          <div class="panel-header">
            <h2>Alumnos conectados</h2>
            <q-input v-model="buscar" outlined dense placeholder="Buscar alumno..." class="apple-input search-input">
              <template #prepend><q-icon name="search" size="16px" /></template>
            </q-input>
          </div>

          <div v-if="cargandoLista" class="flex justify-center q-pa-lg"><q-spinner color="primary" /></div>
          <div v-else-if="!alumnosFiltrados.length" class="apple-notice">No hay alumnos rendiendo en este momento.</div>
          <div v-else class="lista-alumnos">
            <div
              v-for="alumno in alumnosFiltrados"
              :key="alumno.id"
              class="alumno-item"
              :class="{ selected: alumnoSeleccionado?.id === alumno.id }"
              @click="seleccionarAlumno(alumno)"
            >
              <div class="alumno-info">
                <span class="alumno-nombre">{{ alumno.alumno_apellido }}, {{ alumno.alumno_nombre }}</span>
                <span class="alumno-estado" :class="alumno.estado">{{ alumno.estado }}</span>
              </div>
              <div class="alumno-pregunta">
                Pregunta {{ alumno.pregunta_actual || 1 }}
              </div>
            </div>
          </div>
        </aside>

        <section class="panel detalle-panel">
          <div v-if="!alumnoSeleccionado" class="empty-state">
            <q-icon name="sensors" size="48px" class="text-muted q-mb-md" />
            <h2>Seleccioná un alumno</h2>
            <p>Elegí un alumno de la lista para ver su progreso y actividad en tiempo real.</p>
          </div>

          <div v-else class="detalle-content">
            <div class="detalle-header">
              <div>
                <h2>{{ alumnoSeleccionado.alumno_apellido }}, {{ alumnoSeleccionado.alumno_nombre }}</h2>
                <div class="flex gap-md text-caption text-muted q-mt-xs">
                  <span><q-icon name="timer" size="14px"/> Inició: {{ formatearFecha(inicioReal) }}</span>
                  <span><q-icon name="assignment" size="14px"/> Progreso: Pregunta {{ alumnoSeleccionado.pregunta_actual || 1 }}</span>
                </div>
              </div>
              <q-badge :color="alumnoSeleccionado.estado === 'en_progreso' ? 'primary' : 'grey'" class="text-caption">
                {{ alumnoSeleccionado.estado }}
              </q-badge>
            </div>

            <q-separator class="q-my-md" color="border" />

            <div class="actividad-container">
              <h3 class="text-subtitle2 q-mb-sm">Actividad reciente</h3>
              <div v-if="!eventosAlumno.length" class="apple-notice">Sin actividad registrada.</div>
              <q-timeline color="primary" class="q-mt-sm" v-else>
                <q-timeline-entry
                  v-for="evento in eventosAlumno"
                  :key="evento.id"
                  :title="formatearTituloEvento(evento)"
                  :subtitle="formatearFecha(evento.creado_en)"
                  :icon="iconoEvento(evento.tipo)"
                  :color="colorEvento(evento.tipo)"
                >
                  <div class="text-caption text-muted">{{ formatearDetalleEvento(evento) }}</div>
                </q-timeline-entry>
              </q-timeline>
            </div>
          </div>
        </section>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { Notify } from 'quasar';
import * as examenApi from '../../api/examen.api.js';

const route = useRoute();
const evaluacionId = Number(route.params.id);

const cargando = ref(true);
const cargandoLista = ref(true);
const evaluacion = ref(null);
const alumnos = ref([]);
const buscar = ref('');
const alumnoSeleccionado = ref(null);
const eventosAlumno = ref([]);
let intervalo = null;

const inicioReal = computed(() => {
  if (alumnoSeleccionado.value?.iniciada_en) return alumnoSeleccionado.value.iniciada_en;
  const primerEvento = eventosAlumno.value.find(evento => evento.tipo === 'inicio');
  return primerEvento ? primerEvento.creado_en : null;
});

const alumnosFiltrados = computed(() => {
  const consulta = buscar.value.toLowerCase();
  if (!consulta) return alumnos.value;
  return alumnos.value.filter(alumno =>
    `${alumno.alumno_nombre} ${alumno.alumno_apellido}`.toLowerCase().includes(consulta)
  );
});

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatearTituloEvento(evento) {
  const tipo = evento.tipo;
  if (tipo === 'cambio_pregunta') return 'Cambió de pregunta';
  if (tipo === 'heartbeat') return 'Conexión activa';
  if (tipo === 'inicio') return 'Inició el examen';
  if (tipo === 'salida_pagina') return 'Salió de la página';
  if (tipo === 'finalizado') return 'Finalizó el examen';
  if (tipo === 'corregida') return 'Evaluación corregida';
  return tipo ? tipo.replace(/_/g, ' ') : 'Evento';
}

function formatearDetalleEvento(evento) {
  if (!evento.detalle) return '';
  try {
    const data = typeof evento.detalle === 'string' ? JSON.parse(evento.detalle) : evento.detalle;
    if (data.preguntaActual !== undefined) {
      return `Pregunta ${data.preguntaActual}`;
    }
    if (typeof data === 'object') return '';
    return String(data);
  } catch {
    return evento.detalle;
  }
}

function iconoEvento(tipo) {
  if (tipo === 'inicio') return 'play_circle';
  if (tipo === 'salida_pagina') return 'warning';
  if (tipo === 'finalizado') return 'check_circle';
  if (tipo === 'cambio_pregunta') return 'swap_horiz';
  if (tipo === 'heartbeat') return 'favorite';
  if (tipo === 'corregida') return 'grading';
  return 'info';
}

function colorEvento(tipo) {
  if (tipo === 'inicio') return 'primary';
  if (tipo === 'salida_pagina') return 'negative';
  if (tipo === 'finalizado') return 'positive';
  if (tipo === 'cambio_pregunta') return 'info';
  if (tipo === 'heartbeat') return 'grey-5';
  if (tipo === 'corregida') return 'primary';
  return 'grey';
}

async function cargarDatos() {
  cargando.value = true;
  try {
    const [respuestaEvaluacion, respuestaAlumnos] = await Promise.all([
      examenApi.obtenerEvaluacion(evaluacionId),
      examenApi.progresoEnVivo(evaluacionId)
    ]);
    evaluacion.value = respuestaEvaluacion;
    alumnos.value = respuestaAlumnos?.alumnos || respuestaAlumnos || [];

    if (alumnoSeleccionado.value) {
      const actualizado = alumnos.value.find(alumnoActualizado => alumnoActualizado.id === alumnoSeleccionado.value.id);
      if (actualizado) alumnoSeleccionado.value = actualizado;
    }
  } catch (e) {
    Notify.create({ message: 'Error al cargar monitoreo', color: 'negative' });
  } finally {
    cargando.value = false;
    cargandoLista.value = false;
  }
}

async function seleccionarAlumno(alumno) {
  alumnoSeleccionado.value = alumno;
  eventosAlumno.value = [];
  try {
    const eventos = await examenApi.historialEventos(evaluacionId);
    eventosAlumno.value = (eventos || []).filter(evento => !alumno.id || evento.alumno_id === alumno.id);
  } catch {
  }
}

onMounted(() => {
  cargarDatos();
  intervalo = setInterval(cargarDatos, 5000);
});

onUnmounted(() => {
  if (intervalo) clearInterval(intervalo);
});
</script>

<style scoped>
.monitoreo-page { background: var(--bg); min-height: 100vh; padding: 24px 32px; color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.content { max-width: 1300px; margin: auto; }
.page-heading { margin-bottom: 24px; }
.page-heading h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; }
.subtitle { font-size: 14px; color: var(--text-muted); margin: 0; }

.layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; height: calc(100vh - 120px); }

.panel { background: var(--bg-elevated); border-radius: 14px; border: 1px solid var(--border-subtle); box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.lista-panel { padding: 16px; }
.panel-header { margin-bottom: 12px; }
.panel-header h2 { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
.search-input :deep(.q-field__control) { height: 32px; min-height: 32px; border-radius: 8px; background: var(--bg); }
.lista-alumnos { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.alumno-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: 1px solid transparent; }
.alumno-item:hover { background: var(--bg-hover); }
.alumno-item.selected { background: var(--primary-soft); border-color: var(--primary); }
.alumno-info { display: flex; flex-direction: column; gap: 2px; }
.alumno-nombre { font-size: 13px; font-weight: 600; color: var(--text); }
.alumno-estado { font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); }
.alumno-estado.en_progreso { color: var(--primary); }
.alumno-estado.finalizada { color: var(--success); }
.alumno-estado.abandonada { color: var(--error); }
.alumno-pregunta { font-size: 11px; font-weight: 700; color: var(--text-muted); background: var(--bg); padding: 4px 8px; border-radius: 6px; }

.detalle-panel { padding: 24px; }
.detalle-content { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }
.detalle-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.detalle-header h2 { font-size: 20px; font-weight: 700; margin: 0; }

.actividad-container { flex: 1; overflow-y: auto; }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted); }
.empty-state h2 { color: var(--text); font-size: 18px; margin: 0 0 8px; }

.apple-btn-secondary { border-radius: 8px; font-weight: 500; font-size: 12px; padding: 4px 16px; color: var(--text-muted); border: 1px solid var(--border); }

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; height: auto; }
  .lista-panel { max-height: 300px; }
  .detalle-panel { min-height: 400px; }
}
</style>
