<script setup>
import { computed, ref, watch } from 'vue';
import {
  estaVencida,
  formatearFechaCorta,
  iconoPorArchivo,
  formatearBytes,
} from '../../utils/tareas.js';

const props = defineProps({
  abierto: { type: Boolean, default: false },
  tarea: { type: Object, default: null },
  archivo: { type: Object, default: null },
  comentario: { type: String, default: '' },
  subiendo: { type: Boolean, default: false },
  arrastrando: { type: Boolean, default: false },
  ahora: { type: Number, required: true },
});

const emit = defineEmits([
  'cerrar',
  'update:archivo',
  'update:comentario',
  'update:arrastrando',
  'subir',
]);

const referenciaInput = ref(null);

const vencida = computed(() => props.tarea ? estaVencida(props.tarea, props.ahora) : false);
const kicker = computed(() => vencida.value ? 'Entrega tardía' : 'Nueva entrega');
const fechaLimite = computed(() => formatearFechaCorta(props.tarea?.fecha_entrega));
const iconoArchivo = computed(() => props.archivo ? iconoPorArchivo(props.archivo.name) : 'insert_drive_file');
const tamanoArchivo = computed(() => props.archivo ? formatearBytes(props.archivo.size) : '');

function cerrar() { emit('cerrar'); }

function abrirSelectorArchivo() {
  referenciaInput.value?.click();
}

function alSeleccionarArchivo(evento) {
  const archivo = evento.target.files?.[0];
  if (archivo) emit('update:archivo', archivo);
}

function alSoltar(evento) {
  emit('update:arrastrando', false);
  const archivo = evento.dataTransfer?.files?.[0];
  if (archivo) emit('update:archivo', archivo);
}

function alArrastrarSobre() {
  emit('update:arrastrando', true);
}

function alSalirArrastre() {
  emit('update:arrastrando', false);
}

function quitarArchivo() {
  emit('update:archivo', null);
}

function alSubir() { emit('subir'); }

function actualizarComentario(evento) {
  emit('update:comentario', evento.target.value);
}

watch(() => props.abierto, (abierto) => {
  if (!abierto && referenciaInput.value) {
    referenciaInput.value.value = '';
  }
});
</script>

<template>
  <q-dialog :model-value="abierto" persistent @update:model-value="cerrar">
    <q-card class="entrega-dialog">
      <div class="entrega-top-bar"></div>

      <div class="entrega-header">
        <div class="entrega-header-info">
          <span class="entrega-kicker">{{ kicker }}</span>
          <h2 class="entrega-titulo">{{ tarea?.titulo || 'Entregar tarea' }}</h2>
          <p class="entrega-materia">{{ tarea?.materia_nombre }}</p>
        </div>
        <button class="entrega-close" @click="cerrar" type="button">
          <q-icon name="close" size="20px" />
        </button>
      </div>

      <div class="entrega-body">
        <div v-if="vencida" class="entrega-aviso">
          <q-icon name="schedule" size="18px" />
          <span>La fecha de entrega era el {{ fechaLimite }}. Tu trabajo se marcará como <strong>tardío</strong>.</span>
        </div>

        <div class="entrega-campo">
          <label class="entrega-label">¿Querés contarle algo a tu profe?</label>
          <textarea
            :value="comentario"
            class="entrega-textarea"
            placeholder="Opcional. Ej: 'Profe, no pude subir el archivo antes porque...'"
            rows="2"
            maxlength="500"
            @input="actualizarComentario"
          ></textarea>
        </div>

        <div class="entrega-campo">
          <label class="entrega-label">
            Archivo
            <span class="entrega-hint">PDF, DOCX, ZIP o imágenes · máx 10 MB</span>
          </label>

          <div
            v-if="!archivo"
            class="entrega-dropzone"
            :class="{ 'entrega-dropzone--hover': arrastrando }"
            @dragover.prevent="alArrastrarSobre"
            @dragleave.prevent="alSalirArrastre"
            @drop.prevent="alSoltar"
            @click="abrirSelectorArchivo"
          >
            <input
              ref="referenciaInput"
              type="file"
              style="display: none"
              @change="alSeleccionarArchivo"
            />
            <div class="entrega-dropzone-icon">
              <q-icon name="add" size="28px" />
            </div>
            <p class="entrega-dropzone-text">
              Arrastrá el archivo acá<br />
              <span>o hacé clic para buscarlo</span>
            </p>
          </div>

          <div v-else class="entrega-archivo">
            <div class="entrega-archivo-icon">
              <q-icon :name="iconoArchivo" size="24px" />
            </div>
            <div class="entrega-archivo-info">
              <div class="entrega-archivo-nombre">{{ archivo.name }}</div>
              <div class="entrega-archivo-tamano">{{ tamanoArchivo }}</div>
            </div>
            <button class="entrega-archivo-remove" @click="quitarArchivo" type="button">
              <q-icon name="close" size="18px" />
            </button>
          </div>
        </div>
      </div>

      <div class="entrega-footer">
        <button class="entrega-btn entrega-btn--ghost" @click="cerrar" type="button">
          Cancelar
        </button>
        <button
          class="entrega-btn entrega-btn--primary"
          :disabled="subiendo"
          @click="alSubir"
          type="button"
        >
          <q-spinner v-if="subiendo" size="16px" />
          <q-icon v-else name="send" size="16px" />
          {{ subiendo ? 'Enviando...' : 'Entregar' }}
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.entrega-dialog {
  width: 520px;
  max-width: 95vw;
  border-radius: 16px !important;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2) !important;
}
.entrega-top-bar {
  height: 4px;
  background: linear-gradient(90deg, var(--primary) 0%, #ff6b6b 100%);
}
.entrega-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px 16px;
  gap: 12px;
}
.entrega-header-info { flex: 1; min-width: 0; }
.entrega-kicker {
  display: inline-block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--primary);
  margin-bottom: 6px;
}
.entrega-titulo {
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 4px;
  color: var(--text);
  letter-spacing: -0.01em;
  line-height: 1.3;
  word-break: break-word;
}
.entrega-materia { font-size: 13px; color: var(--text-muted); margin: 0; }
.entrega-close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s ease;
  flex-shrink: 0;
}
.entrega-close:hover { background: var(--bg-hover); color: var(--text); }

.entrega-body {
  padding: 0 24px 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.entrega-aviso {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 14px;
  background: #fef3c7;
  border-radius: 10px;
  color: #92400e;
  font-size: 12.5px;
  line-height: 1.5;
  margin-bottom: 16px;
}
.entrega-aviso .q-icon { flex-shrink: 0; margin-top: 1px; }
.entrega-aviso strong { font-weight: 700; }

.entrega-campo { margin-bottom: 18px; }
.entrega-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}
.entrega-hint { font-size: 11.5px; font-weight: 400; color: var(--text-muted); }

.entrega-textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  font-family: inherit;
  font-size: 13px;
  color: var(--text);
  background: var(--bg-elevated);
  resize: vertical;
  min-height: 64px;
  max-height: 160px;
  transition: border-color 0.15s ease;
  line-height: 1.5;
}
.entrega-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}
.entrega-textarea::placeholder { color: var(--text-muted); font-style: italic; }

.entrega-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 24px 16px;
  border: 1.5px dashed var(--border);
  border-radius: 12px;
  cursor: pointer;
  background: var(--bg);
  transition: all 0.2s ease;
}
.entrega-dropzone:hover,
.entrega-dropzone--hover {
  border-color: var(--primary);
  background: var(--primary-soft);
  border-style: solid;
}
.entrega-dropzone-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-elevated);
  color: var(--primary);
  margin-bottom: 4px;
  transition: transform 0.2s ease;
}
.entrega-dropzone:hover .entrega-dropzone-icon { transform: scale(1.1); }
.entrega-dropzone-text {
  margin: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.4;
}
.entrega-dropzone-text span {
  display: block;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
  margin-top: 2px;
}

.entrega-archivo {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1.5px solid var(--primary);
  border-radius: 12px;
  background: var(--primary-soft);
}
.entrega-archivo-icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: white;
  color: var(--primary);
  flex-shrink: 0;
}
.entrega-archivo-info { flex: 1; min-width: 0; }
.entrega-archivo-nombre {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.entrega-archivo-tamano { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
.entrega-archivo-remove {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.15s ease;
}
.entrega-archivo-remove:hover { background: rgba(0, 0, 0, 0.06); color: var(--text); }

.entrega-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  background: var(--bg);
  border-top: 1px solid var(--border);
}
.entrega-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 600;
  border-radius: 10px;
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}
.entrega-btn--ghost { background: transparent; color: var(--text-muted); }
.entrega-btn--ghost:hover { background: var(--bg-hover); color: var(--text); }
.entrega-btn--primary { background: var(--primary); color: white; }
.entrega-btn--primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
.entrega-btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

@media (max-width: 600px) {
  .entrega-dialog { width: 95vw; }
  .entrega-header,
  .entrega-body { padding-left: 18px; padding-right: 18px; }
  .entrega-footer { padding: 14px 18px; flex-direction: column-reverse; }
  .entrega-btn { width: 100%; justify-content: center; }
}
</style>
