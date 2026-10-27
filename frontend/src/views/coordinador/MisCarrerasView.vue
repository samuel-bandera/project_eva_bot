<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import * as coordApi from '../../api/coordinador.api.js';

const $q = useQuasar();
const router = useRouter();

const cargando = ref(true);
const carreras = ref([]);
const busqueda = ref('');

const nivelLabel = { ciclo_basico: 'Ciclo Básico', bachillerato: 'Bachillerato', terciario: 'Terciario' };
const nivelColor = { ciclo_basico: '#607d8b', bachillerato: '#9c27b0', terciario: '#2196f3' };

const filtradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return carreras.value;
  return carreras.value.filter(c =>
    (c.nombre || '').toLowerCase().includes(q)
    || (c.codigo || '').toLowerCase().includes(q)
  );
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

function abrir(c) {
  router.push(`/coordinador/carreras/${c.id}`);
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md coord-page">
    <div class="page-head q-mb-md">
      <div>
        <h1 class="page-title">Mis carreras</h1>
        <p class="page-sub">{{ carreras.length }} carreras a tu cargo</p>
      </div>
    </div>

    <q-card flat bordered class="toolbar-card q-mb-md">
      <q-card-section>
        <q-input v-model="busqueda" outlined dense clearable placeholder="Buscar carrera">
          <template #prepend><q-icon name="search" /></template>
        </q-input>
      </q-card-section>
    </q-card>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !filtradas.length" flat bordered class="empty-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="school" size="56px" color="grey-5" class="q-mb-sm" />
        <div class="text-h6">Sin carreras asignadas</div>
        <div class="text-caption text-grey-7">Contactá a bedelía</div>
      </q-card-section>
    </q-card>

    <div v-else class="row q-col-gutter-md">
      <div v-for="c in filtradas" :key="c.id" class="col-12 col-md-6 col-lg-4">
        <q-card flat bordered class="carrera-card" @click="abrir(c)">
          <q-card-section>
            <div class="carrera-icon" :style="{ background: c.color + '22', color: c.color }">
              <q-icon :name="c.icono || 'school'" size="28px" />
            </div>
            <div class="carrera-nivel" :style="{ color: nivelColor[c.nivel] }">
              {{ nivelLabel[c.nivel] }}
            </div>
            <div class="carrera-nombre">{{ c.nombre }}</div>
            <div class="carrera-codigo">{{ c.codigo }}</div>
            <div class="carrera-stats">
              <div>
                <div class="stat-num">{{ c.total_materias || 0 }}</div>
                <div class="stat-lbl">Materias</div>
              </div>
              <div v-if="c.duracion_anios">
                <div class="stat-num">{{ c.duracion_anios }}</div>
                <div class="stat-lbl">Años</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.coord-page { max-width: 1280px; margin: 0 auto; }
.page-head { display: flex; align-items: center; justify-content: space-between; }
.page-title { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--text); }
.page-sub { margin: 4px 0 0 0; color: var(--text-muted); font-size: 13px; }
.toolbar-card { border-radius: 14px; }
.empty-card { border-radius: 14px; }

.carrera-card {
  border-radius: 16px;
  height: 100%;
  cursor: pointer;
  transition: all 0.2s;
}
.carrera-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -12px rgba(114, 47, 55, 0.2);
}
.carrera-icon {
  display: grid; place-items: center;
  width: 52px; height: 52px;
  border-radius: 14px;
  margin-bottom: 12px;
}
.carrera-nivel {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.carrera-nombre {
  font-size: 17px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.02em;
  line-height: 1.2;
}
.carrera-codigo {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  margin-top: 4px;
}
.carrera-stats {
  display: flex;
  gap: 20px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border);
}
.stat-num { font-size: 20px; font-weight: 800; color: var(--text); }
.stat-lbl {
  font-size: 10px; color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  margin-top: 2px;
}
</style>
