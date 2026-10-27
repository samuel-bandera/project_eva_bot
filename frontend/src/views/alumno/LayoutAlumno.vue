<script setup>
import NokyWidget from '../../components/NokyWidget.vue';
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.js';
import { useNotificaciones } from '../../composables/useNotificaciones.js';
import { useTheme } from '../../composables/useTheme.js';
import { usePreferences } from '../../composables/usePreferences.js';
import { useWebSocket } from '../../composables/useWebSocket.js';
import { useNokyStore } from '../../stores/noky.store.js';

const rutaActual = useRoute();
const router = useRouter();
const auth = useAuthStore();

const modoExamen = computed(() => rutaActual?.matched?.some(m => m.meta?.examMode) === true)
const menuAbierto = ref(false);
const panelNotificaciones = ref(false);
const campanaSonando = ref(false);
let temporizadorCampana = null;

const {
  notificaciones,
  cantidadNoLeidas,
  cargarNotificaciones,
  marcarComoLeida,
  marcarTodasComoLeidas,
  recibirNotificacionEnVivo,
} = useNotificaciones();

const { conectar, escuchar, conectado } = useWebSocket();
const { tema, ciclar: ciclarTema } = useTheme();
const asistente = useNokyStore();

watch(cantidadNoLeidas, (nuevo, viejo) => {
  if (nuevo > viejo) {
    campanaSonando.value = true;
    if (temporizadorCampana) clearTimeout(temporizadorCampana);
    temporizadorCampana = setTimeout(() => { campanaSonando.value = false; }, 800);
  }
});

watch(() => asistente.lastNotifAt, (newAt, oldAt) => {
  if (!newAt || newAt === oldAt) return;
  const n = asistente.lastNotifData;
  if (!n) return;
  const exists = notificaciones.value.some(x =>
    (n.id && x.id === n.id) ||
    (n._at && x._at === n._at)
  );
  if (!exists) {
    notificaciones.value.unshift({
      id: n.id || n._at || Date.now(),
      titulo: n.titulo,
      mensaje: n.mensaje,
      leida: false,
      fecha: new Date().toISOString(),
      esMensaje: n.esMensaje || false,
      _at: n._at,
    });
    cantidadNoLeidas.value += 1;
  }
});

const secciones = [
  { titulo: 'Inicio',        icono: 'dashboard',       ruta: '/alumno' },
  { tipo: 'sep' },
  { titulo: 'Tareas',        icono: 'assignment',      ruta: '/alumno/tareas' },
  { titulo: 'Evaluaciones',  icono: 'quiz',            ruta: '/alumno/evaluaciones' },
  { titulo: 'Mi Rendimiento', icono: 'insights',        ruta: '/alumno/rendimiento' },
  { tipo: 'sep' },
  { titulo: 'Materias',      icono: 'menu_book',       ruta: '/alumno/materias' },

  { titulo: 'Calendario',    icono: 'calendar_month',  ruta: '/alumno/calendario' },
  { tipo: 'sep' },
  { titulo: 'Comunicados',   icono: 'campaign',        ruta: '/alumno/comunicados' },
  { titulo: 'Cartelera',     icono: 'announcement',    ruta: '/alumno/cartelera' },
  { titulo: 'Foros',         icono: 'forum',           ruta: '/alumno/foros' },
  { titulo: 'Tickets',       icono: 'support_agent',   ruta: '/alumno/tickets' },
];

const navegacionMovil = computed(() => {
  const sinInicio = secciones.filter(s => s.titulo !== 'Inicio');
  const inicio = secciones.find(s => s.titulo === 'Inicio');
  if (!inicio) return secciones.slice(0, 5);
  const otros = sinInicio.slice(0, 4);
  return [...otros.slice(0, 2), inicio, ...otros.slice(2, 4)];
});
const nombreCompleto = computed(() => auth.nombreCompleto || 'Estudiante');
const inicialesUsuario = computed(() => auth.iniciales || 'E');
const urlFoto = computed(() => auth.user?.avatar || null);

const iconoTema = computed(() => ({
  auto: 'brightness_auto',
  light: 'light_mode',
  dark: 'dark_mode',
}[tema.value] || 'brightness_auto'));

const tooltipTema = computed(() => ({
  auto: 'Automático (sigue al sistema)',
  light: 'Modo claro',
  dark: 'Modo oscuro',
}[tema.value] || 'Tema'));

function estaActiva(rutaSeccion) {
  const pathActual = rutaActual.path;
  if (rutaSeccion === '/alumno') return pathActual === rutaSeccion;
  return pathActual === rutaSeccion || pathActual.startsWith(`${rutaSeccion}/`);
}

function navegar(rutaDestino) {
  if (rutaActual.path !== rutaDestino) router.push(rutaDestino);
}

function abrirAsistente() {
  if (!asistente.isOpen) asistente.toggle();
}

function cerrarSesion() {
  auth.logout();
  router.push('/login');
}

function irANotificaciones() {
  panelNotificaciones.value = true;
  cargarNotificaciones();
}

function formatearFecha(fecha) {
  if (!fecha) return '';
  const ahora = new Date();
  const creada = new Date(fecha);
  const diferencia = Math.floor((ahora - creada) / 1000);

  if (diferencia < 60) return 'Hace un momento';
  if (diferencia < 3600) return `Hace ${Math.floor(diferencia / 60)} min`;
  if (diferencia < 86400) return `Hace ${Math.floor(diferencia / 3600)} h`;
  if (diferencia < 604800) return `Hace ${Math.floor(diferencia / 86400)} d`;
  return creada.toLocaleDateString('es-UY');
}

const { cargarDelBackend: cargarPrefs } = usePreferences();

onMounted(() => {
  cargarPrefs();
  conectar();
  escuchar('notificacion', (datos) => {
    if (import.meta.env.DEV) console.log('🔔 Notificación en vivo recibida:', datos);
    recibirNotificacionEnVivo(datos);
    asistente.notify(datos);
  });
  escuchar('evento-examen', (datos) => {
    asistente.notify({
      titulo: 'Examen próximo',
      mensaje: datos?.mensaje || datos?.titulo || 'Revisá tus evaluaciones',
    });
  });
});
</script>

<template>
  <q-layout view="hHh Lpr lFf" class="eval-layout" :class="{ 'exam-mode-layout': modoExamen }">
    <q-header v-if="!modoExamen" class="topbar" bordered>
      <q-toolbar class="toolbar">
        <q-btn flat round dense icon="menu" aria-label="Abrir o cerrar menú" class="boton-menu" @click="menuAbierto = !menuAbierto" />

        <div class="marca">
          <div class="marca-icono"><q-icon name="school" size="22px" /></div>
          <div class="marca-texto">
            <div class="marca-nombre">EvalBot</div>
            <div class="marca-subtitulo">Panel alumno</div>
          </div>
        </div>

        <q-space />

        <q-btn flat round dense @click="ciclarTema">
          <q-icon :name="iconoTema" size="20px" />
          <q-tooltip>{{ tooltipTema }}</q-tooltip>
        </q-btn>

        <q-icon :name="conectado ? 'cloud_done' : 'cloud_off'" :color="conectado ? 'positive' : 'grey'" size="18px" class="indicador-conexion">
          <q-tooltip>{{ conectado ? 'Conectado en tiempo real' : 'Sin conexión' }}</q-tooltip>
        </q-icon>

        <q-btn flat round icon="notifications_none" aria-label="Notificaciones" :class="{ 'bell-ring': campanaSonando }" @click="irANotificaciones">
          <q-badge v-if="cantidadNoLeidas > 0" color="negative" floating rounded class="badge-notif" :class="{ 'badge-pop': campanaSonando }">
            {{ cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas }}
          </q-badge>
        </q-btn>

        <q-btn flat round aria-label="Menú de usuario" class="boton-usuario">
          <q-avatar size="36px" class="avatar-usuario">
            <img v-if="urlFoto" :src="urlFoto" :alt="nombreCompleto" />
            <span v-else>{{ inicialesUsuario }}</span>
          </q-avatar>

          <q-menu anchor="bottom right" self="top right" :offset="[0, 8]" transition-show="jump-down" transition-hide="jump-up" class="menu-usuario">
            <div class="menu-encabezado">
              <q-avatar size="48px" class="avatar-menu">
                <img v-if="urlFoto" :src="urlFoto" :alt="nombreCompleto" />
                <span v-else>{{ inicialesUsuario }}</span>
              </q-avatar>
              <div class="menu-info">
                <div class="menu-nombre">{{ nombreCompleto }}</div>
                <div class="menu-rol">Estudiante</div>
              </div>
            </div>
            <q-separator />
            <q-list class="menu-lista">
              <q-item clickable v-close-popup @click="navegar('/alumno/perfil')">
                <q-item-section avatar><q-icon name="person_outline" size="20px" /></q-item-section>
                <q-item-section>Mi perfil</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="irANotificaciones">
                <q-item-section avatar><q-icon name="notifications_none" size="20px" /></q-item-section>
                <q-item-section>Notificaciones</q-item-section>
                <q-item-section side v-if="cantidadNoLeidas > 0"><q-badge color="negative" rounded>{{ cantidadNoLeidas }}</q-badge></q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="navegar('/alumno/ajustes')">
                <q-item-section avatar><q-icon name="settings" size="20px" /></q-item-section>
                <q-item-section>Ajustes</q-item-section>
              </q-item></q-list>
            <q-separator />
            <q-list class="menu-lista">
              <q-item clickable v-close-popup @click="cerrarSesion" class="item-cerrar">
                <q-item-section avatar><q-icon name="logout" size="20px" /></q-item-section>
                <q-item-section>Cerrar sesión</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-dialog v-model="panelNotificaciones" position="right" full-height>
      <q-card class="panel-notificaciones">
        <q-card-section class="panel-encabezado">
          <div class="panel-titulo">Notificaciones</div>
          <q-btn flat round dense icon="close" @click="panelNotificaciones = false" />
        </q-card-section>
        <q-card-section v-if="cantidadNoLeidas > 0" class="panel-acciones">
          <q-btn flat dense no-caps color="primary" label="Marcar todas como leídas" icon="done_all" @click="marcarTodasComoLeidas" />
        </q-card-section>
        <q-separator />
        <q-card-section class="panel-lista">
          <div v-if="notificaciones.length === 0" class="panel-vacio">
            <q-icon name="notifications_off" size="48px" />
            <p>Sin notificaciones por ahora</p>
          </div>
          <q-list v-else separator>
            <q-item v-for="notificacion in notificaciones" :key="notificacion.id" clickable :class="{ 'no-leida': !notificacion.leida }" @click="marcarComoLeida(notificacion.id)">
              <q-item-section avatar>
                <q-icon :name="notificacion.icono || 'notifications'" :color="notificacion.leida ? 'grey' : 'primary'" size="22px" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="noti-titulo">{{ notificacion.titulo || 'Notificación' }}</q-item-label>
                <q-item-label caption lines="2">{{ notificacion.mensaje || notificacion.descripcion || '' }}</q-item-label>
                <q-item-label caption class="noti-fecha">{{ formatearFecha(notificacion.fecha || notificacion.creado) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-drawer v-if="!modoExamen" v-model="menuAbierto" bordered :width="260" class="sidebar" behavior="desktop">
      <div class="sidebar-inner">
        <div class="nav-heading">MENÚ PRINCIPAL</div>
        <q-list class="nav-list">
          <template v-for="(item, i) in secciones" :key="i">
            <q-separator v-if="item.tipo === 'sep'" spaced class="menu-sep" />
            <q-item v-else clickable :active="estaActiva(item.ruta)" active-class="nav-active" class="nav-item" @click="navegar(item.ruta)">
              <q-item-section avatar><q-icon :name="item.icono" size="21px" /></q-item-section>
              <q-item-section>{{ item.titulo }}</q-item-section>
              <q-item-section side v-if="estaActiva(item.ruta)"><span class="active-dot" /></q-item-section>
            </q-item>
          </template>
        </q-list>
        <q-space />
        <div class="sidebar-bottom">
          <div class="institution">Polo Educativo Tecnológico</div>
          <div class="institution-subtitle">Sistema de gestión académica</div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer v-if="!modoExamen" class="mobile-nav">
      <div class="mobile-nav-inner">
        <button v-for="item in navegacionMovil" :key="item.ruta" class="mobile-item" :class="{ 'mobile-active': estaActiva(item.ruta), 'es-inicio': item.titulo === 'Inicio' }" :aria-label="item.titulo" @click="navegar(item.ruta)">
          <q-icon :name="item.icono" size="24px" />
        </button>
      </div>
    </q-footer>

    <NokyWidget v-if="!modoExamen" />

  </q-layout>
</template>

<style>
:root {
  --eb-red: var(--primary);
  --eb-red-hover: var(--primary-hover);
  --eb-beige: var(--bg);
  --eb-white: var(--bg-elevated);
  --eb-black: var(--text);
  --eb-gray: var(--text-muted);
  --eb-border: var(--border);
}

html, body, #app { min-height: 100%; margin: 0; }
body { font-family: Inter, "Segoe UI", system-ui, sans-serif; color: var(--text); background: var(--bg); }
.eval-layout { background: var(--bg); }
.topbar { background: var(--bg-elevated); color: var(--text); border-bottom: 1px solid var(--border); }
.toolbar { min-height: 56px; padding: 0 22px; gap: 8px; }
.boton-menu { color: var(--text); }

.marca { display: flex; align-items: center; gap: 10px; margin-left: 4px; }
.marca-icono { display: grid; place-items: center; width: 38px; height: 38px; color: white; background: var(--eb-red); border-radius: 10px; }
.marca-nombre { font-size: 17px; font-weight: 700; letter-spacing: -0.3px; }
.marca-subtitulo { margin-top: 1px; color: var(--text-muted); font-size: 11px; }
.indicador-conexion { margin-right: 4px; opacity: 0.7; }

.badge-notif { font-size: 10px; min-width: 18px; height: 18px; padding: 0 5px; /* pulso removido: badge estático */ }


.boton-usuario { padding: 2px; }
.avatar-usuario { color: white; background: var(--eb-red); font-weight: 700; font-size: 13px; border: 2px solid transparent; transition: border-color 0.2s; }
.boton-usuario:hover .avatar-usuario { border-color: var(--border); }
.avatar-usuario img { object-fit: cover; width: 100%; height: 100%; }

.menu-usuario { border-radius: 16px !important; box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08) !important; overflow: hidden !important; min-width: 280px !important; border: 1px solid var(--border); }
.menu-encabezado { display: flex !important; align-items: center !important; gap: 14px !important; padding: 20px !important; background: var(--bg-hover) !important; border-bottom: 1px solid var(--border-subtle); }
.avatar-menu { color: white !important; background: var(--primary) !important; font-weight: 700 !important; font-size: 16px !important; flex-shrink: 0 !important; box-shadow: 0 4px 12px -4px color-mix(in srgb, var(--primary) 40%, transparent); border: 2px solid color-mix(in srgb, var(--primary) 20%, transparent); }
.menu-info { min-width: 0 !important; flex: 1 !important; }
.menu-nombre { font-size: 14px !important; font-weight: 700 !important; color: var(--text) !important; white-space: nowrap !important; overflow: hidden !important; text-overflow: ellipsis !important; letter-spacing: -0.01em; }
.menu-rol { margin-top: 3px !important; font-size: 11px !important; color: var(--text-muted) !important; font-weight: 600 !important; text-transform: uppercase; letter-spacing: 0.05em; }

.menu-lista .q-item { min-height: 46px !important; padding: 10px 16px !important; color: var(--text-secondary) !important; font-size: 13px !important; font-weight: 500 !important; border-radius: 10px !important; margin: 2px 6px !important; transition: all 0.15s ease !important; }
.menu-lista .q-item:hover { background: var(--bg-hover) !important; color: var(--primary) !important; transform: translateX(2px); }
.menu-lista .q-item:hover .q-icon { color: var(--primary) !important; }
.menu-lista .q-item .q-icon { color: var(--text-muted) !important; transition: color 0.15s ease; }
.item-cerrar { color: var(--error) !important; }
.item-cerrar:hover { background: var(--error-bg) !important; color: var(--error) !important; }
.item-cerrar .q-icon, .item-cerrar:hover .q-icon { color: var(--error) !important; }
.menu-usuario .q-separator { background: var(--border-subtle) !important; margin: 4px 12px !important; }
.menu-usuario .q-badge { font-size: 10px; font-weight: 700; min-width: 18px; height: 18px; padding: 0 5px; }

[data-theme="dark"] .menu-usuario { box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.7), 0 4px 12px rgba(0, 0, 0, 0.4) !important; }
[data-theme="dark"] .menu-encabezado { background: var(--bg-hover) !important; }

.panel-notificaciones { width: 400px; max-width: 100vw; border-radius: 0; height: 100%; display: flex; flex-direction: column; }
.panel-encabezado { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--border); }
.panel-titulo { font-size: 16px; font-weight: 700; color: var(--text); }
.panel-acciones { padding: 8px 12px; background: var(--bg-hover); }
.panel-lista { flex: 1; overflow-y: auto; padding: 0; }
.panel-vacio { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-muted); text-align: center; }
.panel-vacio .q-icon { color: var(--text-disabled); margin-bottom: 12px; }
.panel-vacio p { margin: 0; font-size: 13px; }
.noti-titulo { font-size: 13px; font-weight: 600; color: var(--text); }
.noti-fecha { margin-top: 3px; color: var(--text-disabled); font-size: 11px; }
.no-leida { background: var(--error-bg); }
.no-leida:hover { background: var(--primary-soft); }

.sidebar { background: var(--bg-elevated) !important; color: var(--text); border-right: 1px solid var(--border) !important; }
.sidebar-inner { display: flex; flex-direction: column; min-height: 100%; padding: 25px 14px 16px; box-sizing: border-box; }
.nav-heading { padding: 0 12px; margin-bottom: 13px; color: var(--text-muted); font-size: 10px; font-weight: 700; letter-spacing: 1.3px; }
.nav-list { display: flex; flex-direction: column; gap: 5px; }
.nav-item { border-radius: 10px !important; margin: 2px 8px !important; transition: all 0.2s ease !important; }
.nav-item .q-item__section--avatar { min-width: 36px; }
.nav-active { color: var(--primary) !important; background: var(--primary-soft) !important; font-weight: 650; }
.active-dot { width: 6px; height: 6px; background: var(--eb-red); border-radius: 50%; }
.sidebar-bottom { padding: 16px 10px 4px; border-top: 1px solid var(--border); }
.institution { font-size: 11px; font-weight: 650; }
.institution-subtitle { margin-top: 5px; color: var(--text-muted); font-size: 10px; line-height: 1.5; }

.mobile-nav { display: none; position: fixed; bottom: calc(12px + env(safe-area-inset-bottom, 0px)); left: 12px; right: 12px; z-index: 1000; pointer-events: none; background: transparent !important; box-shadow: none !important; border: none !important; }
.mobile-nav-inner { pointer-events: auto; display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; padding: 8px; background: rgba(114, 47, 55, 0.72); background: color-mix(in srgb, var(--primary) 72%, transparent); -webkit-backdrop-filter: blur(20px) saturate(180%); backdrop-filter: blur(20px) saturate(180%); border: 1px solid rgba(114, 47, 55, 0.4); border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent); border-radius: 24px; box-shadow: 0 8px 32px rgba(114, 47, 55, 0.35); box-shadow: 0 8px 32px color-mix(in srgb, var(--primary) 35%, transparent); }
.mobile-item { display: flex; align-items: center; justify-content: center; padding: 10px 4px; min-height: 44px; color: rgba(255, 255, 255, 0.62); background: transparent; border: none; cursor: pointer; font: inherit; border-radius: 16px; transition: all 0.2s ease; -webkit-tap-highlight-color: transparent; }
.mobile-item:active { transform: scale(0.94); }
.mobile-item.mobile-active { color: #ffffff; background: rgba(255, 255, 255, 0.22); }
.mobile-item.es-inicio .q-icon { font-size: 26px; }
.mobile-item.mobile-active .q-icon { transform: scale(1.08); }

@media (max-width: 700px) {
  .mobile-nav { display: block; }
  .toolbar { min-height: 58px; padding: 0 10px; gap: 4px; }
  .marca-icono { width: 34px; height: 34px; }
  .marca-nombre { font-size: 16px; }
  .marca-subtitulo { font-size: 10px; }
  .sidebar-bottom { display: none; }
  .q-page-container { padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px)); }
  .panel-notificaciones { width: 100vw; }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

.exam-mode-layout .q-header,
.exam-mode-layout .q-drawer,
.exam-mode-layout .q-footer,
.exam-mode-layout .mobile-nav,
.exam-mode-layout .topbar,
.exam-mode-layout .toolbar { display: none !important; }
.exam-mode-layout .q-page-container { padding: 0 !important; height: 100vh; }
.exam-mode-layout .q-page-container .q-page { padding: 0 !important; }

@keyframes bellShake {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-15deg); }
  40% { transform: rotate(15deg); }
  60% { transform: rotate(-15deg); }
  80% { transform: rotate(10deg); }
}
.topbar .bell-ring { animation: bellShake 0.8s ease-in-out; }
@keyframes badgePop {
  0% { transform: scale(1); }
  40% { transform: scale(1.4); }
  100% { transform: scale(1); }
}
.topbar .badge-pop { animation: badgePop 0.6s ease-out; }

.menu-sep { margin: 6px 12px !important; opacity: 0.5; }

.body--light .nav-item:hover {
  background: rgba(74, 7, 18, 0.05) !important;
  color: var(--primary) !important;
}
.body--dark .nav-item:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  color: #fff !important;
}


</style>
