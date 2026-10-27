<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import * as alumnoApi from '../../api/alumno.api.js';

const router = useRouter();

const cargando = ref(true);
const mensajeError = ref('');
const evaluaciones = ref([]);
const filtro = ref('en_curso');
const ahora = ref(Date.now());
let temporizador = null;

const filtradas = computed(() => {
  const listaEvaluaciones = evaluaciones.value;
  switch (filtro.value) {
    case 'disponibles':
      return listaEvaluaciones.filter(e => estaDisponible(e) && !e.rendicion_id);
    case 'en_curso':
      return listaEvaluaciones.filter(e => e.estado_rendicion === 'en_progreso');
    case 'rendidas':
      return listaEvaluaciones.filter(e => e.rendicion_id && e.estado_rendicion !== 'en_progreso');
    case 'cerradas':
      return listaEvaluaciones.filter(e => new Date(e.fecha_cierre) < new Date(ahora.value));
    default:
      return listaEvaluaciones;
  }
});

const contadores = computed(() => ({
  todas: evaluaciones.value.length,
  disponibles: evaluaciones.value.filter(e => estaDisponible(e) && !e.rendicion_id).length,
  en_curso: evaluaciones.value.filter(e => e.estado_rendicion === 'en_progreso').length,
  rendidas: evaluaciones.value.filter(e => e.rendicion_id && e.estado_rendicion !== 'en_progreso').length,
  cerradas: evaluaciones.value.filter(e => new Date(e.fecha_cierre) < new Date(ahora.value)).length,
}));

function estaDisponible(e) {
  const ahoraMs = new Date(ahora.value);
  return new Date(e.fecha_apertura) <= ahoraMs && new Date(e.fecha_cierre) >= ahoraMs;
}

function formatearFechaCorta(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  return fecha.toLocaleDateString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function formatearDuracion(min) {
  if (!min) return '—';
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

function formatearSegundos(seg) {
  if (seg == null) return '—';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function nivelDeEvaluacion(e) {
  if (e.estado_rendicion === 'en_progreso') {
    if (e.pendiente_autorizacion) {
      return { icon: 'lock_clock', text: 'Esperando autorización', color: 'warning', tipo: 'autorizacion' };
    }
    return { icon: 'play_circle', text: 'En curso', color: 'info', tipo: 'en_curso' };
  }

  if (e.rendicion_id && (e.estado_rendicion === 'enviada') && e.nota == null) {
    let texto = 'Esperando corrección';
    if (e.tipo_correccion === 'ia') texto = 'Corrección IA en proceso (rápida)';
    else if (e.tipo_correccion === 'mixta') texto = 'Esperando revisión del docente';
    else if (e.tipo_correccion === 'manual') texto = 'Esperando corrección manual';

    return { icon: 'hourglass_top', text: texto, color: 'info', tipo: 'enviada' };
  }

  if (e.rendicion_id && e.nota != null) {
    const nota = Number(e.nota);
    const max = Number(e.nota_maxima) || 10;
    const aprobado = nota >= (max * 0.6);
    return {
      icon: aprobado ? 'check_circle' : 'cancel',
      text: 'Corregida',
      color: aprobado ? 'positive' : 'negative',
      tipo: 'corregida',
      nota, max, aprobado,
    };
  }

  if (estaDisponible(e)) {
    return { icon: 'play_arrow', text: 'Disponible', color: 'primary', tipo: 'disponible' };
  }

  if (new Date(e.fecha_apertura) > new Date(ahora.value)) {
    return { icon: 'schedule', text: 'Próximamente', color: 'grey-6', tipo: 'proximamente' };
  }

  return { icon: 'lock', text: 'Cerrada', color: 'grey-6', tipo: 'cerrada' };
}

function botonDeEvaluacion(e) {
  const nivel = nivelDeEvaluacion(e);

  if (nivel.tipo === 'en_curso') {
    return { label: 'Continuar examen', icon: 'play_circle', color: 'info', clickable: true, solid: true };
  }
  if (nivel.tipo === 'disponible') {
    return { label: 'Rendir examen', icon: 'rocket_launch', color: 'positive', clickable: true, solid: true };
  }
  if (nivel.tipo === 'autorizacion') {
    return { label: 'Esperando autorización', icon: 'lock_clock', color: 'warning', clickable: false, solid: false };
  }
  if (nivel.tipo === 'corregida') {
    const aprobado = nivel.aprobado === true;
    return {
      label: aprobado ? 'Ver resultado' : 'Ver detalle',
      icon: aprobado ? 'verified' : 'info',
      color: aprobado ? 'positive' : 'negative',
      clickable: false,
      solid: false,
    };
  }
  if (nivel.tipo === 'enviada') {
    return { label: 'Enviada — esperando corrección', icon: 'hourglass_top', color: 'info', clickable: false, solid: false };
  }
  if (nivel.tipo === 'proximamente') {
    return { label: 'Próximamente', icon: 'event', color: 'primary', clickable: false, solid: false };
  }
  if (nivel.tipo === 'cerrada') {
    return { label: 'Cerrada', icon: 'lock', color: 'grey-7', clickable: false, solid: false };
  }
  return { label: 'No disponible', icon: 'block', color: 'grey-7', clickable: false, solid: false };
}

function rendirExamen(id) {
  router.push(`/alumno/evaluaciones/${id}/rendir`);
}

async function cargarEvaluaciones() {
  cargando.value = true;
  mensajeError.value = '';
  try {
    evaluaciones.value = await alumnoApi.getMisEvaluaciones();
  } catch (e) {
    mensajeError.value = 'No se pudieron cargar las evaluaciones';
    console.error(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargarEvaluaciones);
onMounted(() => {
  temporizador = setInterval(() => { ahora.value = Date.now(); }, 30000);
});
onBeforeUnmount(() => {
  if (temporizador) clearInterval(temporizador);
});
</script>

<template>
  <q-page class="q-pa-md eval-page">
    <div class="page-header q-mb-lg">
      <div class="page-header-icon">
        <q-icon name="quiz" size="28px" />
      </div>
      <div>
        <div class="page-title">Mis Evaluaciones</div>
        <div class="page-sub">
          {{ contadores.disponibles }} disponible(s)
          <span v-if="contadores.en_curso"> · {{ contadores.en_curso }} en curso</span>
          <span v-if="contadores.rendidas"> · {{ contadores.rendidas }} rendida(s)</span>
        </div>
      </div>
    </div>

    <div class="filtros q-mb-md">
      <button
        v-for="f in ['en_curso', 'disponibles', 'rendidas', 'cerradas', 'todas']" :key="f"
        class="chip-filtro"
        :class="{ activo: filtro === f }"
        @click="filtro = f"
      >
        {{ f.charAt(0).toUpperCase() + f.slice(1).replace('_', ' ') }}
        <span class="chip-count">{{ contadores[f] || 0 }}</span>
      </button>
    </div>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <div v-if="mensajeError" class="text-negative q-mb-md">{{ mensajeError }}</div>

    <q-card v-if="!cargando && !error && !filtradas.length" flat bordered class="empty-card">
      <q-card-section class="text-center text-grey-7 q-pa-xl">
        <q-icon name="quiz" size="56px" class="q-mb-sm" />
        <div>No hay evaluaciones para mostrar</div>
      </q-card-section>
    </q-card>

    <div v-else class="row q-col-gutter-md">
      <div v-for="e in filtradas" :key="e.id" class="col-12 col-md-6 col-lg-4">
        <q-card flat bordered class="eval-card">

          <q-card-section class="eval-card-header">
            <div class="row items-center justify-between">
              <q-badge :color="nivelDeEvaluacion(e).color" class="eval-badge">
                <q-icon :name="nivelDeEvaluacion(e).icon" size="13px" class="q-mr-xs" />
                {{ nivelDeEvaluacion(e).text }}
              </q-badge>
              <span class="eval-tipo">{{ e.tipo }}</span>
            </div>
          </q-card-section>

          <q-card-section class="eval-card-titulo">
            <div class="eval-titulo">{{ e.titulo }}</div>
            <div class="eval-codigo-row" v-if="e.codigo_publico || e.modelo">
              <q-badge v-if="e.codigo_publico" outline color="primary" class="codigo-badge">
                <q-icon name="qr_code" size="11px" class="q-mr-xs" />
                {{ e.codigo_publico }}
              </q-badge>

            </div>
            <div class="eval-materia">
              {{ e.materia_nombre }}
              <span v-if="e.profesor_nombre"> · {{ e.profesor_nombre }} {{ e.profesor_apellido }}</span>
            </div>
          </q-card-section>

          <q-card-section class="eval-card-info">

            <div v-if="nivelDeEvaluacion(e).tipo === 'corregida'" class="nota-box" :class="nivelDeEvaluacion(e).aprobado ? 'aprobado' : 'reprobado'">
              <div class="nota-label">Tu nota</div>
              <div class="nota-numero">
                {{ Number(e.nota).toFixed(2) }}
                <span class="nota-max">/ {{ Number(e.nota_maxima).toFixed(0) }}</span>
              </div>
              <div class="nota-intentos">
                Intento {{ e.max_intento }}/{{ e.intentos_permitidos }}
              </div>
            </div>

            <div v-else-if="nivelDeEvaluacion(e).tipo === 'en_curso'" class="en-curso-box">
              <div class="timer-label">Tiempo restante</div>
              <div class="timer-valor" :class="{ 'timer-urgente': e.tiempo_restante_segundos < 300 }">
                {{ formatearSegundos(e.tiempo_restante_segundos) }}
              </div>
              <div class="timer-intentos">
                Intento {{ e.max_intento }}/{{ e.intentos_permitidos }}
              </div>
            </div>

            <div v-else-if="nivelDeEvaluacion(e).tipo === 'autorizacion'" class="autorizacion-box">
              <q-icon name="lock_clock" size="32px" color="warning" />
              <div class="texto">El docente debe autorizar tu continuidad. Volvé a revisar en unos minutos.</div>
            </div>

            <div v-else-if="nivelDeEvaluacion(e).tipo === 'disponible'" class="disponible-box">
              <div class="row q-col-gutter-sm">
                <div class="col-6">
                  <div class="mini-stat">
                    <div class="mini-stat-label">Nota total</div>
                    <div class="mini-stat-valor">{{ Number(e.nota_maxima).toFixed(0) }}</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="mini-stat">
                    <div class="mini-stat-label">Duración</div>
                    <div class="mini-stat-valor">{{ formatearDuracion(e.duracion_minutos) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="nivelDeEvaluacion(e).tipo === 'enviada'" class="enviada-box">
              <q-icon name="hourglass_top" size="28px" color="info" />
              <div class="texto">Tu examen fue enviado. Esperando que el docente lo corrija.</div>
            </div>

            <div v-else class="fechas-box">
              <div class="fecha-row">
                <q-icon name="event_available" size="16px" color="primary" />
                <span>Abre: {{ formatearFechaCorta(e.fecha_apertura) }}</span>
              </div>
              <div class="fecha-row">
                <q-icon name="event_busy" size="16px" color="primary" />
                <span>Cierra: {{ formatearFechaCorta(e.fecha_cierre) }}</span>
              </div>
            </div>

            <div v-if="nivelDeEvaluacion(e).tipo === 'disponible'" class="fechas-inline q-mt-sm">
              Cierra {{ formatearFechaCorta(e.fecha_cierre) }}
            </div>

          </q-card-section>

          <q-separator />

          <q-card-actions class="eval-actions">
            <q-btn
              v-if="botonDeEvaluacion(e).clickable"
              :color="botonDeEvaluacion(e).color"
              unelevated
              rounded
              no-caps
              :icon="botonDeEvaluacion(e).icon"
              :label="botonDeEvaluacion(e).label"
              class="full-width btn-eval btn-eval--solid"
              @click="rendirExamen(e.id)"
            />
            <q-btn
              v-else
              :color="botonDeEvaluacion(e).color"
              outline
              rounded
              no-caps
              :icon="botonDeEvaluacion(e).icon"
              :label="botonDeEvaluacion(e).label"
              class="full-width btn-eval btn-eval--outline"
              disable
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.eval-page { max-width: 1280px; margin: 0 auto; }

.page-header {
  display: flex;
  align-items: center;
  gap: 14px;
}
.page-header-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--primary-soft);
  color: var(--primary);
}
.page-title {
  font-size: 22px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.page-sub {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-muted);
}

.filtros {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.chip-filtro {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 100px;
  font: inherit;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s;
}
.chip-filtro:hover { border-color: var(--primary); }
.chip-filtro.activo {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.chip-count {
  padding: 1px 7px;
  border-radius: 100px;
  background: var(--bg-hover);
  font-size: 10px;
  font-weight: 700;
}
.chip-filtro.activo .chip-count {
  background: rgba(255, 255, 255, 0.25);
}

.empty-card { border-radius: 16px; }

.eval-card {
  border-radius: 16px;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
}
.eval-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -12px rgba(114, 47, 55, 0.25);
}

.eval-card-header {
  padding: 14px 16px 0 16px;
}
.eval-badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
}
.eval-tipo {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  color: var(--text-muted);
}

.eval-card-titulo { padding: 8px 16px; }
.eval-titulo {
  font-size: 15px;
  font-weight: 800;
  color: var(--text);
  line-height: 1.3;
  letter-spacing: -0.01em;
}
.eval-materia {
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}

.eval-card-info { padding: 8px 16px 16px 16px; flex: 1; }

.nota-box {
  padding: 14px;
  border-radius: 12px;
  text-align: center;
}
.nota-box.aprobado { background: rgba(46, 125, 50, 0.1); border: 1px solid rgba(46, 125, 50, 0.3); }
.nota-box.reprobado { background: rgba(198, 40, 40, 0.1); border: 1px solid rgba(198, 40, 40, 0.3); }
.nota-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.nota-numero {
  font-size: 40px;
  font-weight: 900;
  line-height: 1;
  margin: 4px 0;
  font-variant-numeric: tabular-nums;
}
.nota-box.aprobado .nota-numero { color: #2e7d32; }
.nota-box.reprobado .nota-numero { color: #c62828; }
.nota-max {
  font-size: 16px;
  opacity: 0.6;
  font-weight: 600;
}
.nota-intentos {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.en-curso-box {
  padding: 14px;
  border-radius: 12px;
  background: rgba(33, 150, 243, 0.08);
  border: 1px solid rgba(33, 150, 243, 0.25);
  text-align: center;
}
.timer-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.timer-valor {
  font-size: 34px;
  font-weight: 900;
  color: #1565c0;
  line-height: 1;
  margin: 4px 0;
  font-variant-numeric: tabular-nums;
}
.timer-valor.timer-urgente {
  color: #c62828;
  animation: pulso-soft 1.2s ease-in-out infinite;
}
@keyframes pulso-soft {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
.timer-intentos {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.autorizacion-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 12px;
}
.autorizacion-box .texto {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.disponible-box .mini-stat {
  padding: 10px;
  background: var(--bg-hover);
  border-radius: 10px;
  text-align: center;
}
.mini-stat-label {
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
.mini-stat-valor {
  font-size: 18px;
  font-weight: 800;
  color: var(--text);
  margin-top: 2px;
}

.enviada-box {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(33, 150, 243, 0.08);
  border: 1px solid rgba(33, 150, 243, 0.2);
  border-radius: 12px;
}
.enviada-box .texto {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.fechas-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 0;
}
.fecha-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.fechas-inline {
  font-size: 11px;
  color: var(--text-muted);
  text-align: center;
}

.eval-actions { padding: 12px 16px; }

.eval-codigo-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.codigo-badge {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 10px;
  font-weight: 700;
}

.eval-card {
  border-radius: 18px !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03) !important;
  transition: transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1), box-shadow 0.3s, border-color 0.2s !important;
}
.eval-card:hover {
  border-color: rgba(74, 7, 18, 0.15) !important;
  transform: translateY(-3px) !important;
  box-shadow: 0 12px 28px -10px rgba(74, 7, 18, 0.18), 0 3px 8px rgba(0, 0, 0, 0.04) !important;
}

.eval-actions { padding: 14px 16px 16px !important; }

.btn-eval {
  font-weight: 600 !important;
  letter-spacing: -0.005em !important;
  text-transform: none !important;
  height: 44px !important;
  border-radius: 12px !important;
  font-size: 13.5px !important;
}
.btn-eval .q-icon { font-size: 20px !important; }
.btn-eval--solid { box-shadow: 0 4px 12px -4px currentColor !important; }
.btn-eval--outline { opacity: 0.85; }
</style>
