<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import * as coordApi from '../../api/coordinador.api.js';

const $q = useQuasar();
const route = useRoute();
const router = useRouter();

const cargando = ref(true);
const materias = ref([]);
const carreras = ref([]);
const busqueda = ref('');
const filtroCarrera = ref(null);

const nivelLabel = { ciclo_basico: 'Ciclo Básico', bachillerato: 'Bachillerato', terciario: 'Terciario' };

const carreraMap = computed(() => {
  const m = {};
  for (const c of carreras.value) m[c.id] = c;
  return m;
});

const agrupadas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  const carrerasIds = new Set(carreras.value.map(c => c.id));
  const porCarrera = {};

  for (const c of carreras.value) {
    porCarrera[c.id] = { carrera: c, items: [] };
  }

  for (const m of materias.value) {
    if (carrerasIds.size > 0 && !carrerasIds.has(m.carrera_id)) continue;

    if (filtroCarrera.value && m.carrera_id !== filtroCarrera.value) continue;

    if (q) {
      const hit = (m.nombre || '').toLowerCase().includes(q)
        || (m.codigo || '').toLowerCase().includes(q)
        || (m.docente_nombre || '').toLowerCase().includes(q);
      if (!hit) continue;
    }

    const k = m.carrera_id || '_sin';
    if (!porCarrera[k]) {
      porCarrera[k] = {
        carrera: { id: k, nombre: 'Sin carrera', codigo: '—', color: '#999', nivel: null },
        items: [],
      };
    }
    porCarrera[k].items.push(m);
  }

  return Object.values(porCarrera).filter(g => g.items.length > 0);
});

const totalFiltradas = computed(() =>
  agrupadas.value.reduce((n, g) => n + g.items.length, 0)
);

async function cargar() {
  cargando.value = true;
  try {
    const [m, c] = await Promise.all([
      coordApi.listarMaterias(),
      coordApi.listarCarreras(),
    ]);
    materias.value = m || [];
    carreras.value = c || [];

    if (route.query.carrera) {
      const id = Number(route.query.carrera);
      if (carreras.value.some(x => x.id === id)) {
        filtroCarrera.value = id;
      }
    }
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al cargar materias' });
  } finally {
    cargando.value = false;
  }
}

watch(() => route.query.carrera, (nuevo) => {
  if (nuevo) {
    const id = Number(nuevo);
    if (carreras.value.some(x => x.id === id)) filtroCarrera.value = id;
  } else {
    filtroCarrera.value = null;
  }
});

function quitarFiltro() {
  filtroCarrera.value = null;
  if (route.query.carrera) {
    router.replace({ path: '/coordinador/materias' });
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md coord-page">
    <div class="page-head q-mb-md">
      <div>
        <h1 class="page-title">Materias</h1>
        <p class="page-sub">
          {{ totalFiltradas }} de {{ materias.length }} materias
          · {{ agrupadas.length }} {{ agrupadas.length === 1 ? 'carrera' : 'carreras' }}
        </p>
      </div>
      <q-btn
        v-if="filtroCarrera"
        flat dense no-caps icon="close" label="Quitar filtro"
        color="primary" @click="quitarFiltro"
      />
    </div>

    <q-card flat bordered class="toolbar-card q-mb-md">
      <q-card-section class="row q-col-gutter-md items-center">
        <div class="col-12 col-md-7">
          <q-input
            v-model="busqueda" outlined dense clearable
            placeholder="Buscar por nombre, código o docente"
          >
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-12 col-md-5">
          <q-select
            v-model="filtroCarrera"
            outlined dense clearable
            :options="carreras"
            option-value="id"
            option-label="nombre"
            emit-value map-options
            label="Filtrar por carrera"
          >
            <template #prepend><q-icon name="school" /></template>
          </q-select>
        </div>
      </q-card-section>
    </q-card>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !agrupadas.length" flat bordered class="empty-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="menu_book" size="56px" color="grey-5" class="q-mb-sm" />
        <div class="text-h6">Sin materias</div>
        <div class="text-caption text-grey-7">No hay materias que coincidan</div>
      </q-card-section>
    </q-card>

    <div v-else>
      <div
        v-for="grupo in agrupadas"
        :key="grupo.carrera.id ?? 'sin'"
        class="carrera-grupo q-mb-md"
      >
        <div class="grupo-head">
          <div
            class="grupo-icon"
            :style="{ background: grupo.carrera.color + '22', color: grupo.carrera.color }"
          >
            <q-icon name="school" size="20px" />
          </div>
          <div style="flex: 1; min-width: 0;">
            <div class="grupo-nivel" v-if="grupo.carrera.nivel" :style="{ color: grupo.carrera.color }">
              {{ nivelLabel[grupo.carrera.nivel] }}
            </div>
            <div class="grupo-nombre">{{ grupo.carrera.nombre }}</div>
            <div class="grupo-codigo">
              {{ grupo.carrera.codigo }} · {{ grupo.items.length }}
              {{ grupo.items.length === 1 ? 'materia' : 'materias' }}
            </div>
          </div>
        </div>
        <div class="row q-col-gutter-md">
          <div v-for="m in grupo.items" :key="m.id" class="col-12 col-md-6 col-lg-4">
            <q-card flat bordered class="materia-card">
              <q-card-section>
                <div class="row items-start justify-between q-mb-sm">
                  <div class="materia-icon">
                    <q-icon name="menu_book" size="22px" />
                  </div>
                  <q-badge v-if="m.codigo" color="grey-3" text-color="grey-8" :label="m.codigo" />
                </div>
                <div class="materia-nombre">{{ m.nombre }}</div>
                <div class="materia-docente">
                  <q-icon name="person" size="14px" />
                  {{ m.docente_nombre || 'Sin docente asignado' }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.coord-page { max-width: 1280px; margin: 0 auto; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.page-title { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--text); }
.page-sub { margin: 4px 0 0 0; color: var(--text-muted); font-size: 13px; }
.toolbar-card { border-radius: 14px; }
.empty-card { border-radius: 14px; }

.carrera-grupo {
  padding: 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 16px;
}
.grupo-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-subtle);
}
.grupo-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  flex-shrink: 0;
}
.grupo-nivel {
  font-size: 10px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 2px;
}
.grupo-nombre {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.01em;
  line-height: 1.2;
}
.grupo-codigo {
  font-size: 11px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
  margin-top: 2px;
}

.materia-card {
  border-radius: 14px;
  height: 100%;
  transition: all 0.2s;
}
.materia-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 12px 28px -12px rgba(114, 47, 55, 0.2);
}
.materia-icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  background: var(--primary-soft);
  color: var(--primary);
  border-radius: 10px;
}
.materia-nombre {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.01em;
  margin-bottom: 8px;
}
.materia-docente {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
  font-size: 12px;
}
</style>
