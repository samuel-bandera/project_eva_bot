<script setup>
import { computed } from 'vue';

const props = defineProps({
  preguntas: { type: Array, required: true },
  respuestas: { type: Object, required: true },
  indiceActual: { type: Number, required: true },
});

const emit = defineEmits(['ir-a']);

function estaRespondida(pregunta) {
  return !!(props.respuestas[pregunta.id] && String(props.respuestas[pregunta.id]).trim());
}

function colorBoton(i, pregunta) {
  if (i === props.indiceActual) return 'primary';
  if (estaRespondida(pregunta)) return 'positive';
  return 'grey-4';
}

function textColorBoton(i, pregunta) {
  if (i === props.indiceActual) return 'white';
  if (estaRespondida(pregunta)) return 'white';
  return 'grey-8';
}

function esUnelevated(i, pregunta) {
  return i === props.indiceActual || estaRespondida(pregunta);
}

function esOutline(i, pregunta) {
  return i !== props.indiceActual && !estaRespondida(pregunta);
}

function ir(i) { emit('ir-a', i); }
</script>

<template>
  <div>
    <q-card flat bordered class="fit">
      <q-card-section>
        <div class="text-caption text-uppercase text-grey-7 text-weight-bold q-mb-sm">
          Preguntas
        </div>
        <div class="q-grid">
          <q-btn
            v-for="(p, i) in preguntas"
            :key="p.id"
            :color="colorBoton(i, p)"
            :text-color="textColorBoton(i, p)"
            :unelevated="esUnelevated(i, p)"
            :outline="esOutline(i, p)"
            :label="String(i + 1)"
            dense
            no-caps
            class="q-grid-btn"
            @click="ir(i)"
          />
        </div>

        <q-separator class="q-my-md" />

        <div class="column q-gutter-xs text-caption text-grey-7">
          <div class="row items-center q-gutter-sm">
            <div class="legend-dot bg-primary"></div>
            <span>Actual</span>
          </div>
          <div class="row items-center q-gutter-sm">
            <div class="legend-dot bg-positive"></div>
            <span>Respondida</span>
          </div>
          <div class="row items-center q-gutter-sm">
            <div class="legend-dot bg-grey-4"></div>
            <span>Sin responder</span>
          </div>
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<style scoped>
.q-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}
.q-grid-btn {
  min-width: 0;
  aspect-ratio: 1;
  font-weight: 700;
}
.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}
@media (max-width: 960px) {
  .q-grid { grid-template-columns: repeat(8, 1fr); }
}
@media (max-width: 640px) {
  .q-grid { grid-template-columns: repeat(6, 1fr); }
}
</style>
