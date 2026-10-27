<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import * as coordApi from '../../api/coordinador.api.js';

const $q = useQuasar();

const tab = ref('recibidos');
const cargando = ref(true);
const recibidos = ref([]);
const enviados = ref([]);
const carreras = ref([]);
const docentes = ref([]);
const alumnos = ref([]);
const coordinadores = ref([]);
const dialogoCrear = ref(false);
const filtroNivel = ref(null);
const guardando = ref(false);

const formulario = ref({
  titulo: '',
  contenido: '',
  nivelAlerta: 'info',
  enviarEmailTodos: false,
  roles: [],
  carreras: [],
  usuarios: [],
});

const niveles = [
  { value: 'critico', label: 'Crítico', color: 'negative' },
  { value: 'alto',    label: 'Alto',    color: 'orange' },
  { value: 'medio',   label: 'Medio',   color: 'warning' },
  { value: 'bajo',    label: 'Bajo',    color: 'info' },
  { value: 'info',    label: 'Info',    color: 'grey-6' },
];

const rolesDisponibles = [
  { value: 'alumno',      label: 'Alumnos',         icon: 'school' },
  { value: 'docente',     label: 'Docentes',        icon: 'groups' },
  { value: 'coordinador', label: 'Coordinadores',   icon: 'supervisor_account' },
  { value: 'admin',       label: 'Administradores', icon: 'admin_panel_settings' },
];

const nivelColor = (n) => niveles.find(x => x.value === n)?.color || 'grey';
const nivelLabel = (n) => niveles.find(x => x.value === n)?.label || n;

const lista = computed(() => {
  const base = tab.value === 'recibidos' ? recibidos.value : enviados.value;
  if (!filtroNivel.value) return base;
  return base.filter(x => x.nivel_alerta === filtroNivel.value);
});

const noLeidos = computed(() => recibidos.value.filter(r => !r.leido).length);

const totalSeleccionados = computed(() =>
  formulario.value.roles.length + formulario.value.carreras.length + formulario.value.usuarios.length
);

const opcionesUsuarios = computed(() => {
  const all = [...docentes.value, ...alumnos.value, ...coordinadores.value];
  return all.map(u => ({ label: `${u.nombre} ${u.apellido} (${u.tipo})`, value: u.id }));
});

function formatearFecha(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function abrirCrear() {
  formulario.value = {
    titulo: '', contenido: '', nivelAlerta: 'info',
    enviarEmailTodos: false, roles: [], carreras: [], usuarios: [],
  };
  dialogoCrear.value = true;
}

async function cargar() {
  cargando.value = true;
  try {
    const [r, e, c, d, a, co] = await Promise.all([
      coordApi.comunicadosRecibidos().catch(() => []),
      coordApi.comunicadosEnviados().catch(() => []),
      coordApi.listarCarreras().catch(() => []),
      coordApi.listarDocentes().catch(() => []),
      coordApi.listarAlumnos().catch(() => []),
      coordApi.listarCoordinadores().catch(() => []),
    ]);
    recibidos.value = r || [];
    enviados.value = e || [];
    carreras.value = c || [];
    docentes.value = d || [];
    alumnos.value = a || [];
    coordinadores.value = co || [];
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Error al cargar' });
  } finally {
    cargando.value = false;
  }
}

async function marcarLeido(c) {
  if (c.leido) return;
  try {
    await coordApi.marcarComunicadoLeido(c.id);
    c.leido = 1;
  } catch (e) {  }
}

async function crear() {
  if (!formulario.value.titulo || !formulario.value.contenido) {
    $q.notify({ type: 'warning', message: 'Completá título y contenido' });
    return;
  }
  if (totalSeleccionados.value === 0) {
    $q.notify({ type: 'warning', message: 'Seleccioná al menos un destinatario' });
    return;
  }

  const destinatarios = [];
  for (const rol of formulario.value.roles) destinatarios.push({ tipo: 'rol', rol });
  for (const carreraId of formulario.value.carreras) destinatarios.push({ tipo: 'carrera', carreraId });
  for (const usuarioId of formulario.value.usuarios) destinatarios.push({ tipo: 'usuario', usuarioId });

  guardando.value = true;
  try {
    const res = await coordApi.crearComunicado({
      titulo: formulario.value.titulo,
      contenido: formulario.value.contenido,
      nivelAlerta: formulario.value.nivelAlerta,
      enviarEmailTodos: formulario.value.enviarEmailTodos,
      destinatarios,
    });
    $q.notify({
      type: 'positive',
      message: `Enviado a ${res?.total_destinatarios || 0} destinatarios${res?.total_con_email ? ` (${res.total_con_email} por email)` : ''}`,
      timeout: 4000,
    });
    dialogoCrear.value = false;
    await cargar();
  } catch (e) {
    $q.notify({ type: 'negative', message: e.response?.data?.error || 'Error al enviar' });
  } finally {
    guardando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md coord-page">
    <div class="page-head q-mb-md">
      <div>
        <h1 class="page-title">Comunicados</h1>
        <p class="page-sub">{{ noLeidos }} sin leer · {{ recibidos.length + enviados.length }} total</p>
      </div>
      <q-btn unelevated color="primary" icon="add" label="Nuevo" no-caps @click="$router.push('/coordinador/comunicados/nuevo')" />
    </div>

    <q-card flat bordered class="toolbar-card q-mb-md">
      <q-card-section>
        <div class="row q-col-gutter-md items-center">
          <div class="col-12 col-md-5">
            <q-btn-toggle
              v-model="tab" spread no-caps unelevated
              :options="[
                { label: `Recibidos (${recibidos.length})`, value: 'recibidos' },
                { label: `Enviados (${enviados.length})`,  value: 'enviados' },
              ]"
              color="grey-3" text-color="grey-8"
              toggle-color="primary" toggle-text-color="white"
            />
          </div>
          <div class="col-12 col-md-4">
            <q-select
              v-model="filtroNivel" outlined dense clearable
              :options="niveles" option-value="value" option-label="label"
              emit-value map-options label="Nivel"
            />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !lista.length" flat bordered class="empty-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="forum" size="56px" color="grey-5" class="q-mb-sm" />
        <div class="text-h6">Sin comunicados</div>
        <div class="text-caption text-grey-7">Nada por acá</div>
      </q-card-section>
    </q-card>

    <div v-else class="column q-gutter-md">
      <q-card
        v-for="c in lista" :key="c.id"
        flat bordered class="comunicado-card"
        :class="{ 'no-leido': tab === 'recibidos' && !c.leido }"
        @click="tab === 'recibidos' && marcarLeido(c)"
      >
        <q-card-section>
          <div class="row items-center q-mb-sm">
            <q-badge :color="nivelColor(c.nivel_alerta)" :label="nivelLabel(c.nivel_alerta)" class="q-mr-sm" />
            <span v-if="c.total_destinatarios !== undefined" class="text-caption text-grey-7">
              <q-icon name="people" size="13px" /> {{ c.total_destinatarios }}
            </span>
            <q-space />
            <span class="text-caption text-grey-7">{{ formatearFecha(c.creado_en) }}</span>
          </div>
          <div class="comunicado-titulo">{{ c.titulo }}</div>
          <div class="comunicado-contenido">{{ c.contenido }}</div>
          <div v-if="tab === 'enviados' && c.resumen_destinatarios" class="comunicado-dest">
            <q-icon name="send" size="13px" />
            <span>{{ c.resumen_destinatarios }}</span>
          </div>
          <div v-if="tab === 'recibidos'" class="comunicado-emisor">
            <q-icon name="person" size="14px" />
            {{ c.emisor_nombre }} {{ c.emisor_apellido }}
            <span class="text-grey-7">· {{ c.emisor_tipo }}</span>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<style scoped>
.coord-page { max-width: 1000px; margin: 0 auto; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.page-title { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--text); }
.page-sub { margin: 4px 0 0 0; color: var(--text-muted); font-size: 13px; }
.toolbar-card { border-radius: 14px; }
.empty-card { border-radius: 14px; }
.comunicado-card { border-radius: 14px; cursor: pointer; transition: all 0.2s; }
.comunicado-card:hover { border-color: var(--primary); }
.comunicado-card.no-leido { border-left: 4px solid var(--primary); background: var(--primary-soft); }
.comunicado-titulo { font-size: 15px; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.01em; }
.comunicado-contenido { color: var(--text-secondary); font-size: 13px; line-height: 1.55; white-space: pre-wrap; }
.comunicado-dest { display: flex; align-items: center; gap: 6px; margin-top: 10px; padding: 6px 10px; background: var(--bg-hover); border-radius: 8px; font-size: 12px; color: var(--text-secondary); }
.comunicado-emisor { display: flex; align-items: center; gap: 4px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-subtle); font-size: 12px; color: var(--text-muted); }
</style>
