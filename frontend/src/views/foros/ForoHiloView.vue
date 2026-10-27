<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify, Dialog } from 'quasar';
import * as foroApi from '../../api/foro.api.js';
import { useAuthStore } from '../../stores/auth.store.js';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();

const cargando = ref(true);
const error = ref('');
const hilo = ref(null);
const respuestas = ref([]);
const nuevaRespuesta = ref('');
const enviando = ref(false);

const ETIQUETAS = [
  { value: 'ejercicio', label: 'Ejercicio', color: 'primary', icon: 'edit_note' },
  { value: 'teoria',    label: 'Teoría',    color: 'info',    icon: 'school' },
  { value: 'examen',    label: 'Examen',    color: 'warning', icon: 'quiz' },
  { value: 'general',   label: 'General',   color: 'grey-7',  icon: 'forum' },
  { value: 'urgente',   label: 'Urgente',   color: 'negative',icon: 'priority_high' },
];

const etiquetaInfo = (val) => ETIQUETAS.find(e => e.value === val) || { label: val, color: 'grey', icon: 'label' };
const iniciales = (n, a) => ((n?.[0] || '') + (a?.[0] || '')).toUpperCase() || '?';
const formatearFecha = (iso) => iso ? new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const formatearFechaCorta = (iso) => iso ? new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const esProfesor = computed(() => auth.user?.tipo === 'docente');
const esAdmin = computed(() => ['admin', 'coordinador'].includes(auth.user?.tipo));
const puedeModerar = computed(() => esProfesor.value || esAdmin.value);
const esAutor = computed(() => hilo.value?.autor_id === auth.user?.id);
const hiloCerrado = computed(() => hilo.value?.cerrado === 1 || hilo.value?.cerrado === true);
const esMiRespuesta = (r) => r.autor_id === auth.user?.id;

async function cargar() {
  cargando.value = true;
  try {
    const id = Number(route.params.id);
    const data = await foroApi.verHilo(id);
    hilo.value = data;
    respuestas.value = data.respuestas || [];
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al cargar el hilo';
  } finally {
    cargando.value = false;
  }
}

async function responder() {
  if (!nuevaRespuesta.value.trim() || enviando.value) return;
  enviando.value = true;
  try {
    await foroApi.crearHilo({
      materiaId: hilo.value.materia_id,
      titulo: `Re: ${hilo.value.titulo}`,
      contenido: nuevaRespuesta.value,
      padreId: hilo.value.id,
    });
    Notify.create({ type: 'positive', message: 'Respuesta publicada', position: 'top' });
    nuevaRespuesta.value = '';
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  } finally {
    enviando.value = false;
  }
}

async function toggleFijar() {
  try {
    await foroApi.fijarHilo(hilo.value.id, !hilo.value.fijado);
    Notify.create({ type: 'positive', message: hilo.value.fijado ? 'Desfijado' : 'Fijado', position: 'top' });
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error', position: 'top' });
  }
}

async function toggleCerrar() {
  try {
    await foroApi.cerrarHilo(hilo.value.id, !hilo.value.cerrado);
    Notify.create({ type: 'positive', message: hilo.value.cerrado ? 'Reabierto' : 'Cerrado', position: 'top' });
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error', position: 'top' });
  }
}

async function eliminar() {
  const ok = await new Promise((resolve) => {
    Dialog.create({
      title: 'Eliminar hilo',
      message: '¿Eliminar este hilo? Se ocultará del foro.',
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Eliminar', color: 'negative', unelevated: true },
    }).onOk(() => resolve(true)).onCancel(() => resolve(false));
  });
  if (!ok) return;
  try {
    await foroApi.eliminarHilo(hilo.value.id);
    Notify.create({ type: 'info', message: 'Hilo eliminado', position: 'top' });
    router.push('/foros');
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error', position: 'top' });
  }
}

async function reportar() {
  const motivo = await new Promise((resolve) => {
    Dialog.create({
      title: 'Reportar hilo',
      message: '¿Por qué querés reportar este hilo?',
      options: {
        type: 'radio',
        model: 'spam',
        items: [
          { label: 'Spam', value: 'spam' },
          { label: 'Ofensivo', value: 'ofensivo' },
          { label: 'Fuera de tema', value: 'fuera_de_tema' },
          { label: 'Otro', value: 'otro' },
        ],
      },
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Reportar', color: 'warning', unelevated: true },
      persistent: true,
    }).onOk((data) => resolve(data)).onCancel(() => resolve(null));
  });
  if (!motivo) return;
  try {
    await foroApi.reportarHilo(hilo.value.id, motivo);
    Notify.create({ type: 'info', message: 'Reporte enviado', position: 'top' });
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error', position: 'top' });
  }
}

function volverAListado() {
  const path = route.path;
  const base = path.replace(/\/\d+$/, '');
  router.push(base);
}

onMounted(cargar);
</script>

<template>
  <q-page class="hilo-page">
    <button class="btn-volver" @click="volverAListado">
      <q-icon name="arrow_back" size="18px" />
      Foros
    </button>

    <q-inner-loading :showing="cargando">
      <q-spinner size="48px" color="primary" />
    </q-inner-loading>

    <div v-if="error" class="error-banner">
      <q-icon name="error_outline" size="20px" />
      {{ error }}
    </div>

    <template v-if="!cargando && hilo">
      <article class="hilo-principal">
        <div class="hilo-top">
          <div class="hilo-tags" v-if="hilo.etiquetas && hilo.etiquetas.length">
            <span v-for="tag in hilo.etiquetas" :key="tag" class="tag-pill" :class="`tag-${tag}`">
              <q-icon :name="etiquetaInfo(tag).icon" size="12px" />
              {{ etiquetaInfo(tag).label }}
            </span>
          </div>
          <div class="hilo-actions" v-if="puedeModerar || esAutor">
            <button v-if="puedeModerar" class="action-btn" @click="toggleFijar">
              <q-icon :name="hilo.fijado ? 'push_pin' : 'push_pin'" size="18px" :color="hilo.fijado ? 'warning' : 'grey-6'" />
            </button>
            <button v-if="puedeModerar" class="action-btn" @click="toggleCerrar">
              <q-icon :name="hilo.cerrado ? 'lock_open' : 'lock'" size="18px" :color="hilo.cerrado ? 'positive' : 'grey-6'" />
            </button>
            <button v-if="esAutor" class="action-btn" @click="eliminar">
              <q-icon name="delete" size="18px" color="negative" />
            </button>
            <button v-if="!esAutor" class="action-btn" @click="reportar">
              <q-icon name="flag" size="18px" color="grey-6" />
            </button>
          </div>
        </div>

        <h1 class="hilo-titulo-principal">
          <q-icon v-if="hilo.fijado" name="push_pin" size="20px" color="warning" class="q-mr-sm" />
          {{ hilo.titulo }}
          <q-badge v-if="hilo.cerrado" color="grey-7" icon="lock" label="Cerrado" class="q-ml-md" />
        </h1>

        <div class="hilo-autor">
          <q-avatar size="40px" color="primary" text-color="white" class="text-weight-bold">
            {{ iniciales(hilo.autor_nombre, hilo.autor_apellido) }}
          </q-avatar>
          <div>
            <div class="autor-nombre">{{ hilo.autor_nombre }} {{ hilo.autor_apellido }}</div>
            <div class="autor-fecha">{{ formatearFecha(hilo.creado_en || hilo.fecha) }}</div>
          </div>
        </div>

        <div class="hilo-contenido">{{ hilo.contenido }}</div>
      </article>

      <div class="respuestas-section">
        <div class="respuestas-header">
          <q-icon name="chat_bubble_outline" size="20px" color="primary" />
          <span class="respuestas-titulo">
            {{ respuestas.length }} {{ respuestas.length === 1 ? 'respuesta' : 'respuestas' }}
          </span>
        </div>

        <div v-if="!respuestas.length" class="empty-respuestas">
          <q-icon name="forum" size="40px" />
          <div>Sé el primero en responder</div>
        </div>

        <div v-else class="burbujas">
          <div
            v-for="r in respuestas" :key="r.id"
            class="burbuja-row"
            :class="{ 'burbuja-mia': esMiRespuesta(r) }"
          >
            <q-avatar v-if="!esMiRespuesta(r)" size="32px" color="primary" text-color="white" class="burbuja-avatar">
              {{ iniciales(r.autor_nombre, r.autor_apellido) }}
            </q-avatar>

            <div class="burbuja-wrap">
              <div v-if="!esMiRespuesta(r)" class="burbuja-autor">
                {{ r.autor_nombre }} {{ r.autor_apellido }}
              </div>
              <div class="burbuja" :class="{ 'burbuja-out': esMiRespuesta(r) }">
                {{ r.contenido }}
              </div>
              <div class="burbuja-fecha">{{ formatearFechaCorta(r.creado_en || r.fecha) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="!hiloCerrado" class="responder-bar">
        <q-input
          v-model="nuevaRespuesta"
          outlined type="textarea" autogrow
          placeholder="Escribí tu respuesta..."
          maxlength="10000"
          class="responder-input"
          @keydown.enter.exact.prevent="responder"
        />
        <q-btn
          unelevated round
          color="primary"
          icon="send"
          size="lg"
          :loading="enviando"
          :disable="!nuevaRespuesta.trim() || enviando"
          class="responder-btn"
          @click="responder"
        />
      </div>
      <div v-else class="cerrado-bar">
        <q-icon name="lock" size="18px" />
        Este hilo está cerrado. No se aceptan nuevas respuestas.
      </div>
    </template>
</q-page>
</template>

<style scoped>
.hilo-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px 20px 120px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
}

.btn-volver {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 20px;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-volver:hover {
  background: var(--bg-hover);
  color: var(--primary);
}

.hilo-principal {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 28px;
  margin-bottom: 24px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.hilo-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 16px;
}
.hilo-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}
.tag-ejercicio { background: rgba(114, 47, 55, 0.12); color: var(--primary); }
.tag-teoria { background: rgba(30, 91, 138, 0.12); color: #1e5b8a; }
.tag-examen { background: rgba(184, 114, 30, 0.12); color: #b8721e; }
.tag-general { background: rgba(120, 120, 120, 0.12); color: #666; }
.tag-urgente { background: rgba(198, 40, 40, 0.12); color: #c62828; }

.hilo-actions { display: flex; gap: 4px; }
.action-btn {
  width: 36px; height: 36px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
}
.action-btn:hover { background: var(--bg-hover); }

.hilo-titulo-principal {
  font-size: 26px;
  font-weight: 800;
  color: var(--text);
  margin: 0 0 20px;
  letter-spacing: -0.02em;
  line-height: 1.2;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.hilo-autor {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 20px;
}
.autor-nombre {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}
.autor-fecha {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
}
.hilo-contenido {
  font-size: 15px;
  color: var(--text);
  line-height: 1.7;
  white-space: pre-wrap;
}

.respuestas-section { margin-bottom: 24px; }
.respuestas-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 20px;
  padding: 0 4px;
}
.respuestas-titulo {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}
.empty-respuestas {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  background: var(--bg-hover);
  border-radius: 16px;
}
.burbujas {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.burbuja-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  max-width: 85%;
}
.burbuja-mia {
  margin-left: auto;
  flex-direction: row-reverse;
}
.burbuja-avatar {
  flex-shrink: 0;
  font-weight: 700 !important;
  font-size: 12px !important;
}
.burbuja-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.burbuja-mia .burbuja-wrap { align-items: flex-end; }
.burbuja-autor {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  padding: 0 6px;
}
.burbuja {
  padding: 12px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  border-top-left-radius: 4px;
  font-size: 14px;
  color: var(--text);
  line-height: 1.5;
  white-space: pre-wrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.burbuja-out {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  border-top-left-radius: 16px;
  border-top-right-radius: 4px;
}
.burbuja-fecha {
  font-size: 11px;
  color: var(--text-muted);
  padding: 0 6px;
}

.responder-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-subtle);
  padding: 14px 20px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
  z-index: 100;
  box-shadow: 0 -4px 20px rgba(0,0,0,0.08);
  max-width: 900px;
  margin: 0 auto;
}
.responder-input { flex: 1; }
.responder-input :deep(.q-field__control) { border-radius: 20px !important; }
.responder-btn {
  flex-shrink: 0;
  margin-bottom: 2px;
  box-shadow: 0 6px 16px -6px var(--primary);
}
.cerrado-bar {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--bg-hover);
  border-top: 1px solid var(--border-subtle);
  padding: 18px;
  text-align: center;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
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
}

@media (max-width: 600px) {
  .hilo-page { padding: 16px 12px 120px; }
  .hilo-principal { padding: 20px; border-radius: 16px; }
  .hilo-titulo-principal { font-size: 20px; }
  .burbuja-row { max-width: 95%; }
  .responder-bar { padding: 10px 12px; }
}
</style>
