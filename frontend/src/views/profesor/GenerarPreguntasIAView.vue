<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import * as iaApi from '../../api/ia.api.js';
import * as evalApi from '../../api/evaluacion.api.js';

const router = useRouter();

const cargando = ref(false);
const generando = ref(false);
const guardando = ref(false);
const mensajeError = ref('');
const estadoIa = ref({ configurada: false });
const evaluaciones = ref([]);
const preguntas = ref([]);

const form = ref({
  tema: '',
  cantidad: 5,
  tipo: 'multiple_choice',
  dificultad: 'media',
  contexto: '',
  evaluacionId: null,
});

const tipos = [
  { value: 'multiple_choice', label: 'Opción múltiple' },
  { value: 'true_false', label: 'Verdadero / Falso' },
  { value: 'short_answer', label: 'Respuesta corta' },
];

const dificultades = [
  { value: 'facil', label: 'Fácil' },
  { value: 'media', label: 'Media' },
  { value: 'dificil', label: 'Difícil' },
];

const puedeGenerar = computed(() =>
  estadoIa.value.configurada
  && form.value.tema.trim().length >= 3
  && !generando.value
);

const puedeGuardar = computed(() =>
  preguntas.value.length > 0
  && form.value.evaluacionId
  && !guardando.value
);

function actualizarPregunta(i, campo, valor) {
  if (preguntas.value[i]) preguntas.value[i][campo] = valor;
}

function actualizarOpcion(i, j, valor) {
  if (preguntas.value[i]?.opciones?.[j] !== undefined) {
    preguntas.value[i].opciones[j] = valor;
  }
}

function eliminarPregunta(i) {
  preguntas.value.splice(i, 1);
}

async function generar() {
  if (!puedeGenerar.value) return;
  mensajeError.value = '';
  generando.value = true;
  try {
    const respuesta = await iaApi.generarPreguntas({
      tema: form.value.tema.trim(),
      cantidad: Number(form.value.cantidad) || 5,
      tipo: form.value.tipo,
      dificultad: form.value.dificultad,
      contexto: form.value.contexto.trim() || null,
    });
    preguntas.value = respuesta.preguntas || [];
    Notify.create({
      type: 'positive',
      message: `${preguntas.value.length} preguntas generadas`,
      position: 'top',
    });
  } catch (e) {
    mensajeError.value = e.response?.data?.error || e.message || 'Error al generar';
    Notify.create({ type: 'negative', message: mensajeError.value, position: 'top' });
  } finally {
    generando.value = false;
  }
}

async function guardar() {
  if (!puedeGuardar.value) return;
  guardando.value = true;
  try {
    const evaluacionId = form.value.evaluacionId;
    let guardadas = 0;
    for (let i = 0; i < preguntas.value.length; i++) {
      const preguntaGenerada = preguntas.value[i];
      try {
        await evalApi.agregarPregunta(evaluacionId, {
          pregunta: preguntaGenerada.pregunta,
          respuesta_correcta: preguntaGenerada.respuesta_correcta,
          tipo: preguntaGenerada.tipo || form.value.tipo,
          puntaje: Number(preguntaGenerada.puntaje) || 1,
          opciones: Array.isArray(preguntaGenerada.opciones) ? preguntaGenerada.opciones : null,
          orden: 1000 + i,
        });
        guardadas++;
      } catch (e) {
        console.warn('Error guardando pregunta', i, e.message);
      }
    }
    Notify.create({
      type: 'positive',
      message: `${guardadas}/${preguntas.value.length} preguntas guardadas en la evaluación`,
      position: 'top',
      timeout: 4000,
    });
    router.push('/docente/evaluaciones');
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error al guardar', position: 'top' });
  } finally {
    guardando.value = false;
  }
}

async function cargarDatos() {
  cargando.value = true;
  try {
    const [estadoActual, listaEvaluaciones] = await Promise.all([
      iaApi.estado().catch(() => ({ configurada: false })),
      evalApi.listarMisEvaluacionesProfesor().catch(() => []),
    ]);
    estadoIa.value = estadoActual || { configurada: false };
    evaluaciones.value = (listaEvaluaciones || []).filter(e => ['borrador', 'publicada'].includes(e.estado));
  } catch (e) {
    console.error(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargarDatos);
</script>

<template>
  <q-page class="q-pa-md ia-page">
    <div class="page-head q-mb-md">
      <q-btn flat round dense icon="arrow_back" color="primary" @click="router.push('/docente/evaluaciones')" />
      <div>
        <div class="page-title">Generar preguntas con IA</div>
        <div class="page-sub">Usá inteligencia artificial para crear preguntas de evaluación</div>
      </div>
    </div>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-banner v-if="!cargando && !estadoIa.configurada" dense class="bg-warning text-white q-mb-md" rounded>
      <template #avatar><q-icon name="warning" /></template>
      IA no configurada. Agregá una API key en <code>backend/.env</code>:
      <code>OPENAI_API_KEY</code>, <code>ANTHROPIC_API_KEY</code> o <code>GEMINI_API_KEY</code>.
    </q-banner>

    <q-banner v-if="!cargando && estadoIa.configurada" dense class="bg-positive text-white q-mb-md" rounded>
      <template #avatar><q-icon name="check_circle" /></template>
      Proveedor activo: <strong>{{ estadoIa.proveedor }}</strong> · Modelo: <code>{{ estadoIa.modelos?.[estadoIa.proveedor] }}</code>
    </q-banner>

    <q-card flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md">
          <div class="col-12 col-md-6">
            <q-input
              v-model="form.tema"
              outlined dense
              label="Tema *"
              placeholder="Ej: Álgebra lineal, Revolución Francesa, SQL básico"
              :disable="!estadoIa.configurada || generando"
            />
          </div>
          <div class="col-6 col-md-3">
            <q-input
              v-model.number="form.cantidad"
              type="number" outlined dense
              label="Cantidad"
              min="1" max="20"
              :disable="!estadoIa.configurada || generando"
            />
          </div>
          <div class="col-6 col-md-3">
            <q-select
              v-model="form.tipo"
              outlined dense
              :options="tipos"
              option-value="value" option-label="label"
              emit-value map-options
              label="Tipo"
              :disable="!estadoIa.configurada || generando"
            />
          </div>
          <div class="col-6 col-md-3">
            <q-select
              v-model="form.dificultad"
              outlined dense
              :options="dificultades"
              option-value="value" option-label="label"
              emit-value map-options
              label="Dificultad"
              :disable="!estadoIa.configurada || generando"
            />
          </div>
          <div class="col-12">
            <q-input
              v-model="form.contexto"
              outlined dense
              type="textarea" rows="2"
              label="Contexto adicional (opcional)"
              placeholder="Ej: Enfocate en ejemplos prácticos, usá fórmulas, etc."
              :disable="!estadoIa.configurada || generando"
            />
          </div>
        </div>
      </q-card-section>
      <q-card-actions align="right">
        <q-btn
          unelevated no-caps
          color="primary"
          icon="auto_awesome"
          label="Generar preguntas"
          :disable="!puedeGenerar"
          :loading="generando"
          @click="generar"
        />
      </q-card-actions>
    </q-card>

    <q-banner v-if="mensajeError" dense class="bg-negative text-white q-mb-md" rounded>
      <template #avatar><q-icon name="error" /></template>
      {{ mensajeError }}
    </q-banner>

    <div v-if="preguntas.length" class="q-mb-md">
      <div class="text-h6 q-mb-sm">{{ preguntas.length }} preguntas generadas (editables)</div>
      <div v-for="(preguntaGenerada, i) in preguntas" :key="i" class="q-card q-pa-md q-mb-sm pregunta-preview">
        <div class="row items-center justify-between q-mb-sm">
          <div class="text-caption text-grey-7">Pregunta {{ i + 1 }}</div>
          <q-btn flat round dense icon="delete" color="negative" @click="eliminarPregunta(i)" />
        </div>
        <q-input
          :model-value="preguntaGenerada.pregunta"
          outlined dense
          label="Pregunta"
          @update:model-value="valor => actualizarPregunta(i, 'pregunta', valor)"
        />
        <div v-if="Array.isArray(preguntaGenerada.opciones)" class="q-mt-sm">
          <div v-for="(opcion, j) in preguntaGenerada.opciones" :key="j" class="row items-center q-mb-xs">
            <div
              class="opcion-marker q-mr-sm"
              :class="{ correcta: opcion === preguntaGenerada.respuesta_correcta }"
            >{{ String.fromCharCode(65 + j) }}</div>
            <q-input
              :model-value="opcion"
              outlined dense
              class="col"
              @update:model-value="valor => actualizarOpcion(i, j, valor)"
            />
            <q-btn
              flat dense round
              :icon="opcion === preguntaGenerada.respuesta_correcta ? 'check_circle' : 'radio_button_unchecked'"
              :color="opcion === preguntaGenerada.respuesta_correcta ? 'positive' : 'grey'"
              @click="actualizarPregunta(i, 'respuesta_correcta', opcion)"
            >
              <q-tooltip>Marcar como correcta</q-tooltip>
            </q-btn>
          </div>
        </div>
        <q-input
          v-else
          :model-value="preguntaGenerada.respuesta_correcta"
          outlined dense
          label="Respuesta correcta"
          class="q-mt-sm"
          @update:model-value="valor => actualizarPregunta(i, 'respuesta_correcta', valor)"
        />
      </div>
    </div>

    <q-card v-if="preguntas.length" flat bordered class="q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-8">
            <q-select
              v-model="form.evaluacionId"
              outlined dense
              :options="evaluaciones"
              option-value="id" option-label="titulo"
              emit-value map-options
              label="Guardar en evaluación (borrador/publicada)"
              :hint="evaluaciones.length === 0 ? 'No tenés evaluaciones en estado borrador/publicada' : ''"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-btn
              unelevated no-caps
              color="primary"
              icon="save"
              label="Guardar preguntas"
              class="full-width"
              :disable="!puedeGuardar"
              :loading="guardando"
              @click="guardar"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<style scoped>
.ia-page { max-width: 1000px; margin: 0 auto; }
.page-head { display: flex; align-items: center; gap: 12px; }
.page-title { font-size: 22px; font-weight: 800; color: var(--text); letter-spacing: -0.02em; }
.page-sub { margin-top: 2px; font-size: 12px; color: var(--text-muted); }

.pregunta-preview {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elevated);
}
.opcion-marker {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--bg-hover);
  color: var(--text-muted);
  font-weight: 700;
  font-size: 13px;
}
.opcion-marker.correcta {
  background: var(--primary);
  color: white;
}
</style>
