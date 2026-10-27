<script setup>
import { ref, onMounted } from 'vue';
import { Notify, Dialog } from 'quasar';
import * as adminApi from '../../api/admin.api.js';

const cargando = ref(true);
const ciclos = ref([]);
const activo = ref(null);

const modalCiclo = ref(false);
const modalEditar = ref(false);
const nuevoCiclo = ref({ nombre: '', fechaInicio: '', fechaFin: '' });
const cicloEditando = ref(null);

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

async function cargar() {
  cargando.value = true;
  try {
    const [lista, act] = await Promise.all([
      adminApi.listarCiclos(),
      adminApi.obtenerCicloActivo().catch(() => null),
    ]);
    ciclos.value = lista || [];
    activo.value = act;
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar ciclos', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

function crear() {
  nuevoCiclo.value = { nombre: '', fechaInicio: '', fechaFin: '' };
  modalCiclo.value = true;
}

async function guardarNuevoCiclo() {
  if (!nuevoCiclo.value.nombre || !nuevoCiclo.value.fechaInicio || !nuevoCiclo.value.fechaFin) {
    Notify.create({ type: 'warning', message: 'Completá todos los campos', position: 'top' });
    return;
  }
  try {
    await adminApi.crearCiclo({
      nombre: nuevoCiclo.value.nombre,
      fechaInicio: nuevoCiclo.value.fechaInicio,
      fechaFin: nuevoCiclo.value.fechaFin,
      activo: false,
    });
    Notify.create({ type: 'positive', message: 'Ciclo creado', position: 'top' });
    modalCiclo.value = false;
    await cargar();
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.error || 'Error al crear',
      position: 'top',
    });
  }
}

async function activar(ciclo) {
  const ok = await new Promise((resolve) => {
    Dialog.create({
      title: 'Activar ciclo',
      message: `¿Activar ${ciclo.nombre}? Los demás ciclos se desactivarán.`,
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Activar', color: 'positive', unelevated: true },
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });
  if (!ok) return;
  try {
    await adminApi.actualizarCiclo(ciclo.id, { activo: true });
    Notify.create({ type: 'positive', message: 'Ciclo activado', position: 'top' });
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

function editar(ciclo) {
  cicloEditando.value = ciclo;
  nuevoCiclo.value = {
    nombre: ciclo.nombre,
    fechaInicio: ciclo.fecha_inicio?.slice(0, 10) || '',
    fechaFin: ciclo.fecha_fin?.slice(0, 10) || '',
  };
  modalEditar.value = true;
}

async function guardarEdicion() {
  if (!nuevoCiclo.value.nombre || !nuevoCiclo.value.fechaInicio || !nuevoCiclo.value.fechaFin) {
    Notify.create({ type: 'warning', message: 'Completá todos los campos', position: 'top' });
    return;
  }
  try {
    await adminApi.actualizarCiclo(cicloEditando.value.id, {
      nombre: nuevoCiclo.value.nombre,
      fechaInicio: nuevoCiclo.value.fechaInicio,
      fechaFin: nuevoCiclo.value.fechaFin,
    });
    Notify.create({ type: 'positive', message: 'Ciclo actualizado', position: 'top' });
    modalEditar.value = false;
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Ciclos lectivos</div>
        <div class="text-caption text-grey-7">Gestión de períodos académicos</div>
      </div>
      <q-btn unelevated no-caps color="primary" icon="add" label="Nuevo ciclo" @click="crear" />
    </div>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-banner v-if="activo" rounded class="bg-primary text-white q-mb-md">
      <template #avatar><q-icon name="check_circle" size="28px" /></template>
      <div class="text-weight-bold">Ciclo activo: {{ activo.nombre }}</div>
      <div class="text-caption">
        {{ formatearFecha(activo.fecha_inicio) }} → {{ formatearFecha(activo.fecha_fin) }}
      </div>
    </q-banner>

    <q-card v-if="!cargando && !ciclos.length" flat bordered>
      <q-card-section class="text-center text-grey-7 q-pa-xl">
        <q-icon name="calendar_month" size="48px" class="q-mb-sm" />
        <div>No hay ciclos creados</div>
      </q-card-section>
    </q-card>

    <div v-else class="row q-col-gutter-md">
      <div v-for="c in ciclos" :key="c.id" class="col-12 col-md-6">
        <q-card flat bordered :class="{ 'border-primary': c.activo }">
          <q-card-section>
            <div class="row items-center justify-between">
              <div>
                <div class="text-h6 text-weight-bold">{{ c.nombre }}</div>
                <div class="text-caption text-grey-7">
                  {{ formatearFecha(c.fecha_inicio) }} → {{ formatearFecha(c.fecha_fin) }}
                </div>
              </div>
              <q-badge v-if="c.activo" color="positive" label="ACTIVO" />
            </div>
          </q-card-section>
          <q-separator />
          <q-card-actions>
            <q-btn v-if="!c.activo" flat no-caps color="positive" icon="check" label="Activar" @click="activar(c)" />
            <q-btn flat no-caps color="primary" icon="edit" label="Editar" @click="editar(c)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>

    <q-dialog v-model="modalCiclo" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Nuevo ciclo lectivo</div>
        </q-card-section>
        <q-card-section class="q-pt-none column q-gutter-md">
          <q-input v-model="nuevoCiclo.nombre" outlined label="Nombre" placeholder="Ej: 2027" autofocus />
          <q-input v-model="nuevoCiclo.fechaInicio" outlined type="date" label="Fecha inicio" />
          <q-input v-model="nuevoCiclo.fechaFin" outlined type="date" label="Fecha fin" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="modalCiclo = false" />
          <q-btn unelevated no-caps label="Crear" color="primary" @click="guardarNuevoCiclo" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="modalEditar" persistent>
      <q-card style="min-width: 400px">
        <q-card-section>
          <div class="text-h6">Editar ciclo</div>
        </q-card-section>
        <q-card-section class="q-pt-none column q-gutter-md">
          <q-input v-model="nuevoCiclo.nombre" outlined label="Nombre" />
          <q-input v-model="nuevoCiclo.fechaInicio" outlined type="date" label="Fecha inicio" />
          <q-input v-model="nuevoCiclo.fechaFin" outlined type="date" label="Fecha fin" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="modalEditar = false" />
          <q-btn unelevated no-caps label="Guardar" color="primary" @click="guardarEdicion" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.border-primary {
  border-color: var(--primary) !important;
  border-width: 2px !important;
}
</style>
