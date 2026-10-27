<template>
  <section class="selector-grupos">
    <header class="encabezado">
      <h3 class="titulo">
        <q-icon name="groups" size="20px" />
        ¿A quién va dirigida esta evaluación?
      </h3>
      <p class="descripcion">
        Elegí si la evaluación es para todos los alumnos de la materia o solo para algunos grupos.
      </p>
    </header>

    <div class="alcance-opciones">
      <button
        type="button"
        class="alcance-tarjeta"
        :class="{ activa: alcance === 'materia' }"
        @click="seleccionarTodaLaMateria"
      >
        <q-icon name="public" size="24px" />
        <div class="alcance-texto">
          <div class="alcance-titulo">Toda la materia</div>
          <div class="alcance-descripcion">Todos los alumnos matriculados</div>
        </div>
        <q-icon v-if="alcance === 'materia'" name="check_circle" size="20px" color="primary" />
      </button>

      <button
        type="button"
        class="alcance-tarjeta"
        :class="{ activa: alcance === 'grupos' }"
        @click="seleccionarGruposEspecificos"
        :disabled="!gruposCargados || grupos.length === 0"
      >
        <q-icon name="groups" size="24px" />
        <div class="alcance-texto">
          <div class="alcance-titulo">Grupos específicos</div>
          <div class="alcance-descripcion">Elegí uno o varios grupos</div>
        </div>
        <q-icon v-if="alcance === 'grupos'" name="check_circle" size="20px" color="primary" />
      </button>
    </div>

    <div v-if="cargando" class="estado-carga">
      <q-spinner color="primary" size="24px" />
      <span>Cargando grupos de la materia...</span>
    </div>

    <div v-else-if="error" class="estado-error">
      <q-icon name="error_outline" size="20px" color="negative" />
      <span>{{ error }}</span>
      <q-btn flat dense no-caps color="primary" label="Reintentar" @click="cargarGrupos" />
    </div>

    <div v-else-if="gruposCargados && grupos.length === 0" class="estado-vacio">
      <q-icon name="info" size="20px" color="grey-6" />
      <span>No hay grupos con alumnos matriculados en esta materia. La evaluación se asignará a toda la materia.</span>
    </div>

    <div v-else-if="alcance === 'grupos' && grupos.length > 0" class="lista-grupos">
      <div class="barra-herramientas">
        <q-input
          v-model="busqueda"
          outlined
          dense
          placeholder="Buscar grupo..."
          class="buscador"
        >
          <template #prepend>
            <q-icon name="search" size="18px" />
          </template>
        </q-input>

        <div class="acciones">
          <span class="contador">
            {{ gruposSeleccionados.length }} seleccionado{{ gruposSeleccionados.length !== 1 ? 's' : '' }}
          </span>
          <q-btn
            v-if="gruposSeleccionados.length > 0"
            flat
            dense
            no-caps
            color="grey-7"
            label="Limpiar"
            icon="clear"
            @click="limpiarSeleccion"
          />
        </div>
      </div>

      <div class="grilla-grupos">
        <label
          v-for="grupo in gruposFiltrados"
          :key="grupo.id"
          class="grupo-tarjeta"
          :class="{ seleccionado: estaSeleccionado(grupo.id) }"
        >
          <input
            type="checkbox"
            :value="grupo.id"
            :checked="estaSeleccionado(grupo.id)"
            class="grupo-checkbox"
            @change="toggleGrupo(grupo.id)"
          />
          <div class="grupo-info">
            <div class="grupo-nombre">{{ grupo.nombre }}</div>
            <div class="grupo-codigo">{{ grupo.codigo }}</div>
            <div v-if="grupo.carrera" class="grupo-carrera">{{ grupo.carrera }}</div>
          </div>
          <q-icon
            v-if="estaSeleccionado(grupo.id)"
            name="check_circle"
            size="20px"
            color="primary"
            class="grupo-check"
          />
        </label>
      </div>

      <div v-if="gruposSeleccionados.length > 0" class="resumen-seleccion">
        <q-icon name="info" size="16px" color="primary" />
        <span>
          Esta evaluación se aplicará a <strong>{{ gruposSeleccionados.length }} grupo{{ gruposSeleccionados.length !== 1 ? 's' : '' }}</strong>.
          Los alumnos verán la misma evaluación sin duplicaciones.
        </span>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import * as grupoApi from '../../api/grupo.api.js'

const props = defineProps({
  materiaId: { type: Number, default: null },
  modelValue: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:modelValue'])

const grupos = ref([])
const gruposSeleccionados = ref([...props.modelValue])
const cargando = ref(false)
const error = ref('')
const gruposCargados = ref(false)
const busqueda = ref('')

const alcance = computed(() => {
  return gruposSeleccionados.value.length === 0 ? 'materia' : 'grupos'
})

const gruposFiltrados = computed(() => {
  if (!busqueda.value.trim()) return grupos.value
  const q = busqueda.value.toLowerCase().trim()
  return grupos.value.filter(g =>
    g.nombre.toLowerCase().includes(q) ||
    g.codigo.toLowerCase().includes(q) ||
    (g.carrera || '').toLowerCase().includes(q)
  )
})

async function cargarGrupos() {
  if (!props.materiaId) {
    grupos.value = []
    gruposCargados.value = false
    return
  }

  cargando.value = true
  error.value = ''
  try {
    grupos.value = await grupoApi.listarGruposPorMateria(props.materiaId)
    gruposCargados.value = true
  } catch (e) {
    console.error('Error al cargar grupos:', e)
    error.value = 'No se pudieron cargar los grupos. Revisá tu conexión.'
    grupos.value = []
  } finally {
    cargando.value = false
  }
}

function seleccionarTodaLaMateria() {
  gruposSeleccionados.value = []
  emit('update:modelValue', [])
}

function seleccionarGruposEspecificos() {
}

function toggleGrupo(grupoId) {
  const idx = gruposSeleccionados.value.indexOf(grupoId)
  if (idx >= 0) {
    gruposSeleccionados.value.splice(idx, 1)
  } else {
    gruposSeleccionados.value.push(grupoId)
  }
  emit('update:modelValue', [...gruposSeleccionados.value])
}

function estaSeleccionado(grupoId) {
  return gruposSeleccionados.value.includes(grupoId)
}

function limpiarSeleccion() {
  gruposSeleccionados.value = []
  emit('update:modelValue', [])
}

watch(() => props.materiaId, () => {
  gruposSeleccionados.value = []
  emit('update:modelValue', [])
  cargarGrupos()
})

watch(() => props.modelValue, (nuevos) => {
  if (JSON.stringify(nuevos) !== JSON.stringify(gruposSeleccionados.value)) {
    gruposSeleccionados.value = [...nuevos]
  }
}, { deep: true })

onMounted(() => {
  cargarGrupos()
})
</script>

<style scoped>
.selector-grupos {
  margin-top: 24px;
  padding: 20px;
  background: var(--bg-elevated, #ffffff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 12px;
}

.encabezado {
  margin-bottom: 16px;
}

.titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text, #1a1a1a);
}

.descripcion {
  font-size: 13px;
  color: var(--text-muted, #666);
  margin: 0;
}

.alcance-opciones {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}

.alcance-tarjeta {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg, #fafafa);
  border: 2px solid var(--border, #e0e0e0);
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  color: inherit;
  font-family: inherit;
}

.alcance-tarjeta:hover:not(:disabled) {
  border-color: var(--primary, #c62828);
  background: var(--bg-hover, #fff);
}

.alcance-tarjeta.activa {
  border-color: var(--primary, #c62828);
  background: var(--bg-active, #fff5f5);
}

.alcance-tarjeta:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.alcance-tarjeta .q-icon {
  color: var(--primary, #c62828);
  flex-shrink: 0;
}

.alcance-texto {
  flex: 1;
  min-width: 0;
}

.alcance-titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #1a1a1a);
  margin-bottom: 2px;
}

.alcance-descripcion {
  font-size: 12px;
  color: var(--text-muted, #666);
}

.estado-carga,
.estado-error,
.estado-vacio {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  border-radius: 8px;
  font-size: 13px;
}

.estado-carga {
  background: var(--bg, #fafafa);
  color: var(--text-muted, #666);
}

.estado-error {
  background: #fef2f2;
  color: #991b1b;
  flex-wrap: wrap;
}

.estado-vacio {
  background: #f0f9ff;
  color: #075985;
}

.lista-grupos {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.barra-herramientas {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.buscador {
  flex: 1;
  min-width: 200px;
}

.acciones {
  display: flex;
  align-items: center;
  gap: 8px;
}

.contador {
  font-size: 13px;
  color: var(--text-muted, #666);
  font-weight: 500;
}

.grilla-grupos {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.grupo-tarjeta {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--bg, #fafafa);
  border: 2px solid var(--border, #e0e0e0);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  position: relative;
}

.grupo-tarjeta:hover {
  border-color: var(--primary, #c62828);
  background: var(--bg-hover, #fff);
}

.grupo-tarjeta.seleccionado {
  border-color: var(--primary, #c62828);
  background: var(--bg-active, #fff5f5);
}

.grupo-checkbox {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.grupo-info {
  flex: 1;
  min-width: 0;
}

.grupo-nombre {
  font-size: 14px;
  font-weight: 600;
  color: var(--text, #1a1a1a);
  margin-bottom: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grupo-codigo {
  font-size: 12px;
  color: var(--text-muted, #666);
  font-family: monospace;
}

.grupo-carrera {
  font-size: 11px;
  color: var(--text-muted, #888);
  margin-top: 4px;
}

.grupo-check {
  flex-shrink: 0;
}

.resumen-seleccion {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  border-radius: 6px;
  font-size: 13px;
  color: #1e40af;
  line-height: 1.4;
}

.resumen-seleccion .q-icon {
  flex-shrink: 0;
  margin-top: 2px;
}

@media (max-width: 600px) {
  .alcance-opciones {
    grid-template-columns: 1fr;
  }

  .barra-herramientas {
    flex-direction: column;
    align-items: stretch;
  }

  .acciones {
    justify-content: space-between;
  }

  .grilla-grupos {
    grid-template-columns: 1fr;
  }

  .selector-grupos {
    padding: 16px;
  }
}
</style>
