<template>
  <q-page class="calendario-page">
    <header class="page-header">
      <div class="header-info">
        <div class="icon-wrapper"><q-icon name="calendar_month" size="24px" /></div>
        <div>
          <h1 class="page-title">Calendario</h1>
          <p class="page-sub">Tus clases, tareas y eventos académicos</p>
        </div>
      </div>

      <div class="header-actions">
        <q-input
          v-model="busqueda"
          outlined
          dense
          placeholder="Buscar evento..."
          class="search-input"
        >
          <template #prepend>
            <q-icon name="search" size="18px" />
          </template>
        </q-input>

        <q-btn
          unelevated
          outline
          color="primary"
          icon="tune"
          label="Filtros"
          no-caps
          class="btn-filtros"
          @click="drawerAbierto = true"
        />

        <q-btn
          unelevated
          color="primary"
          icon="add"
          label="Nuevo"
          no-caps
          class="btn-agregar"
          @click="abrirModalCrear"
        />
      </div>
    </header>

    <div class="calendar-container">
      <q-card flat bordered class="calendar-card">
        <div class="calendar-toolbar">
          <div class="nav-group">
            <q-btn flat dense icon="chevron_left" @click="prevMonth" />
            <q-btn flat no-caps class="btn-hoy" label="Hoy" @click="goHoy" />
            <q-btn flat dense icon="chevron_right" @click="nextMonth" />
          </div>
          <div class="month-label">{{ mesActual }}</div>
          <div class="view-options">
            <q-btn-toggle
              v-model="vista"
              toggle-color="primary"
              flat
              :options="[
                { label: 'Mes', value: 'month' },
                { label: 'Agenda', value: 'agenda' }
              ]"
            />
          </div>
        </div>

        <div v-if="vista === 'month'" class="custom-grid">
          <div class="grid-header">
            <div v-for="d in diasSemana" :key="d" class="day-header">{{ d }}</div>
          </div>
          <div class="grid-body">
            <div
              v-for="(dia, index) in diasGrilla"
              :key="index"
              class="day-cell"
              :class="{
                'out-of-month': !dia.esMesActual,
                'today': esHoy(dia.fecha)
              }"
            >
              <div class="day-number">{{ dia.dia }}</div>
              <div class="day-events">
                <div
                  v-for="ev in obtenerEventosDelDia(dia.fecha)"
                  :key="ev.id"
                  class="event-pill"
                  :style="{ backgroundColor: ev.color + '15', color: ev.color, borderLeft: '3px solid ' + ev.color }"
                  @click="verDetalle(ev)"
                  :title="ev.origen + ' — ' + ev.titulo"
                >
                  <q-icon :name="iconoOrigen(ev.origen)" size="10px" class="event-origen-icon" />
                  <span class="event-time" v-if="ev.origen !== 'manual' || !ev.todo_el_dia">{{ extraerHora(ev.fecha_inicio) }}</span>
                  <span class="event-title">{{ ev.titulo }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="vista === 'agenda'" class="agenda-view">
          <div v-if="eventosFiltrados.length === 0" class="empty-state">
            <q-icon name="event_busy" size="40px" color="grey-5" />
            <p>No hay eventos para este período.</p>
          </div>
          <div v-else class="agenda-list">
            <template v-for="(grupo, fecha) in eventosAgrupadosPorDia" :key="fecha">
              <div class="agenda-date">{{ formatearFechaCompleta(fecha) }}</div>
              <div class="agenda-items">
                <div v-for="ev in grupo" :key="ev.id" class="agenda-item" @click="verDetalle(ev)">
                  <div class="agenda-dot" :style="{ backgroundColor: ev.color }"></div>
                  <div class="agenda-info">
                    <div class="agenda-title">{{ ev.titulo }}</div>
                    <div class="agenda-meta">
                      <span v-if="ev.materia_nombre"><q-icon name="book" size="12px"/> {{ ev.materia_nombre }}</span>
                      <span><q-icon name="schedule" size="12px"/> {{ extraerHora(ev.fecha_inicio) }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </q-card>
    </div>

    <q-drawer v-model="drawerAbierto" side="right" bordered overlay class="calendar-drawer">
      <div class="drawer-content">
        <div class="drawer-header">
          <span>Filtros y Agenda</span>
          <q-btn icon="close" flat round dense @click="drawerAbierto = false" />
        </div>

        <q-card flat class="drawer-section">
          <div class="section-title"><q-icon name="filter_alt" /> Filtrar por tipo</div>
          <q-list dense class="q-mt-sm">
            <q-item tag="label" v-ripple v-for="f in filtros" :key="f.value">
              <q-item-section avatar>
                <q-checkbox v-model="tiposActivos" :val="f.value" color="primary" dense />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ f.label }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>

        <q-card flat class="drawer-section q-mt-md">
          <div class="section-title"><q-icon name="schedule" /> Próximos Eventos</div>
          <div v-if="proximosEventos.length === 0" class="text-grey-6 text-caption q-mt-sm">
            No hay eventos próximos.
          </div>
          <div v-else class="proximos-list q-mt-sm">
            <div v-for="ev in proximosEventos" :key="ev.id" class="proximo-item" @click="verDetalle(ev)">
              <div class="proximo-fecha">{{ formatearFechaCorta(ev.fecha_inicio) }}</div>
              <div class="proximo-info">
                <div class="proximo-titulo">{{ ev.titulo }}</div>
                <div class="proximo-meta" :style="{ color: ev.color }">{{ ev.materia_nombre || 'General' }}</div>
              </div>
            </div>
          </div>
        </q-card>
      </div>
    </q-drawer>

    <q-dialog v-model="detalleAbierto">
      <q-card style="min-width: 380px; max-width: 95vw; border-radius: 14px;">
        <q-card-section class="row items-start q-pb-none q-pt-md">
          <div
            class="detalle-icono-cabecera"
            :style="{
              backgroundColor: ((eventoDetalle && eventoDetalle.color) || '#888') + '22',
              color: (eventoDetalle && eventoDetalle.color) || '#888'
            }"
          >
            <q-icon :name="iconoOrigen(eventoDetalle && eventoDetalle.origen)" size="22px" />
          </div>
          <div class="q-ml-md" style="flex: 1; min-width: 0;">
            <div class="text-caption text-grey-7" style="line-height: 1;">
              {{ eventoDetalle && etiquetaOrigen(eventoDetalle.origen) }}
            </div>
            <div class="text-h6" style="line-height: 1.25; margin-top: 2px;">
              {{ eventoDetalle && eventoDetalle.titulo }}
            </div>
          </div>
          <q-btn icon="close" flat round dense v-close-popup size="sm" />
        </q-card-section>

        <q-card-section v-if="eventoDetalle" class="q-pt-sm">
          <div class="detalle-fila">
            <q-icon name="book" size="16px" class="detalle-fila-icono" />
            <span>{{ eventoDetalle.materia_nombre || 'General' }}</span>
          </div>
          <div class="detalle-fila">
            <q-icon name="event" size="16px" class="detalle-fila-icono" />
            <span>
              {{ formatearFechaCompleta(String(eventoDetalle.fecha_inicio).substring(0, 10)) }}
              <span v-if="extraerHora(eventoDetalle.fecha_inicio)" class="text-grey-6">
                · {{ extraerHora(eventoDetalle.fecha_inicio) }}
              </span>
            </span>
          </div>
          <div v-if="eventoDetalle.descripcion" class="detalle-descripcion">
            {{ eventoDetalle.descripcion }}
          </div>
        </q-card-section>

        <q-card-actions v-if="eventoDetalle && eventoDetalle.origen === 'clase' && auth.user?.tipo === 'docente'" align="right" class="q-pb-md q-px-md">
          <q-btn unelevated color="primary" icon="fact_check" label="Tomar lista" no-caps @click="irAAsistencia" />
        </q-card-actions>
</q-card>
    </q-dialog>

    <q-dialog v-model="modalAbierto" persistent>
      <q-card style="min-width: 400px; max-width: 95vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Crear Evento</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>
        <q-card-section class="q-gutter-y-md">
          <q-input v-model="nuevoEvento.titulo" outlined label="Título *" />
          <q-input v-model="nuevoEvento.descripcion" outlined type="textarea" label="Descripción" />
          <div class="row q-col-gutter-sm">
            <div class="col-6"><q-input v-model="nuevoEvento.fechaInicio" outlined type="datetime-local" label="Inicio *" /></div>
            <div class="col-6"><q-input v-model="nuevoEvento.fechaFin" outlined type="datetime-local" label="Fin" /></div>
          </div>
          <q-select v-model="nuevoEvento.tipo" outlined :options="['institucion', 'personal']" label="Tipo de evento" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn unelevated color="primary" label="Guardar" @click="guardarEvento" :loading="guardando" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import * as calApi from '../../api/calendario.api.js'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store.js'

const router = useRouter()
const auth = useAuthStore()

const eventos = ref([])
const cargando = ref(true)
const busqueda = ref('')
const vista = ref('month')
const fechaBase = ref(new Date())
const drawerAbierto = ref(false)
const tiposActivos = ref(['manual', 'evaluacion', 'tarea', 'clase'])

const modalAbierto = ref(false)
const guardando = ref(false)
const detalleAbierto = ref(false)
const eventoDetalle = ref(null)
const nuevoEvento = ref({
  titulo: '', descripcion: '', fechaInicio: '', fechaFin: '', tipo: 'personal'
})

const filtros = [
  { label: 'Clases', value: 'clase' },
  { label: 'Evaluaciones', value: 'evaluacion' },
  { label: 'Tareas', value: 'tarea' },
  { label: 'Eventos Manuales', value: 'manual' }
]

const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

const mesActual = computed(() => {
  return fechaBase.value.toLocaleDateString('es-UY', { month: 'long', year: 'numeric' }).toUpperCase()
})

const eventosFiltrados = computed(() => {
  return eventos.value.filter(ev => {
    if (!tiposActivos.value.includes(ev.origen)) return false;
    if (busqueda.value.trim()) {
      const q = busqueda.value.toLowerCase();
      return ev.titulo.toLowerCase().includes(q) || (ev.materia_nombre || '').toLowerCase().includes(q);
    }
    return true;
  })
})

const eventosAgrupadosPorDia = computed(() => {
  const agrupados = {};
  const ordenados = [...eventosFiltrados.value].sort((a,b) => new Date(a.fecha_inicio) - new Date(b.fecha_inicio));
  ordenados.forEach(ev => {
    const fecha = String(ev.fecha_inicio).substring(0, 10);
    if (!agrupados[fecha]) agrupados[fecha] = [];
    agrupados[fecha].push(ev);
  });

  return agrupados;
})

const proximosEventos = computed(() => {
  const hoy = new Date().toISOString().split('T')[0];
  return eventosFiltrados.value
    .filter(ev => String(ev.fecha_inicio).substring(0, 10) >= hoy)
    .slice(0, 8);
})

const diasGrilla = computed(() => {
  const year = fechaBase.value.getFullYear();
  const month = fechaBase.value.getMonth();

  const primerDiaMes = new Date(year, month, 1);
  let diaSemana = primerDiaMes.getDay() - 1;
  if (diaSemana === -1) diaSemana = 6;

  const fechaInicioGrilla = new Date(year, month, 1 - diaSemana);
  const dias = [];

  const fDate = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  for (let i = 0; i < 42; i++) {
    const d = new Date(fechaInicioGrilla);
    d.setDate(d.getDate() + i);
    dias.push({
      fecha: fDate(d),
      dia: d.getDate(),
      esMesActual: d.getMonth() === month
    });
  }
  return dias;
});

function obtenerEventosDelDia(fechaStr) {
  if (!eventosAgrupadosPorDia.value[fechaStr]) return [];
  return eventosAgrupadosPorDia.value[fechaStr];
}

function esHoy(fechaStr) {
  const hoyStr = new Date().toISOString().substring(0, 10);
  return fechaStr === hoyStr;
}

function iconoOrigen(origen) {
  const mapa = { manual: 'push_pin', evaluacion: 'assignment', tarea: 'task_alt', clase: 'school' };
  return mapa[origen] || 'event';
}

function extraerHora(isoStr) {
  if (!isoStr) return '';
  const s = String(isoStr);
  if (s.includes('T')) return s.split('T')[1]?.substring(0, 5) || '';
  if (s.includes(' ')) return s.split(' ')[1]?.substring(0, 5) || '';
  return '';
}

function formatearFechaCorta(isoStr) {
  const d = new Date(isoStr);
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

function formatearFechaCompleta(fechaStr) {
  const d = new Date(fechaStr + 'T00:00:00');
  return d.toLocaleDateString('es-UY', { weekday: 'long', day: 'numeric', month: 'long' });
}

function prevMonth() {
  const d = new Date(fechaBase.value);
  d.setMonth(d.getMonth() - 1);
  fechaBase.value = d;
  cargarEventos();
}

function nextMonth() {
  const d = new Date(fechaBase.value);
  d.setMonth(d.getMonth() + 1);
  fechaBase.value = d;
  cargarEventos();
}

function goHoy() {
  fechaBase.value = new Date();
  cargarEventos();
}

function verDetalle(ev) {
  eventoDetalle.value = ev;
  detalleAbierto.value = true;
}

function irAAsistencia() {
  if (!eventoDetalle.value) return;
  const ev = eventoDetalle.value;
  detalleAbierto.value = false;
  router.push({
    path: '/docente/asistencia',
    query: { materiaId: ev.materia_id, grupoId: ev.grupo_id, sesionId: ev.origen_id }
  });
}

function etiquetaOrigen(origen) {
  const mapa = { manual: 'Evento manual', evaluacion: 'Evaluación', tarea: 'Tarea', clase: 'Clase' };
  return mapa[origen] || 'Evento';
}

function abrirModalCrear() {
  nuevoEvento.value = { titulo: '', descripcion: '', fechaInicio: '', fechaFin: '', tipo: 'personal' };
  modalAbierto.value = true;
}

async function guardarEvento() {
  if (!nuevoEvento.value.titulo || !nuevoEvento.value.fechaInicio) return;
  guardando.value = true;
  try {
    await calApi.crearEvento({
      titulo: nuevoEvento.value.titulo,
      descripcion: nuevoEvento.value.descripcion,
      tipo: nuevoEvento.value.tipo,
      fechaInicio: new Date(nuevoEvento.value.fechaInicio).toISOString(),
      fechaFin: nuevoEvento.value.fechaFin ? new Date(nuevoEvento.value.fechaFin).toISOString() : null,
      todoElDia: false,
      privado: true
    });
    modalAbierto.value = false;
    cargarEventos();
  } catch {
    alert('Error al crear evento');
  } finally {
    guardando.value = false;
  }
}

async function cargarEventos() {
  cargando.value = true;
  try {
    const year = fechaBase.value.getFullYear();
    const month = fechaBase.value.getMonth();
    const fDate = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const desde = fDate(new Date(year, month - 1, 1));
    const hasta = fDate(new Date(year, month + 2, 0));

    eventos.value = await calApi.listarCompleto({ desde, hasta });
  } catch {
    eventos.value = [];
  } finally {
    cargando.value = false;
  }
}

onMounted(cargarEventos);
</script>

<style scoped>
.calendario-page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px; flex-wrap: wrap; gap: 16px; }
.header-info { display: flex; align-items: center; gap: 14px; }
.icon-wrapper { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; background: var(--primary-soft); color: var(--primary); }
.page-title { font-size: 24px; font-weight: 800; margin: 0; }
.page-sub { font-size: 13px; color: var(--text-muted); margin: 4px 0 0; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.search-input { width: 240px; }
.btn-filtros, .btn-agregar { border-radius: 10px; font-weight: 600; }

.calendar-container { width: 100%; }
.calendar-card { border-radius: 16px; overflow: hidden; background: var(--bg-elevated); }

.calendar-toolbar { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border); background: var(--bg); flex-wrap: wrap; gap: 12px; }
.nav-group { display: flex; align-items: center; gap: 8px; }
.btn-hoy { font-weight: 600; text-transform: capitalize; }
.month-label { font-size: 16px; font-weight: 800; color: var(--text); }
.view-options :deep(.q-btn) { border-radius: 8px; }

.custom-grid { display: flex; flex-direction: column; height: 500px; }
.grid-header { display: grid; grid-template-columns: repeat(7, 1fr); border-bottom: 1px solid var(--border); background: var(--bg); }
.day-header { padding: 6px; text-align: center; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
.grid-body { display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; overflow-y: auto; }
.day-cell { border-right: 1px solid var(--border); border-bottom: 1px solid var(--border); padding: 4px; display: flex; flex-direction: column; min-height: 70px; transition: background 0.1s; }
.day-cell:hover { background: var(--bg-hover); }
.day-cell.out-of-month { background: var(--bg); opacity: 0.5; }
.day-cell.today { background: var(--primary-soft); }
.day-cell.today .day-number { background: var(--primary); color: white; border-radius: 50%; width: 22px; height: 22px; display: grid; place-items: center; }
.day-number { font-size: 12px; font-weight: 700; color: var(--text); margin-bottom: 4px; text-align: right; align-self: flex-end; }
.day-events { display: flex; flex-direction: column; gap: 4px; overflow-y: auto; flex: 1; }

.event-pill { font-size: 10px; padding: 2px 4px; border-radius: 4px; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600; display: flex; gap: 4px; align-items: center; }
.event-pill:hover { filter: brightness(0.95); }
.event-origen-icon { flex-shrink: 0; margin-right: 2px; }
.event-time { opacity: 0.8; font-size: 10px; font-weight: 800; }

.agenda-view { padding: 16px; height: 500px; overflow-y: auto; }
.agenda-date { font-size: 16px; font-weight: 800; color: var(--text); margin: 24px 0 12px; padding-bottom: 6px; border-bottom: 1px solid var(--border); text-transform: capitalize; }
.agenda-items { display: flex; flex-direction: column; gap: 8px; }
.agenda-item { display: flex; gap: 14px; padding: 14px; border-radius: 10px; background: var(--bg-elevated); border: 1px solid var(--border); cursor: pointer; transition: background 0.2s; }
.agenda-item:hover { background: var(--bg-hover); }
.agenda-dot { width: 10px; height: 10px; border-radius: 50%; margin-top: 4px; flex-shrink: 0; }
.agenda-info { flex: 1; }
.agenda-title { font-weight: 700; font-size: 15px; color: var(--text); }
.agenda-meta { display: flex; gap: 16px; font-size: 13px; color: var(--text-muted); margin-top: 4px; font-weight: 500; }

.calendar-drawer { background: var(--bg-elevated); width: 320px; }
.drawer-content { padding: 20px; height: 100%; overflow-y: auto; }
.drawer-header { display: flex; justify-content: space-between; align-items: center; font-size: 18px; font-weight: 800; margin-bottom: 20px; color: var(--text); }
.drawer-section { background: var(--bg); border-radius: 12px; padding: 16px; border: 1px solid var(--border); }
.section-title { font-size: 14px; font-weight: 700; display: flex; align-items: center; gap: 8px; color: var(--text); margin-bottom: 12px; }

.proximos-list { display: flex; flex-direction: column; gap: 12px; }
.proximo-item { display: flex; gap: 12px; cursor: pointer; padding: 8px; border-radius: 8px; transition: background 0.2s; }
.proximo-item:hover { background: var(--bg-hover); }
.proximo-fecha { font-size: 12px; font-weight: 800; color: var(--primary); text-transform: uppercase; width: 50px; text-align: center; background: var(--primary-soft); padding: 6px; border-radius: 8px; flex-shrink: 0; display: flex; flex-direction: column; justify-content: center; }
.proximo-info { flex: 1; }
.proximo-titulo { font-size: 13px; font-weight: 700; color: var(--text); line-height: 1.3; }
.proximo-meta { font-size: 11px; font-weight: 600; margin-top: 4px; }

.empty-state { text-align: center; padding: 60px 0; color: var(--text-muted); }

.detalle-icono-cabecera { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; }
.detalle-fila { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 14px; color: var(--text); }
.detalle-fila-icono { color: var(--text-muted); flex-shrink: 0; }
.detalle-descripcion { margin-top: 14px; padding: 12px 14px; background: var(--bg); border-radius: 10px; font-size: 13px; line-height: 1.55; color: var(--text); white-space: pre-wrap; }

@media (max-width: 900px) {
  .search-input { width: 100%; }
  .header-actions { width: 100%; flex-direction: column; align-items: stretch; }
  .custom-grid { height: 600px; }
  .day-cell { min-height: 80px; padding: 4px; }
  .event-pill { font-size: 9px; padding: 2px 4px; }
  .event-time { display: none; }
}
</style>
