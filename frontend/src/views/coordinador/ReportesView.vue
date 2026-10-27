<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import * as coordApi from '../../api/coordinador.api.js';

const $q = useQuasar();

const cargando = ref(true);
const carreras = ref([]);
const carreraSeleccionada = ref(null);
const detalle = ref(null);
const cargandoDetalle = ref(false);

const nivelLabel = { ciclo_basico: 'Ciclo Básico', bachillerato: 'Bachillerato', terciario: 'Terciario' };
const nivelColor = { ciclo_basico: '#607d8b', bachillerato: '#9c27b0', terciario: '#2196f3' };

const totales = computed(() => {
  const t = { materias: 0, docentes: 0, alumnos: 0, carreras: carreras.value.length };
  for (const c of carreras.value) {
    t.materias += c.total_materias || 0;
  }
  return t;
});

async function cargar() {
  cargando.value = true;
  try {
    carreras.value = await coordApi.listarCarreras();
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al cargar carreras' });
  } finally {
    cargando.value = false;
  }
}

async function verDetalle(carrera) {
  if (carreraSeleccionada.value?.id === carrera.id) {
    carreraSeleccionada.value = null;
    detalle.value = null;
    return;
  }
  carreraSeleccionada.value = carrera;
  cargandoDetalle.value = true;
  try {
    detalle.value = await coordApi.obtenerCarrera(carrera.id);
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al cargar detalle' });
    detalle.value = null;
  } finally {
    cargandoDetalle.value = false;
  }
}

function exportar() {
  $q.notify({ type: 'info', message: 'Exportación en desarrollo', icon: 'construction' });
}

function promedioCarrera(d) {
  if (!d?.alumnos?.length) return null;
  const conNota = d.alumnos.filter(a => a.promedio !== null);
  if (!conNota.length) return null;
  const suma = conNota.reduce((s, a) => s + Number(a.promedio), 0);
  return (suma / conNota.length).toFixed(2);
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md coord-page">
    <div class="page-head q-mb-md">
      <div>
        <h1 class="page-title">Reportes</h1>
        <p class="page-sub">Resumen académico de tus carreras a cargo</p>
      </div>
      <q-btn
        unelevated no-caps icon="download" label="Exportar"
        color="primary" @click="exportar"
      />
    </div>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <div class="row q-col-gutter-md q-mb-lg">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="stat-card">
          <q-card-section>
            <div class="stat-num">{{ totales.carreras }}</div>
            <div class="stat-lbl">Carreras</div>
          </q-card-section>
        </q-card>
      </div>
      <div class="col-6 col-md-3">
        <q-card flat bordered class="stat-card">
          <q-card-section>
            <div class="stat-num">{{ totales.materias }}</div>
            <div class="stat-lbl">Materias</div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <q-card v-if="!cargando && !carreras.length" flat bordered class="empty-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="bar_chart" size="56px" color="grey-5" class="q-mb-sm" />
        <div class="text-h6">Sin datos</div>
        <div class="text-caption text-grey-7">No hay carreras a tu cargo</div>
      </q-card-section>
    </q-card>

    <div v-else class="column q-gutter-md">
      <q-card
        v-for="c in carreras"
        :key="c.id"
        flat bordered
        class="carrera-card"
        :class="{ 'expandida': carreraSeleccionada?.id === c.id }"
      >
        <q-card-section
          class="row items-center cursor-pointer"
          @click="verDetalle(c)"
        >
          <div class="carrera-icon" :style="{ background: c.color + '22', color: c.color }">
            <q-icon :name="c.icono || 'school'" size="24px" />
          </div>
          <div class="q-ml-md" style="flex: 1; min-width: 0;">
            <div class="carrera-nivel" :style="{ color: nivelColor[c.nivel] }">
              {{ nivelLabel[c.nivel] }}
            </div>
            <div class="carrera-nombre">{{ c.nombre }}</div>
            <div class="carrera-codigo">{{ c.codigo }} · {{ c.total_materias || 0 }} materias</div>
          </div>
          <q-icon
            :name="carreraSeleccionada?.id === c.id ? 'expand_less' : 'expand_more'"
            size="24px"
            color="grey-6"
          />
        </q-card-section>

        <q-slide-transition>
          <div v-show="carreraSeleccionada?.id === c.id">
            <q-separator />
            <q-card-section v-if="cargandoDetalle">
              <div class="text-center q-pa-md">
                <q-spinner size="32px" color="primary" />
              </div>
            </q-card-section>
            <q-card-section v-else-if="detalle" class="column q-gutter-md">
              <div class="row q-col-gutter-md">
                <div class="col-6 col-md-3">
                  <div class="mini-stat">
                    <div class="mini-num">{{ detalle.materias?.length || 0 }}</div>
                    <div class="mini-lbl">Materias</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="mini-stat">
                    <div class="mini-num">{{ detalle.docentes?.length || 0 }}</div>
                    <div class="mini-lbl">Docentes</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="mini-stat">
                    <div class="mini-num">{{ detalle.alumnos?.length || 0 }}</div>
                    <div class="mini-lbl">Alumnos</div>
                  </div>
                </div>
                <div class="col-6 col-md-3">
                  <div class="mini-stat">
                    <div class="mini-num">{{ promedioCarrera(detalle) || '—' }}</div>
                    <div class="mini-lbl">Promedio</div>
                  </div>
                </div>
              </div>

              <div v-if="detalle.materias?.length" class="seccion">
                <div class="seccion-title">Materias</div>
                <q-list dense separator class="materias-list">
                  <q-item v-for="m in detalle.materias" :key="m.id">
                    <q-item-section>
                      <q-item-label class="text-weight-medium">{{ m.nombre }}</q-item-label>
                      <q-item-label caption>{{ m.codigo }}</q-item-label>
                    </q-item-section>
                    <q-item-section side>
                      <span class="text-caption text-grey-7">{{ m.docentes || 'Sin docente' }}</span>
                    </q-item-section>
                  </q-item>
                </q-list>
              </div>
            </q-card-section>
          </div>
        </q-slide-transition>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped>
.coord-page { max-width: 1280px; margin: 0 auto; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.page-title { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--text); }
.page-sub { margin: 4px 0 0 0; color: var(--text-muted); font-size: 13px; }
.empty-card { border-radius: 14px; }

.stat-card {
  border-radius: 14px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  color: white;
  border: none;
}
.stat-card .stat-num {
  font-size: 32px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1;
}
.stat-card .stat-lbl {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.85;
  margin-top: 6px;
}

.carrera-card {
  border-radius: 14px;
  transition: all 0.2s;
}
.carrera-card:hover {
  border-color: var(--primary);
}
.carrera-card.expandida {
  border-color: var(--primary);
  box-shadow: 0 8px 24px -12px rgba(114, 47, 55, 0.25);
}
.carrera-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 12px;
  flex-shrink: 0;
}
.carrera-nivel {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}
.carrera-nombre {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
}
.carrera-codigo {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 2px;
}

.mini-stat {
  padding: 14px;
  background: var(--bg-hover);
  border-radius: 10px;
  text-align: center;
}
.mini-num { font-size: 22px; font-weight: 800; color: var(--text); }
.mini-lbl {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  margin-top: 2px;
}

.seccion-title {
  font-size: 12px;
  font-weight: 800;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.materias-list {
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
}
</style>
