<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.js';
import { useNotificaciones } from '../../composables/useNotificaciones.js';
import { useWebSocket } from '../../composables/useWebSocket.js';
import { useTheme } from '../../composables/useTheme.js';
import { usePreferences } from '../../composables/usePreferences.js';

const rutaActual = useRoute();
const router = useRouter();
const auth = useAuthStore();

const menuAbierto = ref(false);
const panelNotificaciones = ref(false);

const {
  notificaciones, cantidadNoLeidas, cargarNotificaciones,
  marcarComoLeida, marcarTodasComoLeidas, recibirNotificacionEnVivo,
} = useNotificaciones();

const { conectar, escuchar, conectado } = useWebSocket();
const { tema, ciclar: ciclarTema } = useTheme();

const secciones = [
  { titulo: 'Inicio',       icono: 'dashboard',     ruta: '/admin' },
  { titulo: 'Usuarios',     icono: 'people',        ruta: '/admin/usuarios' },
  { titulo: 'Matrículas',   icono: 'assignment_ind',ruta: '/admin/matriculas' },
  { titulo: 'Solicitudes',  icono: 'move_up',      ruta: '/admin/solicitudes' },
  { titulo: 'Horarios',     icono: 'calendar_month',ruta: '/admin/horarios' },
  { titulo: 'Ciclos',       icono: 'calendar_month',ruta: '/admin/ciclos' },
  { titulo: 'Auditoría',    icono: 'security',      ruta: '/admin/auditoria' },
  { titulo: 'Invitaciones', icono: 'vpn_key',       ruta: '/admin/invitaciones' },
  { titulo: 'Tickets',      icono: 'support_agent', ruta: '/admin/tickets' },
];

const navegacionMovil = computed(() => {
  const sinInicio = secciones.filter(s => s.titulo !== 'Inicio');
  const inicio = secciones.find(s => s.titulo === 'Inicio');
  if (!inicio) return secciones.slice(0, 5);
  const otros = sinInicio.slice(0, 4);
  return [...otros.slice(0, 2), inicio, ...otros.slice(2, 4)];
});
const nombreCompleto = computed(() => auth.nombreCompleto || 'Admin');
const inicialesUsuario = computed(() => auth.iniciales || 'A');
const urlFoto = computed(() => auth.user?.avatar || null);
const rolLabel = computed(() =>
  auth.user?.tipo === 'admin' ? 'Administrador' : 'Coordinador'
);

const iconoTema = computed(() => ({
  auto: 'brightness_auto', light: 'light_mode', dark: 'dark_mode',
}[tema.value] || 'brightness_auto'));

const tooltipTema = computed(() => ({
  auto: 'Automático', light: 'Modo claro', dark: 'Modo oscuro',
}[tema.value] || 'Tema'));

function estaActiva(rutaSeccion) {
  const pathActual = rutaActual.path;
  if (rutaSeccion === '/admin') return pathActual === rutaSeccion;
  return pathActual === rutaSeccion || pathActual.startsWith(`${rutaSeccion}/`);
}

function navegar(rutaDestino) {
  if (rutaActual.path !== rutaDestino) router.push(rutaDestino);
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
  const dif = Math.floor((ahora - creada) / 1000);
  if (dif < 60) return 'Hace un momento';
  if (dif < 3600) return `Hace ${Math.floor(dif / 60)} min`;
  if (dif < 86400) return `Hace ${Math.floor(dif / 3600)} h`;
  if (dif < 604800) return `Hace ${Math.floor(dif / 86400)} d`;
  return creada.toLocaleDateString('es-UY');
}

const { cargarDelBackend: cargarPrefs } = usePreferences();

onMounted(() => {
  cargarPrefs();
  conectar();
  escuchar('notificacion', (datos) => {
    recibirNotificacionEnVivo(datos);
  });
});
</script>

<template>
  <q-layout view="hHh Lpr lFf">
    <q-header bordered style="background: var(--bg-elevated); color: var(--text); border-bottom: 1px solid var(--border)">
      <q-toolbar style="min-height: 68px; padding: 0 22px; gap: 8px;">
        <q-btn flat round dense icon="menu" @click="menuAbierto = !menuAbierto" />

        <div class="row items-center q-gutter-sm q-ml-sm">
          <q-avatar color="primary" text-color="white" size="38px" icon="admin_panel_settings" />
          <div>
            <div class="text-weight-bold" style="font-size: 18px; letter-spacing: -0.5px;">EvalBot</div>
            <div class="text-caption text-grey-7" style="font-size: 11px;">Panel de administración</div>
          </div>
        </div>

        <q-space />

        <q-btn flat round dense @click="ciclarTema">
          <q-icon :name="iconoTema" size="20px" />
          <q-tooltip>{{ tooltipTema }}</q-tooltip>
        </q-btn>

        <q-icon
          :name="conectado ? 'cloud_done' : 'cloud_off'"
          :color="conectado ? 'positive' : 'grey'"
          size="18px"
        >
          <q-tooltip>{{ conectado ? 'Conectado' : 'Sin conexión' }}</q-tooltip>
        </q-icon>

        <q-btn flat round icon="notifications_none" @click="irANotificaciones">
          <q-badge
            v-if="cantidadNoLeidas > 0"
            color="negative" floating rounded
          >
            {{ cantidadNoLeidas > 99 ? '99+' : cantidadNoLeidas }}
          </q-badge>
        </q-btn>

        <q-btn flat round>
          <q-avatar size="36px" color="primary" text-color="white">
            <img v-if="urlFoto" :src="urlFoto" :alt="nombreCompleto" />
            <span v-else class="text-weight-bold">{{ inicialesUsuario }}</span>
          </q-avatar>

          <q-menu anchor="bottom right" self="top right" :offset="[0, 8]" style="min-width: 260px;">
            <div class="q-pa-md" style="background: linear-gradient(135deg, #faf6f0 0%, #f4f0e9 100%)">
              <div class="row items-center q-gutter-sm">
                <q-avatar size="48px" color="primary" text-color="white">
                  <img v-if="urlFoto" :src="urlFoto" :alt="nombreCompleto" />
                  <span v-else class="text-weight-bold">{{ inicialesUsuario }}</span>
                </q-avatar>
                <div>
                  <div class="text-weight-bold">{{ nombreCompleto }}</div>
                  <div class="text-caption text-grey-7">{{ rolLabel }}</div>
                </div>
              </div>
            </div>

            <q-separator />

            <q-list class="menu-lista">
              <q-item clickable v-close-popup @click="navegar('/admin/perfil')">
                <q-item-section avatar><q-icon name="person_outline" size="20px" /></q-item-section>
                <q-item-section>Mi perfil</q-item-section>
              </q-item>
              <q-item clickable v-close-popup @click="navegar('/admin/ajustes')">
                <q-item-section avatar><q-icon name="settings" size="20px" /></q-item-section>
                <q-item-section>Ajustes</q-item-section>
              </q-item>
            </q-list>

            <q-separator />

            <q-list>
              <q-item clickable v-close-popup @click="cerrarSesion">
                <q-item-section avatar><q-icon name="logout" size="20px" /></q-item-section>
                <q-item-section>Cerrar sesión</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-btn>
      </q-toolbar>
    </q-header>

    <q-dialog v-model="panelNotificaciones" position="right" full-height>
      <q-card style="width: 400px; max-width: 100vw; height: 100%">
        <q-card-section class="row items-center justify-between">
          <div class="text-h6">Notificaciones</div>
          <q-btn flat round dense icon="close" @click="panelNotificaciones = false" />
        </q-card-section>
        <q-separator />
        <q-card-section v-if="cantidadNoLeidas > 0">
          <q-btn flat dense no-caps color="primary" label="Marcar todas como leídas"
            icon="done_all" @click="marcarTodasComoLeidas" />
        </q-card-section>
        <q-separator />
        <q-card-section style="flex: 1; overflow-y: auto; padding: 0;">
          <div v-if="notificaciones.length === 0" class="text-center text-grey-7 q-pa-xl">
            <q-icon name="notifications_off" size="48px" />
            <div class="q-mt-sm">Sin notificaciones</div>
          </div>
          <q-list v-else separator>
            <q-item
              v-for="notificacion in notificaciones"
              :key="notificacion.id"
              clickable
              :class="{ 'bg-primary-soft': !notificacion.leida }"
              @click="marcarComoLeida(notificacion.id)"
            >
              <q-item-section avatar>
                <q-icon
                  :name="notificacion.icono || 'notifications'"
                  :color="notificacion.leida ? 'grey' : 'primary'"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ notificacion.titulo }}</q-item-label>
                <q-item-label caption lines="2">{{ notificacion.mensaje || '' }}</q-item-label>
                <q-item-label caption class="text-grey-6">
                  {{ formatearFecha(notificacion.fecha || notificacion.creado) }}
                </q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card-section>
      </q-card>
    </q-dialog>

    <q-drawer v-model="menuAbierto" bordered :width="248" behavior="mobile">
      <div class="column full-height q-pa-md">
        <div class="text-caption text-uppercase text-grey-7 text-weight-bold q-px-sm q-mb-md" style="letter-spacing: 1.3px;">
          Menú principal
        </div>

        <q-list>
          <q-item
            v-for="item in secciones"
            :key="item.ruta"
            clickable
            :active="estaActiva(item.ruta)"
            active-class="bg-primary-soft text-primary text-weight-bold"
            class="rounded-borders q-mb-xs"
            @click="navegar(item.ruta)"
          >
            <q-item-section avatar>
              <q-icon :name="item.icono" size="21px" />
            </q-item-section>
            <q-item-section>{{ item.titulo }}</q-item-section>
          </q-item>
        </q-list>

        <q-space />

        <div class="q-pa-sm" style="border-top: 1px solid var(--border)">
          <div class="text-caption text-weight-bold">Polo Educativo Tecnológico</div>
          <div class="text-caption text-grey-6">Sistema de gestión académica</div>
        </div>
      </div>
    </q-drawer>

    <q-page-container>
      <router-view />
    </q-page-container>

    <q-footer class="lt-md" style="background: var(--bg-elevated); color: var(--text); border-top: 1px solid var(--border)">
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); min-height: 62px;">
        <button
          v-for="item in navegacionMovil"
          :key="item.ruta"
          @click="navegar(item.ruta)"
          class="column items-center justify-center q-pa-xs bg-transparent no-border"
          :class="estaActiva(item.ruta) ? 'text-primary' : 'text-grey-7'"
        >
          <q-icon :name="item.icono" size="22px" />
          <span class="text-caption" style="font-size: 10px;">{{ item.titulo }}</span>
        </button>
      </div>
    </q-footer>
    <q-footer class="mobile-nav">
      <div class="mobile-nav-inner">
        <button
          v-for="item in navegacionMovil"
          :key="item.ruta"
          class="mobile-item"
          :class="{ 'mobile-active': estaActiva(item.ruta), 'es-inicio': item.titulo === 'Inicio' }"
          :aria-label="item.titulo"
          @click="navegar(item.ruta)"
        >
          <q-icon :name="item.icono" size="24px" />
        </button>
      </div>
    </q-footer>

  </q-layout>
</template>

<style>

.mobile-nav {
  display: none;
  position: fixed;
  bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  left: 12px;
  right: 12px;
  z-index: 1000;
  pointer-events: none;
  background: transparent !important;
  box-shadow: none !important;
  border: none !important;
}

.mobile-nav-inner {
  pointer-events: auto;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
  padding: 8px;
  background: rgba(114, 47, 55, 0.72);
  background: color-mix(in srgb, var(--primary) 72%, transparent);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  backdrop-filter: blur(20px) saturate(180%);
  border: 1px solid rgba(114, 47, 55, 0.4);
  border: 1px solid color-mix(in srgb, var(--primary) 50%, transparent);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgba(114, 47, 55, 0.35);
  box-shadow: 0 8px 32px color-mix(in srgb, var(--primary) 35%, transparent);
}

.mobile-item {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  min-height: 44px;
  color: rgba(255, 255, 255, 0.62);
  background: transparent;
  border: none;
  cursor: pointer;
  font: inherit;
  border-radius: 16px;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
}

.mobile-item:active {
  transform: scale(0.94);
}

.mobile-item.mobile-active {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.22);
}

.mobile-item.es-inicio .q-icon {
  font-size: 26px;
}

.mobile-item.mobile-active .q-icon {
  transform: scale(1.08);
}

@media (max-width: 700px) {
  .mobile-nav {
    display: block;
  }
}

@media (max-width: 700px) {
  .q-page-container {
    padding-bottom: calc(96px + env(safe-area-inset-bottom, 0px));
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
  }
}

.menu-usuario {
  border-radius: 16px !important;
  box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  overflow: hidden !important;
  min-width: 280px !important;
  border: 1px solid var(--border);
}
.menu-encabezado {
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  padding: 20px !important;
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--bg-hover) 100%) !important;
  border-bottom: 1px solid var(--border-subtle);
}

.avatar-menu {
  color: white !important;
  background: var(--primary) !important;
  font-weight: 700 !important;
  font-size: 16px !important;
  flex-shrink: 0 !important;
  box-shadow: 0 4px 12px -4px color-mix(in srgb, var(--primary) 40%, transparent);
  border: 2px solid color-mix(in srgb, var(--primary) 20%, transparent);
}

.menu-info { min-width: 0 !important; flex: 1 !important; }

.menu-nombre {
  font-size: 14px !important;
  font-weight: 700 !important;
  color: var(--text) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  letter-spacing: -0.01em;
}

.menu-rol {
  margin-top: 3px !important;
  font-size: 11px !important;
  color: var(--text-muted) !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-lista .q-item {
  min-height: 46px !important;
  padding: 10px 16px !important;
  color: var(--text-secondary) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border-radius: 10px !important;
  margin: 2px 6px !important;
  transition: all 0.15s ease !important;
}

.menu-lista .q-item:hover {
  background: var(--bg-hover) !important;
  color: var(--primary) !important;
  transform: translateX(2px);
}

.menu-lista .q-item:hover .q-icon {
  color: var(--primary) !important;
}

.menu-lista .q-item .q-icon {
  color: var(--text-muted) !important;
  transition: color 0.15s ease;
}

.menu-lista .q-item:active {
  background: var(--bg-active) !important;
}

.item-cerrar {
  color: var(--error) !important;
}

.item-cerrar:hover {
  background: var(--error-bg) !important;
  color: var(--error) !important;
}

.item-cerrar .q-icon,
.item-cerrar:hover .q-icon {
  color: var(--error) !important;
}

.menu-usuario .q-separator {
  background: var(--border-subtle) !important;
  margin: 4px 12px !important;
}

.menu-usuario .q-badge {
  font-size: 10px;
  font-weight: 700;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
}

[data-theme="dark"] .menu-usuario {
  box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.7), 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

[data-theme="dark"] .menu-encabezado {
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, var(--bg-elevated)) 0%, var(--bg-hover) 100%) !important;
}

.menu-usuario {
  border-radius: 16px !important;
  box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.18), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
  overflow: hidden !important;
  min-width: 280px !important;
  border: 1px solid var(--border);
}

.menu-encabezado {
  display: flex !important;
  align-items: center !important;
  gap: 14px !important;
  padding: 20px !important;
  background: linear-gradient(135deg, var(--primary-soft) 0%, var(--bg-hover) 100%) !important;
  border-bottom: 1px solid var(--border-subtle);
}

.avatar-menu {
  color: white !important;
  background: var(--primary) !important;
  font-weight: 700 !important;
  font-size: 16px !important;
  flex-shrink: 0 !important;
  box-shadow: 0 4px 12px -4px color-mix(in srgb, var(--primary) 40%, transparent);
  border: 2px solid color-mix(in srgb, var(--primary) 20%, transparent);
}

.menu-info { min-width: 0 !important; flex: 1 !important; }

.menu-nombre {
  font-size: 14px !important;
  font-weight: 700 !important;
  color: var(--text) !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
  letter-spacing: -0.01em;
}

.menu-rol {
  margin-top: 3px !important;
  font-size: 11px !important;
  color: var(--text-muted) !important;
  font-weight: 600 !important;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.menu-lista .q-item {
  min-height: 46px !important;
  padding: 10px 16px !important;
  color: var(--text-secondary) !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border-radius: 10px !important;
  margin: 2px 6px !important;
  transition: all 0.15s ease !important;
}

.menu-lista .q-item:hover {
  background: var(--bg-hover) !important;
  color: var(--primary) !important;
  transform: translateX(2px);
}

.menu-lista .q-item:hover .q-icon {
  color: var(--primary) !important;
}

.menu-lista .q-item .q-icon {
  color: var(--text-muted) !important;
  transition: color 0.15s ease;
}

.item-cerrar {
  color: var(--error) !important;
}

.item-cerrar:hover {
  background: var(--error-bg) !important;
  color: var(--error) !important;
}

.item-cerrar .q-icon,
.item-cerrar:hover .q-icon {
  color: var(--error) !important;
}

.menu-usuario .q-separator {
  background: var(--border-subtle) !important;
  margin: 4px 12px !important;
}

[data-theme="dark"] .menu-usuario {
  box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.7), 0 4px 12px rgba(0, 0, 0, 0.4) !important;
}

[data-theme="dark"] .menu-encabezado {
  background: linear-gradient(135deg, color-mix(in srgb, var(--primary) 18%, var(--bg-elevated)) 0%, var(--bg-hover) 100%) !important;
}

</style>
