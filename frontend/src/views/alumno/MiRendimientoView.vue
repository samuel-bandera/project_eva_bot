<script setup>
import { ref, computed, onMounted } from 'vue';
import * as alumnoApi from '../../api/alumno.api.js';
import http from '../../api/http.js';

const cargando = ref(true);
const matriculas = ref([]);
const busqueda = ref('');
const expandidas = ref({});
const resumenAsistencia = ref(null);
const clasesExpandidas = ref({});

const materiasFiltradas = computed(() => {
  const consulta = busqueda.value.trim().toLowerCase();
  if (!consulta) return matriculas.value;
  return matriculas.value.filter(matricula =>
    matricula.materia_nombre?.toLowerCase().includes(consulta) ||
    matricula.materia_codigo?.toLowerCase().includes(consulta)
  );
});

function notaAMostrar(matricula) {
  if (matricula.nota_final !== null && matricula.nota_final !== undefined) {
    return Number(matricula.nota_final).toFixed(1);
  }
  if (matricula._desglose?.promedio_calculado) {
    return Number(matricula._desglose.promedio_calculado).toFixed(1);
  }
  return '—';
}

function esAprobada(matricula) {
  const nota = matricula.nota_final !== null && matricula.nota_final !== undefined
    ? Number(matricula.nota_final)
    : (matricula._desglose?.promedio_calculado ? Number(matricula._desglose.promedio_calculado) : null);
  if (nota === null) return null;
  return nota >= (matricula._desglose?.nota_aprobacion || 6);
}

function notaColor(matricula) {
  const ap = esAprobada(matricula);
  if (ap === null) return 'text-grey-5';
  return ap ? 'text-positive' : 'text-negative';
}

function porcentajeAsistencia(matricula) {
  if (!matricula._asistencia?.registros) return null;
  const registros = matricula._asistencia.registros;
  if (!registros.length) return null;
  
  const presentes = registros.filter(r => r.estado === 'presente').length;
  const tardes = registros.filter(r => r.estado === 'tarde').length;
  const justificados = registros.filter(r => r.estado === 'justificado').length;
  
  const totalValidos = registros.length - justificados;
  if (totalValidos === 0) return 100;
  return Math.round(((presentes + tardes) / totalValidos) * 100);
}

function asistenciaColor(matricula) {
  const pct = porcentajeAsistencia(matricula);
  if (pct === null) return 'text-grey-5';
  if (pct >= 85) return 'text-positive';
  if (pct >= 80) return 'text-warning';
  if (pct >= 70) return 'text-orange';
  return 'text-negative';
}

function asistenciaStats(matricula) {
  if (!matricula._asistencia?.registros) return null;
  const registros = matricula._asistencia.registros;
  return {
    total: registros.length,
    presentes: registros.filter(r => r.estado === 'presente').length,
    tardes: registros.filter(r => r.estado === 'tarde').length,
    ausentes: registros.filter(r => r.estado === 'ausente').length,
    justificados: registros.filter(r => r.estado === 'justificado').length,
  };
}

async function cargarMateria(matricula) {
  if (matricula._desglose || matricula._asistencia) return;
  
  matricula._desglose = { cargando: true };
  matricula._asistencia = { cargando: true };
  
  try {
    const resp = await http.get(`/materias/${matricula.materia_id}/mis-calificaciones`);
    matricula._desglose = resp.data.data;
  } catch (e) {
    console.warn(`[Rendimiento] Error al cargar notas de materia ${matricula.materia_id}:`, e.message);
    matricula._desglose = { error: true };
  }
  
  try {
    const resp = await http.get(`/asistencia/mis-registros`, { params: { materiaId: matricula.materia_id } });
    matricula._asistencia = { registros: resp.data.data || resp.data || [] };
  } catch (e) {
    console.warn(`[Rendimiento] Error al cargar asistencia de materia ${matricula.materia_id}:`, e.message);
    matricula._asistencia = { error: true, registros: [] };
  }
}

function toggleMateria(matricula) {
  expandidas.value[matricula.id] = !expandidas.value[matricula.id];
  if (expandidas.value[matricula.id] && !matricula._desglose) {
    cargarMateria(matricula);
  }
}

function estadoColor(estado) {
  return {
    aprobada: 'text-positive', reprobada: 'text-negative',
    abandonada: 'text-grey-6', activa: 'text-primary',
  }[estado] || 'text-grey-5';
}

function estadoBg(estado) {
  return {
    aprobada: 'bg-positive-soft', reprobada: 'bg-negative-soft',
    abandonada: 'bg-grey-soft', activa: 'bg-primary-soft',
  }[estado] || 'bg-grey-soft';
}

function estadoLabel(estado) {
  return {
    aprobada: 'Aprobada', reprobada: 'Reprobada',
    abandonada: 'Abandonada', activa: 'Cursando',
  }[estado] || estado;
}

function estadoAsistenciaLabel(e) {
  return { presente: 'Presente', ausente: 'Ausente', tarde: 'Tarde', justificado: 'Justificado' }[e] || e;
}

function estadoAsistenciaColor(e) {
  return {
    presente: 'estado-presente', ausente: 'estado-ausente',
    tarde: 'estado-tarde', justificado: 'estado-justificado',
  }[e] || '';
}

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

async function cargarRendimiento() {
  cargando.value = true;
  try {
    const [respuestaMatriculas, respuestaResumen] = await Promise.all([
      alumnoApi.getMisMatriculas(),
      http.get('/asistencia/mi-resumen').then(r => r.data?.data || r.data).catch(() => null),
    ]);
    
    const listaMatriculas = (respuestaMatriculas?.matriculas || respuestaMatriculas || []).map(matricula => ({ ...matricula, _desglose: null, _asistencia: null }));
    matriculas.value = listaMatriculas;
    resumenAsistencia.value = respuestaResumen;
    
    for (const matricula of matriculas.value) {
      cargarMateria(matricula);
    }
  } catch (e) {
    console.error(e);
  } finally {
    cargando.value = false;
  }
}

const stats = computed(() => {
  const conNota = matriculas.value.filter(matricula => notaAMostrar(matricula) !== '—');
  const suma = conNota.reduce((acc, matricula) => acc + Number(notaAMostrar(matricula)), 0);
  const promedio = conNota.length ? (suma / conNota.length).toFixed(1) : '—';
  
  let asisGlobal = '—';
  if (resumenAsistencia.value) {
    const r = resumenAsistencia.value;
    const total = (r.presente || 0) + (r.ausente || 0) + (r.tarde || 0) + (r.justificado || 0);
    if (total > 0) {
      const asistio = (r.presente || 0) + (r.justificado || 0) + (r.tarde || 0);
      asisGlobal = Math.round((asistio / total) * 100);
    }
  }
  
  return {
    promedio,
    asisGlobal,
    aprobadas: matriculas.value.filter(matricula => esAprobada(matricula) === true).length,
    total: matriculas.value.length,
  };
});


function toggleClases(materiaId) {
  clasesExpandidas.value[materiaId] = !clasesExpandidas.value[materiaId];
}

onMounted(cargarRendimiento);
</script>

<template>
  <q-page class="notas-page">
    <header class="page-header">
      <div class="page-header-icon"><q-icon name="insights" size="24px" /></div>
      <div>
        <h1 class="page-title">Mi Rendimiento</h1>
        <p class="page-sub">Notas y asistencia unificadas por materia</p>
      </div>
    </header>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-12 col-sm-4">
        <q-card class="stat-card" flat>
          <div class="stat-icon text-primary"><q-icon name="analytics" size="24px" /></div>
          <div class="stat-info">
            <div class="stat-label">Promedio General</div>
            <div class="stat-value">{{ stats.promedio }}</div>
          </div>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card class="stat-card" flat>
          <div class="stat-icon text-positive"><q-icon name="check_circle" size="24px" /></div>
          <div class="stat-info">
            <div class="stat-label">Aprobadas</div>
            <div class="stat-value">{{ stats.aprobadas }} / {{ stats.total }}</div>
          </div>
        </q-card>
      </div>
      <div class="col-12 col-sm-4">
        <q-card class="stat-card" flat>
          <div class="stat-icon text-info"><q-icon name="event_available" size="24px" /></div>
          <div class="stat-info">
            <div class="stat-label">Asistencia Global</div>
            <div class="stat-value">{{ stats.asisGlobal }}<span v-if="stats.asisGlobal !== '—'" class="stat-pct">%</span></div>
          </div>
        </q-card>
      </div>
    </div>

    <q-input v-model="busqueda" outlined dense placeholder="Buscar materia..." class="search-input q-mb-lg" clearable>
      <template #prepend><q-icon name="search" /></template>
    </q-input>

    <div v-if="cargando" class="text-center q-py-xl">
      <q-spinner color="primary" size="40px" />
    </div>

    <div v-else-if="!materiasFiltradas.length" class="empty-state">
      <div class="empty-illustration"><q-icon name="school" size="44px" /></div>
      <h3 class="empty-titulo">No hay materias</h3>
      <p class="empty-desc">{{ busqueda ? 'No se encontraron resultados.' : 'No estás inscripto en ninguna materia.' }}</p>
    </div>

    <div v-else class="column q-gutter-y-md">
      <q-card v-for="matricula in materiasFiltradas" :key="matricula.id" class="materia-card" flat>
        <div class="materia-header" @click="toggleMateria(matricula)">
          <div class="materia-info">
            <div class="materia-titulo">{{ matricula.materia_nombre }}</div>
            <div class="materia-codigo">{{ matricula.materia_codigo }}</div>
          </div>

          <div class="materia-nums">
            <div class="num-box">
              <div class="num-label">Nota</div>
              <div :class="['num-value', notaColor(matricula)]">{{ notaAMostrar(matricula) }}</div>
            </div>
            <div class="num-divider" />
            <div class="num-box">
              <div class="num-label">Asist.</div>
              <div :class="['num-value', asistenciaColor(matricula)]">
                {{ porcentajeAsistencia(matricula) !== null ? porcentajeAsistencia(matricula) + '%' : '—' }}
              </div>
            </div>
            <div class="materia-badge" :class="[estadoBg(matricula.estado), estadoColor(matricula.estado)]">
              {{ estadoLabel(matricula.estado) }}
            </div>
            <q-icon :name="expandidas[matricula.id] ? 'expand_less' : 'expand_more'" size="24px" class="text-grey-5" />
          </div>
        </div>

        <q-slide-transition>
          <div v-show="expandidas[matricula.id]" class="materia-body">
            <q-separator class="q-mb-md" />

            <div class="section-title">
              <q-icon name="grade" size="18px" />
              <span>Calificaciones</span>
            </div>

            <div v-if="matricula._desglose?.cargando" class="text-center q-py-md">
              <q-spinner color="primary" size="20px" /> Cargando...
            </div>
            <div v-else-if="matricula._desglose?.error" class="text-negative q-py-sm">Error al cargar notas.</div>
            <template v-else-if="matricula._desglose">
              <div class="row q-col-gutter-sm q-mb-md">
                <div class="col-6">
                  <div class="mini-stat">
                    <div class="mini-label">Promedio</div>
                    <div class="mini-value">{{ matricula._desglose.promedio_calculado || '—' }}</div>
                  </div>
                </div>
                <div class="col-6">
                  <div class="mini-stat">
                    <div class="mini-label">Evaluaciones</div>
                    <div class="mini-value">{{ matricula._desglose.evaluaciones.length }}</div>
                  </div>
                </div>
              </div>

              <div v-if="!matricula._desglose.evaluaciones.length" class="text-grey-7 q-py-sm text-center">
                Sin evaluaciones rendidas.
              </div>
              <div v-else class="eval-list">
                <div v-for="evaluacion in matricula._desglose.evaluaciones" :key="evaluacion.id" class="eval-item">
                  <div class="eval-info">
                    <div class="eval-titulo">{{ evaluacion.titulo }}</div>
                    <div class="eval-meta">
                      <span><q-icon name="event" size="12px" /> {{ formatearFecha(evaluacion.fecha) }}</span>
                      <span v-if="evaluacion.peso"><q-icon name="scale" size="12px" /> {{ evaluacion.peso }}%</span>
                      <span class="eval-tipo">{{ evaluacion.tipo }}</span>
                    </div>
                  </div>
                  <div class="eval-nota">
                    <span :class="evaluacion.nota >= (matricula._desglose.nota_aprobacion || 6) ? 'text-positive' : 'text-negative'">
                      {{ evaluacion.nota !== null ? Number(evaluacion.nota).toFixed(1) : '—' }}
                    </span>
                    <span class="text-caption text-grey-5"> / {{ evaluacion.notaMaxima }}</span>
                  </div>
                </div>
              </div>
            </template>

            <q-separator class="q-my-md" />

            <div class="section-title">
              <q-icon name="event_available" size="18px" />
              <span>Asistencia</span>
            </div>

            <div v-if="matricula._asistencia?.cargando" class="text-center q-py-md">
              <q-spinner color="primary" size="20px" /> Cargando...
            </div>
            <div v-else-if="matricula._asistencia?.error" class="text-negative q-py-sm">Error al cargar asistencia.</div>
            <template v-else-if="matricula._asistencia">
              <div v-if="asistenciaStats(matricula)" class="asis-stats">
                <div class="asis-stat asis-stat--presente">
                  <div class="asis-num">{{ asistenciaStats(matricula).presentes }}</div>
                  <div class="asis-label">Presentes</div>
                </div>
                <div class="asis-stat asis-stat--tarde">
                  <div class="asis-num">{{ asistenciaStats(matricula).tardes }}</div>
                  <div class="asis-label">Tardes</div>
                </div>
                <div class="asis-stat asis-stat--ausente">
                  <div class="asis-num">{{ asistenciaStats(matricula).ausentes }}</div>
                  <div class="asis-label">Ausentes</div>
                </div>
                <div class="asis-stat asis-stat--justificado">
                  <div class="asis-num">{{ asistenciaStats(matricula).justificados }}</div>
                  <div class="asis-label">Justif.</div>
                </div>
              </div>

              <div v-if="!matricula._asistencia.registros.length" class="text-grey-7 q-py-sm text-center">
                Sin registros de asistencia.
              </div>
              <div v-else>
                <button
                  type="button"
                  class="ver-detalle-btn"
                  @click="toggleClases(matricula.id)"
                >
                  <q-icon name="calendar_month" size="16px" />
                  <span>
                    {{ clasesExpandidas[matricula.id] ? 'Ocultar' : 'Ver' }} detalle de las {{ matricula._asistencia.registros.length }} clases
                  </span>
                  <q-icon
                    :name="clasesExpandidas[matricula.id] ? 'expand_less' : 'expand_more'"
                    size="18px"
                    class="ver-detalle-chevron"
                  />
                </button>

                <q-slide-transition>
                  <div v-show="clasesExpandidas[matricula.id]" class="asis-list">
                    <div v-for="asistencia in matricula._asistencia.registros" :key="asistencia.id" class="asis-item">
                      <div class="asis-fecha">
                        <q-icon name="calendar_today" size="14px" />
                        {{ formatearFecha(asistencia.fecha) }}
                      </div>
                      <div :class="['asis-badge', estadoAsistenciaColor(asistencia.estado)]">
                        {{ estadoAsistenciaLabel(asistencia.estado) }}
                      </div>
                    </div>
                  </div>
                </q-slide-transition>
              </div>
            </template>
          </div>
        </q-slide-transition>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped>
.notas-page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.page-header-icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }
.page-title { font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin: 0; line-height: 1.1; color: var(--text); }
.page-sub { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }

.stat-card { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-radius: 16px; border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.03); background: var(--bg-elevated); }
.stat-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: var(--bg-hover); }
.stat-label { font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.stat-value { font-size: 26px; font-weight: 800; color: var(--text); line-height: 1.1; margin-top: 2px; }
.stat-pct { font-size: 16px; opacity: 0.6; margin-left: 2px; }

.search-input :deep(.q-field__control) { border-radius: 12px; height: 48px; }

.materia-card { border-radius: 18px !important; border: 1px solid rgba(0,0,0,0.06) !important; box-shadow: 0 2px 8px rgba(0,0,0,0.04) !important; background: var(--bg-elevated) !important; overflow: hidden; transition: all 0.3s; }
.materia-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px -8px rgba(0,0,0,0.1) !important; }

.materia-header { display: flex; justify-content: space-between; align-items: center; padding: 20px; cursor: pointer; user-select: none; flex-wrap: wrap; gap: 12px; }
.materia-info { flex: 1; min-width: 150px; }
.materia-titulo { font-size: 17px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; }
.materia-codigo { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

.materia-nums { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.num-box { text-align: center; min-width: 55px; }
.num-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.04em; }
.num-value { font-size: 20px; font-weight: 800; line-height: 1; margin-top: 2px; }
.num-divider { width: 1px; height: 32px; background: var(--border); }
.materia-badge { font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; }
.bg-positive-soft { background: rgba(46, 125, 50, 0.1); }
.bg-negative-soft { background: rgba(198, 40, 40, 0.1); }
.bg-grey-soft { background: rgba(120, 120, 120, 0.1); }
.bg-primary-soft { background: var(--primary-soft); }
.text-positive { color: #2e7d32; }
.text-negative { color: #c62828; }
.text-warning { color: #e65100; }
.text-primary { color: var(--primary); }

.materia-body { padding: 0 20px 20px 20px; background: var(--bg-hover); }
.section-title { display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 800; color: var(--text); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 12px; }
.section-title .q-icon { color: var(--primary); }

.mini-stat { padding: 10px; background: var(--bg-elevated); border-radius: 10px; text-align: center; border: 1px solid var(--border); }
.mini-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; }
.mini-value { font-size: 16px; font-weight: 800; color: var(--text); margin-top: 4px; }

.eval-list { display: flex; flex-direction: column; gap: 6px; }
.eval-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-elevated); border-radius: 10px; border: 1px solid var(--border); }
.eval-info { flex: 1; }
.eval-titulo { font-size: 13px; font-weight: 600; color: var(--text); }
.eval-meta { display: flex; gap: 10px; font-size: 11px; color: var(--text-muted); margin-top: 2px; align-items: center; }
.eval-meta span { display: flex; align-items: center; gap: 3px; }
.eval-tipo { text-transform: capitalize; background: var(--bg-hover); padding: 1px 6px; border-radius: 4px; font-weight: 600; }
.eval-nota { font-size: 18px; font-weight: 800; }

.asis-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
.asis-stat { padding: 12px 8px; border-radius: 10px; text-align: center; background: var(--bg-elevated); border: 1px solid var(--border); }
.asis-num { font-size: 20px; font-weight: 800; line-height: 1; }
.asis-label { font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-top: 4px; }
.asis-stat--presente .asis-num { color: #2e7d32; }
.asis-stat--tarde .asis-num { color: #e65100; }
.asis-stat--ausente .asis-num { color: #c62828; }
.asis-stat--justificado .asis-num { color: #1565c0; }


.asis-badge { font-size: 11px; font-weight: 700; padding: 3px 10px; border-radius: 100px; text-transform: uppercase; }
.estado-presente { background: rgba(46, 125, 50, 0.12); color: #2e7d32; }
.estado-ausente { background: rgba(198, 40, 40, 0.12); color: #c62828; }
.estado-tarde { background: rgba(245, 124, 0, 0.12); color: #e65100; }
.estado-justificado { background: rgba(33, 150, 243, 0.12); color: #1565c0; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 24px; text-align: center; }
.empty-illustration { display: grid; place-items: center; width: 90px; height: 90px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, var(--primary-soft), transparent 70%); color: var(--primary); margin-bottom: 20px; }
.empty-titulo { font-size: 18px; font-weight: 800; margin: 0 0 6px; color: var(--text); }
.empty-desc { font-size: 13px; color: var(--text-muted); max-width: 360px; margin: 0; }

.ver-detalle-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 10px 14px;
  margin-top: 8px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elevated);
  color: var(--text);
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.ver-detalle-btn:hover {
  background: var(--bg-hover);
  border-color: var(--primary);
  color: var(--primary);
}

.ver-detalle-btn .q-icon:first-child {
  color: var(--primary);
  flex-shrink: 0;
}

.ver-detalle-chevron {
  margin-left: auto;
  color: var(--text-muted);
  transition: transform 0.2s ease;
}

.asis-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
  padding: 12px;
  background: var(--bg);
  border-radius: 10px;
  max-height: 320px;
  overflow-y: auto;
}

.asis-list::-webkit-scrollbar {
  width: 6px;
}

.asis-list::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

.asis-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-elevated);
  border-radius: 8px;
  border: 1px solid var(--border);
}

.asis-fecha {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
}

.asis-fecha .q-icon {
  color: var(--text-muted);
}

.text-orange {
  color: #ea580c !important;
}

</style>
