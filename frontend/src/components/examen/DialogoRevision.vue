<script setup>
import { computed } from 'vue';

const props = defineProps({
  abierto: { type: Boolean, required: true },
  datos: { type: Object, default: null },
});

const emit = defineEmits(['cerrar']);

function cerrar() { emit('cerrar'); }
function esCorrecta(r) {
  return String(r.respuesta || '').trim() === String(r.respuesta_correcta || '').trim();
}
function textoRespuesta(r) {
  return r.respuesta || '(sin responder)';
}
</script>

<template>
  <q-dialog :model-value="abierto" maximized @update:model-value="cerrar">
    <q-card class="revision-card">
      <q-card-section class="row items-center justify-between bg-primary text-white">
        <div class="text-h6 text-weight-bold">Tus respuestas</div>
        <q-btn flat round dense icon="close" @click="cerrar" />
      </q-card-section>
      <q-card-section v-if="!datos" class="text-center q-pa-xl">
        <q-spinner color="primary" size="40px" />
        <div class="text-grey-7 q-mt-md">Cargando…</div>
      </q-card-section>
      <q-card-section v-else class="revision-lista">
        <div
          v-for="(r, i) in datos.respuestas"
          :key="r.id"
          class="revision-item"
          :class="{ 'es-correcta': esCorrecta(r), 'es-incorrecta': !esCorrecta(r) }"
        >
          <div class="revision-header">
            <span class="revision-numero">{{ i + 1 }}</span>
            <q-icon
              :name="esCorrecta(r) ? 'check_circle' : 'cancel'"
              :color="esCorrecta(r) ? 'positive' : 'negative'"
              size="22px"
            />
            <span class="text-caption text-grey-7 q-ml-auto">{{ r.puntaje }} pts</span>
          </div>
          <div class="revision-pregunta">{{ r.pregunta }}</div>
          <div class="revision-respuestas">
            <div class="revision-linea">
              <span class="revision-label">Tu respuesta:</span>
              <span class="revision-valor">{{ textoRespuesta(r) }}</span>
            </div>
            <div v-if="!esCorrecta(r)" class="revision-linea">
              <span class="revision-label">Correcta:</span>
              <span class="revision-valor correcta">{{ r.respuesta_correcta }}</span>
            </div>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.revision-card {
  max-width: 800px;
  margin: auto;
}
.revision-lista {
  padding: 16px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
.revision-item {
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  margin-bottom: 12px;
  background: var(--bg-elevated);
}
.revision-item.es-correcta {
  border-left: 4px solid #2e7d32;
  background: rgba(46, 125, 50, 0.04);
}
.revision-item.es-incorrecta {
  border-left: 4px solid #c62828;
  background: rgba(198, 40, 40, 0.04);
}
.revision-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}
.revision-numero {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary);
  font-weight: 800;
  font-size: 13px;
}
.revision-pregunta {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
  line-height: 1.5;
}
.revision-linea {
  display: flex;
  gap: 8px;
  font-size: 13px;
  margin-bottom: 4px;
}
.revision-label {
  color: var(--text-muted);
  min-width: 110px;
  font-weight: 600;
}
.revision-valor {
  color: var(--text);
  font-weight: 500;
}
.revision-valor.correcta {
  color: #2e7d32;
  font-weight: 700;
}
</style>
