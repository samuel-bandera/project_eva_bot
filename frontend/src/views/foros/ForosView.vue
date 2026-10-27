<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import * as foroApi from '../../api/foro.api.js';
import * as alumnoApi from '../../api/alumno.api.js';
import * as profApi from '../../api/profesor.api.js';
import { useAuthStore } from '../../stores/auth.store.js';

const router = useRouter();
const auth = useAuthStore();

const cargando = ref(true);
const error = ref('');
const materias = ref([]);
const materiaSeleccionada = ref(null);
const hilos = ref([]);
const busqueda = ref('');
const filtroEtiqueta = ref(null);
const modalCrear = ref(false);
const nuevoHilo = ref({ titulo: '', contenido: '', etiquetas: [] });

const ETIQUETAS = [
  { value: 'ejercicio', label: 'Ejercicio', color: 'primary', icon: 'edit_note' },
  { value: 'teoria',    label: 'Teoría',    color: 'info',    icon: 'school' },
  { value: 'examen',    label: 'Examen',    color: 'warning', icon: 'quiz' },
  { value: 'general',   label: 'General',   color: 'grey-7',  icon: 'forum' },
  { value: 'urgente',   label: 'Urgente',   color: 'negative',icon: 'priority_high' },
];

const puedeCrearHilos = computed(() => ['docente', 'admin', 'coordinador'].includes(auth.user?.tipo));

const etiquetaInfo = (val) => ETIQUETAS.find(e => e.value === val) || { label: val, color: 'grey', icon: 'label' };

const iniciales = (n, a) => ((n?.[0] || '') + (a?.[0] || '')).toUpperCase() || '?';
const formatearFecha = (iso) => iso ? new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const hilosFiltrados = computed(() => {
  let arr = hilos.value.filter(h => !h.padre_id);
  if (filtroEtiqueta.value) {
    arr = arr.filter(h => Array.isArray(h.etiquetas) && h.etiquetas.includes(filtroEtiqueta.value));
  }
  const q = busqueda.value.trim().toLowerCase();
  if (q) {
    arr = arr.filter(h => (h.titulo || '').toLowerCase().includes(q) || (h.contenido || '').toLowerCase().includes(q));
  }
  return arr;
});

const stats = computed(() => ({
  total: hilos.value.filter(h => !h.padre_id).length,
  respuestas: hilos.value.reduce((s, h) => s + (h.num_respuestas || 0), 0),
  fijados: hilos.value.filter(h => h.fijado && !h.padre_id).length,
}));

const materiaActual = computed(() => materias.value.find(m => m.id === materiaSeleccionada.value));

async function cargarHilos() {
  if (!materiaSeleccionada.value) return;
  cargando.value = true;
  try {
    hilos.value = await foroApi.listarHilos(materiaSeleccionada.value, { soloRaiz: true });
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al cargar los foros';
  } finally {
    cargando.value = false;
  }
}

function abrirNuevo() {
  nuevoHilo.value = { titulo: '', contenido: '', etiquetas: [] };
  modalCrear.value = true;
}

async function crear() {
  if (!nuevoHilo.value.titulo.trim() || !nuevoHilo.value.contenido.trim()) {
    Notify.create({ type: 'warning', message: 'Completá título y contenido', position: 'top' });
    return;
  }
  try {
    await foroApi.crearHilo({
      materiaId: materiaSeleccionada.value,
      titulo: nuevoHilo.value.titulo,
      contenido: nuevoHilo.value.contenido,
      etiquetas: nuevoHilo.value.etiquetas,
    });
    Notify.create({ type: 'positive', message: 'Hilo publicado', position: 'top' });
    modalCrear.value = false;
    await cargarHilos();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

onMounted(async () => {
  try {
    const esProfe = auth.user?.tipo === 'docente';
    materias.value = esProfe
      ? (await profApi.getMisMaterias()) || []
      : (await alumnoApi.getMisMaterias()) || [];
    if (materias.value.length > 0) {
      materiaSeleccionada.value = materias.value[0].id;
      await cargarHilos();
    }
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al cargar';
  } finally {
    cargando.value = false;
  }
});
</script>

<template>
  <q-page class="foros-page">

    <section class="foros-hero">
      <div class="hero-content">
        <div class="hero-badge">
          <q-icon name="forum" size="14px" />
          Foros académicos
        </div>
        <h1 class="hero-title">{{ materiaActual?.nombre || 'Foros' }}</h1>
        <p class="hero-subtitle">
          Discusiones, dudas y respuestas con docentes y compañeros
        </p>

        <div class="hero-stats" v-if="!cargando">
          <div class="stat-card">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">Hilos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.respuestas }}</div>
            <div class="stat-label">Respuestas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.fijados }}</div>
            <div class="stat-label">Fijados</div>
          </div>
        </div>
      </div>

      <q-btn
        v-if="puedeCrearHilos"
        unelevated
        no-caps
        icon="add"
        label="Nuevo hilo"
        class="hero-cta"
        :disable="!materiaSeleccionada"
        @click="abrirNuevo"
      />
    </section>

    <q-card flat class="toolbar-card">
      <div class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-4">
          <q-select
            v-model="materiaSeleccionada"
            :options="materias"
            option-value="id"
            option-label="nombre"
            emit-value map-options
            outlined dense
            label="Materia"
            @update:model-value="cargarHilos"
          >
            <template #prepend>
              <q-icon name="menu_book" color="primary" />
            </template>
          </q-select>
        </div>
        <div class="col-12 col-md-8">
          <q-input
            v-model="busqueda"
            outlined dense clearable
            placeholder="Buscar por título o contenido..."
          >
            <template #prepend><q-icon name="search" color="primary" /></template>
          </q-input>
        </div>
      </div>

      <div class="filtros q-mt-md">
        <button
          class="chip-filtro"
          :class="{ active: filtroEtiqueta === null }"
          @click="filtroEtiqueta = null"
        >
          <q-icon name="apps" size="16px" />
          Todas
        </button>
        <button
          v-for="e in ETIQUETAS" :key="e.value"
          class="chip-filtro"
          :class="{ active: filtroEtiqueta === e.value, [`chip-${e.value}`]: true }"
          @click="filtroEtiqueta = e.value"
        >
          <q-icon :name="e.icon" size="16px" />
          {{ e.label }}
        </button>
      </div>
    </q-card>

    <q-inner-loading :showing="cargando">
      <q-spinner size="48px" color="primary" />
    </q-inner-loading>

    <div v-if="error" class="error-banner">
      <q-icon name="error_outline" size="20px" />
      {{ error }}
    </div>

    <div v-if="!cargando && !error && !hilosFiltrados.length" class="empty-state">
      <div class="empty-icon">
        <q-icon name="forum" size="56px" />
      </div>
      <div class="empty-title">
        {{ busqueda || filtroEtiqueta ? 'Sin resultados' : 'Empezá la conversación' }}
      </div>
      <div class="empty-sub">
        {{ busqueda || filtroEtiqueta ? 'Probá con otros filtros o términos' : (puedeCrearHilos ? 'Aún no hay hilos en esta materia. ¡Creá el primero!' : 'El docente aún no ha publicado ningún tema de discusión.') }}
      </div>
      <q-btn
        v-if="!busqueda && !filtroEtiqueta && puedeCrearHilos"
        unelevated no-caps color="primary" icon="add"
        label="Crear el primer hilo" class="q-mt-md"
        @click="abrirNuevo"
      />
    </div>

    <div v-else class="hilos-list">
      <article
        v-for="h in hilosFiltrados" :key="h.id"
        class="hilo-card"
        :class="{ 'hilo-fijado': h.fijado }"
        @click="router.push(`${route.path}/${h.id}`)"
      >
        <div class="hilo-avatar">
          <q-avatar size="48px" color="primary" text-color="white" class="avatar-author">
            {{ iniciales(h.autor_nombre, h.autor_apellido) }}
          </q-avatar>
        </div>

        <div class="hilo-body">
          <div class="hilo-header">
            <h3 class="hilo-titulo">
              <q-icon v-if="h.fijado" name="push_pin" size="16px" color="warning" class="q-mr-xs" />
              {{ h.titulo }}
            </h3>
            <div class="hilo-badges">
              <span v-if="h.cerrado" class="badge-closed">
                <q-icon name="lock" size="12px" />
                Cerrado
              </span>
              <span v-if="h.num_respuestas > 0" class="badge-replies">
                <q-icon name="chat_bubble" size="12px" />
                {{ h.num_respuestas }}
              </span>
            </div>
          </div>

          <p class="hilo-preview">{{ h.contenido }}</p>

          <div class="hilo-footer">
            <div class="hilo-tags" v-if="h.etiquetas && h.etiquetas.length">
              <span
                v-for="tag in h.etiquetas" :key="tag"
                class="tag-pill" :class="`tag-${tag}`"
              >
                <q-icon :name="etiquetaInfo(tag).icon" size="12px" />
                {{ etiquetaInfo(tag).label }}
              </span>
            </div>
            <div class="hilo-meta">
              <span class="meta-author">{{ h.autor_nombre }} {{ h.autor_apellido }}</span>
              <span class="meta-dot">·</span>
              <span class="meta-time">{{ formatearFecha(h.creado_en || h.fecha) }}</span>
            </div>
          </div>
        </div>

        <div class="hilo-arrow">
          <q-icon name="arrow_forward_ios" size="16px" />
        </div>
      </article>
    </div>

    <q-dialog v-model="modalCrear" persistent>
      <q-card class="modal-crear">
        <div class="modal-header">
          <div class="modal-icon-wrap">
            <q-icon name="edit_square" size="24px" color="white" />
          </div>
          <div>
            <div class="modal-title">Nuevo hilo</div>
            <div class="modal-sub">Compartí tu pregunta con la clase</div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" @click="modalCrear = false" />
        </div>

        <div class="modal-body">
          <div class="field-label">Título</div>
          <q-input
            v-model="nuevoHilo.titulo"
            outlined dense
            placeholder="Ej: Duda sobre normalización 3FN"
            maxlength="200"
          />

          <div class="field-label q-mt-md">Descripción</div>
          <q-input
            v-model="nuevoHilo.contenido"
            outlined type="textarea" rows="10"
            placeholder="Describí tu duda con el mayor detalle posible..."
            maxlength="10000"
          />

          <div class="field-label q-mt-md">Etiquetas <span class="field-hint">(máx. 5)</span></div>
          <div class="tags-selector">
            <button
              v-for="e in ETIQUETAS" :key="e.value"
              class="tag-selector"
              :class="{ selected: nuevoHilo.etiquetas.includes(e.value), [`tag-${e.value}`]: true }"
              @click="
                nuevoHilo.etiquetas.includes(e.value)
                  ? nuevoHilo.etiquetas = nuevoHilo.etiquetas.filter(x => x !== e.value)
                  : (nuevoHilo.etiquetas.length < 5 && nuevoHilo.etiquetas.push(e.value))
              "
            >
              <q-icon :name="e.icon" size="16px" />
              {{ e.label }}
            </button>
          </div>
        </div>

        <div class="modal-footer">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="modalCrear = false" />
          <q-btn unelevated no-caps color="primary" icon="send" label="Publicar" @click="crear" />
        </div>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.foros-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 20px 80px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
}

.foros-hero {
  position: relative;
  background: linear-gradient(135deg, var(--primary) 0%, #4a1e24 100%);
  border-radius: 20px;
  padding: 32px 36px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 20px 40px -20px rgba(114, 47, 55, 0.5);
}
.foros-hero::before {
  content: '';
  position: absolute;
  top: -60px; right: -60px;
  width: 240px; height: 240px;
  background: radial-gradient(circle, rgba(255,255,255,0.12), transparent 70%);
  border-radius: 50%;
  pointer-events: none;
}
.hero-content { flex: 1; min-width: 260px; position: relative; z-index: 1; }
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: rgba(255,255,255,0.15);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: white;
  margin-bottom: 12px;
}
.hero-title {
  font-size: 32px;
  font-weight: 800;
  color: white;
  margin: 0 0 8px;
  letter-spacing: -0.03em;
  line-height: 1.1;
}
.hero-subtitle {
  font-size: 14px;
  color: rgba(255,255,255,0.75);
  margin: 0 0 20px;
  max-width: 480px;
}
.hero-stats {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.stat-card {
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 10px 18px;
  min-width: 80px;
}
.stat-value {
  font-size: 22px;
  font-weight: 800;
  color: white;
  line-height: 1;
}
.stat-label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
  color: rgba(255,255,255,0.6);
  margin-top: 4px;
}
.hero-cta {
  background: white !important;
  color: var(--primary) !important;
  font-weight: 700 !important;
  border-radius: 14px !important;
  padding: 16px 32px !important;
  font-size: 16px !important;
  position: relative;
  z-index: 1;
  box-shadow: 0 8px 24px -8px rgba(0,0,0,0.3);
}
.hero-cta:hover { transform: translateY(-2px); }

.toolbar-card {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.filtros { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-filtro {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-hover);
  border: 1.5px solid var(--border-subtle);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.chip-filtro:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.chip-filtro.active {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  box-shadow: 0 4px 12px -4px var(--primary);
}

.hilos-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hilo-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}
.hilo-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -12px rgba(114, 47, 55, 0.25);
}
.hilo-fijado {
  border-color: var(--warning, #f59e0b);
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.04) 0%, var(--bg-elevated) 40%);
}
.hilo-fijado::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 4px;
  background: #f59e0b;
}
.hilo-avatar { flex-shrink: 0; }
.avatar-author {
  font-weight: 700 !important;
  font-size: 16px !important;
}
.hilo-body { flex: 1; min-width: 0; }
.hilo-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 6px;
}
.hilo-titulo {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.hilo-badges {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.badge-closed, .badge-replies {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  font-size: 11px;
  font-weight: 700;
  border-radius: 999px;
}
.badge-closed {
  background: rgba(120, 120, 120, 0.15);
  color: var(--text-muted);
}
.badge-replies {
  background: var(--primary-soft);
  color: var(--primary);
}
.hilo-preview {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0 0 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hilo-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.hilo-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}
.tag-ejercicio { background: rgba(114, 47, 55, 0.12); color: var(--primary); }
.tag-teoria { background: rgba(30, 91, 138, 0.12); color: #1e5b8a; }
.tag-examen { background: rgba(184, 114, 30, 0.12); color: #b8721e; }
.tag-general { background: rgba(120, 120, 120, 0.12); color: #666; }
.tag-urgente { background: rgba(198, 40, 40, 0.12); color: #c62828; }
.hilo-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.meta-author { font-weight: 600; }
.meta-dot { opacity: 0.4; }
.hilo-arrow {
  display: flex;
  align-items: center;
  color: var(--text-muted);
  opacity: 0.5;
  transition: all 0.2s;
}
.hilo-card:hover .hilo-arrow {
  opacity: 1;
  transform: translateX(4px);
  color: var(--primary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}
.empty-icon {
  width: 96px; height: 96px;
  margin: 0 auto 20px;
  background: var(--primary-soft);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--primary);
}
.empty-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
}
.empty-sub {
  font-size: 14px;
  color: var(--text-muted);
  max-width: 360px;
  margin: 0 auto;
}

.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  background: var(--error-bg, #fbefef);
  color: var(--error, #c62828);
  border-radius: 12px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
}

.modal-crear {
  width: 820px;
  max-width: 95vw;
  border-radius: 20px;
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px 28px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--bg-hover);
}
.modal-icon-wrap {
  width: 52px; height: 52px;
  background: linear-gradient(135deg, var(--primary), #4a1e24);
  border-radius: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--text);
}
.modal-sub {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 2px;
}
.modal-body { padding: 28px 32px; }
.modal-footer {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  padding: 18px 28px;
  border-top: 1px solid var(--border-subtle);
  background: var(--bg-hover);
}
.field-label {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}
.field-hint {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 12px;
}
.tags-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-selector {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--bg-hover);
  border: 1.5px solid var(--border-subtle);
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.tag-selector:hover { border-color: var(--primary); }
.tag-selector.selected {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}

@media (max-width: 600px) {
  .foros-page { padding: 16px 12px 60px; }
  .foros-hero { padding: 24px; }
  .hero-title { font-size: 24px; }
  .hero-stats { width: 100%; }
  .hero-cta { width: 100%; }
  .hilo-card { padding: 16px; }
  .hilo-titulo { font-size: 15px; }
  .hilo-preview { font-size: 13px; }
  .hilo-meta { font-size: 11px; }
}
</style>
