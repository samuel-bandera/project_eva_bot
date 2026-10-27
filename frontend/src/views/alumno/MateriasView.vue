<template>
  <q-page class="materias-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">Materias</h1>
        <p class="page-subtitle">Inscribite, buscá y gestioná tus materias</p>
      </div>
      <button class="unirse-btn" @click="mostrarUnirse = true">
        <q-icon name="key" size="18px" />
        <span>Unirse por código</span>
      </button>
    </div>

    <div class="tabs-container">
      <button
        v-for="pestaña in pestañasDisponibles"
        :key="pestaña.value"
        class="tab-btn"
        :class="{ active: pestañaActiva === pestaña.value }"
        @click="pestañaActiva = pestaña.value"
      >
        <q-icon :name="pestaña.icon" size="16px" />
        <span>{{ pestaña.label }}</span>
      </button>
    </div>

    <div class="content">
      <div v-show="pestañaActiva === 'mismaterias'" class="tab-content">
        <div class="filters">
          <div class="search-wrapper">
            <q-icon name="search" size="18px" class="search-icon" />
            <input
              v-model="busqueda"
              type="text"
              class="search-input"
              placeholder="Buscar por nombre o código..."
            />
            <button v-if="busqueda" class="clear-btn" @click="busqueda = ''">
              <q-icon name="cancel" size="16px" />
            </button>
          </div>
          <select v-model="filtroEstado" class="filter-select">
            <option v-for="op in opcionesEstado" :key="op.value" :value="op.value">{{ op.label }}</option>
          </select>
          <select v-model="orden" class="filter-select">
            <option v-for="op in opcionesOrden" :key="op.value" :value="op.value">{{ op.label }}</option>
          </select>
        </div>

        <div v-if="!cargando && materiasFiltradas.length > 0" class="counter">
          {{ materiasFiltradas.length }} de {{ materias.length }} materias
        </div>

        <SkeletonMaterias v-if="cargando" :cantidad="3" />

        <div v-else-if="!materiasFiltradas.length" class="empty-state">
          <div class="empty-icon">
            <q-icon name="school" size="48px" color="grey-5" />
          </div>
          <h3>{{ materias.length === 0 ? 'Sin materias todavía' : 'Sin resultados' }}</h3>
          <p>{{ materias.length === 0 ? 'Buscá materias para inscribirte.' : 'Probá con otro término.' }}</p>
          <button v-if="materias.length === 0" class="empty-btn" @click="pestañaActiva = 'buscar'">
            Buscar materias
          </button>
        </div>

        <div v-else class="grid">
          <MateriaCard
            v-for="materia in materiasFiltradas"
            :key="materia.materia_id || materia.id"
            :materia="materia"
            @ver="verDetalle"
          />
        </div>
      </div>

      <div v-show="pestañaActiva === 'buscar'" class="tab-content">
        <div class="filters">
          <div class="search-wrapper search-wrapper-flex">
            <q-icon name="search" size="18px" class="search-icon" />
            <input
              v-model="busquedaMateriasPublicas"
              type="text"
              class="search-input"
              placeholder="Buscar materias por nombre, código o descripción..."
            />
            <button v-if="busquedaMateriasPublicas" class="clear-btn" @click="busquedaMateriasPublicas = ''">
              <q-icon name="cancel" size="16px" />
            </button>
          </div>
        </div>

        <div v-if="!cargandoPublicas && materiasPublicasFiltradas.length > 0" class="counter">
          {{ materiasPublicasFiltradas.length }} materias disponibles
        </div>

        <SkeletonMaterias v-if="cargandoPublicas" :cantidad="3" />

        <div v-else-if="!materiasPublicasFiltradas.length" class="empty-state">
          <div class="empty-icon">
            <q-icon name="search_off" size="48px" color="grey-5" />
          </div>
          <h3>{{ materiasPublicas.length === 0 ? 'Sin materias disponibles' : 'Sin resultados' }}</h3>
          <p>{{ materiasPublicas.length === 0 ? 'No hay materias con inscripción abierta.' : 'Probá con otro término.' }}</p>
        </div>

        <div v-else class="grid">
          <div v-for="materia in materiasPublicasFiltradas" :key="materia.id" class="materia-publica-card">
            <div class="card-top">
              <div class="card-avatar">
                <q-icon name="school" size="22px" color="white" />
              </div>
            </div>
            <h3 class="card-title">{{ materia.nombre || materia.materia_nombre }}</h3>
            <p class="card-code">{{ materia.codigo || materia.materia_codigo || '—' }}</p>
            <p v-if="materia.descripcion" class="card-desc">{{ materia.descripcion }}</p>
            <div class="card-action">
              <button v-if="yaSolicitada(materia.id)" class="badge-btn" disabled>
                <q-icon name="hourglass_top" size="14px" /> Solicitud pendiente
              </button>
              <button v-else class="solicitar-btn" @click.stop="abrirSolicitud(materia)">
                <q-icon name="send" size="14px" /> Solicitar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div v-show="pestañaActiva === 'solicitudes'" class="tab-content">
        <SkeletonMaterias v-if="cargandoSolicitudes" :cantidad="2" />

        <div v-else-if="!solicitudes.length" class="empty-state">
          <div class="empty-icon">
            <q-icon name="assignment" size="48px" color="grey-5" />
          </div>
          <h3>Sin solicitudes</h3>
          <p>Cuando solicites inscribirte a una materia, vas a verla acá.</p>
          <button class="empty-btn" @click="pestañaActiva = 'buscar'">Buscar materias</button>
        </div>

        <div v-else class="solicitudes-list">
          <SolicitudCard v-for="solicitud in solicitudes" :key="solicitud.id" :solicitud="solicitud" />
        </div>
      </div>
    </div>

    <q-dialog v-model="mostrarUnirse" persistent>
      <q-card style="min-width: 400px; max-width: 95vw; border-radius: 20px;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Unirse por código</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="mostrarUnirse = false" />
        </q-card-section>
        <q-card-section>
          <p class="text-caption text-grey-6 q-mb-md">Ingresá el código que te dio tu docente.</p>
          <q-input
            v-model="codigoIngresado"
            outlined
            label="Código de inscripción"
            placeholder="Ej: MAT-REDES-2026"
            :disable="uniendo"
            @keyup.enter="unirsePorCodigo"
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" :disable="uniendo" @click="mostrarUnirse = false" no-caps />
          <q-btn
            unelevated
            color="primary"
            label="Unirse"
            :loading="uniendo"
            :disable="!codigoIngresado.trim()"
            @click="unirsePorCodigo"
            no-caps
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <SolicitudDialog v-model="dialogoSolicitud" :materia="materiaSeleccionada" @solicitud-enviada="alSolicitar" />
    <DetalleMateriaDialog v-model="dialogoDetalle" :materia="materiaSeleccionada" />
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import * as alumnoApi from '../../api/alumno.api.js';
import { filtrarPorCampos, crearDebounce } from '../../utils/buscar.js';
import MateriaCard from '../../components/materias/MateriaCard.vue';
import SolicitudCard from '../../components/materias/SolicitudCard.vue';
import SolicitudDialog from '../../components/materias/SolicitudDialog.vue';
import DetalleMateriaDialog from '../../components/materias/DetalleMateriaDialog.vue';
import SkeletonMaterias from '../../components/materias/SkeletonMaterias.vue';

const $q = useQuasar();
const pestañaActiva = ref('mismaterias');

const pestañasDisponibles = [
  { value: 'mismaterias', label: 'Mis materias', icon: 'school' },
  { value: 'buscar', label: 'Buscar y solicitar', icon: 'search' },
  { value: 'solicitudes', label: 'Mis solicitudes', icon: 'assignment' }
];

const cargando = ref(true);
const materias = ref([]);
const busqueda = ref('');
const busquedaAplicada = ref('');
const filtroEstado = ref('todas');
const orden = ref('nombre-asc');

const materiasPublicas = ref([]);
const cargandoPublicas = ref(false);
const busquedaMateriasPublicas = ref('');
const busquedaMateriasPublicasAplicada = ref('');

const solicitudes = ref([]);
const cargandoSolicitudes = ref(false);

const mostrarUnirse = ref(false);
const codigoIngresado = ref('');
const uniendo = ref(false);

const dialogoSolicitud = ref(false);
const dialogoDetalle = ref(false);
const materiaSeleccionada = ref(null);

const opcionesEstado = [
  { label: 'Todas', value: 'todas' },
  { label: 'Activa', value: 'activa' },
  { label: 'Aprobada', value: 'aprobada' },
  { label: 'Cursando', value: 'cursando' }
];

const opcionesOrden = [
  { label: 'Nombre (A-Z)', value: 'nombre-asc' },
  { label: 'Nombre (Z-A)', value: 'nombre-desc' },
  { label: 'Código (A-Z)', value: 'codigo-asc' }
];

const aplicarBusqueda = crearDebounce(() => {
  busquedaAplicada.value = busqueda.value;
}, 300);

const aplicarBusquedaMateriasPublicas = crearDebounce(() => {
  busquedaMateriasPublicasAplicada.value = busquedaMateriasPublicas.value;
}, 300);

watch(busqueda, aplicarBusqueda);
watch(busquedaMateriasPublicas, aplicarBusquedaMateriasPublicas);

const materiasFiltradas = computed(() => {
  let lista = materias.value;
  if (filtroEstado.value !== 'todas') {
    lista = lista.filter(m => m.estado_matricula === filtroEstado.value);
  }
  lista = filtrarPorCampos(lista, busquedaAplicada.value, ['materia_nombre', 'materia_codigo', 'nombre', 'codigo']);
  const copia = [...lista];
  copia.sort((a, b) => {
    const na = a.materia_nombre || a.nombre || '';
    const nb = b.materia_nombre || b.nombre || '';
    if (orden.value === 'nombre-asc') return na.localeCompare(nb);
    if (orden.value === 'nombre-desc') return nb.localeCompare(na);
    if (orden.value === 'codigo-asc') {
      return (a.materia_codigo || a.codigo || '').localeCompare(b.materia_codigo || b.codigo || '');
    }
    return 0;
  });
  return copia;
});

const materiasPublicasFiltradas = computed(() => {
  return filtrarPorCampos(materiasPublicas.value, busquedaMateriasPublicasAplicada.value, ['nombre', 'materia_nombre', 'codigo', 'materia_codigo', 'descripcion']);
});

async function cargarMaterias() {
  cargando.value = true;
  try {
    materias.value = await alumnoApi.getMisMaterias();
  } catch {
    $q.notify({ type: 'negative', message: 'Error al cargar materias', position: 'bottom' });
  } finally {
    cargando.value = false;
  }
}

async function cargarMateriasPublicas() {
  cargandoPublicas.value = true;
  try {
    materiasPublicas.value = await alumnoApi.getMateriasSolicitables();
  } catch {
    $q.notify({ type: 'negative', message: 'Error al cargar materias públicas', position: 'bottom' });
  } finally {
    cargandoPublicas.value = false;
  }
}

async function cargarSolicitudes() {
  cargandoSolicitudes.value = true;
  try {
    solicitudes.value = await alumnoApi.getMisSolicitudes();
  } catch {
    $q.notify({ type: 'negative', message: 'Error al cargar solicitudes', position: 'bottom' });
  } finally {
    cargandoSolicitudes.value = false;
  }
}

function verDetalle(materia) {
  materiaSeleccionada.value = m;
  dialogoDetalle.value = true;
}

function abrirSolicitud(materia) {
  materiaSeleccionada.value = m;
  dialogoSolicitud.value = true;
}

function yaSolicitada(idMateria) {
  return solicitudes.value.some(s => s.materia_id === idMateria && (s.estado === 'pendiente' || s.estado === 'aprobada'));
}

async function alSolicitar() {
  await Promise.all([cargarMateriasPublicas(), cargarSolicitudes()]);
}

async function unirsePorCodigo() {
  if (!codigoIngresado.value.trim()) return;
  uniendo.value = true;
  try {
    const res = await alumnoApi.unirseAMateria(codigoIngresado.value.trim());
    $q.notify({ type: 'positive', message: `Te uniste a ${res.nombre || 'la materia'}`, position: 'bottom' });
    codigoIngresado.value = '';
    mostrarUnirse.value = false;
    await cargarMaterias();
  } catch (error) {
    const msg = error.response && error.response.data && error.response.data.error
      ? error.response.data.error
      : 'Código inválido';
    $q.notify({ type: 'negative', message: msg, position: 'bottom' });
  } finally {
    uniendo.value = false;
  }
}

onMounted(async () => {
  await Promise.all([cargarMaterias(), cargarMateriasPublicas(), cargarSolicitudes()]);
});
</script>

<style scoped>
.materias-page { max-width: 1200px; margin: 0 auto; padding: 32px 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.page-title { font-size: 32px; font-weight: 800; letter-spacing: -1px; margin: 0 0 4px 0; color: var(--text); }
.page-subtitle { font-size: 14px; color: var(--text-muted); margin: 0; }
.unirse-btn {
  display: flex; align-items: center; gap: 8px; padding: 10px 18px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: var(--primary-foreground); font-size: 14px; font-weight: 600; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent);
}
.unirse-btn:hover { box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 40%, transparent); }
.unirse-btn:active { transform: scale(0.97); }
.tabs-container {
  display: flex; gap: 4px; background: var(--bg); padding: 4px; border-radius: 14px;
  margin-bottom: 24px; width: fit-content; max-width: 100%; overflow-x: auto;
  border: 1px solid var(--border-subtle);
}
.tab-btn {
  display: flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px;
  border: none; background: transparent; color: var(--text-muted); font-size: 13px;
  font-weight: 600; cursor: pointer; white-space: nowrap; transition: all 0.2s ease;
}
.tab-btn:hover:not(.active) { color: var(--text); }
.tab-btn.active { background: var(--bg-elevated); color: var(--text); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08); }
.filters { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.search-wrapper {
  flex: 1; min-width: 240px; position: relative; display: flex; align-items: center;
  background: var(--bg); border-radius: 12px; padding: 0 14px; height: 44px;
  transition: background 0.2s ease; border: 1px solid var(--border-subtle);
}
.search-wrapper:focus-within { background: var(--bg-hover); }
.search-icon { color: var(--text-muted); margin-right: 8px; flex-shrink: 0; }
.search-input {
  flex: 1; border: none; background: transparent; outline: none; font-size: 14px;
  color: var(--text); font-family: inherit;
}
.search-input::placeholder { color: var(--text-muted); }
.clear-btn { border: none; background: transparent; color: var(--text-muted); cursor: pointer; padding: 4px; display: grid; place-items: center; border-radius: 50%; }
.clear-btn:hover { color: var(--text); }
.filter-select {
  height: 44px; padding: 0 16px; border-radius: 12px; border: 1px solid var(--border-subtle);
  background: var(--bg); font-size: 14px; color: var(--text); cursor: pointer;
  font-family: inherit; font-weight: 500; outline: none;
}
.filter-select:focus { background: var(--bg-hover); }
.counter { font-size: 13px; color: var(--text-muted); margin-bottom: 16px; font-weight: 500; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.materia-publica-card {
  background: var(--bg-elevated); border-radius: 18px; padding: 20px;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-subtle);
}
.materia-publica-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); }
.card-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.card-avatar {
  width: 44px; height: 44px; border-radius: 13px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  display: grid; place-items: center; box-shadow: 0 4px 10px color-mix(in srgb, var(--primary) 25%, transparent);
}
.card-title {
  font-size: 17px; font-weight: 700; color: var(--text); margin: 0 0 4px 0;
  letter-spacing: -0.3px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.card-code { font-size: 13px; color: var(--text-muted); margin: 0; font-weight: 500; }
.card-desc {
  font-size: 13px; color: var(--text-muted); margin: 10px 0 0 0; line-height: 1.5;
  overflow: hidden; text-overflow: ellipsis; display: -webkit-box;
  -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.card-action { margin-top: 16px; }
.solicitar-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px;
  border: none; background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: var(--primary-foreground); font-size: 13px; font-weight: 600; cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  box-shadow: 0 2px 8px color-mix(in srgb, var(--primary) 25%, transparent);
}
.solicitar-btn:hover { box-shadow: 0 4px 12px color-mix(in srgb, var(--primary) 35%, transparent); }
.solicitar-btn:active { transform: scale(0.97); }
.badge-btn {
  display: inline-flex; align-items: center; gap: 6px; padding: 8px 16px; border-radius: 10px;
  border: none; background: var(--bg); color: var(--text-muted); font-size: 13px;
  font-weight: 600; cursor: not-allowed;
}
.empty-state {
  text-align: center; padding: 64px 24px; background: var(--bg-elevated);
  border-radius: 20px; border: 1px solid var(--border-subtle);
}
.empty-icon {
  display: inline-grid; place-items: center; width: 88px; height: 88px;
  border-radius: 24px; background: var(--bg); margin-bottom: 20px;
}
.empty-state h3 { font-size: 18px; font-weight: 700; color: var(--text); margin: 0 0 8px 0; letter-spacing: -0.3px; }
.empty-state p { font-size: 14px; color: var(--text-muted); margin: 0 0 20px 0; line-height: 1.5; }
.empty-btn {
  display: inline-flex; align-items: center; padding: 10px 20px; border-radius: 12px; border: none;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: var(--primary-foreground); font-size: 14px; font-weight: 600; cursor: pointer;
  transition: transform 0.15s ease;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent);
}
.empty-btn:active { transform: scale(0.97); }
.solicitudes-list { display: flex; flex-direction: column; gap: 12px; }
@media (max-width: 700px) {
  .materias-page { padding: 20px 16px; }
  .page-title { font-size: 26px; }
  .filters { flex-direction: column; }
  .search-wrapper { min-width: 0; }
  .filter-select { width: 100%; }
}
.search-wrapper-flex {
  flex: 1;
}
</style>
