<script setup>
import { computed } from 'vue';
import {
  estaVencida,
  estaEntregada,
  aceptaTardia,
  estadoTarea,
  estadoLabel,
  estadoIcono,
  venceTexto,
  formatearFechaCorta,
} from '../../utils/tareas.js';

const props = defineProps({
  tarea: { type: Object, required: true },
  ahora: { type: Number, required: true },
});

const emit = defineEmits(['entregar', 'ver-entrega']);

const estadoActual = computed(() => estadoTarea(props.tarea, props.ahora));
const etiquetaEstado = computed(() => estadoLabel(props.tarea, props.ahora));
const iconoEstado = computed(() => estadoIcono(props.tarea, props.ahora));
const vencida = computed(() => estaVencida(props.tarea, props.ahora));
const entregada = computed(() => estaEntregada(props.tarea));
const aceptaTardiaActual = computed(() => aceptaTardia(props.tarea));
const textoVence = computed(() => venceTexto(props.tarea.fecha_entrega, props.ahora));
const fechaVence = computed(() => formatearFechaCorta(props.tarea.fecha_entrega));
const fechaEntregada = computed(() => formatearFechaCorta(props.tarea.entrega_fecha));

function alEntregar() { emit('entregar', props.tarea); }
function alVerEntrega() { emit('ver-entrega', props.tarea); }
</script>

<template>
  <q-card class="tarea-card" flat>
    <div class="tarea-card__header">
      <div :class="['tarea-status', 'tarea-status--' + estadoActual]">
        <q-icon :name="iconoEstado" size="14px" />
        {{ etiquetaEstado }}
      </div>
    </div>
    <div class="tarea-card__body">
      <h3 class="tarea-titulo">{{ tarea.titulo }}</h3>
      <p class="tarea-materia">{{ tarea.materia_nombre }}</p>
      <p v-if="tarea.descripcion" class="tarea-descripcion">{{ tarea.descripcion }}</p>
    </div>
    <div class="tarea-card__footer">
      <div class="tarea-meta">
        <q-icon name="event" size="16px" />
        {{ fechaVence }}
      </div>
      <div v-if="!entregada" :class="['tarea-meta', 'tarea-meta--' + estadoActual]">
        <q-icon :name="iconoEstado" size="16px" />
        <span>{{ textoVence }}</span>
      </div>
      <div v-else class="tarea-meta tarea-meta--entregada">
        <q-icon name="check_circle" size="16px" />
        <span>Entregada el {{ fechaEntregada }}</span>
      </div>
    </div>
    <q-card-actions class="tarea-card__actions">
      <q-btn
        v-if="entregada"
        outline rounded no-caps color="primary" icon="check_circle"
        label="Ver entrega" class="full-width tarea-btn" @click="alVerEntrega"
      />
      <q-btn
        v-else-if="vencida && !aceptaTardiaActual"
        outline rounded no-caps color="grey-6" icon="lock"
        label="Vencida" class="full-width tarea-btn" disable
      />
      <q-btn
        v-else-if="vencida && aceptaTardiaActual"
        unelevated rounded no-caps color="warning" icon="update"
        label="Entregar tarde" class="full-width tarea-btn" @click="alEntregar"
      />
      <q-btn
        v-else
        unelevated rounded no-caps color="primary" icon="upload"
        label="Entregar" class="full-width tarea-btn" @click="alEntregar"
      />
    </q-card-actions>
  </q-card>
</template>

<style scoped>
.tarea-card {
  border-radius: 18px !important;
  border: 1px solid rgba(0, 0, 0, 0.06) !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04) !important;
  background: var(--bg-elevated) !important;
  height: 100%;
  display: flex;
  flex-direction: column;
  transition: all 0.3s;
}
.tarea-card:hover {
  transform: translateY(-3px);
  border-color: rgba(114, 47, 55, 0.18) !important;
  box-shadow: 0 12px 28px -10px rgba(114, 47, 55, 0.18) !important;
}
.tarea-card__header { padding: 16px 18px 0; }
.tarea-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 11px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.tarea-status--pendiente { background: rgba(46, 125, 50, 0.12); color: #2e7d32; }
.tarea-status--proxima { background: rgba(245, 124, 0, 0.12); color: #e65100; }
.tarea-status--urgente { background: rgba(198, 40, 40, 0.12); color: #c62828; }
.tarea-status--vencida { background: rgba(120, 120, 120, 0.12); color: #6b6b6b; }
.tarea-status--entregada { background: rgba(33, 150, 243, 0.12); color: #1565c0; }
.tarea-status--tardia { background: rgba(245, 158, 11, 0.12); color: #92400e; }
.tarea-status--entregada_tarde { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }

.tarea-card__body { padding: 12px 18px; flex: 1; }
.tarea-titulo { font-size: 15px; font-weight: 700; margin: 0 0 6px; color: var(--text); }
.tarea-materia { font-size: 12px; color: var(--text-muted); margin: 0 0 8px; }
.tarea-descripcion {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.tarea-card__footer {
  padding: 12px 18px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tarea-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}
.tarea-meta--urgente { color: #c62828; }
.tarea-meta--proxima { color: #e65100; }
.tarea-meta--entregada { color: #2e7d32; }
.tarea-meta--entregada_tarde { color: #1d4ed8; }

.tarea-card__actions { padding: 14px 18px 16px !important; }
.tarea-btn {
  font-weight: 600 !important;
  text-transform: none !important;
  letter-spacing: -0.005em !important;
  height: 42px !important;
  border-radius: 12px !important;
  font-size: 13px !important;
}
</style>
