<template>
  <q-page class="crear-eval-page">
    <div class="content">
      <header class="page-heading">
        <h1>Crear evaluación</h1>
      </header>

      <div class="stepper-container">
        <div class="stepper">
          <div v-for="(nombrePaso, indicePaso) in pasos" :key="indicePaso" class="step-wrapper">
            <div class="step" :class="{ active: paso === indicePaso, done: paso > indicePaso }">
              <div class="circle">{{ paso > indicePaso ? '✓' : indicePaso + 1 }}</div>
              <span class="step-label">{{ nombrePaso }}</span>
            </div>
            <div v-if="indicePaso < pasos.length - 1" class="step-line" :class="{ done: paso > indicePaso }"></div>
          </div>
        </div>
      </div>

      <div class="layout">
        <section class="panel main-panel">
          <div v-if="paso === 0" class="page fade-in">
            <div class="section-header">
              <h2>Configuración general</h2>
            </div>

            <div class="fields-3col">
              <div class="field span-2">
                <label>Título *</label>
                <q-input v-model="config.titulo" outlined dense placeholder="Ej: Parcial 1 - Redes" class="apple-input" />
              </div>
              <div class="field">
                <label>Tipo</label>
                <q-select v-model="config.tipo" :options="['parcial', 'tp', 'recuperatorio', 'final']" outlined dense class="apple-input" />
              </div>
              <div class="field">
                <label>Materia *</label>
                <q-select v-model="config.materiaId" :options="materias" option-value="id" option-label="nombre" emit-value map-options outlined dense class="apple-input" @update:model-value="cargarGrupos" />
              </div>
              <div class="field">
                <label>Grupo *</label>
                <q-select v-model="config.grupoId" :options="grupos" option-value="id" option-label="nombre" emit-value map-options outlined dense :loading="cargandoGrupos" :disable="!config.materiaId" class="apple-input" />
              </div>
              <div class="field">
                <label>Estado inicial</label>
                <q-select v-model="config.estadoInicial" :options="['Borrador', 'Publicada', 'Abierta']" outlined dense class="apple-input" />
              </div>
              <div class="field">
                <label>Apertura *</label>
                <q-input v-model="config.fechaApertura" type="datetime-local" outlined dense class="apple-input" />
              </div>
              <div class="field">
                <label>Cierre *</label>
                <q-input v-model="config.fechaCierre" type="datetime-local" outlined dense class="apple-input" />
              </div>
              <div class="field">
                <label>Duración (min)</label>
                <q-input v-model.number="config.duracionMinutos" type="number" outlined dense class="apple-input" />
              </div>
              <div class="field">
                <label>Intentos</label>
                <q-input v-model.number="config.intentosPermitidos" type="number" outlined dense class="apple-input" />
              </div>
            </div>
          </div>

          <div v-if="paso === 1" class="page fade-in">
            <div class="section-header">
              <h2>Método de creación</h2>
            </div>

            <div class="method-grid">
              <button class="method" :class="{ selected: metodo === 'manual' }" @click="metodo = 'manual'">
                <q-icon name="edit" size="22px" class="symbol" />
                <strong>Manual</strong><p>Escribí las preguntas una por una desde cero.</p>
              </button>
              <button class="method" :class="{ selected: metodo === 'ia' }" @click="metodo = 'ia'">
                <q-icon name="auto_awesome" size="22px" class="symbol" />
                <strong>Automático</strong><p>El sistema selecciona preguntas del banco por vos.</p>
              </button>
              <button class="method" :class="{ selected: metodo === 'excel' }" @click="metodo = 'excel'">
                <q-icon name="upload_file" size="22px" class="symbol" />
                <strong>Archivo Excel</strong><p>Importá desde una planilla estandarizada.</p>
              </button>
              <button class="method" :class="{ selected: metodo === 'mixto' }" @click="metodo = 'mixto'">
                <q-icon name="dashboard_customize" size="22px" class="symbol" />
                <strong>Mixto</strong><p>Combiná preguntas del banco con manuales.</p>
              </button>
            </div>

            <div v-if="metodo === 'ia'" class="q-mt-lg fade-in config-box">
              <h3>Generación automática</h3>
              <p class="text-muted text-caption q-mb-md">El sistema tomará las preguntas del banco según la cantidad solicitada para cada tipo.</p>
              <div class="row q-col-gutter-md">
                <div class="col-12 col-sm-4">
                  <div class="field">
                    <label>Opción Múltiple</label>
                    <q-input v-model.number="cantidadesAuto.multiple" type="number" outlined dense min="0" class="apple-input" />
                  </div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="field">
                    <label>Verdadero / Falso</label>
                    <q-input v-model.number="cantidadesAuto.vf" type="number" outlined dense min="0" class="apple-input" />
                  </div>
                </div>
                <div class="col-12 col-sm-4">
                  <div class="field">
                    <label>Desarrollo</label>
                    <q-input v-model.number="cantidadesAuto.desarrollo" type="number" outlined dense min="0" class="apple-input" />
                  </div>
                </div>
              </div>
            </div>

            <div v-if="metodo === 'excel'" class="q-mt-lg fade-in config-box">
              <h3>Carga desde Excel</h3>
              <div class="flex items-center gap-md">
                <q-btn outline color="primary" icon="download" label="Descargar Plantilla" no-caps class="apple-btn-secondary" @click="descargarPlantilla" />
                <q-file v-model="archivoExcel" outlined dense accept=".xlsx" label="Subir archivo Excel" class="col apple-input" />
              </div>
            </div>

            <div v-if="metodo === 'mixto'" class="q-mt-lg fade-in config-box">
              <h3>Selección mixta</h3>
              <p class="text-muted text-caption q-mb-md">Seleccioná manualmente las preguntas del banco que quieras incluir, y luego agregá las que faltan a mano.</p>
              <div v-if="!config.materiaId" class="apple-notice">Seleccioná una materia en el paso 1.</div>
              <div v-else-if="preguntasBancoFiltradas.length === 0" class="apple-notice">No hay preguntas en el banco para esta materia.</div>
              <div v-else class="filtros-banco-container">

                <div class="flex gap-sm q-mb-md">
                  <q-btn v-for="filtroBancoItem in filtrosBanco" :key="filtroBancoItem.value"
                         :label="filtroBancoItem.label"
                         :outline="filtroBanco !== filtroBancoItem.value"
                         :unelevated="filtroBanco === filtroBancoItem.value"
                         :color="filtroBanco === filtroBancoItem.value ? 'primary' : 'grey-7'"
                         no-caps dense size="sm" class="apple-btn-secondary"
                         @click="filtroBanco = filtroBancoItem.value" />
                </div>

                <div class="banco-list">
                  <div v-for="preguntaBanco in bancoFiltradoPorTipo" :key="preguntaBanco.id" class="banco-item" :class="{ selected: bancoSeleccion.includes(preguntaBanco.id) }">
                    <q-checkbox v-model="bancoSeleccion" :val="preguntaBanco.id" color="primary" dense />
                    <div class="banco-content">
                      <span class="type-badge" :class="colorTipo(preguntaBanco.tipo)">{{ nombresTipo[preguntaBanco.tipo] || preguntaBanco.tipo }}</span>
                      <span class="q-ml-sm text-caption banco-pregunta-texto">{{ preguntaBanco.pregunta }}</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div v-if="paso === 2" class="page fade-in">
            <div class="section-header flex justify-between items-center">
              <div>
                <h2>Preguntas de la evaluación</h2>
                <p class="hint">Total: {{ preguntasTotales.length }} preguntas.</p>
              </div>
              <q-btn v-if="metodo !== 'excel'" unelevated color="primary" icon="add" label="Nueva manual" no-caps class="apple-btn" @click="abrirFormularioPregunta" />
            </div>

            <div v-if="metodo === 'excel' && !archivoExcel" class="apple-notice q-mt-md">
              Subí un archivo Excel en el paso anterior.
            </div>
            <div v-else-if="preguntasTotales.length === 0" class="apple-notice q-mt-md">
              No hay preguntas cargadas todavía.
            </div>
            <div v-else class="lista-preguntas q-mt-md">
              <div v-for="(pregunta, indice) in preguntasTotales" :key="indice" class="pregunta-card">
                <div class="pregunta-header">
                  <div class="flex items-center gap-sm">
                    <span class="type-badge" :class="colorTipo(pregunta.tipo)">{{ nombresTipo[pregunta.tipo] }}</span>
                    <span v-if="pregunta.fromBanco" class="type-badge banco">BANCO</span>
                  </div>
                  <div class="flex items-center gap-md">
                    <small class="text-muted">{{ pregunta.puntaje || 1 }} pts</small>
                    <q-btn v-if="!pregunta.fromBanco" flat round dense icon="delete" color="negative" size="sm" @click="preguntas.splice(indice - bancoSeleccion.length, 1)" />
                  </div>
                </div>
                <div class="pregunta-body">
                  <p class="q-mb-sm"><strong>{{ indice + 1 }}.</strong> {{ pregunta.enunciado }}</p>

                  <div v-if="esMultiple(pregunta.tipo)" class="opciones-preview">
                    <div v-for="(opcion, indiceOpcion) in parseOpciones(pregunta.opciones)" :key="indiceOpcion" class="opcion-item">
                      <q-radio :model-value="null" :val="indiceOpcion" color="primary" dense disable />
                      <span class="text-caption text-muted">{{ opcion }}</span>
                    </div>
                  </div>
                  <div v-else-if="esVF(pregunta.tipo)" class="opciones-preview flex gap-md">
                    <div class="opcion-item"><q-radio :model-value="null" val="true" color="primary" dense disable /> Verdadero</div>
                    <div class="opcion-item"><q-radio :model-value="null" val="false" color="primary" dense disable /> Falso</div>
                  </div>
                  <div v-else class="opciones-preview">
                    <q-input outlined dense disable placeholder="Respuesta del estudiante..." class="force-dark-input" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-if="paso === 3" class="page fade-in">
            <div class="section-header">
              <h2>Revisión y Anti-trampa</h2>
              <p class="hint">Configurá la seguridad y revisá cómo se verá la evaluación.</p>
            </div>

            <div class="config-box q-mb-lg">
              <h3 class="q-mb-xs">Método de corrección</h3>
              <p class="text-caption text-muted parrafo-correccion">¿Cómo se evaluarán las respuestas de los alumnos?</p>
              <div class="column q-gutter-y-sm">
                <q-radio v-model="config.tipoCorreccion" val="manual" label="Manual (Vos corregís las preguntas de Desarrollo a mano)" color="primary" />
                <q-radio v-model="config.tipoCorreccion" val="ia" label="Automática (La IA califica todo)" color="primary" />
                <q-radio v-model="config.tipoCorreccion" val="mixta" label="Mixta (Noky sugiere nota y explica. Vos aprobás o la cambiás)" color="primary" />
              </div>
            </div>

            <div class="config-box q-mb-lg">
              <div class="flex justify-between items-center">
                <div>
                  <h3 class="q-mb-xs">Prevención de copias</h3>
                  <p class="text-caption text-muted parrafo-sin-margen">El sistema barajará las preguntas y opciones para crear versiones únicas.</p>
                </div>
                <q-toggle v-model="antiTrampa.habilitado" color="primary" size="md" />
              </div>

              <div v-if="antiTrampa.habilitado" class="q-mt-md fade-in">
                <div class="row q-col-gutter-md items-center">
                  <div class="col-12 col-sm-6">
                    <div class="field">
                      <label>Cantidad de versiones a generar</label>
                      <q-select v-model="antiTrampa.cantidadVersiones" :options="[2, 3, 4]" outlined dense class="apple-input" />
                    </div>
                  </div>
                  <div class="col-12 col-sm-6">
                    <q-checkbox v-model="antiTrampa.mezclarOpciones" label="Barajar opciones de respuesta (Múltiple)" color="primary" />
                  </div>
                </div>

                <div class="versions-preview q-mt-md">
                  <div class="text-caption text-muted q-mb-sm">Previsualizar versión generada:</div>
                  <div class="flex gap-sm">
                    <q-btn v-for="version in versionesDisponibles" :key="version"
                           :label="'Versión ' + String.fromCharCode(64 + version)"
                           :outline="versionPreview !== version"
                           :unelevated="versionPreview === version"
                           color="primary" no-caps size="sm" @click="versionPreview = version" />
                  </div>
                </div>
              </div>
            </div>

            <div class="preview-box">
              <div class="flex justify-between items-center q-mb-sm">
                <h2>{{ config.titulo || 'Sin título' }}</h2>
                <q-badge v-if="antiTrampa.habilitado" color="primary" class="text-caption">Versión {{ String.fromCharCode(64 + versionPreview) }}</q-badge>
              </div>
              <p class="text-muted text-caption q-mb-sm">{{ config.descripcion || 'Sin descripción' }}</p>
              <div class="text-caption">
                <strong>Duración:</strong> {{ config.duracionMinutos }} min | <strong>Preguntas:</strong> {{ preguntasTotales.length }}
              </div>

              <q-separator class="q-my-sm" color="border" />

              <div v-for="(pregunta, indice) in preguntasBarajadas" :key="indice" class="preview-pregunta">
                <div class="flex justify-between items-center q-mb-xs">
                  <div class="flex items-center gap-sm">
                    <span class="type-badge" :class="colorTipo(pregunta.tipo)">{{ nombresTipo[pregunta.tipo] }}</span>
                    <strong>{{ indice + 1 }}. {{ pregunta.enunciado }}</strong>
                  </div>
                  <span class="text-caption text-muted">({{ pregunta.puntaje || 1 }} pts)</span>
                </div>

                <div v-if="esMultiple(pregunta.tipo)" class="q-ml-md q-mt-sm">
                  <div v-for="(opcion, indiceOpcion) in opcionesBarajadas(pregunta)" :key="indiceOpcion" class="opcion-preview-examen">
                    <q-radio :model-value="null" :val="indiceOpcion" color="primary" dense disable />
                    <span class="text-body2 text-muted">{{ opcion }}</span>
                  </div>
                </div>
                <div v-else-if="esVF(pregunta.tipo)" class="q-ml-md q-mt-sm flex gap-lg">
                  <div class="opcion-preview-examen"><q-radio :model-value="null" val="true" color="primary" dense disable /> <span class="text-body2 text-muted">Verdadero</span></div>
                  <div class="opcion-preview-examen"><q-radio :model-value="null" val="false" color="primary" dense disable /> <span class="text-body2 text-muted">Falso</span></div>
                </div>
                <div v-else class="q-mt-sm">
                  <q-input outlined dense disable type="textarea" placeholder="Respuesta del estudiante..." class="preview-input-disabled" />
                </div>
              </div>
            </div>
          </div>

          <div class="actions">
            <q-btn flat label="Cancelar" no-caps class="apple-btn-secondary" @click="$router.push('/docente/evaluaciones')" />
            <div class="flex gap-sm">
              <q-btn v-if="paso > 0" outline label="Anterior" no-caps class="apple-btn-secondary" @click="paso--" />
              <q-btn v-if="paso < 3" unelevated color="primary" label="Siguiente" no-caps class="apple-btn" @click="siguientePaso" />
              <q-btn v-if="paso === 3" unelevated color="primary" label="Crear Evaluación" no-caps class="apple-btn" :loading="guardando" @click="guardarEvaluacion" />
            </div>
          </div>
        </section>

        <aside class="panel summary">
          <h2>Resumen</h2>
          <div class="sumtitle"><q-icon name="info" size="14px" /> General</div>
          <div class="sumrow"><span>Título</span><strong class="truncate">{{ config.titulo || '—' }}</strong></div>
          <div class="sumrow"><span>Materia</span><strong class="truncate">{{ nombreMateria }}</strong></div>
          <div class="sumrow"><span>Grupo</span><strong class="truncate">{{ nombreGrupo }}</strong></div>
          <div class="sumrow"><span>Método</span><strong>{{ nombreMetodo }}</strong></div>
          <q-separator class="q-my-sm" color="border" />
          <div class="sumtitle"><q-icon name="list" size="14px" /> Preguntas</div>
          <div class="sumrow"><span>Del banco</span><strong>{{ bancoSeleccion.length + (metodo === 'ia' ? (cantidadesAuto.multiple + cantidadesAuto.vf + cantidadesAuto.desarrollo) : 0) }}</strong></div>
          <div class="sumrow"><span>Manuales</span><strong>{{ preguntas.length }}</strong></div>
          <q-separator class="q-my-sm" color="border" />
          <div class="sumrow total-row"><span>Total</span><strong>{{ preguntasTotales.length }}</strong></div>
          <div class="sumrow total-row"><span>Puntaje</span><strong>{{ puntajeTotal }} pts</strong></div>
        </aside>
      </div>
    </div>

    <q-dialog v-model="dialogPregunta" persistent>
      <q-card class="apple-dialog dialog-pregunta">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Nueva pregunta</div>
          <q-space />
          <q-btn icon="close" flat round dense @click="dialogPregunta = false" />
        </q-card-section>
        <q-card-section class="q-gutter-y-sm scroll dialog-pregunta-body">
          <q-select v-model="nuevaPregunta.tipo" :options="opcionesTipo" option-value="value" option-label="label" emit-value map-options outlined dense label="Tipo" class="apple-input" />
          <q-input v-model="nuevaPregunta.enunciado" type="textarea" outlined dense autogrow label="Enunciado" class="apple-input" />
          <q-input v-model.number="nuevaPregunta.puntaje" type="number" outlined dense label="Puntaje" class="apple-input" />

          <div v-if="nuevaPregunta.tipo === 'multiple'" class="q-mt-sm">
            <div class="text-caption text-muted q-mb-xs">Opciones (marcá la correcta)</div>
            <div v-for="(op, i) in nuevaPregunta.opciones" :key="i" class="row items-center q-gutter-sm q-mb-xs">
              <q-radio v-model="nuevaPregunta.correcta" :val="i" color="primary" />
              <q-input v-model="nuevaPregunta.opciones[i]" outlined dense class="col apple-input" />
            </div>
          </div>
          <div v-if="nuevaPregunta.tipo === 'vf'" class="q-mt-sm">
            <div class="text-caption text-muted q-mb-xs">Respuesta correcta</div>
            <q-option-group v-model="nuevaPregunta.correcta" :options="[{ label: 'Verdadero', value: true }, { label: 'Falso', value: false }]" color="primary" inline />
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pb-md q-px-md">
          <q-btn flat label="Cancelar" no-caps class="apple-btn-secondary" @click="dialogPregunta = false" />
          <q-btn unelevated color="primary" label="Guardar" no-caps class="apple-btn" @click="guardarPregunta" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import * as profApi from '../../api/profesor.api.js';
import * as grupoApi from '../../api/grupo.api.js';
import * as evalApi from '../../api/evaluacion.api.js';

const router = useRouter();
const pasos = ['Configuración', 'Método', 'Preguntas', 'Revisión'];
const paso = ref(0);
const metodo = ref('manual');
const guardando = ref(false);
const dialogPregunta = ref(false);
const archivoExcel = ref(null);
const cantidadesAuto = ref({ multiple: 5, vf: 3, desarrollo: 2 });

const antiTrampa = ref({
  habilitado: true,
  cantidadVersiones: 3,
  mezclarOpciones: true
});
const versionPreview = ref(1);

const materias = ref([]);
const grupos = ref([]);
const cargandoGrupos = ref(false);

const config = ref({
  titulo: '', descripcion: '', materiaId: null, grupoId: null,
  tipo: 'parcial', tipoCorreccion: 'manual', fechaApertura: '', fechaCierre: '',
  duracionMinutos: 60, intentosPermitidos: 1, notaMaxima: 10, notaAprobacion: 60,
  estadoInicial: 'Borrador'
});

const preguntas = ref([]);
const preguntasBanco = ref([]);
const bancoSeleccion = ref([]);

const nuevaPregunta = ref({ tipo: 'multiple', enunciado: '', puntaje: 1, opciones: ['', '', '', ''], correcta: 0 });

const opcionesTipo = [
  { label: 'Opción múltiple', value: 'multiple' },
  { label: 'Verdadero o Falso', value: 'vf' },
  { label: 'Desarrollo', value: 'desarrollo' }
];

const nombresTipo = {
  multiple_choice: 'Múltiple',
  true_false: 'V/F',
  short_answer: 'Desarrollo',
  multiple: 'Múltiple',
  vf: 'V/F',
  desarrollo: 'Desarrollo'
};

const colorTipo = (tipo) => {
  if (tipo === 'multiple_choice' || tipo === 'multiple') return 'multiple';
  if (tipo === 'true_false' || tipo === 'vf') return 'vf';
  return 'desarrollo';
};

const esMultiple = (tipo) => tipo === 'multiple_choice' || tipo === 'multiple';
const esVF = (tipo) => tipo === 'true_false' || tipo === 'vf';

const parseOpciones = (opcs) => {
  if (!opcs) return [];
  if (Array.isArray(opcs)) return opcs;
  try {
    return JSON.parse(opcs);
  } catch {
    return [];
  }
};

const versionesDisponibles = computed(() => {
  return [1, 2, 3, 4].slice(0, antiTrampa.value.cantidadVersiones);
});

const nombreMateria = computed(() => materias.value.find(m => m.id === config.value.materiaId)?.nombre || '—');
const nombreGrupo = computed(() => grupos.value.find(g => g.id === config.value.grupoId)?.nombre || '—');
const nombreMetodo = computed(() => ({ manual: 'Manual', ia: 'Automático', excel: 'Excel', mixto: 'Mixto' }[metodo.value]));

const preguntasTotales = computed(() => {
  let delBanco;

  if (metodo.value === 'ia') {
    const bancoMateria = preguntasBanco.value.filter(pb => pb.materia_id === config.value.materiaId);
    const mult = bancoMateria.filter(p => esMultiple(p.tipo)).slice(0, cantidadesAuto.value.multiple);
    const vf = bancoMateria.filter(p => esVF(p.tipo)).slice(0, cantidadesAuto.value.vf);
    const des = bancoMateria.filter(p => !esMultiple(p.tipo) && !esVF(p.tipo)).slice(0, cantidadesAuto.value.desarrollo);
    delBanco = [...mult, ...vf, ...des];
  } else {
    delBanco = preguntasBanco.value.filter(pb => bancoSeleccion.value.includes(pb.id));
  }

  const bancoNorm = delBanco.map(pb => ({ ...pb, enunciado: pb.pregunta, fromBanco: true }));
  return [...bancoNorm, ...preguntas.value];
});

const puntajeTotal = computed(() => preguntasTotales.value.reduce((sum, p) => sum + Number(p.puntaje || 1), 0));

const preguntasBancoFiltradas = computed(() => {
  if (!config.value.materiaId) return [];
  return preguntasBanco.value.filter(pb => pb.materia_id === config.value.materiaId);
});

const filtroBanco = ref('todos');
const filtrosBanco = [
  { label: 'Todos', value: 'todos' },
  { label: 'Múltiple', value: 'multiple' },
  { label: 'V/F', value: 'vf' },
  { label: 'Desarrollo', value: 'desarrollo' }
];

const bancoFiltradoPorTipo = computed(() => {
  const base = preguntasBancoFiltradas.value;
  if (filtroBanco.value === 'todos') return base;
  if (filtroBanco.value === 'multiple') return base.filter(p => esMultiple(p.tipo));
  if (filtroBanco.value === 'vf') return base.filter(p => esVF(p.tipo));
  if (filtroBanco.value === 'desarrollo') return base.filter(p => !esMultiple(p.tipo) && !esVF(p.tipo));
  return base;
});

const preguntasBarajadas = computed(() => {
  const base = [...preguntasTotales.value];
  if (base.length <= 1 || !antiTrampa.value.habilitado) return base;

  const seed = versionPreview.value;
  return base.sort((a, b) => String(a.id || a.enunciado || '').localeCompare(String(b.id || b.enunciado || '')) * (seed % 2 === 0 ? 1 : -1));
});

function opcionesBarajadas(p) {
  const ops = parseOpciones(p.opciones);
  if (!antiTrampa.value.habilitado || !antiTrampa.value.mezclarOpciones || ops.length === 0) return ops;
  return [...ops].sort((a, b) => String(a || '').localeCompare(String(b || '')) * (versionPreview.value % 2 === 0 ? 1 : -1));
}

async function cargarMaterias() {
  try { materias.value = await profApi.getMisMaterias() || []; }
  catch { Notify.create({ message: 'Error al cargar materias', color: 'negative' }); }
}

async function cargarGrupos(materiaId) {
  if (!materiaId) return;
  cargandoGrupos.value = true;

  const materiaEncontrada = materias.value.find(materiaBuscada => materiaBuscada.id === materiaId);
  if (materiaEncontrada && !config.value.titulo) config.value.titulo = `Parcial - ${materiaEncontrada.nombre}`;

  try {
    const [resGrupos, resBanco] = await Promise.all([
      grupoApi.listarGruposPorMateria(materiaId),
      profApi.getPreguntasBanco(materiaId).catch(() => [])
    ]);
    grupos.value = resGrupos || [];
    preguntasBanco.value = resBanco || [];
  } catch {
    Notify.create({ message: 'Error al cargar datos', color: 'negative' });
  } finally {
    cargandoGrupos.value = false;
  }
}

function descargarPlantilla() {
  const csv = "data:text/csv;charset=utf-8,Tipo,Enunciado,Puntaje\\nmultiple,¿Qué es SSH?,2";
  const link = document.createElement("a");
  link.href = encodeURI(csv);
  link.download = "plantilla_evalbot.csv";
  link.click();
}

function siguientePaso() {
  if (paso.value === 0 && (!config.value.titulo || !config.value.materiaId || !config.value.grupoId)) {
    return Notify.create({ message: 'Completá título, materia y grupo', color: 'warning' });
  }
  if (paso.value === 1 && metodo.value === 'ia') {
    const total = cantidadesAuto.value.multiple + cantidadesAuto.value.vf + cantidadesAuto.value.desarrollo;
    if (total < 1) return Notify.create({ message: 'Ingresá al menos 1 pregunta en total', color: 'warning' });
  }
  paso.value++;
  if (paso.value === 3) versionPreview.value = 1;
}

function abrirFormularioPregunta() {
  nuevaPregunta.value = { tipo: 'multiple', enunciado: '', puntaje: 1, opciones: ['', '', '', ''], correcta: 0 };
  dialogPregunta.value = true;
}

function guardarPregunta() {
  if (!nuevaPregunta.value.enunciado.trim()) return Notify.create({ message: 'Falta el enunciado', color: 'warning' });
  if (nuevaPregunta.value.tipo === 'multiple' && nuevaPregunta.value.opciones.some(o => !o.trim())) {
    return Notify.create({ message: 'Completá todas las opciones', color: 'warning' });
  }
  preguntas.value.push({ ...nuevaPregunta.value });
  dialogPregunta.value = false;
}

async function guardarEvaluacion() {
  if (preguntasTotales.value.length === 0) return Notify.create({ message: 'Agregá al menos una pregunta', color: 'warning' });
  guardando.value = true;

  try {
    const payload = {
      titulo: config.value.titulo,
      descripcion: config.value.descripcion,
      materiaId: config.value.materiaId,
      tipo: config.value.tipo,
      fechaPublicacion: config.value.fechaApertura,
      fechaApertura: config.value.fechaApertura,
      fechaCierre: config.value.fechaCierre,
      duracionMinutos: config.value.duracionMinutos,
      intentosPermitidos: config.value.intentosPermitidos,
      notaMaxima: config.value.notaMaxima,
      tipoCorreccion: config.value.tipoCorreccion,
      preguntas: preguntasTotales.value,
      grupos: [config.value.grupoId],
      configuracion_anti_trampa: antiTrampa.value
    };

    const res = await profApi.crearEvaluacion(payload);

    if (config.value.estadoInicial === 'Publicada') {
      await profApi.publicarEvaluacion(res.id);
    } else if (config.value.estadoInicial === 'Abierta') {
      await profApi.publicarEvaluacion(res.id);
      await evalApi.abrirEvaluacion(res.id);
    }

    Notify.create({ message: 'Evaluación creada con éxito', color: 'positive' });
    router.push('/docente/evaluaciones');
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al crear', color: 'negative' });
  } finally {
    guardando.value = false;
  }
}

onMounted(() => {
  cargarMaterias();
  const ahora = new Date();
  const enDosHoras = new Date(ahora.getTime() + 2 * 60 * 60 * 1000);
  const formatLocal = (d) => {
    const pad = numero => String(numero).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  config.value.fechaApertura = formatLocal(ahora);
  config.value.fechaCierre = formatLocal(enDosHoras);
});
</script>

<style scoped>
.crear-eval-page { background: var(--bg); min-height: 100vh; padding: 16px 24px; color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
.content { max-width: 1400px; margin: auto; }
.page-heading { text-align: center; margin-bottom: 8px; }
.page-heading h1 { font-size: 20px; font-weight: 700; margin: 0; }
.stepper-container { display: flex; justify-content: center; margin-bottom: 14px; }
.stepper { display: flex; align-items: center; width: 100%; max-width: 800px; }
.step-wrapper { display: flex; align-items: center; flex: 1; }
.step-wrapper:last-child { flex: 0; }
.step { display: flex; flex-direction: column; align-items: center; gap: 3px; background: var(--bg); padding: 0 8px; z-index: 2; }
.circle { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--bg-hover); color: var(--text-muted); font-weight: 600; font-size: 11px; }
.step.active .circle, .step.done .circle { background: var(--primary); color: white; }
.step-label { font-size: 10px; font-weight: 500; color: var(--text-muted); text-transform: uppercase; }
.step.active .step-label { color: var(--primary); font-weight: 700; }
.step-line { flex: 1; height: 2px; background: var(--border); margin: 0 -6px; z-index: 1; }
.step-line.done { background: var(--primary); }

.layout { display: grid; grid-template-columns: 1fr 280px; gap: 16px; align-items: start; }
.panel { background: var(--bg-elevated); border-radius: 12px; padding: 16px; border: 1px solid var(--border-subtle); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
.section-header { margin-bottom: 12px; }
.section-header h2 { font-size: 16px; font-weight: 700; margin: 0 0 2px; }
.hint { color: var(--text-muted); font-size: 12px; margin: 0; }

.fields-3col { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 14px; }
.field { display: flex; flex-direction: column; gap: 3px; }
.span-2 { grid-column: span 2; }
.span-3 { grid-column: span 3; }
label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; }

.apple-input :deep(.q-field__control) { border-radius: 8px; background: var(--bg); min-height: 32px; height: 32px; }
.apple-input :deep(.q-field__native), .apple-input :deep(.q-field__input) { font-size: 13px; }
.apple-input :deep(textarea) { min-height: 44px !important; padding: 4px 8px !important; font-size: 12px !important; }

.method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.method { text-align: left; padding: 12px; border: 2px solid var(--border-subtle); background: var(--bg-elevated); border-radius: 8px; cursor: pointer; transition: 0.15s; }
.method.selected { border-color: var(--primary); background: var(--primary-soft); }
.method strong { display: block; font-size: 13px; margin: 6px 0 2px; }
.method p { margin: 0; color: var(--text-muted); font-size: 11px; }

.config-box { background: var(--bg); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 16px; }
.config-box h3 { font-size: 14px; font-weight: 600; margin: 0 0 4px; }

.filtros-banco-container { display: flex; flex-direction: column; }
.banco-list { display: flex; flex-direction: column; gap: 4px; max-height: 200px; overflow-y: auto; background: var(--bg); padding: 8px; border-radius: 8px; border: 1px solid var(--border); }
.banco-list::-webkit-scrollbar { width: 6px; }
.banco-list::-webkit-scrollbar-thumb { background: var(--border-strong); border-radius: 4px; }
.banco-item { display: flex; align-items: flex-start; gap: 8px; padding: 6px 8px; border-radius: 6px; border: 1px solid transparent; cursor: pointer; }
.banco-item:hover { background: var(--bg-hover); }
.banco-item.selected { background: var(--primary-soft); border-color: var(--primary); }
.banco-content { font-size: 12px; color: var(--text); line-height: 1.3; display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.banco-pregunta-texto { color: var(--text) !important; }

.pregunta-card { border: 1px solid var(--border-subtle); padding: 12px 16px; border-radius: 10px; background: var(--bg-elevated); margin-bottom: 10px; }
.pregunta-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.pregunta-body { font-size: 13.5px; color: var(--text); }

.type-badge { font-size: 9px; padding: 3px 8px; border-radius: 6px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
.type-badge.multiple { background: var(--info-bg); color: var(--info); }
.type-badge.vf { background: var(--warning-bg); color: var(--warning); }
.type-badge.desarrollo { background: var(--success-bg); color: var(--success); }
.type-badge.banco { background: var(--primary-soft); color: var(--primary); margin-left: 6px; }

.opciones-preview { margin-top: 8px; background: var(--bg); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-subtle); }
.opcion-item { display: flex; align-items: center; gap: 6px; margin: 4px 0; }
.opcion-preview-examen { display: flex; align-items: center; gap: 8px; margin: 6px 0; padding: 6px 10px; border-radius: 6px; transition: 0.2s; }
.opcion-preview-examen:hover { background: var(--bg-hover); }

.preview-box { background: var(--bg); padding: 14px; border-radius: 8px; border: 1px solid var(--border); }
.preview-pregunta { padding: 8px 0; border-top: 1px solid var(--border); }
.preview-pregunta:first-of-type { border-top: none; }
.force-dark-input :deep(.q-field__control) { background: var(--bg) !important; border-color: var(--border) !important; }
.force-dark-input :deep(.q-field__native),
.force-dark-input :deep(.q-field__input),
.force-dark-input :deep(textarea) {
  color: var(--text-muted) !important;
  -webkit-text-fill-color: var(--text-muted) !important;
}
.force-dark-input :deep(.q-field__control:before) { border-color: var(--border) !important; }
.pregunta-body p { color: var(--text) !important; }
.opcion-item span { color: var(--text-muted) !important; }

.versions-preview { background: var(--bg); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px; }

.actions { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle); }
.apple-btn { border-radius: 8px; font-weight: 600; font-size: 12px; padding: 4px 16px; }
.apple-btn-secondary { border-radius: 8px; font-weight: 500; font-size: 12px; padding: 4px 16px; color: var(--text-muted); }

.summary h2 { font-size: 14px; margin: 0 0 10px; }
.sumtitle { font-weight: 700; margin: 10px 0 4px; font-size: 10px; display: flex; gap: 4px; color: var(--text-muted); text-transform: uppercase; }
.sumrow { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; color: var(--text-muted); }
.sumrow strong { color: var(--text); font-weight: 500; max-width: 60%; }
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.total-row { font-size: 13px; margin-top: 4px; }
.total-row strong { font-weight: 700; color: var(--primary); }

@media (max-width: 1100px) { .layout { grid-template-columns: 1fr; } .summary { order: -1; } }
.parrafo-correccion { margin: 0 0 12px 0; }
.parrafo-sin-margen { margin: 0; }
.dialog-pregunta { min-width: 460px; max-width: 95vw; }
.dialog-pregunta-body { max-height: 60vh; }
</style>
