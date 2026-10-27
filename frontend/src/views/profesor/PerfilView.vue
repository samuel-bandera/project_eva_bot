<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify } from 'quasar';
import { useAuthStore } from '../../stores/auth.store.js';
import * as authApi from '../../api/auth.api.js';
import http from '../../api/http.js';

const auth = useAuthStore();

const tabActiva = ref('datos');
const cargando = ref(false);
const guardando = ref(false);

const formDatos = ref({
  nombre: '',
  apellido: '',
  email: '',
});

const erroresDatos = ref({});

const iniciales = computed(() => auth.iniciales);
const urlAvatar = computed(() => auth.user?.avatar || null);

const formPass = ref({
  actual: '',
  nueva: '',
  confirmar: '',
});
const erroresPass = ref({});
const mostrarPass = ref({ actual: false, nueva: false, confirmar: false });

const datosInstitucionales = ref({
  materias: [],
  creado_en: null,
  ultimo_login: null,
});

const tipoTexto = computed(() => {
  const t = auth.user?.tipo;
  const map = { docente: 'Docente', alumno: 'Alumno', coordinador: 'Coordinador', admin: 'Administrador' };
  return map[t] || t || '—';
});

const fechaAlta = computed(() => {
  if (!datosInstitucionales.value.creado_en) return '—';
  return new Date(datosInstitucionales.value.creado_en).toLocaleDateString('es-UY', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
});

const ultimoLogin = computed(() => {
  if (!datosInstitucionales.value.ultimo_login) return '—';
  return new Date(datosInstitucionales.value.ultimo_login).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
});

async function cargarPerfil() {
  cargando.value = true;
  try {
    await auth.fetchPerfil();
    formDatos.value = {
      nombre: auth.user?.nombre || '',
      apellido: auth.user?.apellido || '',
      email: auth.user?.email || '',
    };
    const { data } = await http.get('/materias/mias');
    datosInstitucionales.value.materias = data.data || [];
    datosInstitucionales.value.creado_en = auth.user?.creado_en || null;
    datosInstitucionales.value.ultimo_login = auth.user?.ultimo_login || null;
  } catch (e) {
    console.warn('Error cargando perfil:', e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargarPerfil);

async function guardarDatos() {
  erroresDatos.value = {};
  guardando.value = true;
  try {
    const resp = await authApi.actualizarPerfil({
      nombre: formDatos.value.nombre.trim(),
      apellido: formDatos.value.apellido.trim(),
      email: formDatos.value.email.trim(),
    });
    auth.user = { ...auth.user, ...resp.data.usuario };
    localStorage.setItem('user', JSON.stringify(auth.user));

    Notify.create({
      message: 'Datos guardados correctamente',
      color: 'positive',
      icon: 'check_circle',
      position: 'top-right',
    });
  } catch (e) {
    const msg = e.response?.data?.error || e.message || 'Error al guardar';
    erroresDatos.value = { general: msg };
    Notify.create({
      message: msg,
      color: 'negative',
      icon: 'error',
      position: 'top-right',
    });
  } finally {
    guardando.value = false;
  }
}

async function cambiarPassword() {
  erroresPass.value = {};

  if (formPass.value.nueva.length < 8) {
    erroresPass.value.nueva = 'Mínimo 8 caracteres';
    return;
  }
  if (formPass.value.nueva !== formPass.value.confirmar) {
    erroresPass.value.confirmar = 'Las contraseñas no coinciden';
    return;
  }

  guardando.value = true;
  try {
    await authApi.cambiarPassword({
      contrasenaActual: formPass.value.actual,
      contrasenaNueva: formPass.value.nueva,
    });
    Notify.create({
      message: 'Contraseña actualizada. Otras sesiones cerradas.',
      color: 'positive',
      icon: 'lock',
      position: 'top-right',
      timeout: 6000,
    });
    formPass.value = { actual: '', nueva: '', confirmar: '' };
  } catch (e) {
    const msg = e.response?.data?.error || 'Error al cambiar contraseña';
    erroresPass.value = { general: msg };
    Notify.create({ message: msg, color: 'negative', icon: 'error', position: 'top-right' });
  } finally {
    guardando.value = false;
  }
}

function elegirAvatar() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/png,image/jpeg,image/webp';
  input.onchange = async (e) => {
    const archivo = e.target.files?.[0];
    if (!archivo) return;
    if (archivo.size > 2 * 1024 * 1024) {
      Notify.create({ message: 'Máximo 2MB', color: 'negative' });
      return;
    }
    guardando.value = true;
    try {
      const resp = await authApi.subirAvatar(archivo);
      auth.user = { ...auth.user, avatar: resp.data.avatar };
      localStorage.setItem('user', JSON.stringify(auth.user));
      Notify.create({ message: 'Avatar actualizado', color: 'positive', icon: 'check' });
    } catch (err) {
      Notify.create({ message: err.response?.data?.error || 'Error al subir', color: 'negative' });
    } finally {
      guardando.value = false;
    }
  };
  input.click();
}
</script>

<template>
  <q-page class="perfil-page">
    <div class="perfil-content">

      <header class="page-heading">
        <div>
          <div class="eyebrow">MI CUENTA</div>
          <h1>Perfil</h1>
          <p>Gestioná tus datos personales, seguridad y materias a cargo.</p>
        </div>
      </header>

      <q-card flat bordered class="card-avatar">
        <q-card-section class="avatar-head">
          <q-avatar size="88px" class="avatar-grande">
            <img v-if="urlAvatar" :src="urlAvatar" :alt="auth.nombreCompleto" />
            <span v-else>{{ iniciales }}</span>
          </q-avatar>
          <div class="avatar-info">
            <div class="avatar-nombre">{{ auth.nombreCompleto }}</div>
            <div class="avatar-rol">{{ tipoTexto }}</div>
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              icon="photo_camera"
              label="Cambiar foto"
              size="sm"
              class="q-mt-sm"
              :loading="guardando"
              @click="elegirAvatar"
            />
          </div>
        </q-card-section>
      </q-card>

      <q-tabs
        v-model="tabActiva"
        class="tabs-custom"
        active-color="primary"
        indicator-color="primary"
        align="left"
        narrow-indicator
      >
        <q-tab name="datos" icon="person" label="Datos personales" no-caps />
        <q-tab name="seguridad" icon="lock" label="Seguridad" no-caps />
        <q-tab name="institucional" icon="school" label="Institucional" no-caps />
      </q-tabs>

      <q-separator />

      <q-tab-panels v-model="tabActiva" animated class="panels-custom">

        <q-tab-panel name="datos" class="panel-pad">
          <q-banner v-if="erroresDatos.general" class="banner-error q-mb-md" dense>
            <template #avatar><q-icon name="error_outline" /></template>
            {{ erroresDatos.general }}
          </q-banner>

          <div class="form-grid">
            <q-input v-model="formDatos.nombre" outlined dense label="Nombre" :rules="[(v) => !!v?.trim() || 'Requerido']" lazy-rules />
            <q-input v-model="formDatos.apellido" outlined dense label="Apellido" :rules="[(v) => !!v?.trim() || 'Requerido']" lazy-rules />
            <q-input v-model="formDatos.email" outlined dense type="email" label="Email" class="field-full" />
            <q-input :model-value="auth.user?.usuario" outlined dense label="Usuario" disable class="field-full" hint="El nombre de usuario no se puede cambiar" />
          </div>

          <div class="acciones">
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="save"
              label="Guardar cambios"
              :loading="guardando"
              @click="guardarDatos"
            />
          </div>
        </q-tab-panel>

        <q-tab-panel name="seguridad" class="panel-pad">
          <div class="section-title">
            <q-icon name="key" size="20px" />
            <span>Cambiar contraseña</span>
          </div>

          <q-banner v-if="erroresPass.general" class="banner-error q-mb-md" dense>
            <template #avatar><q-icon name="error_outline" /></template>
            {{ erroresPass.general }}
          </q-banner>

          <div class="form-grid">
            <q-input
              v-model="formPass.actual"
              outlined dense
              :type="mostrarPass.actual ? 'text' : 'password'"
              label="Contraseña actual"
              class="field-full"
            >
              <template #append>
                <q-icon :name="mostrarPass.actual ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="mostrarPass.actual = !mostrarPass.actual" />
              </template>
            </q-input>

            <q-input
              v-model="formPass.nueva"
              outlined dense
              :type="mostrarPass.nueva ? 'text' : 'password'"
              label="Nueva contraseña"
              :error="!!erroresPass.nueva"
              :error-message="erroresPass.nueva"
              hint="Mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número"
            >
              <template #append>
                <q-icon :name="mostrarPass.nueva ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="mostrarPass.nueva = !mostrarPass.nueva" />
              </template>
            </q-input>

            <q-input
              v-model="formPass.confirmar"
              outlined dense
              :type="mostrarPass.confirmar ? 'text' : 'password'"
              label="Repetir nueva"
              :error="!!erroresPass.confirmar"
              :error-message="erroresPass.confirmar"
            >
              <template #append>
                <q-icon :name="mostrarPass.confirmar ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="mostrarPass.confirmar = !mostrarPass.confirmar" />
              </template>
            </q-input>
          </div>

          <q-banner class="banner-info q-mt-md" dense>
            <template #avatar><q-icon name="info" /></template>
            Al cambiar la contraseña, todas tus otras sesiones activas se cerrarán automáticamente.
          </q-banner>

          <div class="acciones">
            <q-btn
              unelevated
              no-caps
              color="primary"
              icon="lock_reset"
              label="Cambiar contraseña"
              :loading="guardando"
              @click="cambiarPassword"
            />
          </div>
        </q-tab-panel>

        <q-tab-panel name="institucional" class="panel-pad">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Tipo</div>
              <div class="info-valor">{{ tipoTexto }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado</div>
              <div class="info-valor">
                <q-badge color="positive" text-color="white">Aprobado</q-badge>
              </div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha de alta</div>
              <div class="info-valor">{{ fechaAlta }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Último acceso</div>
              <div class="info-valor">{{ ultimoLogin }}</div>
            </div>
          </div>

          <div class="section-title q-mt-lg">
            <q-icon name="menu_book" size="20px" />
            <span>Materias a cargo ({{ datosInstitucionales.materias.length }})</span>
          </div>

          <div v-if="datosInstitucionales.materias.length" class="materias-grid">
            <q-card
              v-for="m in datosInstitucionales.materias"
              :key="m.id"
              flat
              bordered
              class="materia-mini"
            >
              <q-card-section>
                <div class="materia-nombre">{{ m.nombre }}</div>
                <div class="materia-codigo">{{ m.codigo }}</div>
              </q-card-section>
            </q-card>
          </div>
          <div v-else class="text-muted">Sin materias asignadas</div>
        </q-tab-panel>
      </q-tab-panels>

    </div>
  </q-page>
</template>

<style scoped>
.perfil-page {
  background: var(--bg);
  min-height: calc(100vh - 68px);
}

.perfil-content {
  max-width: 900px;
  margin: 0 auto;
  padding: 34px 34px 40px;
}

.page-heading { margin-bottom: 24px; }

.eyebrow {
  color: var(--primary);
  font-size: 10px;
  font-weight: 750;
  letter-spacing: 1.5px;
}

h1 {
  margin: 8px 0 5px;
  color: var(--text);
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 750;
  letter-spacing: -1px;
}

.page-heading p {
  margin: 0;
  color: var(--text-muted);
  font-size: 13px;
}

.card-avatar {
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 14px;
  margin-bottom: 20px;
}

.avatar-head {
  display: flex;
  align-items: center;
  gap: 20px;
}

.avatar-grande {
  color: white;
  background: var(--primary);
  font-weight: 700;
  font-size: 32px;
  flex-shrink: 0;
  border: 3px solid var(--primary-soft);
}

.avatar-grande img { object-fit: cover; width: 100%; height: 100%; border-radius: 50%; display: block; }

.avatar-nombre {
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.02em;
}

.avatar-rol {
  margin-top: 3px;
  color: var(--text-muted);
  font-size: 13px;
}

.tabs-custom {
  background: var(--bg-elevated);
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
}

.tabs-custom .q-tab { font-weight: 600; font-size: 13px; }

.panels-custom {
  background: var(--bg-elevated);
  border-bottom-left-radius: 12px;
  border-bottom-right-radius: 12px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.04);
}

.panel-pad { padding: 28px; }

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.field-full { grid-column: 1 / -1; }

.acciones {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.acciones .q-btn {
  text-transform: none;
  font-weight: 600;
  border-radius: 8px;
  padding: 8px 22px;
}

.banner-error {
  background: var(--error-bg);
  color: var(--error);
  border: 1px solid var(--error);
  border-radius: 8px;
}

.banner-info {
  background: var(--info-bg);
  color: var(--info);
  border: 1px solid var(--info);
  border-radius: 8px;
  font-size: 12.5px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text);
  font-size: 14px;
  font-weight: 700;
}

.section-title .q-icon { color: var(--primary); }

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
}

.info-item {
  padding: 14px 16px;
  background: var(--bg-hover);
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
}

.info-label {
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.info-valor {
  color: var(--text);
  font-size: 14px;
  font-weight: 600;
}

.materias-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.materia-mini {
  background: var(--bg-elevated);
  border-color: var(--border);
  border-radius: 10px;
  transition: border-color 0.2s, transform 0.2s;
}

.materia-mini:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}

.materia-nombre {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.3;
}

.materia-codigo {
  margin-top: 5px;
  color: var(--text-muted);
  font-size: 11px;
  font-weight: 500;
}

.text-muted {
  color: var(--text-muted);
  font-size: 13px;
  font-style: italic;
}

@media (max-width: 700px) {
  .perfil-content { padding: 20px 16px 30px; }
  .avatar-head { flex-direction: column; text-align: center; }
  .form-grid { grid-template-columns: 1fr; }
  .panel-pad { padding: 20px 16px; }
  .acciones { justify-content: stretch; }
  .acciones .q-btn { width: 100%; }
}
</style>
