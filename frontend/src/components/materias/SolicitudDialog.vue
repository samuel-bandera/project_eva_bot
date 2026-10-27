<template>
  <q-dialog :model-value="modelValue" persistent @update:model-value="emitirCierre">
    <q-card class="solicitud-card">
      <button class="close-btn" @click="emitirCierre(false)" :disabled="enviando">
        <q-icon name="close" size="18px" />
      </button>
      <div class="header">
        <div class="icon-wrapper">
          <q-icon name="send" size="22px" color="white" />
        </div>
        <h2 class="title">Solicitar inscripción</h2>
        <p class="subtitle">
          {{ nombreMateria }}<span v-if="codigoMateria"> · {{ codigoMateria }}</span>
        </p>
      </div>
      <div class="body">
        <q-input
          v-model="mensaje"
          outlined
          type="textarea"
          label="Mensaje para el docente (opcional)"
          placeholder="Contale por qué querés inscribirte..."
          :disable="enviando"
          autogrow
          maxlength="1000"
          class="textarea"
        />
        <p class="hint">
          <q-icon name="info" size="14px" /> El docente recibirá tu solicitud y podrá aprobarla o rechazarla.
        </p>
      </div>
      <div class="footer">
        <button class="primary-btn" @click="enviar" :disabled="enviando">
          <q-spinner v-if="enviando" size="16px" color="white" class="q-mr-sm" />
          <span>{{ enviando ? 'Enviando...' : 'Enviar solicitud' }}</span>
        </button>
      </div>
    </q-card>
  </q-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useQuasar } from 'quasar';
import * as alumnoApi from '../../api/alumno.api.js';

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  materia: { type: Object, default: null }
});
const emit = defineEmits(['update:modelValue', 'solicitudEnviada']);
const $q = useQuasar();

const mensaje = ref('');
const enviando = ref(false);

const nombreMateria = computed(() => {
  if (!props.materia) return '';
  return props.materia.nombre || props.materia.materia_nombre || '';
});
const codigoMateria = computed(() => {
  if (!props.materia) return '';
  return props.materia.codigo || props.materia.materia_codigo || '';
});

watch(() => props.modelValue, (abierto) => {
  if (!abierto) mensaje.value = '';
});

function emitirCierre(valor) {
  emit('update:modelValue', valor);
}

async function enviar() {
  if (!props.materia) return;
  enviando.value = true;
  try {
    const idMateria = props.materia.id || props.materia.materia_id;
    await alumnoApi.solicitarMateria(idMateria, mensaje.value.trim() || null);
    $q.notify({ type: 'positive', message: 'Solicitud enviada. Esperá la respuesta del docente.', position: 'bottom' });
    emit('solicitudEnviada');
    emitirCierre(false);
  } catch (error) {
    const msg = error.response && error.response.data && error.response.data.error
      ? error.response.data.error
      : 'Error al enviar solicitud';
    $q.notify({ type: 'negative', message: msg, position: 'bottom' });
  } finally {
    enviando.value = false;
  }
}
</script>

<style scoped>
.solicitud-card {
  width: 460px;
  max-width: 95vw;
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
  z-index: 1;
}
.close-btn:hover { background: var(--bg-hover); color: var(--text); }
.close-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.header {
  padding: 28px 28px 16px 28px;
  text-align: center;
}
.icon-wrapper {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  display: inline-grid;
  place-items: center;
  margin-bottom: 12px;
  box-shadow: 0 6px 20px color-mix(in srgb, var(--primary) 30%, transparent);
}
.title {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 6px 0;
  color: var(--text);
  letter-spacing: -0.3px;
}
.subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.4;
}
.body { padding: 0 28px 8px 28px; }
.textarea :deep(.q-field__control) { border-radius: 12px; }
.hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  margin: 12px 0 0 0;
  line-height: 1.4;
}
.footer { padding: 16px 28px 24px 28px; }
.primary-btn {
  width: 100%;
  padding: 14px 20px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: var(--primary-foreground);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease, transform 0.1s ease;
  box-shadow: 0 4px 14px color-mix(in srgb, var(--primary) 30%, transparent);
}
.primary-btn:hover:not(:disabled) { opacity: 0.95; }
.primary-btn:active:not(:disabled) { transform: scale(0.98); }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
