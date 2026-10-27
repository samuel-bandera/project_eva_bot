<script setup>
import { computed } from 'vue';

const props = defineProps({
  pregunta: { type: Object, required: true },
  respuestaActual: { type: String, default: '' },
  guardando: { type: Boolean, default: false },
  ultimoGuardado: { type: Date, default: null },
  indiceActual: { type: Number, required: true },
  totalPreguntas: { type: Number, required: true },
});

const emit = defineEmits([
  'seleccionar-opcion',
  'marcar-vf',
  'actualizar-respuesta',
  'anterior',
  'siguiente',
]);

const esMultipleChoice = computed(() => props.pregunta.tipo === 'multiple_choice' && props.pregunta.opciones?.length);
const esVerdaderoFalso = computed(() => props.pregunta.tipo === 'true_false');
const esDesarrollo = computed(() => !esMultipleChoice.value && !esVerdaderoFalso.value);

const etiquetaTipo = computed(() => {
  if (props.pregunta.tipo === 'multiple_choice') return 'Opción múltiple';
  if (props.pregunta.tipo === 'true_false') return 'Verdadero / Falso';
  return 'Desarrollo';
});

const horaGuardado = computed(() => {
  if (!props.ultimoGuardado) return '';
  return props.ultimoGuardado.toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit' });
});

const puedeIrAnterior = computed(() => props.indiceActual > 0);
const puedeIrSiguiente = computed(() => props.indiceActual < props.totalPreguntas - 1);

function letraOpcion(i) {
  return ['A', 'B', 'C', 'D', 'E', 'F'][i] || String(i + 1);
}

function seleccionarOpcion(opcion) { emit('seleccionar-opcion', opcion); }
function marcarVerdaderoFalso(valor) { emit('marcar-vf', valor); }
function actualizarRespuesta(valor) { emit('actualizar-respuesta', valor); }
function irAnterior() { emit('anterior'); }
function irSiguiente() { emit('siguiente'); }
</script>

<template>
  <q-card flat bordered>
    <q-card-section>
      <div class="row items-center justify-between q-mb-md">
        <div class="text-caption text-primary text-uppercase text-weight-bold etiqueta-pregunta">
          Pregunta {{ indiceActual + 1 }} de {{ totalPreguntas }}
        </div>
        <div class="row q-gutter-sm">
          <q-badge outline color="grey-7">{{ etiquetaTipo }}</q-badge>
          <q-badge v-if="pregunta.puntaje" color="warning">
            {{ pregunta.puntaje }} pts
          </q-badge>
        </div>
      </div>

      <div class="text-h6 text-weight-medium q-mb-lg texto-pregunta">
        {{ pregunta.pregunta }}
      </div>

      <div v-if="esMultipleChoice" class="column q-gutter-sm">
        <q-btn
          v-for="(op, i) in pregunta.opciones"
          :key="i"
          :outline="respuestaActual !== op"
          :unelevated="respuestaActual === op"
          :color="respuestaActual === op ? 'primary' : 'grey-7'"
          :text-color="respuestaActual === op ? 'white' : 'grey-9'"
          no-caps
          class="mc-btn"
          @click="seleccionarOpcion(op)"
        >
          <div class="row items-center full-width q-py-xs">
            <div class="mc-letter" :class="respuestaActual === op ? 'bg-white text-primary' : 'bg-grey-3 text-grey-9'">
              {{ letraOpcion(i) }}
            </div>
            <div class="col text-left q-ml-md">{{ op }}</div>
            <q-icon v-if="respuestaActual === op" name="check_circle" size="24px" />
          </div>
        </q-btn>
      </div>

      <div v-else-if="esVerdaderoFalso" class="row q-col-gutter-md">
        <div class="col-12 col-sm-6">
          <q-btn
            :unelevated="respuestaActual === 'Verdadero'"
            :outline="respuestaActual !== 'Verdadero'"
            :color="respuestaActual === 'Verdadero' ? 'positive' : 'grey-7'"
            :text-color="respuestaActual === 'Verdadero' ? 'white' : 'grey-9'"
            icon="check"
            label="Verdadero"
            no-caps
            class="tf-btn"
            @click="marcarVerdaderoFalso('Verdadero')"
          />
        </div>
        <div class="col-12 col-sm-6">
          <q-btn
            :unelevated="respuestaActual === 'Falso'"
            :outline="respuestaActual !== 'Falso'"
            :color="respuestaActual === 'Falso' ? 'negative' : 'grey-7'"
            :text-color="respuestaActual === 'Falso' ? 'white' : 'grey-9'"
            icon="close"
            label="Falso"
            no-caps
            class="tf-btn"
            @click="marcarVerdaderoFalso('Falso')"
          />
        </div>
      </div>

      <q-input
        v-else-if="esDesarrollo"
        :model-value="respuestaActual"
        outlined
        type="textarea"
        rows="6"
        placeholder="Escribí tu respuesta acá…"
        @update:model-value="actualizarRespuesta"
      />

      <q-separator class="q-my-md" />

      <div class="row items-center justify-between">
        <div class="text-caption text-grey-7">
          <template v-if="guardando">
            <q-spinner size="14px" color="primary" class="q-mr-xs" />
            Guardando…
          </template>
          <template v-else-if="ultimoGuardado">
            <q-icon name="check_circle" size="14px" color="positive" class="q-mr-xs" />
            Guardado {{ horaGuardado }}
          </template>
          <template v-else>
            <q-icon name="save" size="14px" class="q-mr-xs" />
            El guardado es automático
          </template>
        </div>

        <div class="row q-gutter-sm">
          <q-btn
            outline
            no-caps
            color="grey-7"
            icon="arrow_back"
            label="Anterior"
            :disable="!puedeIrAnterior"
            @click="irAnterior"
          />
          <q-btn
            unelevated
            no-caps
            color="primary"
            icon-right="arrow_forward"
            label="Siguiente"
            :disable="!puedeIrSiguiente"
            @click="irSiguiente"
          />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<style scoped>
.etiqueta-pregunta { letter-spacing: 0.1em; }
.texto-pregunta { white-space: pre-wrap; }

.mc-btn {
  width: 100%;
  padding: 12px 16px;
  border-radius: 12px;
  text-transform: none;
}
.mc-letter {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 14px;
  flex-shrink: 0;
}
.tf-btn {
  width: 100%;
  padding: 20px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 700;
}

@media (max-width: 899px) {
  .mc-btn { padding: 10px 12px; }
}
</style>
