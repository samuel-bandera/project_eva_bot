<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.js';
import * as coordApi from '../../api/coordinador.api.js';

const auth = useAuthStore();
const router = useRouter();

const cargando = ref(true);
const docentes = ref([]);
const materias = ref([]);
const solicitudes = ref([]);
const pendientes = ref([]);
const carreras = ref([]);
const comunicadosSinLeer = ref(0);

const totalDocentes = computed(() => docentes.value.length);
const totalMaterias = computed(() => materias.value.length);
const totalSolicitudes = computed(() => solicitudes.value.length);
const totalPendientes = computed(() => pendientes.value.length);
const totalCarreras = computed(() => carreras.value.length);

const saludo = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
});

const nombrePila = computed(() => auth.user?.nombre || 'coordinador');

function iniciales(nombre, apellido) {
  return `${nombre?.[0] || ''}${apellido?.[0] || ''}`.toUpperCase();
}

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

async function cargar() {
  cargando.value = true;
  try {
    const [u, m, s, p, car, com] = await Promise.all([
      coordApi.listarUsuarios({ tipo: 'docente', limit: 500 }).catch(() => []),
      coordApi.listarMaterias().catch(() => []),
      coordApi.listarTodasLasSolicitudes('pendiente').catch(() => []),
      coordApi.listarPendientes().catch(() => []),
      coordApi.listarCarreras().catch(() => []),
      coordApi.comunicadosRecibidos().catch(() => []),
    ]);
    docentes.value = u || [];
    materias.value = m || [];
    solicitudes.value = s || [];
    pendientes.value = p || [];
    carreras.value = car || [];
    comunicadosSinLeer.value = (com || []).filter(x => !x.leido).length;
  } catch (err) {
    console.error(err);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md coord-page">
    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <div class="hero-card q-mb-md">
      <div class="hero-inner">
        <div class="hero-badge">{{ saludo }}</div>
        <h1 class="hero-title">Hola, {{ nombrePila }}</h1>
        <p class="hero-sub">Coordinación Académica · EvalBot</p>
      </div>
      <q-icon name="supervisor_account" size="140px" class="hero-icon" />
    </div>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card cursor-pointer" @click="router.push('/coordinador/docentes')">
          <q-card-section>
            <div class="kpi-row">
              <div class="kpi-icon kpi-icon-primary"><q-icon name="groups" size="26px" /></div>
              <div>
                <div class="kpi-num">{{ totalDocentes }}</div>
                <div class="kpi-label">Docentes</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card cursor-pointer" @click="router.push('/coordinador/materias')">
          <q-card-section>
            <div class="kpi-row">
              <div class="kpi-icon kpi-icon-info"><q-icon name="menu_book" size="26px" /></div>
              <div>
                <div class="kpi-num">{{ totalMaterias }}</div>
                <div class="kpi-label">Materias</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card cursor-pointer" @click="router.push('/coordinador/solicitudes')">
          <q-card-section>
            <div class="kpi-row">
              <div class="kpi-icon kpi-icon-warning"><q-icon name="assignment_ind" size="26px" /></div>
              <div>
                <div class="kpi-num">{{ totalSolicitudes }}</div>
                <div class="kpi-label">Solicitudes</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="kpi-card cursor-pointer" @click="router.push('/coordinador/comunicados')">
          <q-card-section>
            <div class="kpi-row">
              <div class="kpi-icon kpi-icon-warn"><q-icon name="forum" size="26px" /></div>
              <div>
                <div class="kpi-num">{{ comunicadosSinLeer }}</div>
                <div class="kpi-label">Comunicados</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit panel">
          <q-card-section class="panel-head">
            <div class="panel-title">Solicitudes de matrícula</div>
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/coordinador/solicitudes" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !solicitudes.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="assignment_turned_in" size="40px" color="positive" class="q-mb-sm" />
            <div>Sin solicitudes pendientes</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="s in solicitudes.slice(0, 5)" :key="s.id">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="36px">
                  {{ iniciales(s.alumno_nombre, s.alumno_apellido) }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ s.alumno_nombre }} {{ s.alumno_apellido }}</q-item-label>
                <q-item-label caption>{{ s.materia_nombre || 'Materia' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="warning" label="pendiente" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit panel">
          <q-card-section class="panel-head">
            <div class="panel-title">Docentes nuevos</div>
            <q-btn flat dense no-caps color="primary" label="Ver todos" to="/coordinador/docentes" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !pendientes.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="check_circle" size="40px" color="positive" class="q-mb-sm" />
            <div>Sin cuentas pendientes</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="u in pendientes.slice(0, 5)" :key="u.id">
              <q-item-section avatar>
                <q-avatar color="warning" text-color="white" size="36px">
                  {{ iniciales(u.nombre, u.apellido) }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ u.nombre }} {{ u.apellido }}</q-item-label>
                <q-item-label caption>{{ u.email }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="warning" :label="u.tipo" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit panel">
          <q-card-section class="panel-head">
            <div class="panel-title">Materias activas</div>
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/coordinador/materias" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !materias.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="menu_book" size="40px" class="q-mb-sm" />
            <div>Sin materias registradas</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="m in materias.slice(0, 5)" :key="m.id">
              <q-item-section avatar>
                <q-avatar color="info" text-color="white" size="36px">
                  <q-icon name="menu_book" size="20px" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ m.nombre }}</q-item-label>
                <q-item-label caption>{{ m.codigo || '—' }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit panel">
          <q-card-section class="panel-head">
            <div class="panel-title">Docentes activos</div>
            <q-btn flat dense no-caps color="primary" label="Ver todos" to="/coordinador/docentes" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !docentes.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="groups" size="40px" class="q-mb-sm" />
            <div>Sin docentes activos</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="d in docentes.slice(0, 5)" :key="d.id">
              <q-item-section avatar>
                <q-avatar color="positive" text-color="white" size="36px">
                  {{ iniciales(d.nombre, d.apellido) }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ d.nombre }} {{ d.apellido }}</q-item-label>
                <q-item-label caption>{{ d.email }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.coord-page { max-width: 1280px; margin: 0 auto; }

.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, var(--primary) 0%, #4a1e24 100%);
  border-radius: 20px;
  padding: 32px 36px;
  color: white;
  box-shadow: 0 20px 40px -20px rgba(114, 47, 55, 0.5);
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
  opacity: 0.14;
  color: white;
}

.kpi-card {
  border-radius: 14px;
  transition: all 0.2s;
}
.kpi-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 10px 24px -10px rgba(114, 47, 55, 0.2);
}
.kpi-row { display: flex; align-items: center; gap: 14px; }
.kpi-icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  flex-shrink: 0;
}
.kpi-icon-primary { background: var(--primary-soft); color: var(--primary); }
.kpi-icon-info    { background: #e3f2fd; color: #1565c0; }
.kpi-icon-warning { background: #fff4e6; color: #b8721e; }
.kpi-icon-warn    { background: #fdecea; color: #c62828; }
.kpi-num {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  line-height: 1.1;
}
.kpi-label {
  font-size: 11px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-top: 2px;
}

.panel { border-radius: 14px; }
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
</style>
