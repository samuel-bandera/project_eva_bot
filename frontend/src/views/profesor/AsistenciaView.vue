<template>
  <q-page class="asistencia-page">
    <header class="page-header">
      <div class="header-top">
        <q-icon name="fact_check" size="24px" class="text-primary" />
        <h1>Asistencia</h1>
      </div>
      <p class="subtitle">Control de asistencia por clase</p>
    </header>

    <div class="toolbar">
      <div class="toolbar-group">
        <q-select
          v-model="materiaId"
          :options="opcionesMateria"
          option-value="id"
          option-label="nombre"
          emit-value
          map-options
          borderless
          dense
          label="Materia"
          :loading="cargandoMaterias"
          class="toolbar-select"
        />
        <q-separator vertical class="toolbar-sep" v-if="materiaId" />
        <q-select
          v-if="materiaId"
          v-model="grupoId"
          :options="opcionesGrupo"
          option-value="id"
          option-label="nombre"
          emit-value
          map-options
          borderless
          dense
          label="Grupo"
          :loading="cargandoGrupos"
          class="toolbar-select"
        />
        <q-separator vertical class="toolbar-sep" v-if="grupoId" />
        <q-select
          v-if="grupoId"
          v-model="sesionId"
          :options="opcionesSesion"
          option-value="id"
          option-label="etiqueta"
          emit-value
          map-options
          borderless
          dense
          label="Sesión"
          :loading="cargandoSesiones"
          class="toolbar-select"
        />
      </div>

      <q-space />

      <div class="toolbar-actions" v-if="sesionId && alumnos.length">
        <q-btn flat dense no-caps size="sm" icon="done_all" label="Presentes" @click="marcarTodos('presente')" class="btn-action" />
        <q-btn flat dense no-caps size="sm" icon="clear_all" label="Ausentes" @click="marcarTodos('ausente')" class="btn-action" />
        <q-btn unelevated color="primary" dense no-caps size="sm" icon="save" label="Guardar" :loading="guardando" @click="guardar" class="q-ml-sm" />
      </div>
    </div>

    <div v-if="!materiaId" class="empty-state">
      <q-icon name="fact_check" size="48px" class="text-muted q-mb-md" />
      <h2>Elegí una materia</h2>
      <p>Seleccioná una de tus materias para empezar a tomar asistencia.</p>
    </div>

    <div v-else-if="!grupoId" class="empty-state">
      <q-icon name="group_work" size="48px" class="text-muted q-mb-md" />
      <h2>Elegí un grupo</h2>
      <p>Seleccioná el grupo al que le vas a tomar asistencia.</p>
    </div>

    <template v-else>
      <q-tabs v-model="tab" dense align="left" narrow-indicator no-caps class="custom-tabs">
        <q-tab name="tomar" icon="how_to_reg" label="Tomar lista" />
        <q-tab name="historial" icon="history" label="Historial" />
        <q-tab name="faltas" icon="rule" label="Faltas" />
      </q-tabs>

      <q-tab-panels v-model="tab" animated class="paneles">
        <q-tab-panel name="tomar" class="q-pa-none">
          <div v-if="!sesionId" class="empty-state small">
            <q-icon name="schedule" size="40px" class="text-muted q-mb-sm" />
            <h3>Sin sesión seleccionada</h3>
            <p>Seleccioná una sesión en la barra superior para tomar lista.</p>
          </div>

          <div v-else-if="cargandoAlumnos" class="loading-state">
            <q-spinner color="primary" size="32px" />
          </div>

          <div v-else-if="!alumnos.length" class="empty-state small">
            <q-icon name="people_outline" size="40px" class="text-muted q-mb-sm" />
            <h3>Sin alumnos</h3>
            <p>Este grupo no tiene alumnos matriculados.</p>
          </div>

          <div v-else class="tabla-container">
            <div class="tabla-header">
              <div class="col-alumno">Alumno</div>
              <div class="col-email">Email</div>
              <div class="col-estado">Estado</div>
            </div>
            <div v-for="alumno in alumnos" :key="alumno.alumno_id" class="tabla-row">
              <div class="col-alumno flex items-center">
                <q-avatar size="28px" color="primary-soft" text-color="primary" class="q-mr-md">
                  <span class="text-weight-bold text-caption">{{ iniciales(alumno) }}</span>
                </q-avatar>
                <span class="alumno-nombre">{{ alumno.alumno_apellido }}, {{ alumno.alumno_nombre }}</span>
              </div>
              <div class="col-email text-muted">{{ alumno.alumno_email }}</div>
              <div class="col-estado">
                <div class="estado-segmentado">
                  <button
                    v-for="opcion in ESTADOS"
                    :key="opcion.valor"
                    class="btn-estado"
                    :class="[estados[alumno.alumno_id] === opcion.valor ? 'activo ' + opcion.color : '']"
                    @click="estados[alumno.alumno_id] = opcion.valor"
                  >
                    {{ opcion.label }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </q-tab-panel>

        <q-tab-panel name="historial" class="q-pa-none">
          <div v-if="cargandoSesiones" class="loading-state">
            <q-spinner color="primary" size="32px" />
          </div>

          <div v-else-if="!sesiones.length" class="empty-state small">
            <q-icon name="event_busy" size="40px" class="text-muted q-mb-sm" />
            <h3>Sin sesiones</h3>
            <p>No hay clases programadas para este grupo todavía.</p>
          </div>

          <div v-else class="tabla-container">
            <div class="tabla-header">
              <div class="col-sesion">Clase</div>
              <div class="col-fecha">Fecha y Hora</div>
              <div class="col-tipo">Tipo</div>
            </div>
            <div v-for="sesion in sesiones" :key="sesion.id" class="tabla-row">
              <div class="col-sesion">
                <span class="text-weight-medium">{{ sesion.titulo || 'Clase' }}</span>
                <span class="text-muted q-ml-sm text-caption" v-if="sesion.aula">Aula {{ sesion.aula }}</span>
              </div>
              <div class="col-fecha text-muted text-caption">
                {{ formatearFecha(sesion.fecha) }} · {{ sesion.hora_inicio?.slice(0,5) }} - {{ sesion.hora_fin?.slice(0,5) }}
              </div>
              <div class="col-tipo">
                <q-chip dense :color="colorTipo(sesion.tipo)" text-color="white" :label="sesion.tipo" class="text-uppercase text-caption" />
              </div>
            </div>
          </div>
        </q-tab-panel>

        <q-tab-panel name="faltas" class="q-pa-none">
          <div v-if="cargandoFaltas" class="loading-state">
            <q-spinner color="primary" size="32px" />
          </div>

          <div v-else-if="!faltas.length" class="empty-state small">
            <q-icon name="check_circle_outline" size="40px" class="text-muted q-mb-sm" />
            <h3>Sin faltas registradas</h3>
            <p>Todos los alumnos de este grupo tienen asistencia perfecta o ya fueron justificados.</p>
          </div>

          <div v-else class="tabla-container">
            <div class="tabla-header tabla-faltas">
              <div class="col-alumno">Alumno</div>
              <div class="col-fecha">Fecha</div>
              <div class="col-motivo">Motivo</div>
              <div class="col-estado">Estado</div>
              <div class="col-accion"></div>
            </div>
            <div v-for="falta in faltas" :key="falta.id" class="tabla-row tabla-faltas">
              <div class="col-alumno">
                <span class="alumno-nombre">{{ falta.alumno_apellido }}, {{ falta.alumno_nombre }}</span>
              </div>
              <div class="col-fecha text-muted text-caption">
                {{ formatearFecha(falta.fecha) }}
              </div>
              <div class="col-motivo text-muted text-caption">
                {{ falta.motivo || 'Sin motivo' }}
              </div>
              <div class="col-estado">
                <q-chip dense :color="falta.justificada ? 'positive' : 'negative'" text-color="white" class="text-caption">
                  {{ falta.justificada ? 'Justificada' : 'Pendiente' }}
                </q-chip>
              </div>
              <div class="col-accion text-right">
                <q-btn v-if="!falta.justificada" flat dense no-caps size="sm" color="primary" label="Justificar" @click="abrirDialogoJustificar(falta)" />
                <q-btn v-else flat dense no-caps size="sm" color="grey" icon="visibility" @click="verJustificacion(falta)" />
              </div>
            </div>
          </div>
        </q-tab-panel>
      </q-tab-panels>
    </template>

    <q-dialog v-model="dialogoJustificar" persistent>
      <q-card style="min-width: 460px; max-width: 95vw;" class="dialog-card">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Justificar Falta</div>
          <q-space />
          <q-btn icon="close" flat round dense @click="dialogoJustificar = false" />
        </q-card-section>
        <q-card-section class="q-gutter-y-sm" v-if="faltaSeleccionada">
          <div class="text-caption text-muted">Alumno: {{ faltaSeleccionada.alumno_apellido }}, {{ faltaSeleccionada.alumno_nombre }}</div>
          <div class="text-caption text-muted">Fecha: {{ formatearFecha(faltaSeleccionada.fecha) }}</div>
          <q-input v-model="motivoJustificacion" type="textarea" outlined dense autogrow label="Motivo / Observación" />
          
          <div class="q-mt-md">
            <div class="text-caption text-muted q-mb-sm">Adjuntar documento (PDF o Imagen)</div>
            <q-file v-model="archivoJustificacion" outlined dense accept=".pdf, image/*" label="Seleccionar archivo" />
          </div>
          
          <q-banner v-if="mensajeErrorJustificar" dense rounded class="bg-red-1 text-red-9 q-mt-sm">
            {{ mensajeErrorJustificar }}
          </q-banner>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" no-caps @click="dialogoJustificar = false" />
          <q-btn unelevated color="primary" label="Guardar" no-caps :loading="guardandoJustificacion" @click="guardarJustificacion" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute } from 'vue-router';
import { Notify } from 'quasar';
import * as profApi from '../../api/profesor.api.js';
import * as asisApi from '../../api/asistencia.api.js';

const route = useRoute();
const ESTADOS = [
  { valor: 'presente', label: 'Presente', color: 'text-positive' },
  { valor: 'ausente', label: 'Ausente', color: 'text-negative' },
  { valor: 'tarde', label: 'Tarde', color: 'text-warning' },
  { valor: 'justificado', label: 'Justificado', color: 'text-info' }
];

const tab = ref('tomar');
const cargandoMaterias = ref(true);
const materias = ref([]);
const materiaId = ref(null);
const cargandoGrupos = ref(false);
const grupos = ref([]);
const grupoId = ref(null);
const cargandoSesiones = ref(false);
const sesiones = ref([]);
const sesionId = ref(null);
const cargandoAlumnos = ref(false);
const alumnos = ref([]);
const estados = ref({});
const guardando = ref(false);

const faltas = ref([]);
const cargandoFaltas = ref(false);
const dialogoJustificar = ref(false);
const faltaSeleccionada = ref(null);
const motivoJustificacion = ref('');
const archivoJustificacion = ref(null);
const guardandoJustificacion = ref(false);
const mensajeErrorJustificar = ref('');

const opcionesMateria = computed(() =>
  materias.value.map(m => ({ id: m.id, nombre: m.nombre || m.materia_nombre || 'Materia' }))
);
const opcionesGrupo = computed(() =>
  grupos.value.map(g => ({ id: g.id, nombre: g.nombre }))
);
const opcionesSesion = computed(() =>
  sesiones.value.map(s => ({
    id: s.id,
    etiqueta: `${s.titulo || 'Clase'} — ${formatearFecha(s.fecha)}`
  }))
);

function iniciales(alumno) {
  return (alumno.alumno_nombre?.[0] || '') + (alumno.alumno_apellido?.[0] || '');
}

function formatearFechaISO(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
}

function formatearFecha(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
  } catch { return iso; }
}

function colorTipo(tipo) {
  return { teorica: 'primary', practica: 'info', laboratorio: 'warning', examen: 'negative' }[tipo] || 'grey';
}

async function cargarMaterias() {
  cargandoMaterias.value = true;
  try {
    materias.value = await profApi.getMisMaterias() || [];
    if (materias.value.length === 1) materiaId.value = materias.value[0].id;
  } catch {
    Notify.create({ message: 'Error al cargar materias', color: 'negative' });
  } finally {
    cargandoMaterias.value = false;
  }
}

async function alCambiarMateria(id) {
  grupoId.value = null;
  sesionId.value = null;
  grupos.value = [];
  sesiones.value = [];
  alumnos.value = [];
  estados.value = {};
  if (!id) return;
  cargandoGrupos.value = true;
  try {
    grupos.value = await asisApi.gruposDeMateria(id) || [];
    if (grupos.value.length === 1) grupoId.value = grupos.value[0].id;
  } catch {
    Notify.create({ message: 'Error al cargar grupos', color: 'negative' });
  } finally {
    cargandoGrupos.value = false;
  }
}

async function alCambiarGrupo(id) {
  sesionId.value = null;
  sesiones.value = [];
  alumnos.value = [];
  estados.value = {};
  if (!id || !materiaId.value) return;
  cargandoSesiones.value = true;
  cargandoAlumnos.value = true;
  try {
    const [s, a] = await Promise.all([
      asisApi.sesionesDeMateria(materiaId.value, id),
      asisApi.alumnosDeGrupo(id)
    ]);
    sesiones.value = s || [];
    alumnos.value = a || [];
    const inicial = {};
    for (const al of alumnos.value) inicial[al.alumno_id] = 'presente';
    estados.value = inicial;
    if (sesiones.value.length > 0) sesionId.value = sesiones.value[0].id;
  } catch {
    Notify.create({ message: 'Error al cargar datos del grupo', color: 'negative' });
  } finally {
    cargandoSesiones.value = false;
    cargandoAlumnos.value = false;
  }
}

function marcarTodos(estado) {
  for (const al of alumnos.value) estados.value[al.alumno_id] = estado;
}

async function guardar() {
  if (!sesionId.value || !materiaId.value) return;
  const sesion = sesiones.value.find(s => s.id === sesionId.value);
  if (!sesion) return;
  guardando.value = true;
  try {
    const registros = alumnos.value.map(al => ({
      alumnoId: al.alumno_id,
      estado: estados.value[al.alumno_id] || 'presente'
    }));
    await asisApi.registrarMasiva({
      materiaId: materiaId.value,
      grupoId: grupoId.value,
      sesionId: sesionId.value,
      fecha: formatearFechaISO(sesion.fecha),
      registros
    });
    Notify.create({ message: 'Asistencia guardada', color: 'positive' });
  } catch (err) {
    const msg = err.response?.data?.error || 'Error al guardar';
    Notify.create({ message: msg, color: 'negative' });
  } finally {
    guardando.value = false;
  }
}

async function cargarFaltas() {
  cargandoFaltas.value = true;
  try {
    faltas.value = await asisApi.faltasDeMateria(materiaId.value, grupoId.value) || [];
  } catch {
    Notify.create({ message: 'Error al cargar faltas', color: 'negative' });
  } finally {
    cargandoFaltas.value = false;
  }
}

function abrirDialogoJustificar(falta) {
  faltaSeleccionada.value = falta;
  motivoJustificacion.value = falta.observacion || '';
  archivoJustificacion.value = null;
  mensajeErrorJustificar.value = '';
  dialogoJustificar.value = true;
}

function verJustificacion(falta) {
  Notify.create({ message: `Justificada: ${f.observacion || 'Sin detalle'}`, color: 'info' });
}

async function guardarJustificacion() {
  if (!faltaSeleccionada.value) return;
  guardandoJustificacion.value = true;
  mensajeErrorJustificar.value = '';
  try {
    if (archivoJustificacion.value) {
      const fd = new FormData();
      fd.append('documento', archivoJustificacion.value);
      await asisApi.subirDocumentoJustificacion(faltaSeleccionada.value.id, fd);
    } else {
      await asisApi.justificarFalta(faltaSeleccionada.value.id, motivoJustificacion.value || 'Justificada sin documento');
    }
    Notify.create({ message: 'Falta justificada', color: 'positive' });
    dialogoJustificar.value = false;
    await cargarFaltas();
  } catch (err) {
    mensajeErrorJustificar.value = err.response?.data?.error || 'Error al justificar';
  } finally {
    guardandoJustificacion.value = false;
  }
}

watch(materiaId, alCambiarMateria);
watch(grupoId, alCambiarGrupo);

watch(tab, (nuevoTab) => {
  if (nuevoTab === 'faltas' && materiaId.value) {
    cargarFaltas();
  }
});

onMounted(async () => {
  await cargarMaterias();
  if (route.query.materiaId) {
    materiaId.value = Number(route.query.materiaId);
    setTimeout(() => {
      if (route.query.grupoId) {
        grupoId.value = Number(route.query.grupoId);
        setTimeout(() => {
          if (route.query.sesionId) {
            sesionId.value = Number(route.query.sesionId);
          }
        }, 300);
      }
    }, 300);
  }
});
</script>

<style scoped>
.asistencia-page { background: var(--bg); min-height: 100vh; padding: 32px 40px; color: var(--text); font-family: 'Inter', system-ui, sans-serif; }
.page-header { margin-bottom: 28px; }
.header-top { display: flex; align-items: center; gap: 12px; margin-bottom: 4px; }
.page-header h1 { font-size: 24px; font-weight: 800; margin: 0; letter-spacing: -0.5px; }
.subtitle { font-size: 14px; color: var(--text-muted); margin: 0; font-weight: 500; }
.toolbar { display: flex; align-items: center; background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 8px 16px; margin-bottom: 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.toolbar-group { display: flex; align-items: center; }
.toolbar-select { min-width: 180px; font-size: 13px; }
.toolbar-select :deep(.q-field__native) { font-weight: 500; color: var(--text); }
.toolbar-select :deep(.q-field__label) { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.toolbar-sep { height: 24px; margin: 0 12px; background: var(--border-subtle) !important; }
.toolbar-actions { display: flex; align-items: center; gap: 8px; }
.btn-action { font-size: 12px; color: var(--text-muted); }
.btn-action:hover { color: var(--text); }
.custom-tabs { border-bottom: 1px solid var(--border-subtle); margin-bottom: 24px; }
.custom-tabs :deep(.q-tab) { font-size: 13px; font-weight: 600; color: var(--text-muted); min-height: 40px; }
.custom-tabs :deep(.q-tab--active) { color: var(--text); }
.tabla-container { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1); }
.tabla-header { display: grid; grid-template-columns: 2fr 2fr 3fr; padding: 12px 20px; background: var(--bg); border-bottom: 1px solid var(--border-subtle); font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); }
.tabla-row { display: grid; grid-template-columns: 2fr 2fr 3fr; padding: 12px 20px; border-bottom: 1px solid var(--border-subtle); align-items: center; transition: background 0.15s ease; }
.tabla-row:last-child { border-bottom: none; }
.tabla-row:hover { background: var(--bg-hover); }
.alumno-nombre { font-size: 14px; font-weight: 500; color: var(--text); }
.col-email { font-size: 13px; }
.estado-segmentado { display: inline-flex; background: var(--bg); border-radius: 8px; padding: 2px; border: 1px solid var(--border-subtle); }
.btn-estado { background: transparent; border: none; border-radius: 6px; padding: 4px 12px; font-size: 12px; font-weight: 600; color: var(--text-muted); cursor: pointer; transition: all 0.2s ease; }
.btn-estado:hover { color: var(--text); }
.btn-estado.activo { background: var(--bg-elevated); box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2); }
.btn-estado.activo.text-positive { color: var(--success) !important; }
.btn-estado.activo.text-negative { color: var(--error) !important; }
.btn-estado.activo.text-warning { color: var(--warning) !important; }
.btn-estado.activo.text-info { color: var(--info) !important; }
.empty-state { text-align: center; padding: 80px 20px; color: var(--text-muted); }
.empty-state.small { padding: 40px 20px; }
.empty-state h2, .empty-state h3 { color: var(--text); margin: 0 0 8px; font-weight: 700; }
.empty-state h2 { font-size: 20px; }
.empty-state h3 { font-size: 16px; }
.empty-state p { margin: 0; font-size: 14px; }
.loading-state { display: flex; justify-content: center; padding: 60px 0; }
.dialog-card { background: var(--bg-elevated); color: var(--text); }
@media (max-width: 900px) {
  .asistencia-page { padding: 20px; }
  .toolbar { flex-direction: column; align-items: stretch; gap: 16px; }
  .toolbar-group { flex-wrap: wrap; justify-content: center; }
  .toolbar-sep { display: none; }
  .toolbar-select { width: 100%; margin-bottom: 8px; }
  .toolbar-actions { justify-content: flex-end; }
  .tabla-header { display: none; }
  .tabla-row { grid-template-columns: 1fr; gap: 8px; padding: 16px; }
  .col-email { display: none; }
  .estado-segmentado { width: 100%; justify-content: space-between; }
  .btn-estado { flex: 1; }
}
.tabla-header.tabla-faltas,
.tabla-row.tabla-faltas {
  grid-template-columns: 2fr 1fr 2fr 1fr 1fr;
}
</style>
