<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import * as profApi from '../../api/profesor.api.js';

const router = useRouter();
const cargando = ref(true);
const mensajeError = ref('');
const materias = ref([]);
const filtro = ref('');

const materiasFiltradas = computed(() => {
  const consulta = filtro.value.trim().toLowerCase();
  if (!consulta) return materias.value;
  return materias.value.filter((materia) =>
    (materia.nombre || '').toLowerCase().includes(consulta) ||
    (materia.codigo || '').toLowerCase().includes(consulta) ||
    (materia.descripcion || '').toLowerCase().includes(consulta)
  );
});

async function cargarMaterias() {
  cargando.value = true;
  mensajeError.value = '';
  try {
    const listaMaterias = await profApi.getMisMaterias();
    materias.value = listaMaterias || [];
  } catch (e) {
    mensajeError.value = 'No se pudieron cargar las materias';
    Notify.create({
      message: mensajeError.value,
      color: 'negative',
      icon: 'error',
      position: 'top-right',
    });
  } finally {
    cargando.value = false;
  }
}

function abrirDetalleMateria(id) {
  router.push(`/docente/materias/${id}`);
}

onMounted(cargarMaterias);
</script>

<template>
  <q-page class="materias-page">
    <div class="materias-content">

      <header class="page-heading">
        <div class="heading-left">
          <q-btn
            flat round dense
            icon="arrow_back"
            color="primary"
            aria-label="Volver al panel"
            @click="router.push('/docente')"
          />
          <div class="heading-text">
            <div class="eyebrow">PANEL DEL PROFESOR</div>
            <h1>Mis materias</h1>
            <p>Gestioná los cursos que tenés a cargo este ciclo.</p>
          </div>
        </div>
        <div class="heading-right">
          <q-input
            v-model="filtro"
            dense
            outlined
            placeholder="Buscar materia…"
            class="input-buscar"
            :disable="cargando || !materias.length"
            clearable
          >
            <template #prepend>
              <q-icon name="search" size="18px" />
            </template>
          </q-input>
          <q-chip
            v-if="!cargando"
            outline
            color="primary"
            icon="menu_book"
            :label="`${materiasFiltradas.length} / ${materias.length}`"
          />
        </div>
      </header>

      <div v-if="cargando" class="loading-state">
        <q-spinner color="primary" size="40px" />
        <span>Cargando materias…</span>
      </div>

      <q-banner v-else-if="mensajeError" class="banner-error" rounded dense>
        <template #avatar>
          <q-icon name="error_outline" />
        </template>
        {{ mensajeError }}
        <template #action>
          <q-btn flat no-caps dense label="Reintentar" @click="cargarMaterias" />
        </template>
      </q-banner>

      <q-card v-else-if="!materias.length" flat bordered class="empty-card">
        <q-icon name="menu_book" size="52px" />
        <div class="empty-titulo">Sin materias asignadas</div>
        <p>Cuando te asignen materias, aparecerán acá.</p>
      </q-card>

      <q-card v-else-if="!materiasFiltradas.length" flat bordered class="empty-card">
        <q-icon name="search_off" size="52px" />
        <div class="empty-titulo">Sin resultados</div>
        <p>No hay materias que coincidan con "{{ filtro }}"</p>
        <q-btn flat no-caps color="primary" label="Limpiar búsqueda" @click="filtro = ''" />
      </q-card>

      <div v-else class="materias-grid">
        <q-card
          v-for="materia in materiasFiltradas"
          :key="materia.id"
          flat
          bordered
          class="materia-card"
          clickable
          @click="abrirDetalleMateria(materia.id)"
        >
          <div class="card-accent" />
          <q-card-section class="card-head">
            <div class="card-tags">
              <span class="tag-codigo">{{ materia.codigo }}</span>
              <span v-if="materia.total_alumnos" class="tag-alumnos">
                <q-icon name="groups" size="12px" />
                {{ materia.total_alumnos }}
              </span>
            </div>
          </q-card-section>

          <q-card-section class="card-body">
            <h3 class="card-titulo">{{ materia.nombre }}</h3>
            <p class="card-desc">
              {{ materia.descripcion || 'Sin descripción' }}
            </p>
          </q-card-section>

          <q-separator class="card-sep" />

          <q-card-section class="card-meta">
            <div class="meta-item">
              <div class="meta-label">Aula</div>
              <div class="meta-value">{{ materia.aula || '—' }}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Horario</div>
              <div class="meta-value">{{ materia.horario || '—' }}</div>
            </div>
          </q-card-section>

          <q-card-section class="card-footer">
            <span>Ver materia</span>
            <q-icon name="arrow_forward" size="16px" />
          </q-card-section>
        </q-card>
      </div>

    </div>
  </q-page>
</template>

<style scoped>
.materias-page {
  background: var(--bg);
  min-height: calc(100vh - 68px);
  transition: background-color 0.25s ease;
}

.materias-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 34px 34px 60px;
}

.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.heading-left {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.heading-text .eyebrow {
  color: var(--primary);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.5px;
}

.heading-text h1 {
  margin: 6px 0 4px;
  color: var(--text);
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 750;
  letter-spacing: -1px;
  line-height: 1.1;
}

.heading-text p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.5;
}

.heading-right {
  display: flex;
  align-items: center;
  gap: 12px;
  padding-top: 8px;
}

.input-buscar {
  min-width: 240px;
  max-width: 320px;
}

.input-buscar :deep(.q-field__control) {
  border-radius: 10px;
}

.heading-right .q-chip {
  font-weight: 600;
  font-size: 12px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 80px 20px;
  color: var(--text-muted);
}

.banner-error {
  background: var(--error-bg);
  color: var(--error);
  border: 1px solid var(--error);
  font-size: 13px;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 60px 20px;
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 14px;
  text-align: center;
}

.empty-card > .q-icon {
  color: var(--primary);
  margin-bottom: 6px;
}

.empty-titulo {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}

.empty-card p {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.materias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
}

.materia-card {
  position: relative;
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 14px;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.18s, border-color 0.18s, box-shadow 0.18s;
}

.materia-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary);
  box-shadow: var(--shadow-md);
}

.card-accent {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--primary), var(--primary-hover));
  opacity: 0;
  transition: opacity 0.2s;
}

.materia-card:hover .card-accent {
  opacity: 1;
}

.card-head {
  padding: 16px 18px 0;
}

.card-tags {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tag-codigo {
  display: inline-flex;
  align-items: center;
  padding: 3px 9px;
  background: var(--primary-soft);
  color: var(--primary);
  border-radius: 6px;
  font-size: 10.5px;
  font-weight: 800;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.tag-alumnos {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  background: var(--bg-hover);
  color: var(--text-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
}

.card-body {
  padding: 12px 18px 14px;
}

.card-titulo {
  margin: 0 0 6px;
  font-size: 15.5px;
  font-weight: 750;
  color: var(--text);
  letter-spacing: -0.3px;
  line-height: 1.3;
}

.card-desc {
  margin: 0;
  font-size: 12.5px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-sep {
  background: var(--border-subtle);
}

.card-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  padding: 14px 18px;
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.meta-label {
  font-size: 10px;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.meta-value {
  font-size: 12.5px;
  color: var(--text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  background: var(--bg-hover);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  transition: gap 0.15s;
}

.materia-card:hover .card-footer {
  gap: 8px;
}

.card-footer .q-icon {
  transition: transform 0.2s;
}

.materia-card:hover .card-footer .q-icon {
  transform: translateX(4px);
}

@media (max-width: 700px) {
  .materias-content {
    padding: 20px 16px 40px;
  }

  .page-heading {
    flex-direction: column;
    margin-bottom: 22px;
  }

  .heading-right {
    padding-top: 0;
  }

  .materias-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .card-meta {
    grid-template-columns: 1fr;
    gap: 10px;
  }
}
</style>
