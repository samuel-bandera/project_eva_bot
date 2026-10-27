<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import { useAuthStore } from '../../stores/auth.store.js';
import * as authApi from '../../api/auth.api.js';
import {
  registroPaso1Schema,
  registroPaso2Schema,
  registroPaso3Schema,
} from '../../api/auth.schema.js';

const router = useRouter();
const auth = useAuthStore();

const pasoActual = ref(1);
const pasoTotal = 4;
const cargando = ref(false);
const error = ref('');

const form = ref({
  tipo: 'alumno',
  nombre: '',
  apellido: '',
  cedula: '',
  email: '',
  codigoEmail: '',
  telefono: '',
  usuario: '',
  contrasena: '',
  confirmar: '',
  codigoProfesor: '',
});

const errores = ref({});

const codigoEnviado = ref(false);
const segundosEspera = ref(0);
let timerCodigo = null;
const codigoVerificado = ref(false);

const mostrarPass = ref(false);
const mostrarConfirmar = ref(false);

const esProfesor = computed(() => form.value.tipo === 'docente');

const puedeEnviarCodigo = computed(() =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.value.email.trim()) && segundosEspera.value === 0
);

const fuerzaContrasena = computed(() => {
  const p = form.value.contrasena;
  if (!p) return { nivel: 0, texto: '', color: 'grey-4' };
  let puntos = 0;
  if (p.length >= 8) puntos++;
  if (p.length >= 12) puntos++;
  if (/[A-Z]/.test(p)) puntos++;
  if (/[a-z]/.test(p)) puntos++;
  if (/\d/.test(p)) puntos++;
  if (/[@$!%*?&]/.test(p)) puntos++;

  if (puntos <= 2) return { nivel: 1, texto: 'Débil', color: 'negative' };
  if (puntos <= 4) return { nivel: 2, texto: 'Aceptable', color: 'warning' };
  if (puntos <= 5) return { nivel: 3, texto: 'Fuerte', color: 'primary' };
  return { nivel: 4, texto: 'Muy fuerte', color: 'positive' };
});

const pasos = computed(() => [
  { num: 1, label: 'Identificación', icon: 'badge' },
  { num: 2, label: 'Contacto', icon: 'email' },
  { num: 3, label: 'Cuenta', icon: 'vpn_key' },
  { num: 4, label: 'Confirmar', icon: 'check_circle' },
]);

function validarPaso1() {
  errores.value = {};
  const resultado = registroPaso1Schema.safeParse({
    nombre: form.value.nombre,
    apellido: form.value.apellido,
    tipo: form.value.tipo,
  });

  if (!resultado.success) {
    resultado.error.issues.forEach((issue) => {
      errores.value[issue.path[0]] = issue.message;
    });
    return false;
  }
  return true;
}

function validarPaso2() {
  errores.value = {};

  if (!codigoVerificado.value) {
    errores.value.codigoEmail = 'Debés verificar el email antes de continuar';
    return false;
  }

  const resultado = registroPaso2Schema.safeParse({
    email: form.value.email,
    codigoEmail: form.value.codigoEmail,
    telefono: form.value.telefono || null,
    cedula: form.value.cedula || null,
  });

  if (!resultado.success) {
    resultado.error.issues.forEach((issue) => {
      errores.value[issue.path[0]] = issue.message;
    });
    return false;
  }
  return true;
}

function validarPaso3() {
  errores.value = {};
  const resultado = registroPaso3Schema.safeParse({
    usuario: form.value.usuario,
    contrasena: form.value.contrasena,
    confirmar: form.value.confirmar,
    codigoProfesor: form.value.codigoProfesor,
    tipo: form.value.tipo,
  });

  if (!resultado.success) {
    resultado.error.issues.forEach((issue) => {
      errores.value[issue.path[0]] = issue.message;
    });
    return false;
  }
  return true;
}

async function solicitarCodigo() {
  error.value = '';
  if (!puedeEnviarCodigo.value) return;

  try {
    const resultado = await authApi.solicitarCodigo(form.value.email.trim().toLowerCase());
    codigoEnviado.value = true;
    iniciarCountdown(60);

    if (resultado.data?.codigo) {
      Notify.create({
        message: `Código (dev): ${resultado.data.codigo}`,
        caption: 'En producción se envía por email',
        color: 'info',
        icon: 'code',
        timeout: 15000,
        position: 'top-right',
      });
    } else {
      Notify.create({
        message: 'Código enviado. Revisá tu email.',
        color: 'positive',
        icon: 'email',
      });
    }
  } catch (e) {
    error.value = e.error || 'No se pudo enviar el código';
    Notify.create({ message: error.value, color: 'negative', icon: 'error' });
  }
}

async function verificarCodigo() {
  error.value = '';
  if (form.value.codigoEmail.length !== 6) {
    errores.value.codigoEmail = 'Ingresá el código de 6 dígitos';
    return;
  }

  try {
    await authApi.verificarCodigoEmail(form.value.email.trim().toLowerCase(), form.value.codigoEmail);
    codigoVerificado.value = true;
    delete errores.value.codigoEmail;
    Notify.create({
      message: 'Email verificado',
      color: 'positive',
      icon: 'verified',
    });
  } catch (e) {
    errores.value.codigoEmail = e.error || 'Código inválido';
    codigoVerificado.value = false;
  }
}

function iniciarCountdown(segundos) {
  segundosEspera.value = segundos;
  if (timerCodigo) clearInterval(timerCodigo);

  timerCodigo = setInterval(() => {
    segundosEspera.value--;
    if (segundosEspera.value <= 0) {
      clearInterval(timerCodigo);
      timerCodigo = null;
    }
  }, 1000);
}

function siguientePaso() {
  error.value = '';
  let valido = false;

  if (pasoActual.value === 1) valido = validarPaso1();
  else if (pasoActual.value === 2) valido = validarPaso2();
  else if (pasoActual.value === 3) valido = validarPaso3();

  if (!valido) return;

  if (pasoActual.value < pasoTotal) {
    pasoActual.value++;
  }
}

function pasoAnterior() {
  error.value = '';
  errores.value = {};
  if (pasoActual.value > 1) {
    pasoActual.value--;
  } else {
    router.push('/login');
  }
}

async function registrar() {
  error.value = '';
  cargando.value = true;

  try {
    await auth.register({
      nombre: form.value.nombre.trim(),
      apellido: form.value.apellido.trim(),
      usuario: form.value.usuario.trim().toLowerCase(),
      email: form.value.email.trim().toLowerCase(),
      contrasena: form.value.contrasena,
      tipo: form.value.tipo,
      cedula: form.value.cedula?.trim() || null,
      telefono: form.value.telefono?.trim() || null,
      codigoProfesor: esProfesor.value ? form.value.codigoProfesor?.trim() : null,
      codigoEmail: form.value.codigoEmail,
    });

    Notify.create({
      message: esProfesor.value
        ? 'Cuenta de profesor creada. Ya podés iniciar sesión.'
        : 'Cuenta creada. Esperando aprobación del coordinador.',
      color: 'positive',
      icon: 'check_circle',
      timeout: 6000,
    });

    router.push('/login');
  } catch (e) {
    error.value = e.response?.data?.error || e.error || 'No se pudo crear la cuenta';
    Notify.create({ message: error.value, color: 'negative', icon: 'error' });
  } finally {
    cargando.value = false;
  }
}

function irALogin() {
  router.push('/login');
}

onBeforeUnmount(() => {
  if (timerCodigo) clearInterval(timerCodigo);
});

onMounted(() => {
});
</script>

<template>
  <div class="register-page">
    <div class="register-card">

      <header class="register-head">
        <div class="brand-mark">
          <q-icon name="school" size="26px" />
        </div>
        <h1>Crear cuenta</h1>
        <p class="subtitle">Completá los 4 pasos para registrarte en EvalBot.</p>
      </header>

      <nav class="stepper" aria-label="Progreso del registro">
        <div
          v-for="(p, i) in pasos"
          :key="p.num"
          class="step"
          :class="{
            activo: pasoActual === p.num,
            completado: pasoActual > p.num,
          }"
        >
          <div class="step-circle">
            <q-icon v-if="pasoActual > p.num" name="check" size="16px" />
            <span v-else>{{ p.num }}</span>
          </div>
          <div class="step-label">{{ p.label }}</div>
          <div v-if="i < pasos.length - 1" class="step-line" />
        </div>
      </nav>

      <q-banner v-if="error" class="banner-error" rounded dense>
        <template #avatar><q-icon name="error_outline" /></template>
        {{ error }}
      </q-banner>

      <section v-if="pasoActual === 1" class="paso">
        <h2 class="paso-titulo">Datos personales</h2>
        <p class="paso-desc">Contanos quién sos para crear tu cuenta.</p>

        <div class="tipo-selector">
          <button
            type="button"
            class="tipo-card"
            :class="{ activo: form.tipo === 'alumno' }"
            @click="form.tipo = 'alumno'"
          >
            <q-icon name="school" size="24px" />
            <div>
              <strong>Alumno</strong>
              <span>Voy a rendir exámenes</span>
            </div>
          </button>

          <button
            type="button"
            class="tipo-card"
            :class="{ activo: form.tipo === 'docente' }"
            @click="form.tipo = 'docente'"
          >
            <q-icon name="cast_for_education" size="24px" />
            <div>
              <strong>Profesor</strong>
              <span>Necesito código de invitación</span>
            </div>
          </button>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label for="nombre">Nombre *</label>
            <input
              id="nombre"
              v-model="form.nombre"
              type="text"
              placeholder="Ej: Matías"
              maxlength="50"
              :class="{ 'input-error': errores.nombre }"
              autofocus
            />
            <span v-if="errores.nombre" class="error-msg">{{ errores.nombre }}</span>
          </div>

          <div class="form-group">
            <label for="apellido">Apellido *</label>
            <input
              id="apellido"
              v-model="form.apellido"
              type="text"
              placeholder="Ej: González"
              maxlength="50"
              :class="{ 'input-error': errores.apellido }"
            />
            <span v-if="errores.apellido" class="error-msg">{{ errores.apellido }}</span>
          </div>
        </div>

        <div class="form-group">
          <label for="cedula">Cédula <span class="opcional">(opcional)</span></label>
          <input
            id="cedula"
            v-model="form.cedula"
            type="text"
            placeholder="Ej: 1.234.567-8"
            maxlength="12"
            :class="{ 'input-error': errores.cedula }"
          />
          <span class="hint">Si la ingresás, validamos el formato uruguayo.</span>
          <span v-if="errores.cedula" class="error-msg">{{ errores.cedula }}</span>
        </div>
      </section>

      <section v-if="pasoActual === 2" class="paso">
        <h2 class="paso-titulo">Contacto y verificación</h2>
        <p class="paso-desc">Verificá tu email para confirmar que sos real.</p>

        <div class="form-group">
          <label for="email">Email *</label>
          <div class="email-row">
            <input
              id="email"
              v-model="form.email"
              type="email"
              placeholder="tu@email.com"
              :class="{ 'input-error': errores.email }"
              :disabled="codigoVerificado"
            />
            <button
              type="button"
              class="btn-codigo"
              :disabled="!puedeEnviarCodigo || codigoVerificado"
              @click="solicitarCodigo"
            >
              <q-icon :name="codigoVerificado ? 'verified' : 'send'" size="16px" />
              <span v-if="codigoVerificado">Verificado</span>
              <span v-else-if="segundosEspera > 0">Esperar {{ segundosEspera }}s</span>
              <span v-else-if="codigoEnviado">Reenviar</span>
              <span v-else>Enviar código</span>
            </button>
          </div>
          <span v-if="errores.email" class="error-msg">{{ errores.email }}</span>
        </div>

        <div v-if="codigoEnviado && !codigoVerificado" class="form-group codigo-group">
          <label for="codigoEmail">Código de verificación *</label>
          <div class="codigo-row">
            <input
              id="codigoEmail"
              v-model="form.codigoEmail"
              type="text"
              inputmode="numeric"
              placeholder="000000"
              maxlength="6"
              class="codigo-input"
              :class="{ 'input-error': errores.codigoEmail }"
            />
            <button
              type="button"
              class="btn-verificar"
              :disabled="form.codigoEmail.length !== 6"
              @click="verificarCodigo"
            >
              <q-icon name="check" size="16px" />
              Verificar
            </button>
          </div>
          <span class="hint">
            <q-icon name="info" size="14px" />
            Revisá la consola del backend si estás en desarrollo (el código se imprime ahí).
          </span>
          <span v-if="errores.codigoEmail" class="error-msg">{{ errores.codigoEmail }}</span>
        </div>

        <div class="form-group">
          <label for="telefono">Teléfono <span class="opcional">(opcional)</span></label>
          <input
            id="telefono"
            v-model="form.telefono"
            type="tel"
            placeholder="Ej: 099 123 456"
            maxlength="20"
            :class="{ 'input-error': errores.telefono }"
          />
          <span class="hint">Formatos aceptados: 09XXXXXXX, 2XXXXXXX, 4XXXXXXX</span>
          <span v-if="errores.telefono" class="error-msg">{{ errores.telefono }}</span>
        </div>
      </section>

      <section v-if="pasoActual === 3" class="paso">
        <h2 class="paso-titulo">Datos de la cuenta</h2>
        <p class="paso-desc">Elegí tu usuario y contraseña para iniciar sesión.</p>

        <div v-if="esProfesor" class="form-group codigo-profesor">
          <label for="codigoProfesor">
            Código de invitación *
            <q-icon name="info" size="14px">
              <q-tooltip>El coordinador debe darte este código para registrarte como profesor.</q-tooltip>
            </q-icon>
          </label>
          <input
            id="codigoProfesor"
            v-model="form.codigoProfesor"
            type="text"
            placeholder="PROF-XXXX-XXXX"
            maxlength="30"
            class="codigo-input"
            :class="{ 'input-error': errores.codigoProfesor }"
          />
          <span class="hint">
            <q-icon name="warning" size="14px" />
            Sin código válido no se puede registrar un profesor.
          </span>
          <span v-if="errores.codigoProfesor" class="error-msg">{{ errores.codigoProfesor }}</span>
        </div>

        <div class="form-group">
          <label for="usuario">Usuario *</label>
          <input
            id="usuario"
            v-model="form.usuario"
            type="text"
            placeholder="Ej: m.gonzalez"
            maxlength="20"
            autocapitalize="off"
            :class="{ 'input-error': errores.usuario }"
          />
          <span class="hint">Solo letras, números, puntos y guiones. Mínimo 4 caracteres.</span>
          <span v-if="errores.usuario" class="error-msg">{{ errores.usuario }}</span>
        </div>

        <div class="form-group">
          <label for="contrasena">Contraseña *</label>
          <div class="pass-input-wrap">
            <input
              id="contrasena"
              v-model="form.contrasena"
              :type="mostrarPass ? 'text' : 'password'"
              placeholder="Mínimo 8 caracteres"
              maxlength="100"
              :class="{ 'input-error': errores.contrasena }"
            />
            <button
              type="button"
              class="toggle-pass"
              :aria-label="mostrarPass ? 'Ocultar' : 'Mostrar'"
              @click="mostrarPass = !mostrarPass"
            >
              <q-icon :name="mostrarPass ? 'visibility_off' : 'visibility'" size="18px" />
            </button>
          </div>

          <div v-if="form.contrasena" class="strength-bar">
            <div class="strength-track">
              <div
                class="strength-fill"
                :class="`nivel-${fuerzaContrasena.nivel}`"
                :style="{ width: `${(fuerzaContrasena.nivel / 4) * 100}%` }"
              />
            </div>
            <span class="strength-text" :class="`color-${fuerzaContrasena.color}`">
              {{ fuerzaContrasena.texto }}
            </span>
          </div>
          <span class="hint">Una mayúscula, una minúscula, un número y un símbolo.</span>
          <span v-if="errores.contrasena" class="error-msg">{{ errores.contrasena }}</span>
        </div>

        <div class="form-group">
          <label for="confirmar">Confirmar contraseña *</label>
          <div class="pass-input-wrap">
            <input
              id="confirmar"
              v-model="form.confirmar"
              :type="mostrarConfirmar ? 'text' : 'password'"
              placeholder="Repetí la contraseña"
              maxlength="100"
              :class="{ 'input-error': errores.confirmar }"
            />
            <button
              type="button"
              class="toggle-pass"
              :aria-label="mostrarConfirmar ? 'Ocultar' : 'Mostrar'"
              @click="mostrarConfirmar = !mostrarConfirmar"
            >
              <q-icon :name="mostrarConfirmar ? 'visibility_off' : 'visibility'" size="18px" />
            </button>
          </div>
          <span v-if="errores.confirmar" class="error-msg">{{ errores.confirmar }}</span>
        </div>
      </section>

      <section v-if="pasoActual === 4" class="paso">
        <h2 class="paso-titulo">Confirmá tus datos</h2>
        <p class="paso-desc">Revisá la información antes de crear la cuenta.</p>

        <div class="preview-card">
          <div class="preview-row">
            <span class="preview-label">Tipo</span>
            <span class="preview-value">
              <q-icon :name="esProfesor ? 'cast_for_education' : 'school'" size="16px" />
              {{ esProfesor ? 'Profesor' : 'Alumno' }}
            </span>
          </div>
          <div class="preview-row">
            <span class="preview-label">Nombre completo</span>
            <span class="preview-value">{{ form.nombre }} {{ form.apellido }}</span>
          </div>
          <div v-if="form.cedula" class="preview-row">
            <span class="preview-label">Cédula</span>
            <span class="preview-value">{{ form.cedula }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">Email</span>
            <span class="preview-value">
              {{ form.email }}
              <q-icon name="verified" size="14px" color="positive" />
            </span>
          </div>
          <div v-if="form.telefono" class="preview-row">
            <span class="preview-label">Teléfono</span>
            <span class="preview-value">{{ form.telefono }}</span>
          </div>
          <div class="preview-row">
            <span class="preview-label">Usuario</span>
            <span class="preview-value">{{ form.usuario }}</span>
          </div>
        </div>

        <q-banner v-if="esProfesor" class="banner-info" rounded dense>
          <template #avatar><q-icon name="info" /></template>
          Los profesores pueden iniciar sesión inmediatamente después del registro.
        </q-banner>

        <q-banner v-else class="banner-info" rounded dense>
          <template #avatar><q-icon name="hourglass_top" /></template>
          Tu cuenta quedará pendiente hasta que un coordinador la apruebe.
        </q-banner>
      </section>

      <footer class="wizard-nav">
        <button
          type="button"
          class="btn-nav btn-back"
          @click="pasoAnterior"
          :disabled="cargando"
        >
          <q-icon name="arrow_back" size="16px" />
          {{ pasoActual === 1 ? 'Volver al login' : 'Atrás' }}
        </button>

        <button
          v-if="pasoActual < pasoTotal"
          type="button"
          class="btn-nav btn-next"
          @click="siguientePaso"
        >
          Siguiente
          <q-icon name="arrow_forward" size="16px" />
        </button>

        <button
          v-else
          type="button"
          class="btn-nav btn-next btn-crear"
          :disabled="cargando"
          @click="registrar"
        >
          <q-spinner v-if="cargando" size="16px" color="white" />
          <q-icon v-else name="check" size="16px" />
          {{ cargando ? 'Creando cuenta…' : 'Crear cuenta' }}
        </button>
      </footer>

    </div>
  </div>
</template>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1.25rem;
  background: var(--bg);
  color: var(--text);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  transition: background-color 0.25s ease, color 0.25s ease;
}

.register-card {
  width: 100%;
  max-width: 540px;
  padding: 2.25rem 2rem 2rem;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  animation: entrada 0.3s ease-out;
}

@keyframes entrada {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.register-head {
  text-align: center;
  margin-bottom: 1.5rem;
}

.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 0.75rem;
  border-radius: 13px;
  background: var(--primary);
  color: white;
  box-shadow: 0 4px 12px rgba(114, 47, 55, 0.25);
}

.register-head h1 {
  margin: 0 0 0.35rem;
  font-size: 1.5rem;
  font-weight: 750;
  color: var(--text);
  letter-spacing: -0.03em;
}

.subtitle {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  margin-bottom: 1.75rem;
  padding: 0 0.25rem;
}

.step {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  opacity: 0.55;
  transition: opacity 0.25s;
}

.step.activo,
.step.completado {
  opacity: 1;
}

.step-circle {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--bg-hover);
  color: var(--text-muted);
  border: 2px solid var(--border);
  font-size: 12px;
  font-weight: 800;
  transition: all 0.25s;
  z-index: 1;
}

.step.activo .step-circle {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 0 0 4px var(--primary-soft);
}

.step.completado .step-circle {
  background: var(--success);
  color: white;
  border-color: var(--success);
}

.step-label {
  margin-top: 6px;
  font-size: 10px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
  line-height: 1.2;
}

.step.activo .step-label {
  color: var(--primary);
}

.step-line {
  position: absolute;
  top: 16px;
  left: calc(50% + 20px);
  right: calc(-50% + 20px);
  height: 2px;
  background: var(--border);
  z-index: 0;
}

.step.completado .step-line {
  background: var(--success);
}

.banner-error {
  background: var(--error-bg);
  color: var(--error);
  border: 1px solid var(--error);
  font-size: 13px;
  margin-bottom: 1rem;
}

.banner-info {
  background: var(--info-bg);
  color: var(--info);
  border: 1px solid var(--info);
  font-size: 12.5px;
  margin-top: 1rem;
}

.paso {
  animation: fadeIn 0.25s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.paso-titulo {
  margin: 0 0 4px;
  font-size: 1.1rem;
  font-weight: 750;
  color: var(--text);
  letter-spacing: -0.02em;
}

.paso-desc {
  margin: 0 0 1.25rem;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.5;
}

.tipo-selector {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 1.25rem;
}

.tipo-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: var(--bg-hover);
  border: 2px solid var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  font-family: inherit;
  color: var(--text);
}

.tipo-card:hover {
  border-color: var(--border-strong);
  background: var(--bg-elevated);
}

.tipo-card.activo {
  border-color: var(--primary);
  background: var(--primary-soft);
  box-shadow: 0 0 0 3px rgba(114, 47, 55, 0.1);
}

.tipo-card .q-icon {
  color: var(--primary);
  flex-shrink: 0;
}

.tipo-card div {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tipo-card strong {
  font-size: 13px;
  font-weight: 700;
  color: var(--text);
  line-height: 1.2;
}

.tipo-card span {
  margin-top: 2px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.3;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 1.1rem;
}

.form-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.opcional {
  font-weight: 400;
  color: var(--text-muted);
  font-size: 11px;
}

.form-group input,
.form-group textarea {
  padding: 10px 12px;
  background: var(--bg-elevated);
  border: 1.5px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  font-family: inherit;
  font-size: 13.5px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}

.form-group input:disabled {
  background: var(--bg-hover);
  color: var(--text-muted);
  cursor: not-allowed;
}

.form-group input.input-error {
  border-color: var(--error);
}

.form-group input::placeholder {
  color: var(--text-disabled);
}

.hint {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.4;
}

.error-msg {
  font-size: 11.5px;
  color: var(--error);
  font-weight: 500;
}

.email-row {
  display: flex;
  gap: 8px;
  align-items: stretch;
}

.email-row input {
  flex: 1;
}

.btn-codigo {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background: var(--primary);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
  box-shadow: 0 2px 6px rgba(114, 47, 55, 0.2);
}

.btn-codigo:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
}

.btn-codigo:disabled {
  background: var(--bg-hover);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
}

.codigo-group {
  padding: 12px;
  background: var(--bg-hover);
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
}

.codigo-row {
  display: flex;
  gap: 8px;
  margin-bottom: 6px;
}

.codigo-input {
  font-family: 'JetBrains Mono', 'Courier New', monospace;
  font-size: 18px;
  letter-spacing: 0.3em;
  text-align: center;
  font-weight: 800;
  padding: 10px 12px;
  flex: 1;
}

.btn-verificar {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: var(--success);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  box-shadow: 0 2px 6px rgba(46, 125, 50, 0.2);
}

.btn-verificar:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

.btn-verificar:disabled {
  background: var(--bg-hover);
  color: var(--text-muted);
  cursor: not-allowed;
  box-shadow: none;
}

.pass-input-wrap {
  position: relative;
}

.pass-input-wrap input {
  width: 100%;
  padding-right: 42px;
}

.toggle-pass {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.toggle-pass:hover {
  color: var(--primary);
  background: var(--primary-soft);
}

.strength-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}

.strength-track {
  flex: 1;
  height: 4px;
  background: var(--bg-hover);
  border-radius: 999px;
  overflow: hidden;
}

.strength-fill {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease, background-color 0.3s ease;
}

.strength-fill.nivel-1 { background: var(--error); width: 25%; }
.strength-fill.nivel-2 { background: var(--warning); width: 50%; }
.strength-fill.nivel-3 { background: var(--info); width: 75%; }
.strength-fill.nivel-4 { background: var(--success); width: 100%; }

.strength-text {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 80px;
  text-align: right;
}

.color-negative { color: var(--error); }
.color-warning  { color: var(--warning); }
.color-primary  { color: var(--primary); }
.color-positive { color: var(--success); }

.preview-card {
  padding: 16px;
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  margin-bottom: 1rem;
}

.preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
}

.preview-row:last-child {
  border-bottom: none;
}

.preview-label {
  font-size: 11.5px;
  color: var(--text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.preview-value {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
  text-align: right;
}

.wizard-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-subtle);
}

.btn-nav {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 18px;
  border-radius: 10px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
  border: 1.5px solid transparent;
}

.btn-back {
  background: transparent;
  color: var(--text-muted);
  border-color: var(--border);
}

.btn-back:hover:not(:disabled) {
  background: var(--bg-hover);
  color: var(--text);
}

.btn-back:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-next {
  background: var(--primary);
  color: white;
  box-shadow: 0 2px 8px rgba(114, 47, 55, 0.25);
}

.btn-next:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(114, 47, 55, 0.3);
}

.btn-next:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-crear {
  background: var(--success);
  box-shadow: 0 2px 8px rgba(46, 125, 50, 0.25);
}

.btn-crear:hover:not(:disabled) {
  background: var(--success);
  filter: brightness(1.1);
}

@media (max-width: 560px) {
  .register-page {
    padding: 1rem;
  }

  .register-card {
    padding: 1.75rem 1.25rem;
    border-radius: 12px;
  }

  .register-head h1 {
    font-size: 1.3rem;
  }

  .stepper {
    gap: 2px;
  }

  .step-label {
    font-size: 9px;
  }

  .tipo-selector {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .email-row {
    flex-direction: column;
  }

  .codigo-row {
    flex-direction: column;
  }

  .wizard-nav {
    flex-direction: column-reverse;
  }

  .btn-nav {
    width: 100%;
    justify-content: center;
  }

  .preview-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .preview-value {
    text-align: left;
  }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
</style>
