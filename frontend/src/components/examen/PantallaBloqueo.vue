<script setup>
import { computed } from 'vue';

const props = defineProps({
  abierto: { type: Boolean, required: true },
  motivo: { type: String, default: '' },
});

const emit = defineEmits(['volver']);

const textoMotivo = computed(() => {
  switch (props.motivo) {
    case 'salida_pagina':
      return 'La evaluación se cerró automáticamente porque detectamos que saliste de la pantalla.';
    case 'tiempo_agotado':
      return 'Se agotó el tiempo disponible para completar la evaluación.';
    case 'cierre_docente':
      return 'El docente cerró la evaluación.';
    case 'abandono':
      return 'La evaluación se cerró por inactividad.';
    case 'ya_enviada':
      return 'Esta evaluación ya fue enviada anteriormente.';
    default:
      return props.motivo || 'La evaluación ya no está disponible.';
  }
});

function volver() { emit('volver'); }
</script>

<template>
  <q-dialog :model-value="abierto" persistent maximized>
    <q-card class="pantalla-bloqueo">
      <q-card-section class="column items-center text-center q-pa-xl">
        <div class="bloqueo-icono">
          <q-icon name="lock" size="72px" color="white" />
        </div>
        <div class="text-h4 text-weight-bold text-white q-mt-lg q-mb-md">
          Evaluación finalizada
        </div>
        <div class="bloqueo-motivo text-white q-mb-lg">
          {{ textoMotivo }}
        </div>
        <div class="bloqueo-card">
          <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Contactá al docente</div>
          <div class="text-body2 text-grey-8 q-mt-xs">
            Si creés que es un error, comunicate con tu docente o coordinador para revisar tu situación.
          </div>
        </div>
        <q-btn
          unelevated no-caps color="white" text-color="primary" icon="home"
          label="Volver a evaluaciones" class="q-mt-lg" @click="volver"
        />
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.pantalla-bloqueo {
  background: linear-gradient(135deg, var(--primary) 0%, #4a1e24 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}
.bloqueo-icono {
  display: grid;
  place-items: center;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.15);
  animation: bloqueo-pulse 2s ease-in-out infinite;
}
.bloqueo-motivo {
  font-size: 16px;
  line-height: 1.6;
  max-width: 480px;
  opacity: 0.95;
}
.bloqueo-card {
  background: rgba(255, 255, 255, 0.95);
  padding: 20px 28px;
  border-radius: 16px;
  max-width: 480px;
  text-align: left;
}
@keyframes bloqueo-pulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.3); }
  50% { transform: scale(1.05); box-shadow: 0 0 0 20px rgba(255, 255, 255, 0); }
}
</style>
