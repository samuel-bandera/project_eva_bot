<template>
  <q-dialog :model-value="modelValue" @update:model-value="emitirCierre">
    <q-card class="detalle-card">
      <button class="close-btn" @click="emitirCierre(false)">
        <q-icon name="close" size="18px" />
      </button>
      <div class="header">
        <div class="avatar">
          <q-icon name="school" size="26px" color="white" />
        </div>
        <div class="header-info">
          <h2 class="title">{{ nombreMateria }}</h2>
          <p class="codigo">{{ codigoMateria || 'Sin código' }}</p>
        </div>
      </div>
      <q-tabs v-model="tab" dense class="tabs" active-color="primary" indicator-color="primary" align="left" narrow-indicator no-caps>
        <q-tab name="info" icon="info" label="Información" />
        <q-tab name="tareas" icon="assignment" label="Tareas" />
        <q-tab name="materiales" icon="description" label="Materiales" />
      </q-tabs>
      <q-separator />
      <q-tab-panels v-model="tab" animated class="panels">
        <q-tab-panel name="info" class="panel">
          <div v-if="descripcion" class="section">
            <h3 class="section-title">Descripción</h3>
            <p class="section-text">{{ descripcion }}</p>
          </div>
          <div v-if="nombreDocente" class="docente-row">
            <div class="docente-icon">
              <q-icon name="person" size="18px" color="primary" />
            </div>
            <div>
              <div class="docente-label">Docente</div>
              <div class="docente-name">{{ nombreDocente }}</div>
            </div>
          </div>
          <div v-if="!descripcion && !nombreDocente" class="empty">
            <q-icon name="info" size="40px" color="grey-5" />
            <p>Sin información adicional.</p>
          </div>
        </q-tab-panel>
        <q-tab-panel name="tareas" class="panel">
          <q-inner-loading :showing="cargando">
            <q-spinner color="primary" size="32px" />
          </q-inner-loading>
          <div v-if="!cargando && !tareas.length" class="empty">
            <q-icon name="assignment" size="40px" color="grey-5" />
            <p>Sin tareas asignadas.</p>
          </div>
          <div v-else class="lista">
            <div v-for="t in tareas" :key="t.id" class="lista-item">
              <div class="lista-icon icon-warning">
                <q-icon name="assignment" size="18px" color="warning" />
              </div>
              <div class="lista-info">
                <div class="lista-title">{{ t.titulo }}</div>
                <div v-if="t.fecha_entrega" class="lista-caption">
                  Entrega · {{ formatearFecha(t.fecha_entrega) }}
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>
        <q-tab-panel name="materiales" class="panel">
          <q-inner-loading :showing="cargando">
            <q-spinner color="primary" size="32px" />
          </q-inner-loading>
          <div v-if="!cargando && !materiales.length" class="empty">
            <q-icon name="description" size="40px" color="grey-5" />
            <p>Sin materiales.</p>
          </div>
          <div v-else class="lista">
            <div v-for="m in materiales" :key="m.id" class="lista-item">
              <div class="lista-icon icon-info">
                <q-icon name="description" size="18px" color="info" />
              </div>
              <div class="lista-info">
                <div class="lista-title">{{ m.titulo }}</div>
                <div v-if="m.descripcion" class="lista-caption">{{ m.descripcion }}</div>
              </div>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import * as alumnoApi from '../../api/alumno.api.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  materia: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue']);

const tab = ref('info');
const cargando = ref(false);
const tareas = ref([]);
const materiales = ref([]);

const nombreMateria = computed(() => {
  if (!props.materia) return '';
  return props.materia.materia_nombre || props.materia.nombre || '';
});
const codigoMateria = computed(() => {
  if (!props.materia) return '';
  return props.materia.materia_codigo || props.materia.codigo || '';
});
const descripcion = computed(() => {
  return props.materia && props.materia.descripcion ? props.materia.descripcion : '';
});
const nombreDocente = computed(() => {
  return props.materia && props.materia.profesor_nombre ? props.materia.profesor_nombre : '';
});

watch(() => props.modelValue, async (abierto) => {
  if (abierto && props.materia) {
    tab.value = 'info';
    await cargarDetalle();
  }
});

async function cargarDetalle() {
  if (!props.materia) return;
  const idMateria = props.materia.materia_id || props.materia.id;
  if (!idMateria) return;
  cargando.value = true;
  tareas.value = [];
  materiales.value = [];
  try {
    const [t, m] = await Promise.all([
      alumnoApi.getTareasDeMateria(idMateria).catch(() => []),
      alumnoApi.getMaterialesDeMateria(idMateria).catch(() => [])
    ]);
    tareas.value = t || [];
    materiales.value = m || [];
  } finally {
    cargando.value = false;
  }
}

function formatearFecha(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function emitirCierre(valor) {
  emit('update:modelValue', valor);
}
</script>

<style scoped>
.detalle-card {
  width: 520px;
  max-width: 95vw;
  height: 70vh;
  max-height: 640px;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  padding: 0;
  overflow: hidden;
  position: relative;
  background: var(--bg-elevated);
  color: var(--text);
}
.close-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: none;
  background: var(--bg);
  color: var(--text-muted);
  cursor: pointer;
  display: grid;
  place-items: center;
  transition: background 0.2s ease;
  z-index: 10;
}
.close-btn:hover { background: var(--bg-hover); color: var(--text); }
.header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 60px 20px 24px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  display: grid;
  place-items: center;
  flex-shrink: 0;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent);
}
.header-info { flex: 1; min-width: 0; }
.title {
  font-size: 19px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: var(--text);
  letter-spacing: -0.3px;
  line-height: 1.2;
}
.codigo {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  font-weight: 500;
}
.tabs {
  padding: 0 16px;
  border-bottom: 1px solid var(--border-subtle);
}
.tabs :deep(.q-tab) {
  font-weight: 500;
  font-size: 13px;
  min-height: 44px;
}
.panels { flex: 1; overflow-y: auto; }
.panel { padding: 20px 24px; }
.section { margin-bottom: 20px; }
.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 8px 0;
}
.section-text {
  font-size: 14px;
  color: var(--text-muted);
  line-height: 1.6;
  margin: 0;
}
.docente-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--bg);
  border-radius: 12px;
}
.docente-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: var(--primary-soft);
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.docente-label {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
  margin-bottom: 2px;
}
.docente-name {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
}
.lista { display: flex; flex-direction: column; gap: 10px; }
.lista-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--bg);
  transition: background 0.15s ease;
}
.lista-item:hover { background: var(--bg-hover); }
.lista-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
}
.icon-warning { background: color-mix(in srgb, var(--q-warning) 15%, transparent); }
.icon-info { background: color-mix(in srgb, var(--q-info) 15%, transparent); }
.lista-info { flex: 1; min-width: 0; }
.lista-title {
  font-size: 14px;
  color: var(--text);
  font-weight: 500;
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.lista-caption {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.empty {
  text-align: center;
  padding: 48px 20px;
  color: var(--text-muted);
}
.empty p { font-size: 14px; margin: 12px 0 0 0; }
</style>
