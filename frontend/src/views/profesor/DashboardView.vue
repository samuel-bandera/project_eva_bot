<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.js';
import * as profApi from '../../api/profesor.api.js';

const auth = useAuthStore();
const router = useRouter();

const cargando = ref(true);
const materias = ref([]);
const evaluaciones = ref([]);
const solicitudes = ref([]);
const comunicados = ref([]);

const totalMaterias = computed(() => materias.value.length);
const totalEvaluaciones = computed(() => evaluaciones.value.filter(e =>
  ['publicada', 'abierta'].includes(e.estado)
).length);
const totalSolicitudes = computed(() => solicitudes.value.length);
const totalComunicados = computed(() => comunicados.value.filter(c => !c.confirmado).length);

const saludo = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
});

const nombrePila = computed(() => auth.user?.nombre || 'docente');

const evaluacionesProximas = computed(() =>
  evaluaciones.value
    .filter(e => ['publicada', 'abierta'].includes(e.estado))
    .sort((a, b) => new Date(a.fecha_cierre) - new Date(b.fecha_cierre))
    .slice(0, 4)
);

function iniciales(nombre, apellido) {
  return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase();
}

function formatearFecha(iso) {
  if (!iso) return '—';
  const fecha = new Date(iso);
  const ahora = new Date();
  const diff = Math.floor((fecha - ahora) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff > 0 && diff < 7) return `En ${diff} días`;
  return fecha.toLocaleDateString('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function cargarDatos() {
  cargando.value = true;
  try {
    const [listaMaterias, listaEvaluaciones, listaSolicitudes, listaComunicados] = await Promise.all([
      profApi.getMisMaterias().catch(() => []),
      profApi.getMisEvaluaciones().catch(() => []),
      profApi.getSolicitudesPendientes().catch(() => []),
      profApi.getCartelera().catch(() => []),
    ]);
    materias.value = listaMaterias || [];
    evaluaciones.value = listaEvaluaciones || [];
    solicitudes.value = listaSolicitudes || [];
    comunicados.value = listaComunicados || [];
  } catch (err) {
    console.error(err);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargarDatos);
</script>

<template>
  <q-page class="q-pa-md dash-page">
    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <div class="hero-card q-mb-lg">
      <div class="hero-inner">
        <div class="hero-badge">{{ saludo }}</div>
        <h1 class="hero-title">Hola, {{ nombrePila }}</h1>
        <p class="hero-sub">Panel docente · EvalBot</p>
      </div>
      <q-icon name="school" size="140px" class="hero-icon" />
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat class="kpi-card cursor-pointer" @click="router.push('/docente/materias')">
          <q-card-section>
            <div class="kpi-row">
              <div class="kpi-icon kpi-icon-primary"><q-icon name="menu_book" size="24px" /></div>
              <div>
                <div class="kpi-num">{{ totalMaterias }}</div>
                <div class="kpi-label">Materias</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat class="kpi-card cursor-pointer" @click="router.push('/docente/evaluaciones')">
          <q-card-section>
            <div class="kpi-row">
              <div class="kpi-icon kpi-icon-info"><q-icon name="quiz" size="24px" /></div>
              <div>
                <div class="kpi-num">{{ totalEvaluaciones }}</div>
                <div class="kpi-label">Evaluaciones activas</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat class="kpi-card cursor-pointer" @click="router.push('/docente/materias')">
          <q-card-section>
            <div class="kpi-row">
              <div class="kpi-icon kpi-icon-warning"><q-icon name="assignment_ind" size="24px" /></div>
              <div>
                <div class="kpi-num">{{ totalSolicitudes }}</div>
                <div class="kpi-label">Solicitudes</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat class="kpi-card cursor-pointer" @click="router.push('/docente/comunicados')">
          <q-card-section>
            <div class="kpi-row">
              <div class="kpi-icon kpi-icon-warn"><q-icon name="campaign" size="24px" /></div>
              <div>
                <div class="kpi-num">{{ totalComunicados }}</div>
                <div class="kpi-label">Comunicados</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat class="panel fit">
          <q-card-section class="panel-head">
            <div class="panel-title">Próximas a cerrar</div>
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/docente/evaluaciones" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !evaluacionesProximas.length" class="text-center q-pa-lg empty-panel">
            <q-icon name="event_available" size="36px" class="q-mb-sm" />
            <div class="text-caption">Sin evaluaciones próximas</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="evaluacion in evaluacionesProximas" :key="evaluacion.id" clickable @click="router.push('/docente/evaluaciones')">
              <q-item-section avatar>
                <div class="eval-avatar">
                  <q-icon name="quiz" size="20px" />
                </div>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ evaluacion.titulo }}</q-item-label>
                <q-item-label caption>{{ evaluacion.materia_nombre || '—' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="eval-date">{{ formatearFecha(evaluacion.fecha_cierre) }}</div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat class="panel fit">
          <q-card-section class="panel-head">
            <div class="panel-title">Solicitudes de matrícula</div>
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/docente/materias" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !solicitudes.length" class="text-center q-pa-lg empty-panel">
            <q-icon name="assignment_turned_in" size="36px" color="positive" class="q-mb-sm" />
            <div class="text-caption">Sin solicitudes pendientes</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="solicitud in solicitudes.slice(0, 4)" :key="solicitud.id">
              <q-item-section avatar>
                <q-avatar size="36px" class="avatar-sol">
                  {{ iniciales(solicitud.alumno_nombre, solicitud.alumno_apellido) }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ solicitud.alumno_nombre }} {{ solicitud.alumno_apellido }}</q-item-label>
                <q-item-label caption>{{ solicitud.materia_nombre || 'Materia' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="warning" label="pendiente" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat class="panel fit">
          <q-card-section class="panel-head">
            <div class="panel-title">Mis materias</div>
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/docente/materias" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !materias.length" class="text-center q-pa-lg empty-panel">
            <q-icon name="menu_book" size="36px" class="q-mb-sm" />
            <div class="text-caption">Sin materias asignadas</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="materia in materias.slice(0, 4)" :key="materia.id" clickable @click="router.push(`/docente/materias/${materia.id}`)">
              <q-item-section avatar>
                <div class="mat-avatar" :style="{ background: (materia.color || 'var(--primary-hover)') + '22', color: materia.color || 'var(--primary-hover)' }">
                  <q-icon name="menu_book" size="18px" />
                </div>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ materia.nombre }}</q-item-label>
                <q-item-label caption>{{ materia.codigo || '—' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-icon name="chevron_right" size="20px" class="text-grey-5" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat class="panel fit">
          <q-card-section class="panel-head">
            <div class="panel-title">Comunicados recientes</div>
            <q-btn flat dense no-caps color="primary" label="Ver todos" to="/docente/comunicados" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !comunicados.length" class="text-center q-pa-lg empty-panel">
            <q-icon name="campaign" size="36px" class="q-mb-sm" />
            <div class="text-caption">Sin comunicados</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="comunicado in comunicados.slice(0, 4)" :key="comunicado.id" clickable @click="router.push('/docente/comunicados')">
              <q-item-section avatar>
                <div class="com-avatar"><q-icon name="campaign" size="18px" /></div>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium" lines="1">{{ comunicado.titulo }}</q-item-label>
                <q-item-label caption lines="1">{{ comunicado.autor_nombre || 'Sistema' }}</q-item-label>
              </q-item-section>
              <q-item-section side v-if="comunicado.requiere_confirmacion && !comunicado.confirmado">
                <q-badge color="error" label="Nuevo" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.dash-page { max-width: 1280px; margin: 0 auto; }

.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--primary) 0%, #2A0309 100%);
  border-radius: 20px;
  padding: 32px 36px;
  color: #FFFFFF;
  box-shadow: 0 20px 40px -20px rgba(74, 7, 18, 0.6);
}
.hero-inner { position: relative; z-index: 2; }
.hero-badge {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.16);
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 10px;
  backdrop-filter: blur(8px);
}
.hero-title {
  font-size: 34px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.hero-sub {
  margin: 8px 0 0 0;
  font-size: 14px;
  opacity: 0.9;
}
.hero-icon {
  position: absolute;
  right: 24px;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.12;
  color: #FFFFFF;
}

.kpi-card {
  border-radius: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  transition: all 0.2s ease;
}
.kpi-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -10px rgba(74, 7, 18, 0.25);
}
.kpi-row { display: flex; align-items: center; gap: 14px; }
.kpi-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 12px;
  flex-shrink: 0;
}
.kpi-icon-primary { background: var(--primary-soft); color: var(--primary); }
.kpi-icon-info    { background: var(--info-bg); color: var(--info); }
.kpi-icon-warning { background: var(--warning-bg); color: var(--warning); }
.kpi-icon-warn    { background: var(--error-bg); color: var(--error); }
.kpi-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.kpi-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
}

.panel {
  border-radius: 14px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
}
.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.panel-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.empty-panel { color: var(--text-muted); }

.eval-avatar {
  display: grid; place-items: center;
  width: 38px; height: 38px; border-radius: 10px;
  background: var(--primary-soft); color: var(--primary);
}
.eval-date {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary);
  background: var(--primary-soft);
  padding: 3px 8px;
  border-radius: 100px;
  white-space: nowrap;
}

.avatar-sol {
  background: var(--warning-bg);
  color: var(--warning);
  font-weight: 700;
  font-size: 13px;
}
.mat-avatar, .com-avatar {
  display: grid; place-items: center;
  width: 38px; height: 38px; border-radius: 10px;
}
.mat-avatar { background: var(--primary-soft); }
.com-avatar { background: var(--info-bg); color: var(--info); }

@media (max-width: 700px) {
  .hero-card { padding: 24px 20px; border-radius: 16px; }
  .hero-title { font-size: 24px; }
  .hero-icon { display: none; }
}
</style>
