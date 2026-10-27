<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Notify } from 'quasar';
import QRCode from 'qrcode';
import * as profApi from '../../api/profesor.api.js';

const route = useRoute();
const router = useRouter();
const materiaId = Number(route.params.id);

const cargando = ref(true);
const materia = ref(null);
const alumnos = ref([]);
const materiales = ref([]);
const tareas = ref([]);
const alumnosConNotas = ref([]);
const notaAprobacion = ref(6);
const guardandoNotaAprobacion = ref(false);
const guardandoNotas = ref(false);
const cambiosNotas = ref({});
const tabActiva = ref('alumnos');

const modalAgregar = ref(false);
const busqueda = ref('');
const resultados = ref([]);
const buscando = ref(false);
const agregando = ref({});
let timerBusqueda = null;

const modalQr = ref(false);
const qrDataUrl = ref('');
const linkInscripcion = ref('');

const tabs = computed(() => [
  { id: 'alumnos',        label: 'Alumnos',        icon: 'groups',       count: alumnos.value.length },
  { id: 'materiales',     label: 'Materiales',     icon: 'description',  count: materiales.value.length },
  { id: 'tareas',         label: 'Tareas',         icon: 'assignment',   count: tareas.value.length },
  { id: 'calificaciones', label: 'Calificaciones', icon: 'grading',      count: alumnosConNotas.value.length },
]);

const hayCodigoInscripcion = computed(() => !!materia.value?.codigo_inscripcion);

const urlQr = computed(() => {
  if (!materia.value?.codigo_inscripcion) return '';
  const base = window.location.origin;
  return `${base}/registro?codigo=${materia.value.codigo_inscripcion}`;
});

function iniciales(n, a) {
  return ((n?.[0] || '') + (a?.[0] || '')).toUpperCase() || '?';
}

function fechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

async function cargar() {
  cargando.value = true;
  try {
    const [mat, als, mats, tars, califs] = await Promise.all([
      profApi.getDetalleMateria(materiaId),
      profApi.getAlumnosDeMateria(materiaId).catch(() => []),
      profApi.getMaterialesDeMateria(materiaId).catch(() => []),
      profApi.getTareasDeMateria(materiaId).catch(() => []),
      profApi.getAlumnosConNotas(materiaId).catch(() => []),
    ]);
    materia.value = mat;
    notaAprobacion.value = Number(mat.nota_aprobacion) || 6;
    alumnos.value = als || [];
    materiales.value = mats || [];
    tareas.value = tars || [];
    alumnosConNotas.value = califs || [];
  } catch (e) {
    console.error('Error cargando materia:', e);
    Notify.create({ message: 'Error al cargar la materia', color: 'negative', icon: 'error' });
  } finally {
    cargando.value = false;
  }
}

async function abrirModalAgregar() {
  modalAgregar.value = true;
  busqueda.value = '';
  await buscarInmediato('');
}

function cerrarModalAgregar() {
  modalAgregar.value = false;
  busqueda.value = '';
  resultados.value = [];
}

function alCambiarBusqueda() {
  clearTimeout(timerBusqueda);
  timerBusqueda = setTimeout(() => buscarInmediato(busqueda.value), 300);
}

async function buscarInmediato(q) {
  buscando.value = true;
  try {
    const datos = await profApi.buscarAlumnosParaMateria(q, materiaId);
    resultados.value = datos || [];
  } catch (e) {
    console.warn('Error búsqueda:', e);
    resultados.value = [];
  } finally {
    buscando.value = false;
  }
}

async function agregarAlumno(alumno) {
  agregando.value = { ...agregando.value, [alumno.id]: true };
  try {
    await profApi.agregarAlumnoAMateria(materiaId, alumno.id);

    resultados.value = resultados.value.filter((a) => a.id !== alumno.id);

    const actualizados = await profApi.getAlumnosDeMateria(materiaId).catch(() => []);
    alumnos.value = actualizados || [];

    Notify.create({
      message: `${alumno.nombre} ${alumno.apellido} agregado a la materia`,
      color: 'positive',
      icon: 'check_circle',
      position: 'top-right',
    });
  } catch (e) {
    const msg = e?.error || 'Error al agregar alumno';
    Notify.create({ message: msg, color: 'negative', icon: 'error', position: 'top-right' });
  } finally {
    const nuevo = { ...agregando.value };
    delete nuevo[alumno.id];
    agregando.value = nuevo;
  }
}

async function abrirModalQr() {
  modalQr.value = true;
  qrDataUrl.value = '';
  linkInscripcion.value = urlQr.value;

  try {
    const dataUrl = await QRCode.toDataURL(urlQr.value, {
      width: 320,
      margin: 2,
      color: { dark: '#4A0712', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
    qrDataUrl.value = dataUrl;
  } catch (e) {
    console.warn('Error generando QR:', e);
  }
}

function copiarLink() {
  navigator.clipboard.writeText(linkInscripcion.value).then(() => {
    Notify.create({ message: 'Link copiado', color: 'positive', icon: 'content_copy' });
  }).catch(() => {
    Notify.create({ message: 'No se pudo copiar', color: 'negative' });
  });
}

function descargarQr() {
  if (!qrDataUrl.value) return;
  const link = document.createElement('a');
  link.href = qrDataUrl.value;
  link.download = `qr-${materia.value.codigo_inscripcion || 'materia'}.png`;
  link.click();
}

function imprimirQr() {
  if (!qrDataUrl.value) return;
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>QR - ${materia.value.nombre}</title>
    <style>
      body{font-family:system-ui;text-align:center;padding:40px}
      h1{color:var(--primary);margin-bottom:8px}
      p{color:#666;margin:4px 0}
      img{max-width:400px;margin:20px 0}
    </style></head><body>
      <h1>${materia.value.nombre}</h1>
      <p>Código: ${materia.value.codigo_inscripcion}</p>
      <img src="${qrDataUrl.value}" />
      <p><small>Escaneá para inscribirte</small></p>
    </body></html>
  `);
  w.document.close();
  setTimeout(() => w.print(), 300);
}

function getNota(alumno) {
  const cambio = cambiosNotas.value[alumno.matricula_id];
  if (cambio && 'nota_final' in cambio) return cambio.nota_final;
  return alumno.nota_final;
}

function getObservacion(alumno) {
  const cambio = cambiosNotas.value[alumno.matricula_id];
  if (cambio && 'observacion' in cambio) return cambio.observacion;
  return alumno.observacion || '';
}

function setNota(matriculaId, valor) {
  if (!cambiosNotas.value[matriculaId]) cambiosNotas.value[matriculaId] = {};
  cambiosNotas.value[matriculaId].nota_final = valor === '' || valor === null ? null : Number(valor);
}

function setObservacion(matriculaId, valor) {
  if (!cambiosNotas.value[matriculaId]) cambiosNotas.value[matriculaId] = {};
  cambiosNotas.value[matriculaId].observacion = valor;
}

function estadoCalificacion(alumno) {
  const nota = getNota(alumno);
  if (nota === null || nota === undefined || nota === '') return 'grey-5';
  return Number(nota) >= notaAprobacion.value ? 'positive' : 'negative';
}

function estadoCalificacionLabel(alumno) {
  const nota = getNota(alumno);
  if (nota === null || nota === undefined || nota === '') return 'Sin nota';
  return Number(nota) >= notaAprobacion.value ? 'Aprobado' : 'Reprobado';
}

async function guardarNotaAprobacion() {
  guardandoNotaAprobacion.value = true;
  try {
    await profApi.actualizarNotaAprobacion(materiaId, notaAprobacion.value);
    Notify.create({ type: 'positive', message: 'Nota de aprobación actualizada', position: 'top-right' });
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error al guardar', position: 'top-right' });
  } finally {
    guardandoNotaAprobacion.value = false;
  }
}

async function guardarNotas() {
  guardandoNotas.value = true;
  try {
    const entries = Object.entries(cambiosNotas.value);
    for (const [matriculaId, cambio] of entries) {
      await profApi.actualizarNotaFinal(Number(matriculaId), {
        nota_final: cambio.nota_final,
        observacion: cambio.observacion,
      });
    }
    Notify.create({
      type: 'positive',
      message: entries.length + ' calificación(es) guardada(s)',
      position: 'top-right',
    });
    cambiosNotas.value = {};
    alumnosConNotas.value = await profApi.getAlumnosConNotas(materiaId);
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error al guardar', position: 'top-right' });
  } finally {
    guardandoNotas.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="materia-page">
    <div class="materia-content">

      <header class="page-heading">
        <div class="heading-left">
          <q-btn
            flat round dense
            icon="arrow_back"
            color="primary"
            aria-label="Volver"
            @click="router.push('/docente/materias')"
          />
          <div v-if="materia" class="heading-text">
            <div class="eyebrow">{{ materia.codigo }}</div>
            <h1>{{ materia.nombre }}</h1>
          </div>
        </div>

        <div v-if="hayCodigoInscripcion" class="heading-right">
          <q-btn
            outline
            no-caps
            color="primary"
            icon="qr_code_2"
            label="Compartir QR"
            class="btn-heading"
            @click="abrirModalQr"
          />
        </div>
      </header>

      <div v-if="cargando" class="loading-state">
        <q-spinner color="primary" size="40px" />
        <span>Cargando materia…</span>
      </div>

      <template v-else-if="materia">

        <div class="info-grid">
          <div class="info-card">
            <q-icon name="meeting_room" size="20px" />
            <div>
              <div class="info-label">Aula</div>
              <div class="info-value">{{ materia.aula || '—' }}</div>
            </div>
          </div>
          <div class="info-card">
            <q-icon name="schedule" size="20px" />
            <div>
              <div class="info-label">Horario</div>
              <div class="info-value">{{ materia.horario || '—' }}</div>
            </div>
          </div>
          <div class="info-card">
            <q-icon name="groups" size="20px" />
            <div>
              <div class="info-label">Alumnos</div>
              <div class="info-value">{{ alumnos.length }}</div>
            </div>
          </div>
        </div>

        <div class="tabs-bar">
          <q-btn
            v-for="t in tabs"
            :key="t.id"
            :label="t.label"
            :icon="t.icon"
            no-caps
            :unelevated="tabActiva === t.id"
            :flat="tabActiva !== t.id"
            :color="tabActiva === t.id ? 'primary' : 'grey-7'"
            class="tab-btn"
            @click="tabActiva = t.id"
          >
            <q-badge
              v-if="t.count > 0"
              :color="tabActiva === t.id ? 'white' : 'grey-5'"
              :text-color="tabActiva === t.id ? 'primary' : 'white'"
              class="tab-badge"
            >
              {{ t.count }}
            </q-badge>
          </q-btn>
        </div>

        <q-card v-if="tabActiva === 'alumnos'" flat bordered class="content-card">
          <div class="card-header">
            <div class="card-title">
              <q-icon name="groups" size="20px" />
              <span>Alumnos ({{ alumnos.length }})</span>
            </div>
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="person_add"
              label="Agregar alumno"
              class="btn-accion"
              @click="abrirModalAgregar"
            />
          </div>

          <div v-if="!alumnos.length" class="empty-state">
            <q-icon name="group_off" size="48px" />
            <p>Sin alumnos en esta materia</p>
            <q-btn
              flat no-caps color="primary"
              icon="person_add" label="Agregar el primero"
              @click="abrirModalAgregar"
            />
          </div>

          <div v-else class="alumnos-grid">
            <div v-for="a in alumnos" :key="a.id || a.alumno_id" class="alumno-item">
              <q-avatar size="40px" class="avatar-alumno">
                {{ iniciales(a.nombre, a.apellido) }}
              </q-avatar>
              <div class="alumno-info">
                <div class="alumno-nombre">{{ a.nombre }} {{ a.apellido }}</div>
                <div class="alumno-email">{{ a.email || a.usuario || '—' }}</div>
              </div>
            </div>
          </div>
        </q-card>

        <q-card v-else-if="tabActiva === 'materiales'" flat bordered class="content-card">
          <div class="card-header">
            <div class="card-title">
              <q-icon name="description" size="20px" />
              <span>Materiales ({{ materiales.length }})</span>
            </div>
          </div>

          <div v-if="!materiales.length" class="empty-state">
            <q-icon name="folder_off" size="48px" />
            <p>Sin materiales cargados</p>
          </div>

          <div v-else class="lista-simple">
            <div v-for="m in materiales" :key="m.id" class="item-row">
              <q-icon name="description" size="20px" class="item-icon" />
              <div class="item-main">
                <div class="item-titulo">{{ m.titulo }}</div>
                <div class="item-desc">{{ m.tipo }} · {{ fechaCorta(m.fecha) }}</div>
              </div>
            </div>
          </div>
        </q-card>

        <q-card v-else-if="tabActiva === 'tareas'" flat bordered class="content-card">
          <div class="card-header">
            <div class="card-title">
              <q-icon name="assignment" size="20px" />
              <span>Tareas ({{ tareas.length }})</span>
            </div>
          </div>

          <div v-if="!tareas.length" class="empty-state">
            <q-icon name="inbox" size="48px" />
            <p>Sin tareas asignadas</p>
          </div>

          <div v-else class="lista-simple">
            <div v-for="t in tareas" :key="t.id" class="item-row">
              <q-icon name="assignment" size="20px" class="item-icon" />
              <div class="item-main">
                <div class="item-titulo">{{ t.titulo }}</div>
                <div class="item-desc">Vence: {{ fechaCorta(t.fecha_entrega) }} · {{ t.estado }}</div>
              </div>
            </div>
          </div>
        </q-card>

        <q-card v-else-if="tabActiva === 'calificaciones'" flat bordered class="content-card">
          <div class="card-header">
            <div class="card-title">
              <q-icon name="grading" size="20px" />
              <span>Calificaciones ({{ alumnosConNotas.length }})</span>
            </div>
          </div>

          <div class="criterio-box">
            <div>
              <div class="criterio-label">Nota de aprobación</div>
              <div class="criterio-desc">Los alumnos aprueban con esta nota o más (escala 0-12)</div>
            </div>
            <div class="criterio-right">
              <q-btn-group outline>
                <q-btn v-for="n in [6, 7, 8]" :key="n"
                  :color="notaAprobacion == n ? 'primary' : 'grey-7'"
                  :outline="notaAprobacion != n"
                  :unelevated="notaAprobacion == n"
                  :label="String(n)" no-caps
                  @click="notaAprobacion = n" />
              </q-btn-group>
              <q-input
                v-model.number="notaAprobacion"
                type="number" outlined dense
                min="0" max="12" step="0.5"
                style="width: 100px"
              />
              <q-btn
                unelevated no-caps color="primary" icon="save"
                label="Guardar"
                :loading="guardandoNotaAprobacion"
                @click="guardarNotaAprobacion"
              />
            </div>
          </div>

          <q-separator />

          <div v-if="!alumnosConNotas.length" class="empty-state">
            <q-icon name="group_off" size="48px" />
            <p>Sin alumnos en esta materia</p>
          </div>

          <div v-else class="tabla-calificaciones-wrapper">
            <table class="tabla-calificaciones">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th style="width: 130px">Nota final</th>
                  <th>Observación</th>
                  <th style="width: 110px" class="text-center">Estado</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="a in alumnosConNotas" :key="a.matricula_id">
                  <td>
                    <div class="alumno-cell">
                      <q-avatar size="32px" class="avatar-alumno">
                        {{ iniciales(a.nombre, a.apellido) }}
                      </q-avatar>
                      <div>
                        <div class="alumno-nombre">{{ a.apellido }}, {{ a.nombre }}</div>
                        <div class="alumno-email">{{ a.email }}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <q-input
                      :model-value="getNota(a)"
                      @update:model-value="val => setNota(a.matricula_id, val)"
                      type="number" outlined dense
                      min="0" max="12" step="0.5"
                      placeholder="—"
                    />
                  </td>
                  <td>
                    <q-input
                      :model-value="getObservacion(a)"
                      @update:model-value="val => setObservacion(a.matricula_id, val)"
                      outlined dense
                      placeholder="Sin observación"
                      maxlength="2000"
                    />
                  </td>
                  <td class="text-center">
                    <q-badge
                      :color="estadoCalificacion(a)"
                      :label="estadoCalificacionLabel(a)"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="tabla-footer">
            <div class="footer-hint">
              {{ Object.keys(cambiosNotas).length }} cambio(s) pendiente(s)
            </div>
            <q-btn
              unelevated no-caps color="primary" icon="save"
              label="Guardar cambios"
              :loading="guardandoNotas"
              :disable="Object.keys(cambiosNotas).length === 0"
              @click="guardarNotas"
            />
          </div>
        </q-card>

      </template>
    </div>

    <q-dialog v-model="modalAgregar" persistent>
      <q-card class="modal-agregar">
        <q-card-section class="modal-header">
          <div>
            <div class="modal-titulo">Agregar alumno</div>
            <div class="modal-subtitulo">{{ materia?.nombre }}</div>
          </div>
          <q-btn flat round dense icon="close" @click="cerrarModalAgregar" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <q-input
            v-model="busqueda"
            outlined dense
            autofocus
            placeholder="Buscar por nombre, email o usuario..."
            class="input-buscar"
            @update:model-value="alCambiarBusqueda"
          >
            <template #prepend>
              <q-icon name="search" />
            </template>
            <template v-if="buscando" #append>
              <q-spinner size="18px" color="primary" />
            </template>
            <template v-else-if="busqueda" #append>
              <q-icon name="close" class="cursor-pointer" @click="busqueda = ''; buscarInmediato('')" />
            </template>
          </q-input>

          <div class="buscador-hint">
            Mostrando alumnos <strong>no matriculados</strong> en esta materia
          </div>
        </q-card-section>

        <q-separator />

        <q-card-section class="modal-listado">
          <div v-if="buscando && !resultados.length" class="empty-modal">
            <q-spinner color="primary" size="32px" />
          </div>

          <div v-else-if="!resultados.length" class="empty-modal">
            <q-icon name="search_off" size="40px" />
            <p v-if="busqueda">Sin resultados para "{{ busqueda }}"</p>
            <p v-else>Todos los alumnos ya están matriculados 🎉</p>
          </div>

          <div v-else class="resultados-lista">
            <div
              v-for="a in resultados"
              :key="a.id"
              class="resultado-item"
            >
              <q-avatar size="42px" class="avatar-alumno">
                {{ iniciales(a.nombre, a.apellido) }}
              </q-avatar>
              <div class="resultado-info">
                <div class="resultado-nombre">{{ a.nombre }} {{ a.apellido }}</div>
                <div class="resultado-email">{{ a.email }} · {{ a.usuario }}</div>
              </div>
              <q-btn
                unelevated
                no-caps
                dense
                color="primary"
                icon="add"
                label="Agregar"
                :loading="!!agregando[a.id]"
                class="btn-agregar"
                @click="agregarAlumno(a)"
              />
            </div>
          </div>
        </q-card-section>

        <q-card-actions align="right" class="modal-actions">
          <q-btn flat no-caps label="Cerrar" color="grey-7" @click="cerrarModalAgregar" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="modalQr">
      <q-card class="modal-qr">
        <q-card-section class="modal-header">
          <div>
            <div class="modal-titulo">Inscripción por QR</div>
            <div class="modal-subtitulo">{{ materia?.nombre }}</div>
          </div>
          <q-btn flat round dense icon="close" @click="modalQr = false" />
        </q-card-section>

        <q-separator />

        <q-card-section class="qr-content">
          <div v-if="!qrDataUrl" class="qr-loading">
            <q-spinner color="primary" size="40px" />
          </div>
          <div v-else class="qr-frame">
            <img :src="qrDataUrl" alt="QR de inscripción" class="qr-imagen" />
          </div>

          <div class="qr-info">
            <div class="qr-titulo">Escaneá para inscribirte</div>
            <div class="qr-codigo">
              Código: <strong>{{ materia?.codigo_inscripcion }}</strong>
            </div>
          </div>

          <div class="qr-link">
            <q-input
              :model-value="linkInscripcion"
              outlined dense
              readonly
              class="input-link"
            >
              <template #prepend>
                <q-icon name="link" size="16px" />
              </template>
            </q-input>
            <q-btn
              flat round dense
              icon="content_copy"
              color="primary"
              @click="copiarLink"
            >
              <q-tooltip>Copiar link</q-tooltip>
            </q-btn>
          </div>
        </q-card-section>

        <q-separator />

        <q-card-actions class="qr-actions">
          <q-btn
            flat no-caps
            color="grey-7"
            icon="print"
            label="Imprimir"
            @click="imprimirQr"
          />
          <q-space />
          <q-btn
            unelevated no-caps
            color="primary"
            icon="download"
            label="Descargar PNG"
            @click="descargarQr"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

  </q-page>
</template>

<style scoped>
.materia-page {
  background: var(--bg);
  min-height: calc(100vh - 68px);
}

.materia-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 28px 34px 60px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.heading-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.heading-text .eyebrow {
  color: var(--primary);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.5px;
}

.heading-text h1 {
  margin: 4px 0 0;
  color: var(--text);
  font-size: clamp(20px, 2.5vw, 28px);
  font-weight: 750;
  letter-spacing: -0.8px;
}

.btn-heading {
  text-transform: none;
  font-weight: 600;
  border-radius: 10px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
  margin-bottom: 24px;
}

.info-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 18px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}

.info-card .q-icon { color: var(--primary); }

.info-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 600;
}

.info-value {
  margin-top: 2px;
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.tabs-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.tab-btn {
  text-transform: none;
  font-weight: 600;
  border-radius: 10px;
  padding: 8px 16px;
  min-height: 40px;
}

.tab-badge {
  margin-left: 8px;
  font-size: 10px;
  font-weight: 700;
}

.content-card {
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 14px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-subtle);
  flex-wrap: wrap;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
  font-size: 15px;
  font-weight: 700;
}

.card-title .q-icon { color: var(--primary); }

.btn-accion {
  text-transform: none;
  font-weight: 600;
  border-radius: 10px;
}

.alumnos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
  padding: 20px;
}

.alumno-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  transition: border-color 0.15s, transform 0.15s;
}

.alumno-item:hover {
  border-color: var(--primary);
  transform: translateY(-1px);
}

.avatar-alumno {
  color: white;
  background: var(--primary);
  font-weight: 700;
  font-size: 13px;
  flex-shrink: 0;
}

.alumno-info {
  min-width: 0;
  flex: 1;
}

.alumno-nombre {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.alumno-email {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.lista-simple {
  padding: 12px 20px 20px;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.item-row:last-child { border-bottom: none; }

.item-icon { color: var(--primary); }

.item-main { flex: 1; min-width: 0; }

.item-titulo {
  font-size: 13.5px;
  font-weight: 700;
  color: var(--text);
}

.item-desc {
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 50px 20px;
  color: var(--text-muted);
}

.empty-state .q-icon { color: var(--text-disabled); }

.empty-state p {
  margin: 0;
  font-size: 13.5px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 60px 20px;
  color: var(--text-muted);
}

.modal-agregar {
  width: 560px;
  max-width: 95vw;
  border-radius: 14px;
  background: var(--bg-elevated);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 20px;
  background: var(--bg-hover);
}

.modal-titulo {
  font-size: 16px;
  font-weight: 750;
  color: var(--text);
  letter-spacing: -0.2px;
}

.modal-subtitulo {
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-muted);
}

.input-buscar {
  border-radius: 10px;
}

.buscador-hint {
  margin-top: 10px;
  font-size: 11.5px;
  color: var(--text-muted);
}

.buscador-hint strong {
  color: var(--text-secondary);
}

.modal-listado {
  max-height: 400px;
  overflow-y: auto;
  padding: 12px;
}

.empty-modal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-modal .q-icon { color: var(--text-disabled); }

.empty-modal p {
  margin: 0;
  font-size: 13px;
}

.resultados-lista {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.resultado-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  transition: border-color 0.15s;
}

.resultado-item:hover {
  border-color: var(--primary);
}

.resultado-info {
  flex: 1;
  min-width: 0;
}

.resultado-nombre {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
}

.resultado-email {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn-agregar {
  text-transform: none;
  font-weight: 600;
  border-radius: 8px;
  flex-shrink: 0;
}

.modal-actions {
  padding: 10px 16px 14px;
}

.modal-qr {
  width: 420px;
  max-width: 95vw;
  border-radius: 14px;
  background: var(--bg-elevated);
}

.qr-content {
  padding: 24px 24px 20px;
  text-align: center;
}

.qr-loading {
  display: grid;
  place-items: center;
  height: 320px;
}

.qr-frame {
  display: inline-block;
  padding: 16px;
  background: var(--bg-elevated);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
}

.qr-imagen {
  display: block;
  width: 280px;
  height: 280px;
  max-width: 100%;
}

.qr-info {
  margin-top: 18px;
}

.qr-titulo {
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.qr-codigo {
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--text-muted);
}

.qr-codigo strong {
  color: var(--primary);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 13.5px;
  letter-spacing: 0.05em;
}

.qr-link {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 18px;
}

.input-link {
  flex: 1;
}

.input-link :deep(.q-field__native) {
  font-size: 11px;
  color: var(--text-muted);
}

.qr-actions {
  padding: 12px 16px;
}

@media (max-width: 700px) {
  .materia-content { padding: 20px 16px 40px; }
  .info-grid { grid-template-columns: 1fr; gap: 10px; }
  .alumnos-grid { grid-template-columns: 1fr; padding: 12px; }
  .card-header { padding: 14px 16px; }
  .lista-simple { padding: 8px 16px 16px; }
  .tabs-bar { gap: 4px; }
  .tab-btn { flex: 1; min-width: 0; padding: 8px 10px; }
  .modal-agregar, .modal-qr { width: 100vw; max-width: 100vw; border-radius: 0; }
  .qr-imagen { width: 240px; height: 240px; }
  .resultado-item { padding: 10px; }
  .resultado-nombre { font-size: 12.5px; }
  .btn-agregar { padding: 4px 10px; }
}
</style>
