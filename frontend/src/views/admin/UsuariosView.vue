<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify, Dialog } from 'quasar';
import * as adminApi from '../../api/admin.api.js';
import { useAuthStore } from '../../stores/auth.store.js';

const auth = useAuthStore();

const cargando = ref(true);
const usuarios = ref([]);
const busqueda = ref('');
const filtroTipo = ref('todos');
const filtroEstado = ref('todos');

const tabActual = ref('lista');
const pendientes = ref([]);

const tipos = [
  { value: 'todos', label: 'Todos' },
  { value: 'alumno', label: 'Alumnos' },
  { value: 'docente', label: 'Profesores' },
  { value: 'coordinador', label: 'Coordinadores' },
];

const estados = [
  { value: 'todos', label: 'Todos' },
  { value: 'pendiente', label: 'Pendientes' },
  { value: 'aprobado', label: 'Aprobados' },
  { value: 'rechazado', label: 'Rechazados' },
];

const usuariosFiltrados = computed(() => {
  let arr = usuarios.value;
  if (filtroTipo.value !== 'todos') arr = arr.filter(u => u.tipo === filtroTipo.value);
  if (filtroEstado.value !== 'todos') arr = arr.filter(u => u.estado === filtroEstado.value);
  const q = busqueda.value.trim().toLowerCase();
  if (q) {
    arr = arr.filter(u =>
      (u.nombre || '').toLowerCase().includes(q) ||
      (u.apellido || '').toLowerCase().includes(q) ||
      (u.usuario || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  }
  return arr;
});

function tipoColor(tipo) {
  return {
    admin: 'negative', coordinador: 'warning',
    profesor: 'primary', alumno: 'positive',
  }[tipo] || 'grey-5';
}

function estadoColor(estado) {
  return {
    aprobado: 'positive', pendiente: 'warning', rechazado: 'negative',
  }[estado] || 'grey-5';
}

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

async function cargarLista() {
  cargando.value = true;
  try {
    usuarios.value = await adminApi.listarUsuarios({ limit: 100 });
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar usuarios', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

async function cargarPendientes() {
  cargando.value = true;
  try {
    pendientes.value = await adminApi.listarPendientes();
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar pendientes', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

async function cargar() {
  if (tabActual.value === 'lista') await cargarLista();
  else await cargarPendientes();
}

async function aprobar(user) {
  try {
    await adminApi.aprobarUsuario(user.id);
    Notify.create({ type: 'positive', message: `${user.nombre} aprobado`, position: 'top' });
    await cargar();
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.error || 'Error al aprobar',
      position: 'top',
    });
  }
}

async function rechazar(user) {
  const motivo = await new Promise((resolve) => {
    Dialog.create({
      title: 'Rechazar cuenta',
      message: `¿Rechazar a ${user.nombre} ${user.apellido}?`,
      prompt: {
        model: '',
        type: 'textarea',
        label: 'Motivo (opcional)',
      },
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Rechazar', color: 'negative', unelevated: true },
      persistent: true,
    })
      .onOk((data) => resolve(data || ''))
      .onCancel(() => resolve(null))
      .onDismiss(() => resolve(null));
  });
  if (motivo === null) return;
  try {
    await adminApi.rechazarUsuario(user.id, motivo);
    Notify.create({ type: 'info', message: 'Cuenta rechazada', position: 'top' });
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

async function cambiarTipo(user) {
  const nuevoTipo = await new Promise((resolve) => {
    Dialog.create({
      title: 'Cambiar tipo de usuario',
      message: `${user.nombre} ${user.apellido}`,
      options: {
        type: 'radio',
        model: user.tipo,
        items: [
          { label: 'Alumno', value: 'alumno' },
          { label: 'Profesor', value: 'docente' },
          { label: 'Coordinador', value: 'coordinador' },
          { label: 'Admin', value: 'admin' },
        ],
      },
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Cambiar', color: 'primary', unelevated: true },
      persistent: true,
    })
      .onOk((data) => resolve(data))
      .onCancel(() => resolve(null))
      .onDismiss(() => resolve(null));
  });
  if (!nuevoTipo || nuevoTipo === user.tipo) return;
  try {
    await adminApi.actualizarUsuario(user.id, { tipo: nuevoTipo });
    Notify.create({ type: 'positive', message: 'Tipo actualizado', position: 'top' });
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

async function toggleActivo(user) {
  try {
    await adminApi.actualizarUsuario(user.id, { activo: !user.activo });
    Notify.create({ type: 'positive', message: user.activo ? 'Usuario desactivado' : 'Usuario activado', position: 'top' });
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
        <div class="text-h5">Usuarios</div>
        <div class="text-caption text-grey-7">Gestión de cuentas y permisos</div>
      </div>
    </div>

    <div class="row q-gutter-sm q-mb-md">
      <q-btn
        label="Todos los usuarios"
        icon="people"
        no-caps
        :unelevated="tabActual === 'lista'"
        :flat="tabActual !== 'lista'"
        :color="tabActual === 'lista' ? 'primary' : 'grey-7'"
        @click="tabActual = 'lista'; cargar()"
      />
      <q-btn
        label="Pendientes"
        icon="pending_actions"
        no-caps
        :unelevated="tabActual === 'pendientes'"
        :flat="tabActual !== 'pendientes'"
        :color="tabActual === 'pendientes' ? 'primary' : 'grey-7'"
        @click="tabActual = 'pendientes'; cargar()"
      >
        <q-badge v-if="pendientes.length > 0" color="warning" class="q-ml-sm">
          {{ pendientes.length }}
        </q-badge>
      </q-btn>
    </div>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <template v-if="tabActual === 'lista'">
      <div class="row q-col-gutter-sm q-mb-md">
        <div class="col-12 col-md-6">
          <q-input v-model="busqueda" outlined dense clearable placeholder="Buscar por nombre, usuario o email...">
            <template #prepend><q-icon name="search" /></template>
          </q-input>
        </div>
        <div class="col-6 col-md-3">
          <q-select v-model="filtroTipo" :options="tipos" option-value="value" option-label="label"
            emit-value map-options outlined dense label="Tipo" />
        </div>
        <div class="col-6 col-md-3">
          <q-select v-model="filtroEstado" :options="estados" option-value="value" option-label="label"
            emit-value map-options outlined dense label="Estado" />
        </div>
      </div>

      <q-card flat bordered>
        <q-card-section v-if="usuariosFiltrados.length === 0" class="text-center text-grey-7 q-pa-xl">
          <q-icon name="person_off" size="48px" class="q-mb-sm" />
          <div>Sin usuarios que coincidan</div>
        </q-card-section>

        <q-markup-table v-else flat separator="horizontal" wrap-cells>
          <thead>
            <tr>
              <th class="text-left">Usuario</th>
              <th class="text-center">Tipo</th>
              <th class="text-center">Estado</th>
              <th class="text-center">Registro</th>
              <th class="text-center">Activo</th>
              <th class="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in usuariosFiltrados" :key="u.id">
              <td>
                <div class="row items-center q-gutter-sm">
                  <q-avatar color="primary" text-color="white" size="36px">
                    {{ (u.nombre?.[0] || '') + (u.apellido?.[0] || '') }}
                  </q-avatar>
                  <div>
                    <div class="text-weight-medium">{{ u.nombre }} {{ u.apellido }}</div>
                    <div class="text-caption text-grey-7">{{ u.email }}</div>
                  </div>
                </div>
              </td>
              <td class="text-center">
                <q-badge :color="tipoColor(u.tipo)" :label="u.tipo" />
              </td>
              <td class="text-center">
                <q-badge :color="estadoColor(u.estado)" :label="u.estado" />
              </td>
              <td class="text-center text-caption">{{ formatearFecha(u.creado_en) }}</td>
              <td class="text-center">
                <q-toggle
                  :model-value="u.activo === 1 || u.activo === true"
                  color="positive"
                  @update:model-value="toggleActivo(u)"
                />
              </td>
              <td class="text-center">
                <q-btn flat round dense icon="edit" color="primary" size="sm" @click="cambiarTipo(u)">
                  <q-tooltip>Cambiar tipo</q-tooltip>
                </q-btn>
              </td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card>
    </template>

    <template v-else>
      <q-card v-if="!cargando && !pendientes.length" flat bordered>
        <q-card-section class="text-center text-grey-7 q-pa-xl">
          <q-icon name="check_circle" size="48px" color="positive" class="q-mb-sm" />
          <div>¡No hay cuentas pendientes de aprobación!</div>
        </q-card-section>
      </q-card>

      <div v-else class="row q-col-gutter-md">
        <div v-for="u in pendientes" :key="u.id" class="col-12 col-md-6">
          <q-card flat bordered>
            <q-card-section>
              <div class="row items-center q-gutter-md">
                <q-avatar color="primary" text-color="white" size="56px">
                  {{ (u.nombre?.[0] || '') + (u.apellido?.[0] || '') }}
                </q-avatar>
                <div class="col">
                  <div class="text-subtitle1 text-weight-medium">{{ u.nombre }} {{ u.apellido }}</div>
                  <div class="text-caption text-grey-7">{{ u.email }}</div>
                  <div class="q-mt-xs">
                    <q-badge :color="tipoColor(u.tipo)" :label="u.tipo" />
                    <span class="text-caption text-grey-6 q-ml-sm">
                      Registro: {{ formatearFecha(u.creado_en) }}
                    </span>
                  </div>
                </div>
              </div>
            </q-card-section>
            <q-separator />
            <q-card-actions>
              <q-btn
                unelevated no-caps color="positive" icon="check"
                label="Aprobar" class="col"
                @click="aprobar(u)"
              />
              <q-btn
                outline no-caps color="negative" icon="close"
                label="Rechazar" class="col"
                @click="rechazar(u)"
              />
            </q-card-actions>
          </q-card>
        </div>
      </div>
    </template>
  </q-page>
</template>
