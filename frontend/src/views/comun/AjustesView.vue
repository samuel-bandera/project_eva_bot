<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify, Dialog } from 'quasar';
import { useAuthStore } from '../../stores/auth.store.js';
import { useNokyStore } from '../../stores/noky.store.js';
import { useTheme } from '../../composables/useTheme.js';
import { usePreferences } from '../../composables/usePreferences.js';
import * as authApi from '../../api/auth.api.js';

const auth = useAuthStore();
const asistente = useNokyStore();
const { tema, cambiar: cambiarTema } = useTheme();
const { prefs, cargarDelBackend, guardar, set, resetear } = usePreferences();

const seccionActual = ref('cuenta');
const busqueda = ref('');
const guardando = ref(false);
const cambiandoPass = ref(false);
const modalPass = ref(false);
const passActual = ref('');
const passNueva = ref('');
const passConfirmar = ref('');

const iniciales = computed(() => auth.iniciales);
const nombreCompleto = computed(() => auth.nombreCompleto || 'Usuario');
const rolLabel = computed(() =>
  ({ alumno: 'Estudiante', profesor: 'Docente', coordinador: 'Coordinador', admin: 'Administrador' }[auth.user?.tipo] || '')
);

const secciones = computed(() => [
  { id: 'cuenta',         titulo: 'Cuenta',            icono: 'person',     color: 'var(--primary)' },
  { id: 'asistente', titulo: 'Asistente IA', icono: 'smart_toy', color: '#0288d1' },
  { id: 'apariencia',     titulo: 'Apariencia',        icono: 'palette',    color: '#1976d2' },
  { id: 'notificaciones', titulo: 'Notificaciones',    icono: 'notifications', color: '#f57c00' },
  { id: 'privacidad',     titulo: 'Privacidad y datos',icono: 'security',   color: '#2e7d32' },
  { id: 'acerca',         titulo: 'Acerca de',         icono: 'info',       color: '#616161' },
]);

const seccionesFiltradas = computed(() => {
  const q = busqueda.value.trim().toLowerCase();
  if (!q) return secciones.value;
  return secciones.value.filter(s => s.titulo.toLowerCase().includes(q));
});

async function guardarTodo() {
  guardando.value = true;
  try {
    const ok = await guardar();
    if (ok) Notify.create({ type: 'positive', message: 'Ajustes guardados', position: 'top', icon: 'check_circle' });
    else Notify.create({ type: 'negative', message: 'Error al guardar', position: 'top' });
  } finally {
    guardando.value = false;
  }
}

async function resetearTodo() {
  const ok = await new Promise((resolve) => {
    Dialog.create({
      title: 'Restablecer ajustes',
      message: '¿Volver a la configuración por defecto? Se perderán tus preferencias actuales.',
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Restablecer', color: 'negative', unelevated: true },
    }).onOk(() => resolve(true)).onCancel(() => resolve(false));
  });
  if (!ok) return;
  await resetear();
  cambiarTema('auto');
  Notify.create({ type: 'info', message: 'Ajustes restablecidos', position: 'top' });
}

function abrirCambiarPass() {
  passActual.value = ''; passNueva.value = ''; passConfirmar.value = '';
  modalPass.value = true;
}

async function cambiarPass() {
  if (!passActual.value || !passNueva.value) {
    Notify.create({ type: 'warning', message: 'Completá los campos', position: 'top' }); return;
  }
  if (passNueva.value !== passConfirmar.value) {
    Notify.create({ type: 'warning', message: 'Las contraseñas no coinciden', position: 'top' }); return;
  }
  if (passNueva.value.length < 8 || !/[A-Z]/.test(passNueva.value) || !/[0-9]/.test(passNueva.value)) {
    Notify.create({ type: 'warning', message: 'Mínimo 8 caracteres, 1 mayúscula y 1 número', position: 'top' }); return;
  }
  cambiandoPass.value = true;
  try {
    await authApi.cambiarPassword({ contrasenaActual: passActual.value, contrasenaNueva: passNueva.value });
    Notify.create({ type: 'positive', message: 'Contraseña actualizada', position: 'top' });
    modalPass.value = false;
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  } finally { cambiandoPass.value = false; }
}

async function cerrarSesiones() {
  const ok = await new Promise((resolve) => {
    Dialog.create({
      title: 'Cerrar todas las sesiones',
      message: 'Se cerrará sesión en todos los dispositivos. Tendrás que volver a iniciar sesión.',
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Cerrar todas', color: 'negative', unelevated: true },
    }).onOk(() => resolve(true)).onCancel(() => resolve(false));
  });
  if (!ok) return;
  try {
    await authApi.logout();
    auth.logout();
    window.location.href = '/login';
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error', position: 'top' });
  }
}

onMounted(async () => { await cargarDelBackend(); });
</script>

<template>
  <q-page class="ajustes-page">
    <div class="ajustes-layout">

      <aside class="ajustes-sidebar gt-sm">
        <h2 class="sidebar-title">Ajustes</h2>

        <q-input v-model="busqueda" dense outlined placeholder="Buscar ajustes..." class="sidebar-search">
          <template #prepend><q-icon name="search" size="18px" /></template>
        </q-input>

        <nav class="sidebar-nav">
          <button
            v-for="s in seccionesFiltradas" :key="s.id"
            class="nav-item" :class="{ active: seccionActual === s.id }"
            @click="seccionActual = s.id"
          >
            <div class="nav-icon" :style="{ background: s.color }">
              <q-icon :name="s.icono" color="white" size="18px" />
            </div>
            <span class="nav-label">{{ s.titulo }}</span>
            <q-icon name="chevron_right" size="16px" class="nav-chevron" />
          </button>
        </nav>

        <div class="sidebar-footer">
          <div class="text-caption text-grey-6">EvalBot v1.0</div>
        </div>
      </aside>

      <main class="ajustes-content">

        <div class="lt-md q-mb-md">
          <h1 class="text-h5 text-weight-bold">Ajustes</h1>
          <q-input v-model="busqueda" dense outlined placeholder="Buscar ajustes..." class="q-mt-sm" />
          <div class="row q-gutter-xs q-mt-sm" style="overflow-x: auto; flex-wrap: nowrap;">
            <q-chip
              v-for="s in seccionesFiltradas" :key="s.id"
              clickable dense
              :color="seccionActual === s.id ? 'primary' : 'grey-3'"
              :text-color="seccionActual === s.id ? 'white' : 'dark'"
              @click="seccionActual = s.id"
            >
              {{ s.titulo }}
            </q-chip>
          </div>
        </div>

        <section v-if="seccionActual === 'cuenta'" class="ajustes-section">
          <h2 class="section-heading">Cuenta</h2>
          <p class="section-desc">Información personal y seguridad de tu cuenta en EvalBot.</p>

          <div class="ajustes-card">
            <div class="perfil-row">
              <q-avatar size="72px" color="primary" text-color="white" class="text-weight-bold" style="font-size: 26px">
                {{ iniciales }}
              </q-avatar>
              <div class="col">
                <div class="text-h5 text-weight-medium">{{ nombreCompleto }}</div>
                <div class="text-body2 text-grey-7 q-mt-xs">{{ auth.user?.email }}</div>
                <div class="row q-gutter-xs q-mt-sm">
                  <q-badge color="primary" :label="rolLabel" />
                  <q-badge color="positive" label="Cuenta activa" />
                </div>
              </div>
            </div>
          </div>

          <h3 class="subsection-heading">Seguridad</h3>
          <div class="ajustes-card">
            <q-item clickable @click="abrirCambiarPass" class="action-row">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="36px"><q-icon name="lock" size="18px" /></q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="action-title">Cambiar contraseña</q-item-label>
                <q-item-label caption>Actualizá tu contraseña regularmente. Recomendamos cada 3 meses.</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" color="grey-6" /></q-item-section>
            </q-item>
            <q-separator class="row-sep" />
            <q-item clickable @click="cerrarSesiones" class="action-row">
              <q-item-section avatar>
                <q-avatar color="negative" text-color="white" size="36px"><q-icon name="logout" size="18px" /></q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="action-title text-negative">Cerrar todas las sesiones</q-item-label>
                <q-item-label caption>Si sospechás que alguien más accedió a tu cuenta, cerrá todas las sesiones activas.</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" color="grey-6" /></q-item-section>
            </q-item>
          </div>
        </section>


        <section v-if="seccionActual === 'asistente'" class="ajustes-section">
          <h2 class="section-heading">Asistente IA</h2>
          <p class="section-desc">Personalizá a Mochi, tu compañero de EvalBot, y configurá cómo querés que te avise.</p>

          <h3 class="subsection-heading">Apariencia de Mochi</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Sombrero</div>
                <div class="setting-subtitle">Elegí qué accesorio lleva Mochi en la cabeza.</div>
              </div>
              <div class="row q-gutter-sm">
                <q-btn
                  v-for="sombrero in ['witchHat', 'partyHat', 'crown', 'sunglasses', 'scarf', 'beanie', 'santaHat', 'none']"
                  :key="sombrero"
                  :color="asistente.currentHat === sombrero ? 'primary' : 'grey-8'"
                  :outline="asistente.currentHat !== sombrero"
                  unelevated no-caps
                  @click="asistente.currentHat = sombrero"
                >
                  {{ { witchHat: 'Bruja', partyHat: 'Fiesta', crown: 'Corona', sunglasses: 'Lentes', scarf: 'Bufanda', beanie: 'Gorro', santaHat: 'Papá Noel', none: 'Sin gorro' }[sombrero] }}
                </q-btn>
              </div>
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Seguir el mouse</div>
                <div class="setting-subtitle">Si está activo, los ojos de Mochi seguirán el cursor por la pantalla.</div>
              </div>
              <q-toggle :model-value="asistente.eyeTracking" @update:model-value="v => asistente.eyeTracking = v" color="primary" />
            </div>
          </div>


          <h3 class="subsection-heading">Color de Mochi</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Color del cuerpo</div>
                <div class="setting-subtitle">Elegí el color base de Mochi. Por defecto es el blanco original.</div>
              </div>
              <div class="row q-gutter-sm">
                <button class="color-swatch" :class="{ active: asistente.nokyColor === 'default' }" style="background: linear-gradient(135deg, #f0f0f0, #c4c5ca);" @click="asistente.nokyColor = 'default'"><q-icon v-if="asistente.nokyColor === 'default'" name="check" size="16px" color="dark" /></button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#3b82f6' }" style="background: #3b82f6;" @click="asistente.nokyColor = '#3b82f6'"><q-icon v-if="asistente.nokyColor === '#3b82f6'" name="check" size="16px" color="white" /></button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#10b981' }" style="background: #10b981;" @click="asistente.nokyColor = '#10b981'"><q-icon v-if="asistente.nokyColor === '#10b981'" name="check" size="16px" color="white" /></button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#f59e0b' }" style="background: #f59e0b;" @click="asistente.nokyColor = '#f59e0b'"><q-icon v-if="asistente.nokyColor === '#f59e0b'" name="check" size="16px" color="white" /></button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#ec4899' }" style="background: #ec4899;" @click="asistente.nokyColor = '#ec4899'"><q-icon v-if="asistente.nokyColor === '#ec4899'" name="check" size="16px" color="white" /></button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#8b5cf6' }" style="background: #8b5cf6;" @click="asistente.nokyColor = '#8b5cf6'"><q-icon v-if="asistente.nokyColor === '#8b5cf6'" name="check" size="16px" color="white" /></button>
              </div>
            </div>
          </div>

          <h3 class="subsection-heading">Comportamiento</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Probar Asistente</div>
                <div class="setting-subtitle">Abrí el panel del Asistente IA para ver los cambios en vivo.</div>
              </div>
              <q-btn color="primary" icon="smart_toy" label="Abrir Asistente" unelevated no-caps @click="asistente.isOpen = true" />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Sonidos del Asistente</div>
                <div class="setting-subtitle">Reproducir sonidos al abrir el panel o recibir respuestas.</div>
              </div>
              <q-toggle :model-value="asistente.soundEnabled" @update:model-value="v => asistente.soundEnabled = v" color="primary" />
            </div>
          </div>

          <h3 class="subsection-heading">Historial</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Limpiar conversación</div>
                <div class="setting-subtitle">Borrar todos los mensajes guardados en el chat del asistente.</div>
              </div>
              <q-btn color="negative" icon="delete" label="Limpiar Chat" outline unelevated no-caps @click="asistente.clearChat()" />
            </div>
          </div>
        </section>

        <section v-if="seccionActual === 'apariencia'" class="ajustes-section">
          <h2 class="section-heading">Apariencia</h2>
          <p class="section-desc">Personalizá cómo se ve EvalBot. Los cambios se aplican instantáneamente.</p>

          <h3 class="subsection-heading">Tema</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Modo de color</div>
                <div class="setting-subtitle">Elegí claro, oscuro o automático según la configuración de tu sistema operativo.</div>
              </div>
              <q-btn-toggle
                :model-value="tema" @update:model-value="cambiarTema"
                no-caps unelevated toggle-color="primary" color="transparent" text-color="grey-8"
                :options="[
                  { label: 'Auto', value: 'auto', icon: 'brightness_auto' },
                  { label: 'Claro', value: 'light', icon: 'light_mode' },
                  { label: 'Oscuro', value: 'dark', icon: 'dark_mode' },
                ]"
                class="segmented"
              />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Color de acento</div>
                <div class="setting-subtitle">El color principal de botones, badges y elementos destacados en toda la aplicación.</div>
              </div>
              <div class="row q-gutter-xs">
                <button
                  v-for="c in [
                    { id: 'vino', color: 'var(--primary)' },
                    { id: 'azul', color: '#1976d2' },
                    { id: 'verde', color: '#2e7d32' },
                    { id: 'morado', color: '#6a1b9a' },
                    { id: 'naranja', color: '#e65100' },
                  ]" :key="c.id"
                  class="color-swatch" :class="{ active: prefs.color_acento === c.id }"
                  :style="{ background: c.color }"
                  @click="set('color_acento', c.id)"
                >
                  <q-icon v-if="prefs.color_acento === c.id" name="check" size="16px" color="white" />
                </button>
              </div>
            </div>
          </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Color del cuerpo</div>
                <div class="setting-subtitle">Elegí el color base de Mochi. Por defecto es el blanco original.</div>
              </div>
              <div class="row q-gutter-sm">
                <button class="color-swatch" :class="{ active: asistente.nokyColor === 'default' }" style="background: linear-gradient(135deg, #f0f0f0, #c4c5ca);" @click="asistente.nokyColor = 'default'">
                  <q-icon v-if="asistente.nokyColor === 'default'" name="check" size="16px" color="dark" />
                </button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#3b82f6' }" style="background: #3b82f6;" @click="asistente.nokyColor = '#3b82f6'">
                  <q-icon v-if="asistente.nokyColor === '#3b82f6'" name="check" size="16px" color="white" />
                </button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#10b981' }" style="background: #10b981;" @click="asistente.nokyColor = '#10b981'">
                  <q-icon v-if="asistente.nokyColor === '#10b981'" name="check" size="16px" color="white" />
                </button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#f59e0b' }" style="background: #f59e0b;" @click="asistente.nokyColor = '#f59e0b'">
                  <q-icon v-if="asistente.nokyColor === '#f59e0b'" name="check" size="16px" color="white" />
                </button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#ec4899' }" style="background: #ec4899;" @click="asistente.nokyColor = '#ec4899'">
                  <q-icon v-if="asistente.nokyColor === '#ec4899'" name="check" size="16px" color="white" />
                </button>
                <button class="color-swatch" :class="{ active: asistente.nokyColor === '#8b5cf6' }" style="background: #8b5cf6;" @click="asistente.nokyColor = '#8b5cf6'">
                  <q-icon v-if="asistente.nokyColor === '#8b5cf6'" name="check" size="16px" color="white" />
                </button>
              </div>
            </div>

          <h3 class="subsection-heading">Legibilidad</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Tamaño de letra</div>
                <div class="setting-subtitle">Aumentá o reducí el tamaño del texto en toda la interfaz.</div>
              </div>
              <q-btn-toggle
                :model-value="prefs.tamano_fuente" @update:model-value="v => set('tamano_fuente', v)"
                no-caps unelevated toggle-color="primary" color="transparent" text-color="grey-8"
                :options="[
                  { label: 'Pequeña', value: 'pequena' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'Grande', value: 'grande' },
                  { label: 'Extra', value: 'extra' },
                ]"
                class="segmented"
              />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Densidad</div>
                <div class="setting-subtitle">Qué tan compactos se ven los espacios, listas y tablas.</div>
              </div>
              <q-btn-toggle
                :model-value="prefs.densidad" @update:model-value="v => set('densidad', v)"
                no-caps unelevated toggle-color="primary" color="transparent" text-color="grey-8"
                :options="[
                  { label: 'Compacta', value: 'compact' },
                  { label: 'Normal', value: 'normal' },
                  { label: 'Amplia', value: 'spacious' },
                ]"
                class="segmented"
              />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Modo lectura</div>
                <div class="setting-subtitle">Usa una tipografía serif y mayor interlineado para leer textos largos con más comodidad.</div>
              </div>
              <q-toggle :model-value="prefs.modo_lectura" @update:model-value="v => set('modo_lectura', v)" color="primary" />
            </div>
          </div>

          <h3 class="subsection-heading">Accesibilidad</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Alto contraste</div>
                <div class="setting-subtitle">Aumenta el contraste del texto y los bordes para facilitar la lectura.</div>
              </div>
              <q-toggle :model-value="prefs.alto_contraste" @update:model-value="v => set('alto_contraste', v)" color="primary" />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Reducir movimiento</div>
                <div class="setting-subtitle">Desactiva animaciones y transiciones para una experiencia más tranquila.</div>
              </div>
              <q-toggle :model-value="prefs.reduce_motion" @update:model-value="v => set('reduce_motion', v)" color="primary" />
            </div>
          </div>
        </section>

        <section v-if="seccionActual === 'notificaciones'" class="ajustes-section">
          <h2 class="section-heading">Notificaciones</h2>
          <p class="section-desc">Elegí qué avisos querés recibir y por qué canales. Podés silenciar todo con el modo No molestar.</p>

          <h3 class="subsection-heading">No molestar</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Activar No molestar</div>
                <div class="setting-subtitle">Silencia todas las notificaciones en el horario que elijas. No afecta mensajes críticos de seguridad.</div>
              </div>
              <q-toggle :model-value="prefs.no_molestar_activo" @update:model-value="v => set('no_molestar_activo', v)" color="primary" />
            </div>
            <template v-if="prefs.no_molestar_activo">
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Desde</div>
                  <div class="setting-subtitle">Hora de inicio del silencio</div>
                </div>
                <q-input :model-value="prefs.no_molestar_desde" @update:model-value="v => set('no_molestar_desde', v)" outlined dense type="time" style="width: 130px" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Hasta</div>
                  <div class="setting-subtitle">Hora de fin del silencio</div>
                </div>
                <q-input :model-value="prefs.no_molestar_hasta" @update:model-value="v => set('no_molestar_hasta', v)" outlined dense type="time" style="width: 130px" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Incluir fines de semana</div>
                  <div class="setting-subtitle">Silenciar también sábados y domingos</div>
                </div>
                <q-toggle :model-value="prefs.no_molestar_fines_semana" @update:model-value="v => set('no_molestar_fines_semana', v)" color="primary" />
              </div>
            </template>
          </div>

          <h3 class="subsection-heading">Canales</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Copia por email</div>
                <div class="setting-subtitle">Recibí copia de los avisos importantes en tu Gmail.</div>
              </div>
              <q-toggle :model-value="prefs.notif_email" @update:model-value="v => set('notif_email', v)" color="primary" />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Sonidos</div>
                <div class="setting-subtitle">Reproducir un sonido al recibir notificaciones.</div>
              </div>
              <q-toggle :model-value="prefs.notif_sonidos" @update:model-value="v => set('notif_sonidos', v)" color="primary" />
            </div>
          </div>

          <h3 class="subsection-heading">Avisos generales</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <q-icon name="assignment" color="primary" size="20px" class="q-mr-sm" />
                <div>
                  <div class="setting-title">Nuevas tareas</div>
                  <div class="setting-subtitle">Cuando se asigna una tarea en tus materias.</div>
                </div>
              </div>
              <q-toggle :model-value="prefs.notif_tareas" @update:model-value="v => set('notif_tareas', v)" color="primary" />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <q-icon name="quiz" color="primary" size="20px" class="q-mr-sm" />
                <div>
                  <div class="setting-title">Evaluaciones</div>
                  <div class="setting-subtitle">Publicaciones y recordatorios de cierre.</div>
                </div>
              </div>
              <q-toggle :model-value="prefs.notif_evaluaciones" @update:model-value="v => set('notif_evaluaciones', v)" color="primary" />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <q-icon name="grade" color="primary" size="20px" class="q-mr-sm" />
                <div>
                  <div class="setting-title">Notas cargadas</div>
                  <div class="setting-subtitle">Cuando se publica una calificación.</div>
                </div>
              </div>
              <q-toggle :model-value="prefs.notif_notas" @update:model-value="v => set('notif_notas', v)" color="primary" />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <q-icon name="campaign" color="primary" size="20px" class="q-mr-sm" />
                <div>
                  <div class="setting-title">Comunicados</div>
                  <div class="setting-subtitle">Avisos oficiales de coordinación y dirección.</div>
                </div>
              </div>
              <q-toggle :model-value="prefs.notif_comunicados" @update:model-value="v => set('notif_comunicados', v)" color="primary" />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <q-icon name="forum" color="primary" size="20px" class="q-mr-sm" />
                <div>
                  <div class="setting-title">Foros</div>
                  <div class="setting-subtitle">Respuestas en los foros de tus materias.</div>
                </div>
              </div>
              <q-toggle :model-value="prefs.notif_foros" @update:model-value="v => set('notif_foros', v)" color="primary" />
            </div>
          </div>

          <h3 class="subsection-heading">Específico de tu rol ({{ rolLabel }})</h3>
          <div class="ajustes-card">
            <template v-if="auth.user?.tipo === 'alumno'">
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Recordatorio de tareas</div>
                  <div class="setting-subtitle">Cuándo querés recibir aviso antes del vencimiento.</div>
                </div>
                <q-btn-toggle
                  :model-value="prefs.recordatorio_tareas" @update:model-value="v => set('recordatorio_tareas', v)"
                  no-caps unelevated toggle-color="primary" color="transparent" text-color="grey-8"
                  :options="[
                    { label: 'Nunca', value: 'nunca' },
                    { label: '1 día', value: '1d' },
                    { label: '3 días', value: '3d' },
                    { label: '1 semana', value: '1sem' },
                  ]"
                  class="segmented"
                />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Ocultar notas hasta publicación oficial</div>
                  <div class="setting-subtitle">No mostrar notas parciales cargadas hasta que el docente las publique.</div>
                </div>
                <q-toggle :model-value="prefs.ocultar_notas_publicacion" @update:model-value="v => set('ocultar_notas_publicacion', v)" color="primary" />
              </div>
            </template>

            <template v-if="auth.user?.tipo === 'docente'">
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Entregas pendientes de corrección</div>
                  <div class="setting-subtitle">Avisos cuando hay entregas sin corregir.</div>
                </div>
                <q-toggle :model-value="prefs.notif_correcciones_pendientes" @update:model-value="v => set('notif_correcciones_pendientes', v)" color="primary" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Nuevos tickets recibidos</div>
                  <div class="setting-subtitle">Cuando un alumno te envía un ticket.</div>
                </div>
                <q-toggle :model-value="prefs.notif_tickets_recibidos" @update:model-value="v => set('notif_tickets_recibidos', v)" color="primary" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Mensajes de alumnos</div>
                  <div class="setting-subtitle">Nuevos mensajes en el sistema.</div>
                </div>
                <q-toggle :model-value="prefs.notif_mensajes_alumnos" @update:model-value="v => set('notif_mensajes_alumnos', v)" color="primary" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Copia por email al publicar evaluación</div>
                  <div class="setting-subtitle">Enviarte copia cuando publicás una evaluación.</div>
                </div>
                <q-toggle :model-value="prefs.copia_email_evaluacion" @update:model-value="v => set('copia_email_evaluacion', v)" color="primary" />
              </div>
            </template>

            <template v-if="auth.user?.tipo === 'coordinador'">
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Nuevas cuentas pendientes</div>
                  <div class="setting-subtitle">Avisos cuando un usuario se registra y requiere aprobación.</div>
                </div>
                <q-toggle :model-value="prefs.notif_cuentas_pendientes" @update:model-value="v => set('notif_cuentas_pendientes', v)" color="primary" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Matrículas por aprobar</div>
                  <div class="setting-subtitle">Solicitudes de matrícula pendientes.</div>
                </div>
                <q-toggle :model-value="prefs.notif_matriculas_pendientes" @update:model-value="v => set('notif_matriculas_pendientes', v)" color="primary" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Alumnos en riesgo</div>
                  <div class="setting-subtitle">Avisar cuando un alumno baja del umbral de asistencia.</div>
                </div>
                <q-toggle :model-value="prefs.notif_alumnos_riesgo" @update:model-value="v => set('notif_alumnos_riesgo', v)" color="primary" />
              </div>
              <template v-if="prefs.notif_alumnos_riesgo">
                <q-separator class="row-sep" />
                <div class="setting-row">
                  <div class="setting-info">
                    <div class="setting-title">Umbral de asistencia</div>
                    <div class="setting-subtitle">Alertar cuando la asistencia baje de este porcentaje.</div>
                  </div>
                  <q-input :model-value="prefs.alumnos_riesgo_umbral" @update:model-value="v => set('alumnos_riesgo_umbral', Number(v))" type="number" outlined dense suffix="%" style="width: 110px" min="0" max="100" />
                </div>
              </template>
            </template>

            <template v-if="auth.user?.tipo === 'admin'">
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Alertas críticas de seguridad</div>
                  <div class="setting-subtitle">Intentos de login sospechosos, IDOR, ataques. No se pueden silenciar con No molestar.</div>
                </div>
                <q-toggle :model-value="prefs.notif_alertas_criticas" @update:model-value="v => set('notif_alertas_criticas', v)" color="primary" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Errores del sistema</div>
                  <div class="setting-subtitle">Notificar cuando hay errores críticos en el backend.</div>
                </div>
                <q-toggle :model-value="prefs.notif_errores_sistema" @update:model-value="v => set('notif_errores_sistema', v)" color="primary" />
              </div>
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Rate limit excedido</div>
                  <div class="setting-subtitle">Cuando un usuario supera el límite de requests.</div>
                </div>
                <q-toggle :model-value="prefs.notif_rate_limit" @update:model-value="v => set('notif_rate_limit', v)" color="primary" />
              </div>
            </template>

            <div v-if="!['alumno','docente','coordinador','admin'].includes(auth.user?.tipo)" class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Sin opciones específicas para tu rol</div>
              </div>
            </div>
          </div>

          <h3 class="subsection-heading">Resumen semanal</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Recibir resumen semanal</div>
                <div class="setting-subtitle">Un email con lo más importante de la semana: tareas, evaluaciones, notas, avisos.</div>
              </div>
              <q-toggle :model-value="prefs.resumen_semanal" @update:model-value="v => set('resumen_semanal', v)" color="primary" />
            </div>
            <template v-if="prefs.resumen_semanal">
              <q-separator class="row-sep" />
              <div class="setting-row">
                <div class="setting-info">
                  <div class="setting-title">Día de envío</div>
                  <div class="setting-subtitle">Elegí qué día querés recibir el resumen.</div>
                </div>
                <q-btn-toggle
                  :model-value="prefs.resumen_dia" @update:model-value="v => set('resumen_dia', v)"
                  no-caps unelevated toggle-color="primary" color="transparent" text-color="grey-8"
                  :options="[
                    { label: 'Lun', value: 'lunes' },
                    { label: 'Vie', value: 'viernes' },
                    { label: 'Dom', value: 'domingo' },
                  ]"
                  class="segmented"
                />
              </div>
            </template>
          </div>
        </section>

        <section v-if="seccionActual === 'privacidad'" class="ajustes-section">
          <h2 class="section-heading">Privacidad y datos</h2>
          <p class="section-desc">Controlá quién puede ver tu información y gestioná tus datos.</p>

          <h3 class="subsection-heading">Visibilidad</h3>
          <div class="ajustes-card">
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Perfil visible para otros usuarios</div>
                <div class="setting-subtitle">Si está activo, otros estudiantes y docentes pueden ver tu nombre y rol.</div>
              </div>
              <q-toggle :model-value="prefs.perfil_visible" @update:model-value="v => set('perfil_visible', v)" color="primary" />
            </div>
            <q-separator class="row-sep" />
            <div class="setting-row">
              <div class="setting-info">
                <div class="setting-title">Mostrar mi email</div>
                <div class="setting-subtitle">Permite que otros usuarios vean tu correo institucional en tu perfil.</div>
              </div>
              <q-toggle :model-value="prefs.mostrar_email" @update:model-value="v => set('mostrar_email', v)" color="primary" />
            </div>
          </div>

          <h3 class="subsection-heading">Datos</h3>
          <div class="ajustes-card">
            <q-item clickable class="action-row">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="36px"><q-icon name="download" size="18px" /></q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="action-title">Exportar mis datos</q-item-label>
                <q-item-label caption>Descargá una copia de tu información académica (próximamente).</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" color="grey-6" /></q-item-section>
            </q-item>
            <q-separator class="row-sep" />
            <q-item clickable class="action-row">
              <q-item-section avatar>
                <q-avatar color="warning" text-color="white" size="36px"><q-icon name="cleaning_services" size="18px" /></q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="action-title">Limpiar caché local</q-item-label>
                <q-item-label caption>Borra los datos guardados en este navegador (no afecta tu cuenta).</q-item-label>
              </q-item-section>
              <q-item-section side><q-icon name="chevron_right" color="grey-6" /></q-item-section>
            </q-item>
          </div>
        </section>

        <section v-if="seccionActual === 'acerca'" class="ajustes-section">
          <h2 class="section-heading">Acerca de EvalBot</h2>
          <p class="section-desc">Información del sistema y enlaces de interés.</p>

          <div class="ajustes-card">
            <div class="about-header">
              <q-avatar size="64px" color="primary" text-color="white">
                <q-icon name="school" size="32px" />
              </q-avatar>
              <div>
                <div class="text-h5 text-weight-bold">EvalBot</div>
                <div class="text-caption text-grey-7">Versión 1.0.0</div>
              </div>
            </div>
          </div>

          <h3 class="subsection-heading">Sistema</h3>
          <div class="ajustes-card">
            <q-item class="info-row">
              <q-item-section><q-item-label caption>Institución</q-item-label></q-item-section>
              <q-item-section side><q-item-label>Polo Educativo Tecnológico</q-item-label></q-item-section>
            </q-item>
            <q-separator class="row-sep" />
            <q-item class="info-row">
              <q-item-section><q-item-label caption>Rol</q-item-label></q-item-section>
              <q-item-section side><q-item-label>{{ rolLabel }}</q-item-label></q-item-section>
            </q-item>
            <q-separator class="row-sep" />
            <q-item class="info-row">
              <q-item-section><q-item-label caption>Usuario</q-item-label></q-item-section>
              <q-item-section side><q-item-label>{{ auth.user?.usuario }}</q-item-label></q-item-section>
            </q-item>
          </div>

          <h3 class="subsection-heading">Enlaces</h3>
          <div class="ajustes-card">
            <q-item clickable class="action-row">
              <q-item-section avatar><q-avatar size="36px" color="primary" text-color="white"><q-icon name="menu_book" size="18px" /></q-avatar></q-item-section>
              <q-item-section><q-item-label class="action-title">Términos y condiciones</q-item-label></q-item-section>
              <q-item-section side><q-icon name="open_in_new" color="grey-6" /></q-item-section>
            </q-item>
            <q-separator class="row-sep" />
            <q-item clickable class="action-row">
              <q-item-section avatar><q-avatar size="36px" color="primary" text-color="white"><q-icon name="support_agent" size="18px" /></q-avatar></q-item-section>
              <q-item-section><q-item-label class="action-title">Soporte técnico</q-item-label></q-item-section>
              <q-item-section side><q-icon name="open_in_new" color="grey-6" /></q-item-section>
            </q-item>
          </div>
        </section>

        <div class="ajustes-footer">
          <q-btn flat no-caps color="grey-7" icon="restart_alt" label="Restablecer" @click="resetearTodo" />
          <q-space />
          <q-btn unelevated no-caps color="primary" icon="save" label="Guardar cambios" :loading="guardando" @click="guardarTodo" />
        </div>
      </main>
    </div>

    <q-dialog v-model="modalPass" persistent>
      <q-card style="width: 420px; max-width: 95vw;">
        <q-card-section>
          <div class="text-h6">Cambiar contraseña</div>
          <div class="text-caption text-grey-7 q-mt-xs">Elegí una contraseña segura que no uses en otros sitios.</div>
        </q-card-section>
        <q-card-section class="column q-gutter-md">
          <q-input v-model="passActual" outlined type="password" label="Contraseña actual" />
          <q-input v-model="passNueva" outlined type="password" label="Nueva contraseña" hint="Mínimo 8 caracteres, 1 mayúscula, 1 número" />
          <q-input v-model="passConfirmar" outlined type="password" label="Confirmar nueva contraseña" />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" color="grey-7" @click="modalPass = false" />
          <q-btn unelevated no-caps label="Cambiar" color="primary" :loading="cambiandoPass" @click="cambiarPass" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.ajustes-page {
  min-height: 100vh;
  padding: 24px 20px 60px;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
}

.ajustes-layout {
  display: flex;
  gap: 32px;
  max-width: 1200px;
  margin: 0 auto;
}

.ajustes-sidebar {
  width: 260px;
  flex-shrink: 0;
  position: sticky;
  top: 24px;
  height: fit-content;
}
.sidebar-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 16px 4px;
  letter-spacing: -0.02em;
}
.sidebar-search { margin-bottom: 16px; }
.sidebar-nav { display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  font-family: inherit;
  font-size: 14px;
  color: var(--text);
  text-align: left;
  transition: background 0.12s;
}
.nav-item:hover { background: var(--bg-hover); }
.nav-item.active { background: var(--primary); color: white; }
.nav-icon {
  width: 28px; height: 28px;
  border-radius: 7px;
  display: grid; place-items: center;
  flex-shrink: 0;
}
.nav-item.active .nav-icon { background: rgba(255,255,255,0.25) !important; }
.nav-label { flex: 1; font-weight: 500; }
.nav-chevron { opacity: 0.4; }
.nav-item.active .nav-chevron { opacity: 0.9; }
.sidebar-footer { margin-top: 40px; padding: 0 8px; }

.ajustes-content { flex: 1; min-width: 0; }
.section-heading {
  font-size: 26px;
  font-weight: 700;
  margin: 0 0 4px;
  letter-spacing: -0.02em;
}
.section-desc {
  color: var(--text-muted);
  font-size: 14px;
  margin: 0 0 24px;
  line-height: 1.5;
}
.subsection-heading {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin: 24px 0 8px 4px;
}
.ajustes-card {
  background: var(--bg-elevated);
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  overflow: hidden;
  margin-bottom: 8px;
}
.perfil-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
}
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 16px 20px;
  min-height: 68px;
}
.setting-info {
  display: flex;
  align-items: flex-start;
  gap: 4px;
  flex: 1;
  min-width: 0;
}
.setting-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
  line-height: 1.3;
}
.setting-subtitle {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 3px;
  line-height: 1.4;
}
.row-sep { margin: 0; background: var(--border-subtle); }
.segmented {
  border-radius: 9px;
  background: var(--bg-hover);
  padding: 2px;
  flex-shrink: 0;
}
.segmented :deep(.q-btn) {
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  padding: 6px 14px;
}
.action-row { min-height: 68px; padding: 12px 20px; }
.action-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--text);
}
.color-swatch {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.15s;
  display: grid;
  place-items: center;
}
.color-swatch:hover { transform: scale(1.1); }
.color-swatch.active {
  border-color: var(--text);
  box-shadow: 0 0 0 2px var(--bg-elevated) inset;
}
.about-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
}
.info-row { min-height: 48px; padding: 8px 20px; }
.ajustes-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 4px;
}

@media (max-width: 900px) {
  .ajustes-page { padding: 16px 12px 80px; }
  .ajustes-content { padding-top: 8px; }
  .setting-row { flex-direction: column; align-items: stretch; gap: 12px; }
  .segmented { width: 100%; }
  .segmented :deep(.q-btn) { flex: 1; }
}
</style>
