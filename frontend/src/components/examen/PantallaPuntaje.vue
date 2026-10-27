<script setup>
defineProps({
  abierto: { type: Boolean, required: true },
  datos: { type: Object, default: null },
});

const emit = defineEmits(['ver-respuestas', 'volver']);

function verRespuestas() { emit('ver-respuestas'); }
function volver() { emit('volver'); }
</script>

<template>
  <q-dialog :model-value="abierto" persistent maximized transition-show="fade">
    <q-card class="pantalla-puntaje">
      <q-card-section class="column items-center text-center q-pa-xl">
        <q-icon name="emoji_events" size="80px" color="primary" class="q-mb-md" />
        <div class="text-h5 text-weight-bold q-mb-md">¡Examen enviado!</div>
        <div class="puntaje-card">
          <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Tu nota</div>
          <div class="puntaje-grande">
            {{ datos?.nota?.toFixed(2) || '0.00' }}
          </div>
          <div class="text-caption text-grey-7">sobre {{ datos?.notaMaxima || 10 }}</div>
          <q-separator class="q-my-md" />
          <div class="text-body2">
            {{ datos?.totalRespondidas || 0 }} de {{ datos?.totalPreguntas || 0 }} preguntas respondidas
          </div>
        </div>
        <div class="row q-gutter-md q-mt-lg">
          <q-btn outline no-caps color="primary" icon="visibility" label="Ver mis respuestas" @click="verRespuestas" />
          <q-btn unelevated no-caps color="primary" icon="home" label="Volver a evaluaciones" @click="volver" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.pantalla-puntaje {
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
}
.puntaje-card {
  background: var(--bg-elevated);
  border: 2px solid var(--primary);
  border-radius: 20px;
  padding: 28px 40px;
  min-width: 280px;
  box-shadow: 0 20px 60px -20px rgba(114, 47, 55, 0.4);
}
.puntaje-grande {
  font-size: 64px;
  font-weight: 900;
  color: var(--primary);
  line-height: 1;
  margin: 8px 0 4px 0;
  font-variant-numeric: tabular-nums;
}
@media (max-width: 899px) {
  .puntaje-grande { font-size: 52px; }
}
</style>
