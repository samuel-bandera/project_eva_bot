<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify } from 'quasar';
import * as adminApi from '../../api/admin.api.js';

const cargando = ref(true);
const tabActual = ref('auditoria');
const auditoria = ref([]);
const eventos = ref([]);
const filtroGravedad = ref('todas');

const gravedades = [
  { value: 'todas', label: 'Todas' },
  { value: 'alta', label: 'Alta' },
  { value: 'media', label: 'Media' },
  { value: 'baja', label: 'Baja' },
  { value: 'info', label: 'Info' },
];

const eventosFiltrados = computed(() => {
  if (filtroGravedad.value === 'todas') return eventos.value;
  return eventos.value.filter(e => e.gravedad === filtroGravedad.value);
});

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function gravedadColor(g) {
  return { alta: 'negative', media: 'warning', baja: 'info', info: 'grey-6' }[g] || 'grey-5';
}

function gravedadIcon(g) {
  return {
    alta: 'warning', media: 'error_outline',
    baja: 'info', info: 'notifications',
  }[g] || 'info';
}

async function cargar() {
  cargando.value = true;
  try {
    const [aud, ev] = await Promise.all([
      adminApi.listarAuditoria({ limit: 100 }).catch(() => []),
      adminApi.listarEventos({ limit: 100 }).catch(() => []),
    ]);
    auditoria.value = aud || [];
    eventos.value = ev || [];
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

async function resolverEvento(ev) {
  try {
    await adminApi.resolverEvento(ev.id);
    Notify.create({ type: 'positive', message: 'Evento resuelto', position: 'top' });
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
        <div class="text-h5">Auditoría</div>
        <div class="text-caption text-grey-7">Historial de acciones y eventos de seguridad</div>
      </div>
    </div>

    <div class="row q-gutter-sm q-mb-md">
      <q-btn
        label="Acciones (auditoría)"
        icon="history"
        no-caps
        :unelevated="tabActual === 'auditoria'"
        :flat="tabActual !== 'auditoria'"
        :color="tabActual === 'auditoria' ? 'primary' : 'grey-7'"
        @click="tabActual = 'auditoria'"
      >
        <q-badge v-if="auditoria.length" :color="tabActual === 'auditoria' ? 'white' : 'grey-5'"
          :text-color="tabActual === 'auditoria' ? 'primary' : 'white'" class="q-ml-sm">
          {{ auditoria.length }}
        </q-badge>
      </q-btn>
      <q-btn
        label="Eventos de seguridad"
        icon="security"
        no-caps
        :unelevated="tabActual === 'eventos'"
        :flat="tabActual !== 'eventos'"
        :color="tabActual === 'eventos' ? 'primary' : 'grey-7'"
        @click="tabActual = 'eventos'"
      >
        <q-badge v-if="eventos.length" :color="tabActual === 'eventos' ? 'white' : 'grey-5'"
          :text-color="tabActual === 'eventos' ? 'primary' : 'white'" class="q-ml-sm">
          {{ eventos.length }}
        </q-badge>
      </q-btn>
    </div>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <template v-if="tabActual === 'auditoria'">
      <q-card v-if="!cargando && !auditoria.length" flat bordered>
        <q-card-section class="text-center text-grey-7 q-pa-xl">
          <q-icon name="history" size="48px" class="q-mb-sm" />
          <div>Sin acciones registradas</div>
        </q-card-section>
      </q-card>

      <q-card v-else flat bordered>
        <q-markup-table flat separator="horizontal">
          <thead>
            <tr>
              <th class="text-left">Acción</th>
              <th class="text-left">Usuario</th>
              <th class="text-left">Entidad</th>
              <th class="text-center">Fecha</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in auditoria" :key="a.id">
              <td>
                <div class="text-weight-medium">{{ a.accion }}</div>
                <div v-if="a.detalle" class="text-caption text-grey-7">{{ a.detalle }}</div>
              </td>
              <td class="text-caption">{{ a.usuario_nombre || 'Sistema' }}</td>
              <td class="text-caption">
                <span v-if="a.entidad">{{ a.entidad }}</span>
                <span v-if="a.entidad_id" class="text-grey-6"> #{{ a.entidad_id }}</span>
                <span v-if="!a.entidad" class="text-grey-6">—</span>
              </td>
              <td class="text-center text-caption">{{ formatearFecha(a.creado_en) }}</td>
            </tr>
          </tbody>
        </q-markup-table>
      </q-card>
    </template>

    <template v-else>
      <q-select
        v-model="filtroGravedad"
        :options="gravedades"
        option-value="value"
        option-label="label"
        emit-value
        map-options
        outlined dense
        label="Filtrar por gravedad"
        class="q-mb-md"
        style="max-width: 250px"
      />

      <q-card v-if="!cargando && !eventosFiltrados.length" flat bordered>
        <q-card-section class="text-center text-grey-7 q-pa-xl">
          <q-icon name="verified_user" size="48px" color="positive" class="q-mb-sm" />
          <div>Sin eventos de seguridad</div>
        </q-card-section>
      </q-card>

      <div v-else class="column q-gutter-y-sm">
        <q-card v-for="e in eventosFiltrados" :key="e.id" flat bordered>
          <q-card-section>
            <div class="row items-center q-gutter-md">
              <q-icon :name="gravedadIcon(e.gravedad)" :color="gravedadColor(e.gravedad)" size="28px" />
              <div class="col">
                <div class="row items-center q-gutter-sm">
                  <div class="text-weight-medium">{{ e.tipo }}</div>
                  <q-badge :color="gravedadColor(e.gravedad)" :label="e.gravedad" />
                  <q-badge v-if="e.resuelto" color="positive" label="resuelto" />
                </div>
                <div v-if="e.detalle" class="text-caption text-grey-8 q-mt-xs">{{ e.detalle }}</div>
                <div class="text-caption text-grey-6 q-mt-xs">
                  {{ formatearFecha(e.creado_en) }}
                  <span v-if="e.ip"> · IP: {{ e.ip }}</span>
                </div>
              </div>
              <div class="col-auto">
                <q-btn
                  v-if="!e.resuelto"
                  flat dense no-caps color="positive"
                  icon="check" label="Resolver"
                  @click="resolverEvento(e)"
                />
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </template>
  </q-page>
</template>
