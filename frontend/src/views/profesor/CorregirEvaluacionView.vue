<template>
  <q-page class="corregir-page">
    <div class="content">
      <header class="page-heading flex justify-between items-end">
        <div>
          <h1>Corregir evaluación</h1>
          <p class="subtitle">{{ evaluacion?.titulo || 'Cargando...' }}</p>
        </div>
        <q-btn flat no-caps icon="arrow_back" label="Volver a Evaluaciones" class="apple-btn-secondary" @click="$router.push('/docente/evaluaciones')" />
      </header>

      <div class="layout">
        <aside class="panel lista-panel">
          <div class="panel-header">
            <h2>Rendiciones</h2>
            <q-input v-model="buscar" outlined dense placeholder="Buscar alumno..." class="apple-input search-input">
              <template #prepend><q-icon name="search" size="16px" /></template>
            </q-input>
          </div>

          <div v-if="cargandoLista" class="flex justify-center q-pa-lg"><q-spinner color="primary" /></div>
          <div v-else-if="!rendicionesFiltradas.length" class="apple-notice">No hay rendiciones para mostrar.</div>
          <div v-else class="lista-alumnos">
            <div
              v-for="rendicion in rendicionesFiltradas"
              :key="rendicion.id"
              class="alumno-item"
              :class="{ selected: rendicionSeleccionada?.id === rendicion.id }"
              @click="seleccionarAlumno(rendicion)"
            >
              <div class="alumno-info">
                <span class="alumno-nombre">{{ rendicion.alumno_apellido }}, {{ rendicion.alumno_nombre }}</span>
                <span class="alumno-estado" :class="rendicion.estado">{{ rendicion.estado }}</span>
              </div>
              <div class="alumno-nota" v-if="rendicion.nota !== null">
                <span>{{ rendicion.nota }}</span> pts
              </div>
            </div>
          </div>
        </aside>

        <section class="panel detalle-panel">
          <div v-if="!rendicionSeleccionada" class="empty-state">
            <q-icon name="assignment_turned_in" size="48px" class="text-muted q-mb-md" />
            <h2>Seleccioná un alumno</h2>
            <p>Elegí una rendición de la lista para ver las respuestas y calificar.</p>
          </div>

          <div v-else class="detalle-content">
            <div class="detalle-header">
              <div>
                <h2>{{ rendicionSeleccionada.alumno_apellido }}, {{ rendicionSeleccionada.alumno_nombre }}</h2>
                <p class="text-muted text-caption q-mt-xs">
                  Enviado: {{ formatearFecha(rendicionSeleccionada.enviada_en) }} |
                  Intento: {{ rendicionSeleccionada.intento }}
                </p>
              </div>
              <div class="nota-box">
                <label>Nota final</label>
                <q-input v-model.number="notaInput" type="number" outlined dense class="apple-input nota-input" />
                <q-btn unelevated color="primary" label="Guardar" no-caps class="apple-btn" :loading="guardandoNota" @click="guardarNota" />
              </div>
            </div>

            <q-separator class="q-my-md" color="border" />

            <div v-if="cargandoDetalle" class="flex justify-center q-pa-lg"><q-spinner color="primary" /></div>
            <div v-else class="lista-respuestas">
              <div v-for="(respuesta, indice) in respuestas" :key="respuesta.id" class="respuesta-item" :class="{ 'requiere-correccion': requiereCorreccionManual(respuesta.pregunta_tipo) }">
                <div class="flex justify-between items-start">
                  <div class="pregunta-texto">
                    <strong>{{ indice + 1 }}. {{ respuesta.pregunta_enunciado }}</strong>
                    <span class="tag q-ml-sm">{{ nombresTipo[respuesta.pregunta_tipo] || respuesta.pregunta_tipo }}</span>
                  </div>
                  <q-badge v-if="!requiereCorreccionManual(respuesta.pregunta_tipo) && tipoCorreccion !== 'manual'" color="positive" class="text-caption">
                    <q-icon name="auto_awesome" size="12px" class="q-mr-xs" /> Calificada por IA
                  </q-badge>
                </div>

                <div class="respuesta-alumno q-mt-sm">
                  <span class="text-caption text-muted">Respuesta del alumno:</span>
                  <div class="valor">{{ respuesta.respuesta || '(Sin respuesta)' }}</div>
                </div>

                <div v-if="respuesta.respuesta_correcta && respuesta.respuesta !== respuesta.respuesta_correcta && !requiereCorreccionManual(respuesta.pregunta_tipo)" class="respuesta-correcta q-mt-sm">
                  <span class="text-caption text-positive">Respuesta correcta:</span>
                  <div class="valor">{{ respuesta.respuesta_correcta }}</div>
                </div>

                <div v-if="tipoCorreccion === 'mixta' && (respuesta.pregunta_tipo === 'short_answer' || respuesta.pregunta_tipo === 'desarrollo')" class="noky-panel q-mt-md">
                  <div class="noky-header">
                    <q-icon name="auto_awesome" size="16px" color="primary" />
                    <span class="text-caption text-primary text-weight-bold">Sugerencia de Noky</span>
                  </div>
                  <div class="text-caption text-muted q-mt-xs">
                    Noky analizó la respuesta y sugiere una calificación. Revisá su justificación y aprobá o modificá la nota.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { Notify } from 'quasar';
import * as profApi from '../../api/profesor.api.js';

const route = useRoute();
const evaluacionId = Number(route.params.id);

const evaluacion = ref(null);
const rendiciones = ref([]);
const cargandoLista = ref(true);
const buscar = ref('');

const tipoCorreccion = ref('manual');
const nombresTipo = {
  multiple_choice: 'Múltiple',
  true_false: 'V/F',
  short_answer: 'Desarrollo',
  multiple: 'Múltiple',
  vf: 'V/F',
  desarrollo: 'Desarrollo'
};

const requiereCorreccionManual = (tipo) => {
  if (tipoCorreccion.value === 'manual') return true;
  if (tipo === 'short_answer' || tipo === 'desarrollo') return true;
  return false;
};

const rendicionSeleccionada = ref(null);
const respuestas = ref([]);
const cargandoDetalle = ref(false);
const notaInput = ref(null);
const guardandoNota = ref(false);

const rendicionesFiltradas = computed(() => {
  const consulta = buscar.value.toLowerCase();
  if (!consulta) return rendiciones.value;
  return rendiciones.value.filter(rendicion =>
    `${rendicion.alumno_nombre} ${rendicion.alumno_apellido}`.toLowerCase().includes(consulta)
  );
});

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function cargarDatos() {
  cargandoLista.value = true;
  try {
    const [respuestaEvaluacion, respuestaRendiciones] = await Promise.all([
      profApi.obtenerEvaluacion(evaluacionId),
      profApi.listarRendiciones(evaluacionId)
    ]);
    evaluacion.value = respuestaEvaluacion;
    if (respuestaEvaluacion && respuestaEvaluacion.tipo_correccion) {
      tipoCorreccion.value = respuestaEvaluacion.tipo_correccion;
    }
    rendiciones.value = respuestaRendiciones || [];
  } catch (e) {
    Notify.create({ message: 'Error al cargar datos', color: 'negative' });
  } finally {
    cargandoLista.value = false;
  }
}

async function seleccionarAlumno(rendicion) {
  rendicionSeleccionada.value = rendicion;
  notaInput.value = rendicion.nota !== null ? rendicion.nota : null;
  cargandoDetalle.value = true;
  respuestas.value = [];
  try {
    const respuesta = await profApi.verRespuestasDeRendicion(rendicion.id);
    respuestas.value = respuesta || [];
  } catch (e) {
    Notify.create({ message: 'Error al cargar respuestas', color: 'negative' });
  } finally {
    cargandoDetalle.value = false;
  }
}

async function guardarNota() {
  if (notaInput.value === null || notaInput.value < 0) {
    return Notify.create({ message: 'Ingresá una nota válida', color: 'warning' });
  }
  guardandoNota.value = true;
  try {
    await profApi.corregirRendicion(rendicionSeleccionada.value.id, { nota: notaInput.value });
    Notify.create({ message: 'Nota guardada correctamente', color: 'positive' });
    const indice = rendiciones.value.findIndex(rendicion => rendicion.id === rendicionSeleccionada.value.id);
    if (indice !== -1) {
      rendiciones.value[indice].nota = notaInput.value;
      rendiciones.value[indice].estado = 'corregida';
      rendicionSeleccionada.value = rendiciones.value[indice];
    }
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al guardar nota', color: 'negative' });
  } finally {
    guardandoNota.value = false;
  }
}

onMounted(cargarDatos);
</script>

<style scoped>
.corregir-page { background: var(--bg); min-height: 100vh; padding: 24px 32px; color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.content { max-width: 1300px; margin: auto; }
.page-heading { margin-bottom: 24px; }
.page-heading h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; letter-spacing: -0.5px; }
.subtitle { font-size: 14px; color: var(--text-muted); margin: 0; }

.layout { display: grid; grid-template-columns: 320px 1fr; gap: 20px; align-items: start; height: calc(100vh - 120px); }

.panel { background: var(--bg-elevated); border-radius: 14px; border: 1px solid var(--border-subtle); box-shadow: 0 4px 12px rgba(0,0,0,0.03); display: flex; flex-direction: column; height: 100%; overflow: hidden; }

.lista-panel { padding: 16px; }
.panel-header { margin-bottom: 12px; }
.panel-header h2 { font-size: 16px; font-weight: 700; margin: 0 0 8px; }
.search-input :deep(.q-field__control) { height: 32px; min-height: 32px; border-radius: 8px; background: var(--bg); }
.lista-alumnos { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.alumno-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 8px; cursor: pointer; transition: background 0.15s; border: 1px solid transparent; }
.alumno-item:hover { background: var(--bg-hover); }
.alumno-item.selected { background: var(--primary-soft); border-color: var(--primary); }
.alumno-info { display: flex; flex-direction: column; gap: 2px; }
.alumno-nombre { font-size: 13px; font-weight: 600; color: var(--text); }
.alumno-estado { font-size: 10px; text-transform: uppercase; font-weight: 700; color: var(--text-muted); }
.alumno-estado.enviada { color: var(--info); }
.alumno-estado.corregida { color: var(--success); }
.alumno-nota { font-size: 13px; font-weight: 700; color: var(--primary); }

.detalle-panel { padding: 24px; }
.detalle-content { display: flex; flex-direction: column; height: 100%; overflow-y: auto; }
.detalle-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
.detalle-header h2 { font-size: 20px; font-weight: 700; margin: 0; }
.nota-box { display: flex; align-items: flex-end; gap: 8px; }
.nota-box label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }
.nota-input { width: 80px; }
.nota-input :deep(.q-field__control) { height: 34px; min-height: 34px; border-radius: 8px; background: var(--bg); font-weight: 700; font-size: 15px; text-align: center; }

.lista-respuestas { display: flex; flex-direction: column; gap: 16px; }
.respuesta-item { background: var(--bg); padding: 16px; border-radius: 10px; border: 1px solid var(--border-subtle); }
.respuesta-item.requiere-correccion { border-left: 4px solid var(--primary); background: var(--primary-soft); }
.noky-panel { background: var(--bg-elevated); border: 1px dashed var(--primary); padding: 12px; border-radius: 8px; }
.noky-header { display: flex; align-items: center; gap: 6px; }
.pregunta-texto { font-size: 14px; color: var(--text); }
.tag { font-size: 9px; font-weight: 700; text-transform: uppercase; background: var(--primary-soft); color: var(--primary); padding: 2px 6px; border-radius: 4px; }
.respuesta-alumno .valor { font-size: 13px; color: var(--text); background: var(--bg-elevated); padding: 6px 10px; border-radius: 6px; margin-top: 4px; border: 1px solid var(--border); }
.respuesta-correcta .valor { font-size: 13px; color: var(--success); background: var(--success-bg); padding: 6px 10px; border-radius: 6px; margin-top: 4px; border: 1px solid var(--success); }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; text-align: center; color: var(--text-muted); }
.empty-state h2 { color: var(--text); font-size: 18px; margin: 0 0 8px; }

.apple-btn { border-radius: 8px; font-weight: 600; font-size: 12px; padding: 4px 16px; height: 34px; }
.apple-btn-secondary { border-radius: 8px; font-weight: 500; font-size: 12px; padding: 4px 16px; color: var(--text-muted); }

@media (max-width: 900px) {
  .layout { grid-template-columns: 1fr; height: auto; }
  .lista-panel { max-height: 300px; }
  .detalle-panel { min-height: 500px; }
}
</style>
