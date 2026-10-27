<template>
  <q-page class="pagina-crear-grupo">
    <div class="contenedor">
      <header class="encabezado">
        <q-btn flat dense icon="arrow_back" no-caps label="Volver" @click="volver" />
        <h1 class="titulo">
          <q-icon name="group_add" size="28px" />
          Crear nuevo grupo
        </h1>
      </header>

      <q-card flat bordered class="tarjeta-formulario">
        <q-card-section>
          <div class="campo">
            <label class="etiqueta">Carrera *</label>
            <q-select
              v-model="form.carreraId"
              :options="carreras"
              option-value="id"
              option-label="nombre"
              emit-value
              map-options
              outlined
              dense
              placeholder="Elegí la carrera"
              @update:model-value="sugerirCodigo"
            >
              <template #option="scope">
                <q-item v-bind="scope.itemProps">
                  <q-item-section>
                    <q-item-label>{{ scope.opt.nombre }}</q-item-label>
                    <q-item-label caption>
                      {{ scope.opt.codigo }} · {{ scope.opt.tipo_division === 'semestre' ? 'Semestres' : 'Años' }}
                    </q-item-label>
                  </q-item-section>
                </q-item>
              </template>
            </q-select>
          </div>

          <div v-if="configCarrera?.usa_turnos" class="campo">
            <label class="etiqueta">Turno</label>
            <q-btn-toggle
              v-model="form.turno"
              :options="[
                { label: 'Mañana', value: 'M' },
                { label: 'Tarde', value: 'T' },
                { label: 'Noche', value: 'N' }
              ]"
              toggle-color="primary"
              outlined
              @update:model-value="sugerirCodigo"
            />
          </div>

          <div v-if="configCarrera?.usa_paralelos" class="campo">
            <label class="etiqueta">Paralelo (opcional)</label>
            <q-btn-toggle
              v-model="form.paralelo"
              :options="[
                { label: 'A', value: 'A' },
                { label: 'B', value: 'B' },
                { label: 'C', value: 'C' },
                { label: 'D', value: 'D' }
              ]"
              toggle-color="primary"
              outlined
              @update:model-value="sugerirCodigo"
            />
          </div>

          <div v-if="sugerencia" class="campo">
            <label class="etiqueta">
              Código del grupo
              <q-chip dense color="primary" text-color="white" class="chip-auto">
                Sugerido
              </q-chip>
            </label>
            <q-input
              v-model="form.codigo"
              outlined
              dense
              :rules="[validarCodigo]"
              hint="Podés editarlo. Formato: CARRERA-TIPO-NUMERO[-TURNO][-PARALELO]"
            />
            <div v-if="!sugerencia.puede_crear_mas" class="advertencia">
              <q-icon name="warning" size="16px" color="warning" />
              Esta carrera ya tiene todos sus {{ sugerencia.total_divisiones }} {{ sugerencia.tipo_division === 'semestre' ? 'semestres' : 'años' }} creados.
            </div>
          </div>

          <div class="campo">
            <label class="etiqueta">Nombre del grupo *</label>
            <q-input
              v-model="form.nombre"
              outlined
              dense
              placeholder="Ej: Redes y Software — 5to Semestre (Mañana)"
              :rules="[v => !!v || 'El nombre es obligatorio']"
            />
          </div>

          <div class="campo">
            <label class="etiqueta">Capacidad máxima</label>
            <q-input
              v-model.number="form.capacidadMax"
              outlined
              dense
              type="number"
              min="1"
              max="200"
            />
          </div>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancelar" @click="volver" />
          <q-btn
            unelevated
            color="primary"
            label="Crear grupo"
            icon="save"
            :loading="guardando"
            :disable="!puedeGuardar"
            @click="guardar"
          />
        </q-card-actions>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { Notify } from 'quasar'
import * as grupoApi from '../../api/grupo.api.js'
import * as carreraApi from '../../api/carrera.api.js'

const router = useRouter()

const form = ref({
  carreraId: null,
  turno: null,
  paralelo: null,
  codigo: '',
  nombre: '',
  capacidadMax: 50
})

const carreras = ref([])
const configCarrera = ref(null)
const sugerencia = ref(null)
const guardando = ref(false)

const puedeGuardar = computed(() => {
  return form.value.carreraId && form.value.codigo && form.value.nombre
})

async function cargarCarreras() {
  try {
    carreras.value = await carreraApi.listarCarreras()
  } catch (e) {
    Notify.create({ message: 'Error al cargar carreras', color: 'negative' })
  }
}

async function sugerirCodigo() {
  if (!form.value.carreraId) return
  try {
    sugerencia.value = await grupoApi.sugerirCodigoGrupo(
      form.value.carreraId,
      form.value.turno,
      form.value.paralelo
    )
    if (sugerencia.value) {
      form.value.codigo = sugerencia.value.codigo_sugerido
      configCarrera.value = sugerencia.value
      if (!form.value.nombre) {
        const carrera = carreras.value.find(c => c.id === form.value.carreraId)
        if (carrera) {
          form.value.nombre = `${carrera.nombre} — ${sugerencia.value.division_numero}° ${sugerencia.value.tipo_division === 'semestre' ? 'Semestre' : 'Año'}`
        }
      }
    }
  } catch (e) {
    console.error('Error al sugerir código:', e)
  }
}

function validarCodigo(val) {
  const regex = /^[A-Z]{2,}-[A-Z0-9]+-(SEM|ANO)-\d+(-[MTN])?(-[A-Z])?$/
  return regex.test(val) || 'Formato inválido. Ej: TEC-CONST-SEM-5-M'
}

async function guardar() {
  guardando.value = true
  try {
    await grupoApi.crearGrupo({
      carrera_id: form.value.carreraId,
      codigo: form.value.codigo,
      nombre: form.value.nombre,
      capacidad_max: form.value.capacidadMax,
      turno: form.value.turno,
      paralelo: form.value.paralelo,
      division_numero: sugerencia.value?.division_numero
    })
    Notify.create({ message: 'Grupo creado exitosamente', color: 'positive' })
    router.push('/admin/grupos')
  } catch (e) {
    Notify.create({
      message: e.response?.data?.error || 'Error al crear grupo',
      color: 'negative'
    })
  } finally {
    guardando.value = false
  }
}

function volver() {
  router.push('/admin/grupos')
}

onMounted(() => {
  cargarCarreras()
})
</script>

<style scoped>
.pagina-crear-grupo {
  padding: 24px;
  max-width: 720px;
  margin: 0 auto;
}

.encabezado {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
}

.titulo {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 22px;
  font-weight: 600;
  margin: 0;
}

.tarjeta-formulario {
  background: var(--bg-elevated, #ffffff);
}

.campo {
  margin-bottom: 20px;
}

.etiqueta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text, #1a1a1a);
  margin-bottom: 6px;
}

.chip-auto {
  font-size: 10px;
  height: 18px;
}

.advertencia {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #92400e;
  margin-top: 6px;
  padding: 8px;
  background: #fef3c7;
  border-radius: 4px;
}

@media (max-width: 600px) {
  .pagina-crear-grupo {
    padding: 16px;
  }
  .titulo {
    font-size: 18px;
  }
}
</style>
