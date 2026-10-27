<script setup>
import { ref } from 'vue';
import { useTareas } from '../../composables/useTareas.js';
import { useEntregaTarea } from '../../composables/useEntregaTarea.js';
import TarjetaTarea from '../../components/tareas/TarjetaTarea.vue';
import TarjetaMaterial from '../../components/tareas/TarjetaMaterial.vue';
import DialogoEntrega from '../../components/tareas/DialogoEntrega.vue';

const tab = ref('tareas');

const {
  cargando,
  tareas,
  materiales,
  filtroEstado,
  filtroMateria,
  ahora,
  materias,
  tareasFiltradas,
  materialesFiltrados,
  materialesAgrupados,
  contadores,
  cargar,
} = useTareas();

const {
  modalEntrega,
  tareaActiva,
  archivoSeleccionado,
  comentarioEntrega,
  subiendo,
  arrastrandoArchivo,
  abrirModalEntrega,
  cerrarModalEntrega,
  onArchivoSeleccionado,
  onDrop,
  subirEntrega,
  verEntrega,
  descargarMaterial,
} = useEntregaTarea({ ahora, alSubir: cargar });

function abrirLink(url) {
  window.open(url, '_blank');
}
</script>

<template>
  <q-page class="tareas-page">
    <header class="page-header">
      <div class="page-header-icon"><q-icon name="assignment" size="24px" /></div>
      <div>
        <h1 class="page-title">Mis Tareas y Materiales</h1>
        <p class="page-sub">Todo lo que tenés que hacer y estudiar en un solo lugar</p>
      </div>
    </header>

    <div class="row items-center q-mb-md q-gutter-md" style="justify-content: space-between;">
      <div class="tabs-container">
        <button :class="['tab-btn', { 'tab-btn--active': tab === 'tareas' }]" @click="tab = 'tareas'">
          <q-icon name="assignment" size="18px" /> Tareas
          <span class="tab-count">{{ tareas.length }}</span>
        </button>
        <button :class="['tab-btn', { 'tab-btn--active': tab === 'materiales' }]" @click="tab = 'materiales'">
          <q-icon name="folder" size="18px" /> Materiales
          <span class="tab-count">{{ materiales.length }}</span>
        </button>
      </div>

      <q-select
        v-model="filtroMateria"
        :options="[{ id: 'todas', nombre: 'Todas las materias' }, ...materias]"
        option-value="id"
        option-label="nombre"
        emit-value
        map-options
        outlined
        dense
        label="Filtrar materia"
        class="materia-select"
        style="min-width: 240px;"
      />
    </div>

    <div class="filtros q-mb-lg" v-show="tab === 'tareas'">
      <button
        v-for="f in ['pendientes','vencidas','entregadas','todas']"
        :key="f"
        type="button"
        :class="['chip', { activo: filtroEstado === f }]"
        @click="filtroEstado = f"
      >
        {{ f.charAt(0).toUpperCase() + f.slice(1) }}
        <span class="chip-count">{{ contadores[f] }}</span>
      </button>
    </div>

    <div v-if="cargando" class="row q-col-gutter-md">
      <div v-for="i in 3" :key="i" class="col-12 col-md-6 col-lg-4">
        <div class="skeleton-card" />
      </div>
    </div>

    <div v-show="tab === 'tareas' && !cargando" class="content-wrapper">
      <div v-if="!tareasFiltradas.length" class="empty-state">
        <div class="empty-illustration"><q-icon name="task_alt" size="44px" /></div>
        <h3 class="empty-titulo">Sin tareas</h3>
        <p class="empty-desc">No tenés tareas en esta vista para la materia seleccionada.</p>
      </div>
      <div v-else class="row q-col-gutter-md">
        <div v-for="tarea in tareasFiltradas" :key="tarea.id" class="col-12 col-md-6 col-lg-4">
          <TarjetaTarea
            :tarea="tarea"
            :ahora="ahora"
            @entregar="abrirModalEntrega"
            @ver-entrega="verEntrega"
          />
        </div>
      </div>
    </div>

    <div v-show="tab === 'materiales' && !cargando" class="content-wrapper">
      <div v-if="!materialesFiltrados.length" class="empty-state">
        <div class="empty-illustration"><q-icon name="folder_off" size="44px" /></div>
        <h3 class="empty-titulo">Sin materiales</h3>
        <p class="empty-desc">No hay apuntes ni archivos para la materia seleccionada.</p>
      </div>
      <div v-else class="column q-gutter-y-md">
        <q-expansion-item
          v-for="grupo in materialesAgrupados"
          :key="grupo.tema"
          :label="grupo.tema"
          icon="folder"
          header-class="tema-header"
          default-opened
        >
          <div class="row q-col-gutter-md q-pt-md">
            <div v-for="material in grupo.items" :key="material.id" class="col-12 col-md-6 col-lg-4">
              <TarjetaMaterial
                :material="material"
                @descargar="descargarMaterial"
                @abrir-link="abrirLink"
              />
            </div>
          </div>
        </q-expansion-item>
      </div>
    </div>

    <DialogoEntrega
      :abierto="modalEntrega"
      :tarea="tareaActiva"
      :archivo="archivoSeleccionado"
      :comentario="comentarioEntrega"
      :subiendo="subiendo"
      :arrastrando="arrastrandoArchivo"
      :ahora="ahora"
      @cerrar="cerrarModalEntrega"
      @update:archivo="archivoSeleccionado = $event"
      @update:comentario="comentarioEntrega = $event"
      @update:arrastrando="arrastrandoArchivo = $event"
      @subir="subirEntrega"
    />
  </q-page>
</template>

<style scoped>
.tareas-page { max-width: 1280px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.page-header-icon {
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--primary-soft);
  color: var(--primary);
  flex-shrink: 0;
}
.page-title {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin: 0;
  line-height: 1.1;
  color: var(--text);
}
.page-sub { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }

.tabs-container { display: flex; gap: 8px; }
.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 100px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover { border-color: var(--primary); color: var(--primary); }
.tab-btn--active { background: var(--primary); color: white; border-color: var(--primary); }
.tab-count {
  background: var(--bg-hover);
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 700;
}
.tab-btn--active .tab-count { background: rgba(255, 255, 255, 0.25); }

.filtros { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 16px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 100px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s;
}
.chip:hover { border-color: var(--primary); transform: translateY(-1px); }
.chip.activo { background: var(--primary); color: white; border-color: var(--primary); }
.chip-count {
  padding: 1px 8px;
  border-radius: 100px;
  background: var(--bg-hover);
  font-size: 11px;
  font-weight: 700;
  min-width: 22px;
  text-align: center;
}
.chip.activo .chip-count { background: rgba(255, 255, 255, 0.25); }

.skeleton-card {
  border-radius: 18px;
  background: linear-gradient(90deg, var(--bg-elevated) 0%, var(--bg-hover) 50%, var(--bg-elevated) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite linear;
  height: 220px;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  text-align: center;
}
.empty-illustration {
  display: grid;
  place-items: center;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, var(--primary-soft), transparent 70%);
  color: var(--primary);
  margin-bottom: 20px;
}
.empty-titulo {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin: 0 0 6px;
  color: var(--text);
}
.empty-desc {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.5;
  max-width: 360px;
  margin: 0;
}

.materia-select :deep(.q-field__control) {
  border-radius: 12px;
  background: var(--bg-elevated) !important;
  height: 40px;
}
.materia-select :deep(.q-field__native) { color: var(--text); }
.materia-select :deep(.q-field__label) { color: var(--text-muted); }

.tema-header {
  background: var(--bg-elevated) !important;
  border-radius: 12px !important;
  font-weight: 700 !important;
  color: var(--text) !important;
}
.tema-header .q-icon { color: var(--primary) !important; }
</style>
