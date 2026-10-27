<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.js';
import { loginSchema } from '../../api/auth.schema.js';
import { normalizarUsuario, contienePatronSospechoso } from '../../utils/sanitizar.js';
import { useValidacion } from '../../composables/useValidacion.js';

const router = useRouter();
const auth = useAuthStore();
const usuario = ref('');
const contrasena = ref('');
const error = ref('');
const cargando = ref(false);
const mostrarContrasena = ref(false);
const formRef = ref(null);

const RUTAS_POR_TIPO = {
  alumno: '/alumno',
  docente: '/docente',
  coordinador: '/coordinador',
  admin: '/admin',
};

const { errores, validar: validarSchema } = useValidacion(loginSchema);

const reglasUsuario = [
  (v) => !!v?.trim() || 'Ingresá tu usuario o email',
  (v) => (v?.trim().length ?? 0) >= 3 || 'Mínimo 3 caracteres',
  (v) => !contienePatronSospechoso(v) || 'Caracteres no permitidos',
];

const reglasContrasena = [
  (v) => !!v || 'Ingresá tu contraseña',
  (v) => (v?.length ?? 0) >= 6 || 'Mínimo 6 caracteres',
];

async function enviarFormulario() {
  error.value = '';

  const valido = await formRef.value.validate();
  if (!valido) return;

  if (contienePatronSospechoso(usuario.value)) {
    error.value = 'El usuario o email contiene caracteres no permitidos';
    return;
  }

  const usuarioNormalizado = normalizarUsuario(usuario.value);

  const resultado = validarSchema({
    usuario: usuarioNormalizado,
    contrasena: contrasena.value,
  });

  if (!resultado.ok) {
    const primerCampo = Object.keys(resultado.errores)[0];
    error.value = resultado.errores[primerCampo];
    return;
  }

  cargando.value = true;
  try {
    const usuarioLogueado = await auth.login(usuarioNormalizado, contrasena.value);
    const destino = RUTAS_POR_TIPO[usuarioLogueado.tipo] || '/';
    await router.push(destino);
  } catch (e) {
    error.value = e.response?.data?.error || 'Usuario o contraseña incorrectos';
    contrasena.value = '';
  } finally {
    cargando.value = false;
  }
}

const irARegistro = () => router.push('/registro');
const irARecuperar = () => router.push('/recuperar-password');
</script>

<template>
  <div class="login-page">
    <div class="login-card">

      <header class="login-head">
        <div class="brand-mark">
          <q-icon name="school" size="26px" />
        </div>
        <h1>Iniciar sesión</h1>
        <p>Ingresá con tu cuenta para continuar.</p>
      </header>

      <q-form
        ref="formRef"
        class="login-form"
        greedy
        @submit.prevent="enviarFormulario"
      >
        <q-input
          v-model="usuario"
          outlined
          dense
          hide-bottom-space
          autocomplete="username"
          placeholder="Usuario o email"
          aria-label="Usuario o email"
          :rules="reglasUsuario"
          lazy-rules
          :disable="cargando"
          :error="!!errores.usuario"
          :error-message="errores.usuario"
        >
          <template #prepend>
            <q-icon name="person_outline" size="18px" aria-hidden="true" />
          </template>
        </q-input>

        <q-input
          v-model="contrasena"
          outlined
          dense
          hide-bottom-space
          autocomplete="current-password"
          placeholder="Contraseña"
          aria-label="Contraseña"
          :type="mostrarContrasena ? 'text' : 'password'"
          :rules="reglasContrasena"
          lazy-rules
          :disable="cargando"
          :error="!!errores.contrasena"
          :error-message="errores.contrasena"
        >
          <template #prepend>
            <q-icon name="lock_outline" size="18px" aria-hidden="true" />
          </template>
          <template #append>
            <q-icon
              :name="mostrarContrasena ? 'visibility_off' : 'visibility'"
              size="18px"
              class="cursor-pointer"
              :aria-label="mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              role="button"
              tabindex="0"
              @click="mostrarContrasena = !mostrarContrasena"
            />
          </template>
        </q-input>

        <div class="recuperar">
          <a @click="irARecuperar">¿Olvidaste tu contraseña?</a>
        </div>

        <q-banner
          v-if="error"
          class="error-banner"
          dense
          rounded
          role="alert"
        >
          <template #avatar>
            <q-icon name="error_outline" size="18px" aria-hidden="true" />
          </template>
          {{ error }}
        </q-banner>

        <q-btn
          type="submit"
          unelevated
          no-caps
          color="primary"
          label="Iniciar sesión"
          class="btn-primary full-width"
          :loading="cargando"
          :disable="cargando"
        />
      </q-form>

      <p class="register-row">
        ¿No tenés cuenta?
        <a class="link-register" @click="irARegistro">Registrate</a>
      </p>
    </div>

    <footer class="page-footer">
      <span>EvalBot</span>
      <span class="dot">·</span>
      <span>{{ new Date().getFullYear() }}</span>
    </footer>
  </div>
</template>

<style scoped>
.login-page {
  --rojo: var(--primary);
  --rojo-hover: var(--primary-hover);
  --fondo: var(--bg);
  --blanco: var(--bg-elevated);
  --negro: var(--text);
  --gris: var(--text-muted);
  --borde: var(--border);
  --texto-secundario: var(--text-secondary);

  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 1.25rem;
  background: var(--fondo);
  color: var(--negro);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.login-card {
  width: 100%;
  max-width: 380px;
  padding: 2rem 1.75rem 1.75rem;
  background: var(--blanco);
  border: 1px solid var(--borde);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
  animation: entrada 0.3s ease-out;
}

@keyframes entrada {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.login-head {
  text-align: center;
  margin-bottom: 1.5rem;
}

.brand-mark {
  display: inline-grid;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-bottom: 0.75rem;
  border-radius: 12px;
  background: var(--rojo);
  color: white;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--primary) 18%, transparent);
}

.login-head h1 {
  margin: 0 0 0.35rem;
  font-size: 1.4rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.login-head p {
  margin: 0;
  color: var(--texto-secundario);
  font-size: 0.84rem;
  line-height: 1.5;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.login-form :deep(.q-field--outlined .q-field__control) {
  border-radius: 8px;
  min-height: 42px;
  background: var(--blanco);
}

.login-form :deep(.q-field--outlined .q-field__control::before) {
  border: 1px solid var(--border);
  transition: border-color 0.2s, box-shadow 0.2s;
}

.login-form :deep(.q-field--outlined:hover .q-field__control::before) {
  border-color: var(--border-strong);
}

.login-form :deep(.q-field--outlined.q-field--focused .q-field__control::before) {
  border-color: var(--rojo);
}

.login-form :deep(.q-field--outlined.q-field--focused .q-field__control::after) {
  display: none;
}

.login-form :deep(.q-field--focused) {
  filter: drop-shadow(0 0 0 3px color-mix(in srgb, var(--primary) 9%, transparent));
}

.login-form :deep(.q-field__prepend) {
  padding-right: 0;
  padding-left: 11px;
}

.login-form :deep(.q-field__append) {
  padding-right: 8px;
  padding-left: 0;
}

.login-form :deep(.q-field__native) {
  padding: 9px 10px;
  font-size: 0.9rem;
  color: var(--negro);
}

.login-form :deep(.q-field__native::placeholder) {
  color: var(--text-disabled);
  opacity: 1;
}

.login-form :deep(.q-icon) {
  color: var(--text-muted);
  transition: color 0.2s;
}

.login-form :deep(.q-field--focused .q-icon) {
  color: var(--rojo);
}

.login-form :deep(.q-field__native:-webkit-autofill),
.login-form :deep(.q-field__native:-webkit-autofill:hover),
.login-form :deep(.q-field__native:-webkit-autofill:focus) {
  -webkit-box-shadow: 0 0 0 1000px var(--blanco) inset !important;
  -webkit-text-fill-color: var(--negro) !important;
  transition: background-color 5000s ease-in-out 0s;
  caret-color: var(--negro);
}

.recuperar {
  display: flex;
  justify-content: flex-end;
  margin-top: -0.1rem;
}

.recuperar a {
  color: var(--texto-secundario);
  font-size: 0.78rem;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
}

.recuperar a:hover {
  color: var(--rojo);
  text-decoration: underline;
}

.btn-primary {
  height: 42px;
  margin-top: 0.15rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  text-transform: none;
  box-shadow: 0 3px 10px color-mix(in srgb, var(--primary) 16%, transparent);
}

.btn-primary:hover {
  box-shadow: 0 5px 14px color-mix(in srgb, var(--primary) 22%, transparent);
}

.error-banner {
  background: var(--error-bg);
  color: var(--error);
  border: 1px solid var(--border);
  font-size: 0.8rem;
  line-height: 1.45;
}

.error-banner :deep(.q-banner__avatar) {
  color: var(--rojo);
}

.register-row {
  margin: 1.25rem 0 0;
  color: var(--texto-secundario);
  font-size: 0.8rem;
  text-align: center;
}

.link-register {
  margin-left: 0.3rem;
  color: var(--rojo);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
}

.link-register:hover {
  color: var(--rojo-hover);
  text-decoration: underline;
}

.page-footer {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 1.25rem;
  color: var(--text-muted);
  font-size: 0.7rem;
  text-align: center;
}

.page-footer .dot {
  color: var(--border-strong);
}

@media (max-width: 480px) {
  .login-page { padding: 1rem 0.85rem; }
  .login-card { padding: 1.6rem 1.25rem 1.4rem; border-radius: 10px; }
  .login-head h1 { font-size: 1.25rem; }
}
</style>