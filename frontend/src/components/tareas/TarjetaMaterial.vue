<script setup>
import { computed } from 'vue';
import { iconoPorTipoMaterial, formatearFechaCorta } from '../../utils/tareas.js';

const props = defineProps({
  material: { type: Object, required: true },
});

const emit = defineEmits(['descargar', 'abrir-link']);

const iconoTipo = computed(() => iconoPorTipoMaterial(props.material.tipo));
const fechaMaterial = computed(() => formatearFechaCorta(props.material.fecha));
const etiquetaTipo = computed(() => {
  const tipo = props.material.tipo;
  if (tipo === 'apunte') return 'PDF';
  if (tipo === 'link') return 'LINK';
  return (tipo || '').toUpperCase();
});
const claseEstado = computed(() => {
  const tipo = props.material.tipo;
  if (tipo === 'video') return 'is-video';
  if (tipo === 'link') return 'is-link';
  return 'is-doc';
});

function alVerVideo() { emit('abrir-link', props.material.url_externa); }
function alAbrirLink() { emit('abrir-link', props.material.url_externa); }
function alDescargar() { emit('descargar', props.material.id); }
</script>

<template>
  <q-card class="material-card" flat>
    <div class="material-card__header">
      <div class="material-status" :class="claseEstado">
        <q-icon :name="iconoTipo" size="14px" />
        {{ etiquetaTipo }}
      </div>
      <div class="material-date">{{ fechaMaterial }}</div>
    </div>
    <div class="material-card__body">
      <h3 class="material-titulo">{{ material.titulo }}</h3>
      <p class="material-materia">{{ material.materia_nombre }}</p>
      <p v-if="material.descripcion" class="material-descripcion">{{ material.descripcion }}</p>
    </div>
    <div class="material-card__footer">
      <q-btn
        v-if="material.tipo === 'video'"
        flat no-caps color="red" icon="smart_display"
        label="Ver Video" class="full-width" @click="alVerVideo"
      />
      <q-btn
        v-else-if="material.tipo === 'link' || material.url_externa"
        flat no-caps color="info" icon="open_in_new"
        label="Abrir Enlace" class="full-width" @click="alAbrirLink"
      />
      <q-btn
        v-else
        flat no-caps color="primary" icon="download"
        label="Descargar Archivo" class="full-width" @click="alDescargar"
      />
    </div>
  </q-card>
</template>

<style scoped>
.material-card {
  border-radius: 18px !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
  background: var(--bg-elevated) !important;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}
.material-card:hover {
  transform: translateY(-3px);
  border-color: rgba(114, 47, 55, 0.18) !important;
  box-shadow: 0 12px 28px -10px rgba(114, 47, 55, 0.18) !important;
}
.material-card__header {
  padding: 16px 18px 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.material-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(33, 150, 243, 0.12);
  color: #1565c0;
}
.material-status.is-video { background: rgba(229, 57, 53, 0.12); color: #E53935; }
.material-status.is-doc { background: rgba(33, 150, 243, 0.12); color: #1565c0; }
.material-status.is-link { background: rgba(156, 39, 176, 0.12); color: #9c27b0; }
.material-date { font-size: 11px; color: var(--text-muted); font-weight: 600; }

.material-card__body { padding: 12px 18px; flex: 1; }
.material-titulo { font-size: 15px; font-weight: 700; margin: 0 0 6px; color: var(--text); }
.material-materia { font-size: 12px; color: var(--text-muted); margin: 0 0 8px; }
.material-descripcion {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 8px 0 0;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.material-card__footer {
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
