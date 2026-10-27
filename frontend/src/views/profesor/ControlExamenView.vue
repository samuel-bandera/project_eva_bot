<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify } from 'quasar';
import { useAuthStore } from '../../stores/auth.store.js';
import * as examenApi from '../../api/examen.api.js';
import http from '../../api/http.js';
import GraficoNotas from '../../components/GraficoNotas.vue';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const evaluacionId = Number(route.params.id);

const tabActiva = ref('en-vivo');

const cargando = ref(true);
const error = ref('');
const evaluacion = ref(null);

const alumnos = ref([]);
const resumen = ref({});
const ultimaAct = ref(null);
const filtro = ref('todos');
let cerrarStream = null;

const stats = ref(null);
const filas = ref([]);
const dificultad = ref([]);
const cargandoResultados = ref(false);
const filtroResultados = ref('');

const modalTiempo = ref(false);
const modalEventos = ref(false);
const alumnoSeleccionado = ref(null);
const minutosCustom = ref(5);
const eventosAlumno = ref([]);
const cargandoEventos = ref(false);

const mostrarEnVivo = computed(() => {
  const e = evaluacion.value?.estado;
  return e === 'abierta' || e === 'publicada';
});

const mostrarResultados = computed(() => {
  const e = evaluacion.value?.estado;
  return e === 'cerrada' || e === 'corregida';
});

const alumnosFiltrados = computed(() => {
  const arr = alumnos.value;
  switch (filtro.value) {
    case 'en_curso':  return arr.filter(a => a.estado === 'en_progreso');
    case 'enviados':  return arr.filter(a => a.estado === 'enviada' || a.estado === 'corregida');
    case 'salidas':   return arr.filter(a => a.salidas_detectadas > 0);
    case 'inactivos': return arr.filter(a =>
      a.estado === 'en_progreso' && a.segundos_inactivo !== null && a.segundos_inactivo > 60
    );
    default: return arr;
  }
});

const filasFiltradas = computed(() => {
  const q = filtroResultados.value.trim().toLowerCase();
  if (!q) return filas.value;
  return filas.value.filter(f =>
    `${f.alumno_nombre} ${f.alumno_apellido}`.toLowerCase().includes(q) ||
    (f.alumno_usuario || '').toLowerCase().includes(q)
  );
});

const segundosDesdeUpdate = computed(() => {
  if (!ultimaAct.value) return 0;
  return Math.floor((Date.now() - ultimaAct.value.getTime()) / 1000);
});

const statsFormateadas = computed(() => {
  if (!stats.value) return null;
  const s = stats.value;
  const aprobados = Number(s.aprobados) || 0;
  const corregidas = Number(s.corregidas) || 0;
  return {
    total: Number(s.total) || 0,
    corregidas,
    promedio: s.promedio != null ? Number(s.promedio).toFixed(2) : '—',
    minima: s.minima != null ? Number(s.minima).toFixed(2) : '—',
    maxima: s.maxima != null ? Number(s.maxima).toFixed(2) : '—',
    aprobados,
    reprobados: Number(s.reprobados) || 0,
    tasaAprobacion: corregidas > 0 ? Math.round((aprobados / corregidas) * 100) : 0,
    tiempoPromedio: formatearMinutos(s.tiempo_promedio_seg),
    salidas: Number(s.total_salidas) || 0,
  };
});

const notasParaChart = computed(() =>
  filas.value.map(f => f.nota).filter(n => n != null)
);

const estadoBadge = computed(() => {
  const e = evaluacion.value?.estado;
  return {
    borrador:   { label: 'Borrador',   color: 'grey-7' },
    publicada:  { label: 'Publicada',  color: 'primary' },
    abierta:    { label: 'En curso',   color: 'positive' },
    cerrada:    { label: 'Cerrada',    color: 'warning' },
    corregida:  { label: 'Corregida',  color: 'info' },
  }[e] || { label: e, color: 'grey-7' };
});

function iniciales(nombre, apellido) {
  return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase() || '?';
}

function formatearTiempo(segundos) {
  if (!segundos || segundos < 0) return '00:00';
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatearMinutos(segundos) {
  if (!segundos) return '—';
  const m = Math.floor(Number(segundos) / 60);
  return `${m} min`;
}

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function estadoTexto(estado) {
  return {
    'en_progreso': 'En curso',
    'enviada': 'Enviado',
    'corregida': 'Corregido',
  }[estado] || estado;
}

function estadoClase(estado) {
  return {
    'en_progreso': 'live',
    'enviada': 'sent',
    'corregida': 'graded',
  }[estado] || 'idle';
}

function estaInactivo(a) {
  return a.estado === 'en_progreso'
    && a.segundos_inactivo !== null
    && a.segundos_inactivo > 60;
}

function notaColor(nota) {
  if (nota === null || nota === undefined) return 'grey';
  const n = Number(nota);
  if (n >= 9) return 'positive';
  if (n >= 6) return 'primary';
  if (n >= 4) return 'warning';
  return 'negative';
}

function dificultadColor(pct) {
  if (pct >= 80) return 'positive';
  if (pct >= 50) return 'primary';
  if (pct >= 30) return 'warning';
  return 'negative';
}

function dificultadTexto(pct) {
  if (pct >= 80) return 'Fácil';
  if (pct >= 50) return 'Media';
  if (pct >= 30) return 'Difícil';
  return 'Muy difícil';
}

function tipoLabel(t) {
  return {
    multiple_choice: 'Opción múltiple',
    true_false: 'Verdadero/Falso',
    short_answer: 'Desarrollo',
  }[t] || t;
}

async function agregarTiempo(rendicionId, segundos = 300) {
  const min = Math.floor(segundos / 60);
  if (!confirm(`¿Agregar ${min} minutos a este alumno?`)) return;

  try {
    await examenApi.agregarTiempo(rendicionId, segundos);
    Notify.create({ message: `+${min} min agregados`, color: 'positive', icon: 'schedule' });
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al agregar tiempo', color: 'negative' });
  }
}

async function forzar(rendicionId) {
  if (!confirm('¿Forzar el cierre de esta rendición? El alumno no podrá seguir respondiendo.')) return;
  try {
    await examenApi.forzarCierre(rendicionId);
    Notify.create({ message: 'Rendición cerrada', color: 'info', icon: 'lock' });
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al cerrar', color: 'negative' });
  }
}

function iniciarStream() {
  if (!mostrarEnVivo.value || cerrarStream) return;
  cerrarStream = examenApi.conectarStreamProgreso(
    evaluacionId,
    auth.token,
    (payload) => {
      alumnos.value = payload.alumnos || [];
      resumen.value = payload.resumen || {};
      ultimaAct.value = new Date();
    }
  );
}

function detenerStream() {
  if (cerrarStream) {
    cerrarStream();
    cerrarStream = null;
  }
}

async function cargarEvaluacion() {
  cargando.value = true;
  error.value = '';
  try {
    const datos = await examenApi.progresoEnVivo(evaluacionId);
    evaluacion.value = datos.evaluacion;
    alumnos.value = datos.alumnos || [];
    resumen.value = datos.resumen || {};
    ultimaAct.value = new Date();

    if (datos.evaluacion.estado === 'cerrada' || datos.evaluacion.estado === 'corregida') {
      tabActiva.value = 'resultados';
    } else {
      tabActiva.value = 'en-vivo';
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudo cargar la evaluación';
  } finally {
    cargando.value = false;
  }
}

async function cargarResultados() {
  if (stats.value) return;
  cargandoResultados.value = true;
  try {
    const { data } = await http.get(`/evaluaciones/${evaluacionId}/resultados`);
    stats.value = data.data.stats;
    filas.value = data.data.filas || [];
    dificultad.value = data.data.dificultad || [];
  } catch (e) {
    Notify.create({ message: 'Error al cargar resultados', color: 'negative', icon: 'error' });
  } finally {
    cargandoResultados.value = false;
  }
}

watch(tabActiva, (nuevo) => {
  if (nuevo === 'resultados') {
    detenerStream();
    cargarResultados();
  } else if (nuevo === 'en-vivo' && mostrarEnVivo.value) {
    iniciarStream();
  }
});

onMounted(async () => {
  await cargarEvaluacion();
  if (tabActiva.value === 'en-vivo' && mostrarEnVivo.value) {
    iniciarStream();
  } else if (tabActiva.value === 'resultados') {
    cargarResultados();
  }
});

onBeforeUnmount(() => {
  detenerStream();
});

function rindiendo() {
  return alumnos.value.filter(a => a.estado === 'en_progreso');
}

async function agregarATodos(segundos) {
  const enCurso = rindiendo();
  if (!enCurso.length) {
    Notify.create({ message: 'No hay alumnos rindiendo ahora', color: 'warning', icon: 'info' });
    return;
  }
  const min = Math.floor(segundos / 60);
  if (!confirm(`¿Agregar ${min} minutos a los ${enCurso.length} alumnos que están rindiendo?`)) return;

  let ok = 0;
  for (const a of enCurso) {
    try {
      await examenApi.agregarTiempo(a.rendicion_id, segundos);
      ok++;
    } catch (e) {  }
  }
  Notify.create({
    message: `+${min} min agregados a ${ok}/${enCurso.length} alumnos`,
    color: 'positive',
    icon: 'schedule',
  });
}

async function forzarTodos() {
  const enCurso = rindiendo();
  if (!enCurso.length) {
    Notify.create({ message: 'No hay alumnos rindiendo ahora', color: 'warning' });
    return;
  }
  if (!confirm(`¿Forzar el cierre de ${enCurso.length} rendiciones en curso? Los alumnos no podrán seguir.`)) return;

  let ok = 0;
  for (const a of enCurso) {
    try {
      await examenApi.forzarCierre(a.rendicion_id);
      ok++;
    } catch (e) {  }
  }
  Notify.create({
    message: `Cerradas ${ok}/${enCurso.length} rendiciones`,
    color: 'info',
    icon: 'lock',
  });
}

function abrirModalTiempo(alumno) {
  alumnoSeleccionado.value = alumno;
  minutosCustom.value = 5;
  modalTiempo.value = true;
}

async function confirmarTiempoCustom() {
  const min = Number(minutosCustom.value);
  if (min < 1 || min > 120) {
    Notify.create({ message: 'Minutos entre 1 y 120', color: 'negative' });
    return;
  }
  try {
    await examenApi.agregarTiempo(alumnoSeleccionado.value.rendicion_id, min * 60);
    Notify.create({
      message: `+${min} min agregados a ${alumnoSeleccionado.value.alumno_nombre}`,
      color: 'positive',
      icon: 'schedule',
    });
    modalTiempo.value = false;
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al agregar', color: 'negative' });
  }
}

async function abrirEventos(alumno) {
  alumnoSeleccionado.value = alumno;
  modalEventos.value = true;
  eventosAlumno.value = [];
  cargandoEventos.value = true;

  try {
    const todos = await examenApi.historialEventos(evaluacionId);
    eventosAlumno.value = (todos || [])
      .filter(e => e.alumno_id === alumno.alumno_id)
      .slice(0, 50);
  } catch (e) {
    Notify.create({ message: 'No se pudieron cargar los eventos', color: 'negative' });
  } finally {
    cargandoEventos.value = false;
  }
}

function iconoEvento(tipo) {
  return {
    inicio: 'play_circle',
    heartbeat: 'favorite',
    cambio_pregunta: 'swap_horiz',
    salida_pagina: 'warning',
    vuelta_pagina: 'undo',
    tiempo_agregado: 'schedule',
    cierre_manual: 'lock',
    entrega_automatica: 'send',
  }[tipo] || 'circle';
}

function colorEvento(tipo) {
  return {
    inicio: 'primary',
    heartbeat: 'grey-5',
    cambio_pregunta: 'info',
    salida_pagina: 'negative',
    vuelta_pagina: 'warning',
    tiempo_agregado: 'positive',
    cierre_manual: 'grey-7',
    entrega_automatica: 'primary',
  }[tipo] || 'grey-7';
}

function textoEvento(tipo) {
  return {
    inicio: 'Inicio del examen',
    heartbeat: 'Actividad',
    cambio_pregunta: 'Cambió de pregunta',
    salida_pagina: '⚠️ SALIDA detectada',
    vuelta_pagina: 'Volvió a la pestaña',
    tiempo_agregado: 'Tiempo agregado',
    cierre_manual: 'Cierre manual',
    entrega_automatica: 'Entrega automática',
  }[tipo] || tipo;
}

function horaEvento(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-UY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
</script>

<template>
  <q-page class="control-page">
    <div class="control-content">

      <header class="page-heading">
        <div class="heading-left">
          <q-btn
            flat round dense
            icon="arrow_back"
            color="primary"
            aria-label="Volver"
            @click="router.push('/docente/evaluaciones')"
          />
          <div class="heading-text">
            <div class="eyebrow">CONTROL DE EXAMEN</div>
            <h1>{{ evaluacion?.titulo || 'Cargando…' }}</h1>
            <p v-if="evaluacion">
              {{ evaluacion.materia_nombre }}
              <span class="sep">·</span>
              <span class="tiempo">{{ evaluacion.duracion_minutos }} min</span>
            </p>
          </div>
        </div>

        <div class="heading-right" v-if="evaluacion">
          <q-badge
            :color="estadoBadge.color"
            text-color="white"
            :label="estadoBadge.label"
            class="badge-estado"
          />
        </div>
      </header>

      <div v-if="!cargando && !error" class="tabs-bar">
        <q-btn
          label="En vivo"
          icon="podcasts"
          no-caps
          :unelevated="tabActiva === 'en-vivo'"
          :flat="tabActiva !== 'en-vivo'"
          :color="tabActiva === 'en-vivo' ? 'primary' : 'grey-7'"
          class="tab-btn"
          :disable="!mostrarEnVivo"
          @click="tabActiva = 'en-vivo'"
        >
          <q-badge
            v-if="resumen.en_curso > 0"
            color="positive"
            text-color="white"
            class="tab-badge pulse-badge"
          >
            {{ resumen.en_curso }}
          </q-badge>
        </q-btn>

        <q-btn
          label="Resultados"
          icon="analytics"
          no-caps
          :unelevated="tabActiva === 'resultados'"
          :flat="tabActiva !== 'resultados'"
          :color="tabActiva === 'resultados' ? 'primary' : 'grey-7'"
          class="tab-btn"
          :disable="!mostrarResultados"
          @click="tabActiva = 'resultados'"
        />
      </div>

      <div v-if="cargando" class="loading-state">
        <q-spinner color="primary" size="40px" />
        <span>Cargando…</span>
      </div>

      <q-banner v-else-if="error" class="banner-error" rounded>
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
        <template #action>
          <q-btn flat no-caps dense label="Volver" @click="router.push('/docente/evaluaciones')" />
        </template>
      </q-banner>

      <div v-else-if="tabActiva === 'en-vivo'" class="tab-en-vivo">

        <div class="kpis-live">
          <div class="kpi-card">
            <div class="kpi-icon"><q-icon name="groups" size="22px" /></div>
            <div class="kpi-info">
              <span class="kpi-label">Total</span>
              <span class="kpi-value">{{ resumen.total || 0 }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon live"><q-icon name="play_circle" size="22px" /></div>
            <div class="kpi-info">
              <span class="kpi-label">Rindiendo</span>
              <span class="kpi-value">{{ resumen.en_curso || 0 }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon warn"><q-icon name="schedule" size="22px" /></div>
            <div class="kpi-info">
              <span class="kpi-label">Inactivos</span>
              <span class="kpi-value">{{ resumen.inactivos || 0 }}</span>
            </div>
          </div>
          <div class="kpi-card">
            <div class="kpi-icon danger"><q-icon name="logout" size="22px" /></div>
            <div class="kpi-info">
              <span class="kpi-label">Salidas</span>
              <span class="kpi-value">{{ resumen.salidas || 0 }}</span>
            </div>
          </div>
        </div>

        <div class="filtros-bar">
          <div class="filtros-tabs">
            <q-btn
              v-for="f in [
                { id: 'todos', label: 'Todos', icon: 'list' },
                { id: 'en_curso', label: 'Rindiendo', icon: 'play_arrow' },
                { id: 'enviados', label: 'Enviados', icon: 'done' },
                { id: 'salidas', label: 'Con salidas', icon: 'warning' },
                { id: 'inactivos', label: 'Inactivos', icon: 'schedule' },
              ]"
              :key="f.id"
              :label="f.label"
              :icon="f.icon"
              no-caps dense
              :unelevated="filtro === f.id"
              :flat="filtro !== f.id"
              :color="filtro === f.id ? 'primary' : 'grey-7'"
              class="filter-btn"
              @click="filtro = f.id"
            />
          </div>
          <div class="live-indicator">
            <span class="pulse-dot"></span>
            hace {{ segundosDesdeUpdate }}s
          </div>
        </div>

        <div v-if="rindiendo().length > 0" class="acciones-bar">
          <div class="ab-info">
            <span class="ab-live-dot"></span>
            <span><strong>{{ rindiendo().length }}</strong> {{ rindiendo().length === 1 ? 'alumno rindiendo' : 'alumnos rindiendo' }}</span>
          </div>

          <div class="ab-botones">
            <q-btn
              flat dense no-caps
              color="primary"
              icon="add_alarm"
              label="+1min"
              class="btn-quick"
              @click="agregarATodos(60)"
            >
              <q-tooltip>Agregar 1 minuto a todos</q-tooltip>
            </q-btn>
            <q-btn
              flat dense no-caps
              color="primary"
              icon="schedule"
              label="+5min"
              class="btn-quick"
              @click="agregarATodos(300)"
            >
              <q-tooltip>Agregar 5 minutos a todos</q-tooltip>
            </q-btn>
            <q-btn
              flat dense no-caps
              color="primary"
              icon="schedule"
              label="+10min"
              class="btn-quick"
              @click="agregarATodos(600)"
            >
              <q-tooltip>Agregar 10 minutos a todos</q-tooltip>
            </q-btn>
            <q-btn
              unelevated dense no-caps
              color="negative"
              icon="lock"
              label="Forzar todos"
              class="btn-quick danger"
              @click="forzarTodos"
            >
              <q-tooltip>Forzar cierre de todas las rendiciones</q-tooltip>
            </q-btn>
          </div>
        </div>

        <div v-if="!alumnosFiltrados.length" class="empty-card">
          <q-icon name="group_off" size="52px" />
          <div class="empty-titulo">Sin alumnos en esta vista</div>
          <p>Probá con otro filtro o esperá que se conecten.</p>
        </div>

        <div v-else class="alumnos-grid">
          <div
            v-for="a in alumnosFiltrados"
            :key="a.rendicion_id"
            class="alumno-card"
            :class="{
              inactivo: estaInactivo(a),
              salidas: a.salidas_detectadas > 0,
              cerrada: a.estado !== 'en_progreso'
            }"
          >
            <div class="card-head">
              <q-avatar size="40px" class="avatar-alumno">
                {{ iniciales(a.alumno_nombre, a.alumno_apellido) }}
              </q-avatar>
              <div class="alumno-info">
                <div class="alumno-nombre">{{ a.alumno_nombre }} {{ a.alumno_apellido }}</div>
                <div class="alumno-usuario">{{ a.alumno_usuario }}</div>
              </div>
              <q-badge
                :class="['estado-badge', estadoClase(a.estado)]"
                :label="estadoTexto(a.estado)"
              />
            </div>

            <div class="stats-mini">
              <div class="stat-mini">
                <span class="sm-label">Pregunta</span>
                <span class="sm-value">{{ (a.pregunta_actual || 0) + 1 }}/{{ a.preguntas_totales || '?' }}</span>
              </div>
              <div class="stat-mini">
                <span class="sm-label">Respondidas</span>
                <span class="sm-value">{{ a.preguntas_respondidas || 0 }}/{{ a.preguntas_totales || '?' }}</span>
              </div>
              <div class="stat-mini" :class="{ alert: a.salidas_detectadas > 0 }">
                <span class="sm-label">Salidas</span>
                <span class="sm-value">{{ a.salidas_detectadas || 0 }}</span>
              </div>
              <div class="stat-mini" :class="{ alert: estaInactivo(a) }">
                <span class="sm-label">Inactivo</span>
                <span class="sm-value">{{ Math.floor((a.segundos_inactivo || 0) / 60) }}m</span>
              </div>
            </div>

            <div class="progress-bar">
              <div class="pb-track">
                <div
                  class="pb-fill"
                  :style="{ width: `${a.preguntas_totales ? ((a.preguntas_respondidas || 0) / a.preguntas_totales * 100) : 0}%` }"
                />
              </div>
              <span class="pb-time">⏱ {{ formatearTiempo(a.segundos_restantes) }}</span>
            </div>

            <div class="card-actions">
              <template v-if="a.estado === 'en_progreso'">
                <q-btn
                  round dense
                  outline
                  color="primary"
                  icon="add_alarm"
                  size="sm"
                  class="btn-mini"
                  @click="agregarTiempo(a.rendicion_id, 60)"
                >
                  <q-tooltip>+1 minuto</q-tooltip>
                </q-btn>
                <q-btn
                  round dense
                  outline
                  color="primary"
                  icon="schedule"
                  size="sm"
                  class="btn-mini"
                  @click="agregarTiempo(a.rendicion_id, 300)"
                >
                  <q-tooltip>+5 minutos</q-tooltip>
                </q-btn>
                <q-btn
                  round dense
                  outline
                  color="primary"
                  icon="hourglass_bottom"
                  size="sm"
                  class="btn-mini"
                  @click="agregarTiempo(a.rendicion_id, 600)"
                >
                  <q-tooltip>+10 minutos</q-tooltip>
                </q-btn>
                <q-btn
                  round dense
                  flat
                  color="amber-9"
                  icon="edit_calendar"
                  size="sm"
                  class="btn-mini"
                  @click="abrirModalTiempo(a)"
                >
                  <q-tooltip>Tiempo custom</q-tooltip>
                </q-btn>
                <q-btn
                  round dense
                  flat
                  color="info"
                  icon="history"
                  size="sm"
                  class="btn-mini"
                  @click="abrirEventos(a)"
                >
                  <q-tooltip>Ver eventos</q-tooltip>
                </q-btn>
                <q-btn
                  round dense
                  flat
                  color="negative"
                  icon="lock"
                  size="sm"
                  class="btn-mini"
                  @click="forzar(a.rendicion_id)"
                >
                  <q-tooltip>Forzar cierre</q-tooltip>
                </q-btn>
              </template>

              <template v-else>
                <q-btn
                  round dense
                  flat
                  color="info"
                  icon="history"
                  size="sm"
                  class="btn-mini"
                  @click="abrirEventos(a)"
                >
                  <q-tooltip>Ver eventos</q-tooltip>
                </q-btn>
                <span class="badge-cerrada">
                  <q-icon name="check_circle" size="14px" />
                  {{ estadoTexto(a.estado) }}
                </span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="tabActiva === 'resultados'" class="tab-resultados">

        <div v-if="cargandoResultados" class="loading-state">
          <q-spinner color="primary" size="40px" />
          <span>Cargando resultados…</span>
        </div>

        <template v-else-if="statsFormateadas">
          <div class="stats-big">
            <div class="stat-big-card primary">
              <div class="sb-label">Promedio</div>
              <div class="sb-value">{{ statsFormateadas.promedio }}</div>
            </div>
            <div class="stat-big-card">
              <div class="sb-label">Aprobados</div>
              <div class="sb-value">{{ statsFormateadas.aprobados }}/{{ statsFormateadas.corregidas }}</div>
              <div class="sb-sub">{{ statsFormateadas.tasaAprobacion }}%</div>
            </div>
            <div class="stat-big-card success">
              <div class="sb-label">Nota máxima</div>
              <div class="sb-value">{{ statsFormateadas.maxima }}</div>
            </div>
            <div class="stat-big-card danger">
              <div class="sb-label">Nota mínima</div>
              <div class="sb-value">{{ statsFormateadas.minima }}</div>
            </div>
            <div class="stat-big-card">
              <div class="sb-label">Tiempo promedio</div>
              <div class="sb-value small">{{ statsFormateadas.tiempoPromedio }}</div>
            </div>
            <div class="stat-big-card warning">
              <div class="sb-label">Salidas detectadas</div>
              <div class="sb-value">{{ statsFormateadas.salidas }}</div>
            </div>
          </div>

          <GraficoNotas :notas="notasParaChart" class="chart-section" />

          <q-card flat bordered class="tabla-card">
            <q-card-section class="tabla-head">
              <div class="section-title">
                <q-icon name="groups" size="20px" />
                <span>Detalle por alumno ({{ filas.length }})</span>
              </div>
              <q-input
                v-model="filtroResultados"
                outlined dense
                placeholder="Buscar alumno…"
                class="buscador"
                clearable
              >
                <template #prepend>
                  <q-icon name="search" size="18px" />
                </template>
              </q-input>
            </q-card-section>

            <q-separator />

            <q-markup-table flat separator="horizontal" class="tabla-alumnos">
              <thead>
                <tr>
                  <th class="col-alumno">Alumno</th>
                  <th class="col-nota">Nota</th>
                  <th class="col-tiempo">Tiempo</th>
                  <th class="col-resp">Respondidas</th>
                  <th class="col-salidas">Salidas</th>
                  <th class="col-cierre">Cierre</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="f in filasFiltradas" :key="f.rendicion_id">
                  <td class="col-alumno">
                    <div class="fila-alumno">
                      <q-avatar size="32px" class="avatar-mini">
                        {{ iniciales(f.alumno_nombre, f.alumno_apellido) }}
                      </q-avatar>
                      <div>
                        <div class="fa-nombre">{{ f.alumno_nombre }} {{ f.alumno_apellido }}</div>
                        <div class="fa-usuario">{{ f.alumno_usuario }}</div>
                      </div>
                    </div>
                  </td>
                  <td class="col-nota">
                    <q-badge
                      :color="notaColor(f.nota)"
                      text-color="white"
                      :label="f.nota != null ? Number(f.nota).toFixed(1) : '—'"
                      class="nota-badge"
                    />
                  </td>
                  <td class="col-tiempo">{{ formatearMinutos(f.tiempo_seg) }}</td>
                  <td class="col-resp">{{ f.preguntas_respondidas || 0 }}</td>
                  <td class="col-salidas">
                    <q-badge
                      v-if="f.salidas > 0"
                      color="negative"
                      text-color="white"
                      :label="f.salidas"
                    />
                    <span v-else class="text-muted">0</span>
                  </td>
                  <td class="col-cierre">
                    <span class="cierre-text">
                      {{ f.motivo_cierre || 'normal' }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!filasFiltradas.length">
                  <td colspan="6" class="tabla-empty">
                    <q-icon name="search_off" size="32px" />
                    Sin resultados para "{{ filtroResultados }}"
                  </td>
                </tr>
              </tbody>
            </q-markup-table>
          </q-card>

          <q-card v-if="dificultad.length" flat bordered class="dificultad-card">
            <q-card-section>
              <div class="section-title">
                <q-icon name="insights" size="20px" />
                <span>Dificultad real por pregunta ({{ dificultad.length }})</span>
              </div>

              <div class="dificultad-lista">
                <div
                  v-for="(p, i) in dificultad"
                  :key="p.pregunta_id"
                  class="dificultad-item"
                >
                  <div class="di-num">{{ i + 1 }}</div>
                  <div class="di-body">
                    <div class="di-pregunta">{{ p.pregunta }}</div>
                    <div class="di-meta">
                      <span class="di-tipo">{{ tipoLabel(p.tipo) }}</span>
                      <span class="sep">·</span>
                      <span>{{ p.correctas }}/{{ p.total_respuestas }} acertaron</span>
                    </div>
                  </div>
                  <div class="di-pct">
                    <q-badge
                      :color="dificultadColor(p.porcentaje_acierto)"
                      text-color="white"
                      :label="`${p.porcentaje_acierto}%`"
                      class="pct-badge"
                    />
                    <span class="di-dificultad">{{ dificultadTexto(p.porcentaje_acierto) }}</span>
                  </div>
                </div>
              </div>
            </q-card-section>
          </q-card>
        </template>
      </div>

    </div>

    <q-dialog v-model="modalTiempo" persistent>
      <q-card class="modal-tiempo">
        <q-card-section class="modal-head">
          <div class="mh-icon">
            <q-icon name="edit_calendar" size="28px" />
          </div>
          <div class="mh-text">
            <div class="mh-titulo">Agregar tiempo</div>
            <div class="mh-sub" v-if="alumnoSeleccionado">
              {{ alumnoSeleccionado.alumno_nombre }} {{ alumnoSeleccionado.alumno_apellido }}
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="modalTiempo = false" />
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-body">
          <q-input
            v-model.number="minutosCustom"
            type="number"
            outlined dense
            label="Minutos"
            min="1" max="120"
            autofocus
            class="input-minutos"
            @keyup.enter="confirmarTiempoCustom"
          >
            <template #prepend>
              <q-icon name="schedule" />
            </template>
          </q-input>

          <div class="quick-min">
            <q-btn
              v-for="m in [1, 5, 10, 15, 30]"
              :key="m"
              :label="`${m} min`"
              no-caps dense outline
              :color="minutosCustom === m ? 'primary' : 'grey-7'"
              class="btn-min"
              @click="minutosCustom = m"
            />
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="modal-actions">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="modalTiempo = false" />
          <q-btn unelevated no-caps color="primary" icon="check" label="Agregar"
                 @click="confirmarTiempoCustom" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="modalEventos">
      <q-card class="modal-eventos">
        <q-card-section class="modal-head">
          <div class="mh-icon info">
            <q-icon name="history" size="28px" />
          </div>
          <div class="mh-text">
            <div class="mh-titulo">Eventos del alumno</div>
            <div class="mh-sub" v-if="alumnoSeleccionado">
              {{ alumnoSeleccionado.alumno_nombre }} {{ alumnoSeleccionado.alumno_apellido }}
            </div>
          </div>
          <q-btn flat round dense icon="close" @click="modalEventos = false" />
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-body eventos-body">
          <div v-if="cargandoEventos" class="eventos-loading">
            <q-spinner color="primary" size="32px" />
          </div>

          <div v-else-if="!eventosAlumno.length" class="eventos-empty">
            <q-icon name="inbox" size="40px" />
            <p>Sin eventos registrados</p>
          </div>

          <div v-else class="timeline">
            <div
              v-for="ev in eventosAlumno"
              :key="ev.id"
              class="timeline-item"
              :class="{ 'tl-highlight': ev.tipo === 'salida_pagina' }"
            >
              <div class="tl-icon" :class="`tl-${colorEvento(ev.tipo)}`">
                <q-icon :name="iconoEvento(ev.tipo)" size="16px" />
              </div>
              <div class="tl-body">
                <div class="tl-header">
                  <span class="tl-hora">{{ horaEvento(ev.fecha) }}</span>
                  <span class="tl-tipo">{{ textoEvento(ev.tipo) }}</span>
                </div>
                <div v-if="ev.detalle" class="tl-detalle">{{ ev.detalle }}</div>
              </div>
            </div>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions align="right" class="modal-actions">
          <q-btn flat no-caps label="Cerrar" color="grey-7" @click="modalEventos = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<style scoped>
.control-page {
  background: var(--bg);
  min-height: calc(100vh - 68px);
}

.control-content {
  max-width: 1300px;
  margin: 0 auto;
  padding: 30px 34px 60px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
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
  font-size: clamp(20px, 2.5vw, 26px);
  font-weight: 750;
  letter-spacing: -0.8px;
  line-height: 1.15;
}

.heading-text p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.heading-text .sep { color: var(--border-strong); }
.heading-text .tiempo { color: var(--text-secondary); font-weight: 600; }

.heading-right {
  padding-top: 8px;
}

.badge-estado {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 5px 12px;
  border-radius: 8px;
}

.tabs-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 22px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-subtle);
}

.tab-btn {
  text-transform: none;
  font-weight: 700;
  border-radius: 10px;
  min-height: 42px;
  padding: 8px 20px;
  font-size: 13px;
}

.tab-badge {
  margin-left: 8px;
  font-size: 10px;
  font-weight: 800;
  min-width: 20px;
}

.pulse-badge {
  animation: pulse-badge 1.5s ease-in-out infinite;
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.1); }
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

.tab-en-vivo {
  animation: fade-in 0.2s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.kpis-live {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-bottom: 22px;
}

.kpi-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
}

.kpi-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: var(--primary-soft);
  color: var(--primary);
  flex-shrink: 0;
}

.kpi-icon.live   { background: rgba(46, 125, 50, 0.12); color: var(--success); }
.kpi-icon.warn   { background: rgba(183, 114, 30, 0.12); color: var(--warning); }
.kpi-icon.danger { background: rgba(198, 40, 40, 0.12); color: var(--error); }

.kpi-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.kpi-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.kpi-value {
  margin-top: 3px;
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.8px;
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

.filter-btn {
  text-transform: none;
  font-weight: 600;
  border-radius: 9px;
  font-size: 12px;
  min-height: 34px;
  padding: 5px 14px;
}

.live-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 600;
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: pulso-live 1.5s ease-in-out infinite;
}

@keyframes pulso-live {
  0%,100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  50%     { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
}

.alumnos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 14px;
}

.alumno-card {
  background: var(--bg-elevated);
  border: 1.5px solid var(--border);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.18s, border-color 0.18s;
}

.alumno-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
}

.alumno-card.inactivo {
  border-color: var(--warning);
  background: linear-gradient(180deg, rgba(183, 114, 30, 0.05), var(--bg-elevated));
}

.alumno-card.salidas {
  border-color: var(--error);
  background: linear-gradient(180deg, rgba(198, 40, 40, 0.05), var(--bg-elevated));
}

.alumno-card.cerrada { opacity: 0.7; }

.card-head {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-alumno {
  color: white;
  background: var(--primary);
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.alumno-info {
  flex: 1;
  min-width: 0;
}

.alumno-nombre {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alumno-usuario {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
}

.estado-badge {
  font-size: 9.5px;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 6px;
  flex-shrink: 0;
}

.estado-badge.live   { background: rgba(46, 125, 50, 0.15);  color: var(--success); }
.estado-badge.sent   { background: var(--primary-soft);      color: var(--primary); }
.estado-badge.graded { background: rgba(30, 91, 138, 0.12);  color: var(--info); }

.stats-mini {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}

.stat-mini {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 7px 4px;
  background: var(--bg-hover);
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
}

.stat-mini.alert {
  background: rgba(198, 40, 40, 0.08);
  border-color: var(--error);
}

.sm-label {
  font-size: 9.5px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 700;
  margin-bottom: 3px;
}

.sm-value {
  font-size: 13px;
  font-weight: 800;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

.stat-mini.alert .sm-value { color: var(--error); }

.progress-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pb-track {
  flex: 1;
  height: 5px;
  background: var(--bg-sunken);
  border-radius: 999px;
  overflow: hidden;
}

.pb-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--primary-hover));
  transition: width 0.4s ease;
}

.pb-time {
  font-size: 11.5px;
  font-weight: 800;
  color: var(--primary);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.card-actions {
  display: flex;
  gap: 4px;
  padding-top: 4px;
  border-top: 1px dashed var(--border-subtle);
}

.card-actions .q-btn {
  flex: 1;
  text-transform: none;
  font-weight: 600;
  font-size: 11.5px;
  border-radius: 8px;
}

.tab-resultados {
  animation: fade-in 0.2s ease-out;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.stats-big {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
}

.stat-big-card {
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: center;
}

.stat-big-card.primary { border-color: var(--primary); background: var(--primary-soft); }
.stat-big-card.success { border-color: var(--success); }
.stat-big-card.danger  { border-color: var(--error); }
.stat-big-card.warning { border-color: var(--warning); }

.sb-label {
  font-size: 10.5px;
  color: var(--text-muted);
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.sb-value {
  margin-top: 6px;
  font-size: 24px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -1px;
  line-height: 1;
}

.stat-big-card.primary .sb-value { color: var(--primary); }
.stat-big-card.success .sb-value { color: var(--success); }
.stat-big-card.danger  .sb-value { color: var(--error); }

.sb-value.small { font-size: 18px; }

.sb-sub {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
  font-weight: 700;
}

.tabla-card,
.dificultad-card {
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 14px;
}

.tabla-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px 20px;
  flex-wrap: wrap;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
}

.section-title .q-icon { color: var(--primary); }

.buscador {
  min-width: 240px;
  max-width: 300px;
}

.buscador :deep(.q-field__control) {
  border-radius: 10px;
}

.tabla-alumnos {
  background: transparent;
}

.tabla-alumnos thead th {
  font-size: 10.5px;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 12px 16px;
  background: var(--bg-hover);
  border-bottom: 1px solid var(--border);
}

.tabla-alumnos tbody td {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text);
  font-size: 12.5px;
}

.tabla-alumnos tbody tr:hover {
  background: var(--bg-hover);
}

.col-alumno { min-width: 220px; }
.col-nota { text-align: center; width: 80px; }
.col-tiempo { text-align: center; width: 100px; color: var(--text-muted); }
.col-resp { text-align: center; width: 100px; }
.col-salidas { text-align: center; width: 90px; }
.col-cierre { text-align: center; width: 120px; }

.fila-alumno {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-mini {
  color: white;
  background: var(--primary);
  font-weight: 700;
  font-size: 11px;
  flex-shrink: 0;
}

.fa-nombre {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--text);
}

.fa-usuario {
  margin-top: 1px;
  font-size: 10.5px;
  color: var(--text-muted);
}

.nota-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  min-width: 42px;
}

.text-muted {
  color: var(--text-muted);
  font-size: 11.5px;
}

.cierre-text {
  font-size: 10.5px;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  padding: 2px 6px;
  background: var(--bg-hover);
  border-radius: 4px;
}

.tabla-empty {
  text-align: center;
  padding: 40px 20px !important;
  color: var(--text-muted);
  font-size: 12.5px;
}

.tabla-empty .q-icon {
  display: block;
  margin: 0 auto 8px;
  color: var(--text-disabled);
}

.dificultad-lista {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
}

.dificultad-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
}

.di-num {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  background: var(--primary);
  color: white;
  border-radius: 8px;
  font-weight: 800;
  font-size: 12px;
  flex-shrink: 0;
}

.di-body {
  flex: 1;
  min-width: 0;
}

.di-pregunta {
  font-size: 12.5px;
  color: var(--text);
  font-weight: 600;
  line-height: 1.35;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
}

.di-meta {
  margin-top: 3px;
  font-size: 11px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}

.di-meta .sep { color: var(--border-strong); }

.di-tipo {
  padding: 1px 6px;
  background: var(--primary-soft);
  color: var(--primary);
  border-radius: 4px;
  font-size: 9.5px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.di-pct {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 80px;
}

.pct-badge {
  font-size: 12px;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  min-width: 52px;
  text-align: center;
}

.di-dificultad {
  font-size: 10px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 20px;
  background: var(--bg-elevated);
  border: 1px dashed var(--border);
  border-radius: 14px;
  text-align: center;
  grid-column: 1 / -1;
}

.empty-card > .q-icon {
  color: var(--text-disabled);
  margin-bottom: 6px;
}

.empty-titulo {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.empty-card p {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted);
}

@media (max-width: 1100px) {
  .stats-big {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 900px) {
  .kpis-live {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 700px) {
  .control-content {
    padding: 20px 16px 40px;
  }

  .page-heading {
    flex-direction: column;
  }

  .kpis-live {
    grid-template-columns: 1fr;
  }

  .stats-big {
    grid-template-columns: repeat(2, 1fr);
  }

  .tabla-head {
    flex-direction: column;
    align-items: stretch;
  }

  .buscador {
    min-width: 0;
    max-width: 100%;
  }

  .alumnos-grid {
    grid-template-columns: 1fr;
  }

  .tabla-alumnos {
    font-size: 11px;
  }

  .col-tiempo, .col-resp, .col-cierre {
    display: none;
  }

  .dificultad-item {
    flex-wrap: wrap;
  }
}

.acciones-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--bg-hover) 100%);
  border: 1.5px solid var(--primary);
  border-radius: 12px;
  flex-wrap: wrap;
  animation: slide-down 0.3s ease-out;
}

@keyframes slide-down {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ab-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text);
}

.ab-info strong {
  color: var(--primary);
  font-weight: 800;
  font-size: 15px;
}

.ab-live-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #10b981;
  animation: pulso-verde 1.5s ease-in-out infinite;
}

@keyframes pulso-verde {
  0%,100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
  50%     { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
}

.ab-botones {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.btn-quick {
  text-transform: none;
  font-weight: 700;
  font-size: 12px;
  border-radius: 8px;
  min-height: 34px;
  padding: 4px 12px;
  background: var(--bg-elevated);
  transition: all 0.15s;
}

.btn-quick:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

.btn-quick.danger {
  box-shadow: 0 4px 12px rgba(198, 40, 40, 0.2);
}

.card-actions {
  display: flex;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-subtle);
  align-items: center;
  flex-wrap: wrap;
}

.btn-mini {
  width: 34px;
  height: 34px;
  min-height: 34px !important;
  border-radius: 50% !important;
  transition: all 0.15s;
}

.btn-mini:hover {
  transform: scale(1.1);
}

.badge-cerrada {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
}

.badge-cerrada .q-icon {
  color: var(--success);
}

.modal-tiempo,
.modal-eventos {
  width: 420px;
  max-width: 95vw;
  border-radius: 16px;
  background: var(--bg-elevated);
  overflow: hidden;
}

.modal-eventos {
  width: 520px;
}

.modal-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(135deg, var(--bg-hover), var(--primary-soft));
}

.mh-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(114, 47, 55, 0.25);
}

.mh-icon.info {
  background: #1e5b8a;
  box-shadow: 0 6px 16px rgba(30, 91, 138, 0.25);
}

.mh-text {
  flex: 1;
  min-width: 0;
}

.mh-titulo {
  font-size: 15px;
  font-weight: 750;
  color: var(--text);
  letter-spacing: -0.2px;
}

.mh-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-muted);
}

.modal-body {
  padding: 20px;
}

.input-minutos :deep(.q-field__control) {
  border-radius: 10px;
}

.quick-min {
  display: flex;
  gap: 6px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.btn-min {
  text-transform: none;
  font-weight: 700;
  font-size: 12px;
  border-radius: 8px;
  min-width: 60px;
}

.modal-actions {
  padding: 12px 16px 14px;
  background: var(--bg-hover);
}

.modal-actions .q-btn {
  text-transform: none;
  font-weight: 600;
  border-radius: 8px;
}

.eventos-body {
  max-height: 480px;
  overflow-y: auto;
  padding: 16px 20px;
}

.eventos-loading,
.eventos-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 50px 20px;
  color: var(--text-muted);
  text-align: center;
}

.eventos-empty .q-icon {
  color: var(--text-disabled);
}

.eventos-empty p {
  margin: 0;
  font-size: 13px;
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.timeline-item {
  display: flex;
  gap: 14px;
  padding: 10px 0;
  position: relative;
}

.timeline-item:not(:last-child)::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 42px;
  bottom: 0;
  width: 2px;
  background: var(--border-subtle);
}

.tl-icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
  z-index: 1;
  background: var(--bg-hover);
  border: 2px solid var(--border);
  color: var(--text-muted);
}

.tl-icon.tl-primary    { background: rgba(114, 47, 55, 0.12);  border-color: var(--primary);   color: var(--primary); }
.tl-icon.tl-info       { background: rgba(30, 91, 138, 0.12);  border-color: #1e5b8a;          color: #1e5b8a; }
.tl-icon.tl-negative   { background: rgba(198, 40, 40, 0.15);  border-color: var(--error);     color: var(--error); }
.tl-icon.tl-warning    { background: rgba(183, 114, 30, 0.15); border-color: var(--warning);   color: var(--warning); }
.tl-icon.tl-positive   { background: rgba(46, 125, 50, 0.15);  border-color: var(--success);   color: var(--success); }
.tl-icon.tl-grey-7     { background: var(--bg-hover);           border-color: var(--border); }
.tl-icon.tl-grey-5     { background: var(--bg-hover);           border-color: var(--border); }

.tl-body {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}

.tl-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
}

.tl-hora {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted);
  letter-spacing: 0.03em;
}

.tl-tipo {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.tl-detalle {
  margin-top: 4px;
  font-size: 11.5px;
  color: var(--text-muted);
  line-height: 1.4;
  word-break: break-word;
}

.timeline-item.tl-highlight {
  background: rgba(198, 40, 40, 0.05);
  padding-left: 8px;
  padding-right: 8px;
  margin-left: -8px;
  margin-right: -8px;
  border-radius: 8px;
}

.timeline-item.tl-highlight .tl-tipo {
  color: var(--error);
  font-weight: 800;
}

@media (max-width: 700px) {
  .acciones-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .ab-botones {
    justify-content: stretch;
  }

  .btn-quick {
    flex: 1;
  }

  .modal-tiempo,
  .modal-eventos {
    width: 100vw;
    max-width: 100vw;
    border-radius: 0;
    height: 100vh;
  }

  .modal-eventos {
    height: auto;
    max-height: 90vh;
  }

  .eventos-body {
    max-height: calc(90vh - 200px);
  }
}
</style>
