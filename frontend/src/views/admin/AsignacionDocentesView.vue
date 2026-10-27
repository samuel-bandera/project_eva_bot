<template>
  <q-page class="pagina-asignaciones">
    <div class="contenedor">
      <header class="encabezado">
        <h1 class="titulo">
          <q-icon name="assignment_ind" size="28px" />
          Asignación de docentes a grupos
        </h1>
        <p class="subtitulo">
          Asigná qué docentes dictan cada materia en cada grupo.
        </p>
      </header>

      <q-card flat bordered class="tarjeta-selector">
        <q-card-section>
          <div class="grid-selectores">
            <div class="campo">
              <label class="etiqueta">Carrera</label>
              <q-select
                v-model="carreraSeleccionada"
                :options="carreras"
                option-value="id"
                option-label="nombre"
                emit-value
                map-options
                outlined
                dense
                @update:model-value="cargarGruposDeCarrera"
              />
            </div>
            <div class="campo">
              <label class="etiqueta">Grupo</label>
              <q-select
                v-model="grupoSeleccionado"
                :options="grupos"
                option-value="id"
                option-label="nombre"
                emit-value
                map-options
                outlined
                dense
                :disable="!carreraSeleccionada"
                @update:model-value="cargarAsignaciones"
              />
            </div>
          </div>
        </q-card-section>
      </q-card>

      <q-card v-if="grupoSeleccionado" flat bordered class="tarjeta-asignaciones">
        <q-card-section>
          <div class="header-tabla">
            <h2 class="titulo-seccion">
              <q-icon name="groups" size="20px" />
              Docentes asignados
            </h2>
            <q-btn
              unelevated
              color="primary"
              icon="add"
              label="Asignar docente"
              no-caps
              @click="abrirModal"
            />
          </div>

          <div v-if="cargando" class="estado-carga">
            <q-spinner color="primary" size="32px" />
            <span>Cargando asignaciones...</span>
          </div>

          <div v-else-if="asignaciones.length === 0" class="estado-vacio">
            <q-icon name="info" size="32px" color="grey-6" />
            <p>Este grupo todavía no tiene docentes asignados.</p>
            <q-btn
              outline
              color="primary"
              label="Asignar el primero"
              no-caps
              @click="abrirModal"
            />
          </div>

          <q-table
            v-else
            :rows="asignaciones"
            :columns="columnas"
            row-key="id"
            flat
            dense
            :pagination="{ rowsPerPage: 20 }"
          >
            <template #body-cell-tipo="props">
              <q-td :props="props">
                <q-chip
                  :color="props.row.tipo_docente === 'titular' ? 'primary' : 'grey-6'"
                  text-color="white"
                  dense
                >
                  {{ props.row.tipo_docente === 'titular' ? 'Titular' : 'Suplente' }}
                </q-chip>
              </q-td>
            </template>
            <template #body-cell-acciones="props">
              <q-td :props="props">
                <q-btn
                  flat
                  dense
                  icon="delete"
                  color="negative"
                  @click="confirmarEliminar(props.row)"
                >
                  <q-tooltip>Desasignar docente</q-tooltip>
                </q-btn>
              </q-td>
            </template>
          </q-table>
        </q-card-section>
      </q-card>

      <div v-else class="estado-inicial">
        <q-icon name="touch_app" size="48px" color="grey-5" />
        <p>Seleccioná una carrera y un grupo para ver sus asignaciones.</p>
      </div>
    </div>

    <q-dialog v-model="modalAbierto" persistent>
      <q-card style="min-width: 500px; max-width: 90vw;">
        <q-card-section class="row items-center q-pb-none">
          <div class="text-h6">Asignar docente al grupo</div>
          <q-space />
          <q-btn icon="close" flat round dense v-close-popup />
        </q-card-section>

        <q-card-section>
          <div class="campo">
            <label class="etiqueta">Docente *</label>
            <q-select
              v-model="form.docenteId"
              :options="docentes"
              option-value="id"
              option-label="nombreCompleto"
              emit-value
              map-options
              outlined
              dense
              use-input
              input-debounce="300"
              placeholder="Buscar docente..."
              :loading="cargandoDocentes"
              @filter="filtrarDocentes"
            />
          </div>

          <div class="campo">
            <label class="etiqueta">Materia *</label>
            <q-select
              v-model="form.materiaId"
              :options="materias"
              option-value="id"
              option-label="nombre"
              emit-value
              map-options
              outlined
              dense
              placeholder="Elegí la materia"
            />
          </div>

          <div class="campo">
            <label class="etiqueta">Tipo de docente</label>
            <q-btn-toggle
              v-model="form.tipoDocente"
              :options="[
                { label: 'Titular', value: 'titular' },
                { label: 'Suplente', value: 'suplente' }
              ]"
              toggle-color="primary"
              outlined
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-close-popup />
          <q-btn
            unelevated
            color="primary"
            label="Asignar"
            :loading="guardando"
            :disable="!form.docenteId || !form.materiaId"
            @click="guardarAsignacion"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="modalEliminar">
      <q-card>
        <q-card-section>
          <div class="text-h6">¿Desasignar docente?</div>
          <p v-if="asignacionAEliminar" class="q-mt-sm">
            {{ asignacionAEliminar.docente_nombre }} {{ asignacionAEliminar.docente_apellido }} dejará de estar asignado a
            <strong>{{ asignacionAEliminar.materia_nombre }}</strong>.
          </p>
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat label="Cancelar" v-model="modalEliminar" />
          <q-btn unelevated color="negative" label="Desasignar" @click="eliminarAsignacion" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Notify } from 'quasar'
import * as grupoApi from '../../api/grupo.api.js'
import * as docenteGrupoApi from '../../api/docenteGrupo.api.js'
import * as carreraApi from '../../api/carrera.api.js'
import * as adminApi from '../../api/admin.api.js'

const carreras = ref([])
const grupos = ref([])
const asignaciones = ref([])
const docentes = ref([])
const docentesOriginales = ref([])
const materias = ref([])

const carreraSeleccionada = ref(null)
const grupoSeleccionado = ref(null)

const cargando = ref(false)
const guardando = ref(false)
const cargandoDocentes = ref(false)
const modalAbierto = ref(false)
const modalEliminar = ref(false)
const asignacionAEliminar = ref(null)

const form = ref({
  docenteId: null,
  materiaId: null,
  tipoDocente: 'titular'
})

const columnas = [
  { name: 'docente', label: 'Docente', field: row => `${row.docente_nombre} ${row.docente_apellido}`, align: 'left', sortable: true },
  { name: 'usuario', label: 'Usuario', field: 'docente_usuario', align: 'left' },
  { name: 'materia', label: 'Materia', field: 'materia_nombre', align: 'left', sortable: true },
  { name: 'tipo', label: 'Tipo', align: 'center' },
  { name: 'acciones', label: '', align: 'center' }
]

async function cargarCarreras() {
  try {
    carreras.value = await carreraApi.listarCarreras()
  } catch (e) {
    Notify.create({ message: 'Error al cargar carreras', color: 'negative' })
  }
}

async function cargarGruposDeCarrera() {
  grupoSeleccionado.value = null
  asignaciones.value = []
  if (!carreraSeleccionada.value) {
    grupos.value = []
    return
  }
  try {
    const todos = await grupoApi.listarGrupos()
    grupos.value = todos.filter(g => g.carrera_id === carreraSeleccionada.value)
  } catch (e) {
    Notify.create({ message: 'Error al cargar grupos', color: 'negative' })
  }
}

async function cargarAsignaciones() {
  if (!grupoSeleccionado.value) return
  cargando.value = true
  try {
    asignaciones.value = await docenteGrupoApi.listarDocentesDeGrupo(grupoSeleccionado.value)
  } catch (e) {
    Notify.create({ message: 'Error al cargar asignaciones', color: 'negative' })
  } finally {
    cargando.value = false
  }
}

async function abrirModal() {
  form.value = { docenteId: null, materiaId: null, tipoDocente: 'titular' }
  modalAbierto.value = true
  await cargarDocentes()
  await cargarMaterias()
}

async function cargarDocentes() {
  if (docentesOriginales.value.length > 0) return
  cargandoDocentes.value = true
  try {
    const res = await adminApi.listarUsuarios({ tipo: 'docente', limit: 500 })
    docentesOriginales.value = res.map(d => ({
      ...d,
      nombreCompleto: `${d.nombre} ${d.apellido} (${d.usuario})`
    }))
    docentes.value = docentesOriginales.value
  } catch (e) {
    Notify.create({ message: 'Error al cargar docentes', color: 'negative' })
  } finally {
    cargandoDocentes.value = false
  }
}

async function cargarMaterias() {
  try {
    const res = await adminApi.listarMaterias()
    materias.value = res || []
  } catch (e) {
    console.error('Error al cargar materias:', e)
  }
}

function filtrarDocentes(val, update) {
  update(() => {
    if (!val) {
      docentes.value = docentesOriginales.value
      return
    }
    const q = val.toLowerCase()
    docentes.value = docentesOriginales.value.filter(d =>
      d.nombreCompleto.toLowerCase().includes(q)
    )
  })
}

async function guardarAsignacion() {
  guardando.value = true
  try {
    await docenteGrupoApi.asignarDocenteAGrupo(grupoSeleccionado.value, form.value)
    Notify.create({ message: 'Docente asignado correctamente', color: 'positive' })
    modalAbierto.value = false
    await cargarAsignaciones()
  } catch (e) {
    Notify.create({
      message: e.response?.data?.error || 'Error al asignar docente',
      color: 'negative'
    })
  } finally {
    guardando.value = false
  }
}

function confirmarEliminar(asignacion) {
  asignacionAEliminar.value = asignacion
  modalEliminar.value = true
}

async function eliminarAsignacion() {
  if (!asignacionAEliminar.value) return
  try {
    await docenteGrupoApi.desasignarDocente(grupoSeleccionado.value, asignacionAEliminar.value.id)
    Notify.create({ message: 'Asignación eliminada', color: 'positive' })
    modalEliminar.value = false
    await cargarAsignaciones()
  } catch (e) {
    Notify.create({ message: 'Error al desasignar', color: 'negative' })
  }
}

onMounted(() => {
  cargarCarreras()
})
</script>

<style scoped>
.pagina-asignaciones {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
}

.encabezado {
  margin-bottom: 24px;
}

.titulo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  font-weight: 600;
  margin: 0 0 6px 0;
}

.subtitulo {
  color: var(--text-muted, #666);
  font-size: 14px;
  margin: 0;
}

.tarjeta-selector, .tarjeta-asignaciones {
  margin-bottom: 24px;
  background: var(--bg-elevated, #fff);
}

.grid-selectores {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.campo {
  margin-bottom: 16px;
}

.etiqueta {
  display: block;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 6px;
}

.header-tabla {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.titulo-seccion {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  margin: 0;
}

.estado-carga, .estado-vacio, .estado-inicial {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px;
  color: var(--text-muted, #666);
  text-align: center;
}

@media (max-width: 600px) {
  .grid-selectores {
    grid-template-columns: 1fr;
  }
  .header-tabla {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}
</style>
