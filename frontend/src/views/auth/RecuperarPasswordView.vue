<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { Notify } from 'quasar';
import * as authApi from '../../api/auth.api.js';

const router = useRouter();

const pasoActual = ref(1);
const pasoTotal = 3;

const email = ref('');
const codigo = ref('');
const nuevaContrasena = ref('');
const confirmarContrasena = ref('');
const mostrarPass = ref(false);
const mostrarConfirmar = ref(false);

const cargando = ref(false);
const errores = ref({});
const codigoEnviado = ref(false);
const segundosEspera = ref(0);

const pasos = computed(() => [
  { numero: 1, titulo: 'Email',        icono: 'mail' },
  { numero: 2, titulo: 'Código',       icono: 'pin' },
  { numero: 3, titulo: 'Contraseña',   icono: 'lock' },
]);

const progreso = computed(() => (pasoActual.value / pasoTotal) * 100);

function validarEmail() {
  errores.value = {};
  if (!email.value.trim()) { errores.value.email = 'Ingresá tu email'; return false; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) {
    errores.value.email = 'Formato de email inválido';
    return false;
  }
  return true;
}

function validarCodigo() {
  errores.value = {};
  if (!codigo.value.trim()) { errores.value.codigo = 'Ingresá el código'; return false; }
  if (!/^\d{6}$/.test(codigo.value)) {
    errores.value.codigo = 'El código tiene 6 dígitos';
    return false;
  }
  return true;
}

function validarPassword() {
  errores.value = {};
  if (!nuevaContrasena.value) { errores.value.nuevaContrasena = 'Ingresá una contraseña'; return false; }
  if (nuevaContrasena.value.length < 8) {
    errores.value.nuevaContrasena = 'Mínimo 8 caracteres';
    return false;
  }
  if (!/[A-Z]/.test(nuevaContrasena.value)) {
    errores.value.nuevaContrasena = 'Al menos una mayúscula';
    return false;
  }
  if (!/[0-9]/.test(nuevaContrasena.value)) {
    errores.value.nuevaContrasena = 'Al menos un número';
    return false;
  }
  if (nuevaContrasena.value !== confirmarContrasena.value) {
    errores.value.confirmarContrasena = 'Las contraseñas no coinciden';
    return false;
  }
  return true;
}

async function solicitarCodigo() {
  if (!validarEmail()) return;
  cargando.value = true;
  try {
    await authApi.solicitarCodigo(email.value, 'reset');
    codigoEnviado.value = true;
    Notify.create({ type: 'positive', message: 'Código enviado. Revisá tu email.', position: 'top' });
    pasoActual.value = 2;
    iniciarCuentaRegresiva();
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.error || 'No se pudo enviar el código',
      position: 'top',
    });
  } finally {
    cargando.value = false;
  }
}

function avanzarAContrasena() {
  if (!validarCodigo()) return;
  pasoActual.value = 3;
}

async function cambiarPassword() {
  if (!validarPassword()) return;
  cargando.value = true;
  try {
    await authApi.resetearPassword({
      email: email.value,
      codigo: codigo.value,
      nuevaContrasena: nuevaContrasena.value,
    });
    Notify.create({
      type: 'positive',
      message: 'Contraseña actualizada. Iniciá sesión con la nueva.',
      position: 'top',
      timeout: 3000,
    });
    setTimeout(() => router.push('/login'), 800);
  } catch (e) {
    Notify.create({
      type: 'negative',
      message: e.response?.data?.error || 'No se pudo cambiar la contraseña',
      position: 'top',
    });
  } finally {
    cargando.value = false;
  }
}

function pasoAnterior() {
  if (pasoActual.value > 1) {
    errores.value = {};
    pasoActual.value--;
  }
}

function iniciarCuentaRegresiva() {
  segundosEspera.value = 60;
  const timer = setInterval(() => {
    segundosEspera.value--;
    if (segundosEspera.value <= 0) clearInterval(timer);
  }, 1000);
}

function reenviarCodigo() {
  if (segundosEspera.value > 0) return;
  solicitarCodigo();
}
</script>

<template>
  <div class="recuperar-page">
    <q-card class="recuperar-card">
      <q-card-section class="q-pb-sm">
        <div class="text-h5 text-weight-bold text-primary q-mb-xs">
          Recuperar contraseña
        </div>
        <div class="text-caption text-grey-7 q-mb-md">
          Paso {{ pasoActual }} de {{ pasoTotal }}
        </div>

        <q-linear-progress
          :value="progreso / 100"
          color="primary"
          track-color="grey-3"
          size="6px"
          rounded
        />

        <div class="row q-mt-md q-gutter-x-sm">
          <div
            v-for="p in pasos"
            :key="p.numero"
            class="paso-indicator"
            :class="{
              'paso-activo': pasoActual === p.numero,
              'paso-completo': pasoActual > p.numero,
            }"
          >
            <q-icon
              :name="pasoActual > p.numero ? 'check_circle' : p.icono"
              size="18px"
            />
            <span>{{ p.titulo }}</span>
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-pt-md">
        <div v-if="pasoActual === 1">
          <div class="text-body2 text-grey-8 q-mb-md">
            Ingresá tu email institucional. Te enviaremos un código de 6 dígitos para verificar tu identidad.
          </div>
          <q-input
            v-model="email"
            outlined
            label="Email institucional"
            type="email"
            :error="!!errores.email"
            :error-message="errores.email"
            :disable="cargando"
            autofocus
            @keyup.enter="solicitarCodigo"
          >
            <template #prepend><q-icon name="mail" /></template>
          </q-input>

          <q-btn
            unelevated
            no-caps
            color="primary"
            label="Enviar código"
            icon="send"
            class="full-width q-mt-lg"
            :loading="cargando"
            :disable="cargando"
            @click="solicitarCodigo"
          />
        </div>

        <div v-else-if="pasoActual === 2">
          <div class="text-body2 text-grey-8 q-mb-md">
            Ingresá el código de 6 dígitos que enviamos a <strong>{{ email }}</strong>.
          </div>
          <q-input
            v-model="codigo"
            outlined
            label="Código de verificación"
            maxlength="6"
            inputmode="numeric"
            :error="!!errores.codigo"
            :error-message="errores.codigo"
            :disable="cargando"
            autofocus
            @keyup.enter="avanzarAContrasena"
          >
            <template #prepend><q-icon name="pin" /></template>
          </q-input>

          <div class="row items-center justify-between q-mt-md">
            <div class="text-caption text-grey-7">
              <template v-if="segundosEspera > 0">
                Reenviar en {{ segundosEspera }}s
              </template>
              <template v-else>
                ¿No recibiste el código?
              </template>
            </div>
            <q-btn
              flat
              dense
              no-caps
              color="primary"
              label="Reenviar código"
              :disable="segundosEspera > 0 || cargando"
              @click="reenviarCodigo"
            />
          </div>

          <div class="row q-gutter-sm q-mt-lg">
            <q-btn
              outline
              no-caps
              color="grey-7"
              label="Volver"
              icon="arrow_back"
              @click="pasoAnterior"
              class="col"
            />
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Continuar"
              icon-right="arrow_forward"
              class="col"
              :disable="cargando"
              @click="avanzarAContrasena"
            />
          </div>
        </div>

        <div v-else-if="pasoActual === 3">
          <div class="text-body2 text-grey-8 q-mb-md">
            Elegí una nueva contraseña segura.
          </div>

          <q-input
            v-model="nuevaContrasena"
            outlined
            label="Nueva contraseña"
            :type="mostrarPass ? 'text' : 'password'"
            :error="!!errores.nuevaContrasena"
            :error-message="errores.nuevaContrasena"
            :disable="cargando"
            autofocus
          >
            <template #prepend><q-icon name="lock" /></template>
            <template #append>
              <q-icon
                :name="mostrarPass ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="mostrarPass = !mostrarPass"
              />
            </template>
          </q-input>

          <q-input
            v-model="confirmarContrasena"
            outlined
            label="Confirmar contraseña"
            :type="mostrarConfirmar ? 'text' : 'password'"
            :error="!!errores.confirmarContrasena"
            :error-message="errores.confirmarContrasena"
            :disable="cargando"
            class="q-mt-md"
            @keyup.enter="cambiarPassword"
          >
            <template #prepend><q-icon name="lock" /></template>
            <template #append>
              <q-icon
                :name="mostrarConfirmar ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="mostrarConfirmar = !mostrarConfirmar"
              />
            </template>
          </q-input>

          <div class="requisitos q-mt-md">
            <div class="text-caption text-grey-7 q-mb-xs text-weight-bold">
              Requisitos:
            </div>
            <div
              class="req-item"
              :class="{ 'req-ok': nuevaContrasena.length >= 8 }"
            >
              <q-icon :name="nuevaContrasena.length >= 8 ? 'check_circle' : 'radio_button_unchecked'" size="14px" />
              Mínimo 8 caracteres
            </div>
            <div
              class="req-item"
              :class="{ 'req-ok': /[A-Z]/.test(nuevaContrasena) }"
            >
              <q-icon :name="/[A-Z]/.test(nuevaContrasena) ? 'check_circle' : 'radio_button_unchecked'" size="14px" />
              Al menos una mayúscula
            </div>
            <div
              class="req-item"
              :class="{ 'req-ok': /[0-9]/.test(nuevaContrasena) }"
            >
              <q-icon :name="/[0-9]/.test(nuevaContrasena) ? 'check_circle' : 'radio_button_unchecked'" size="14px" />
              Al menos un número
            </div>
          </div>

          <div class="row q-gutter-sm q-mt-lg">
            <q-btn
              outline
              no-caps
              color="grey-7"
              label="Volver"
              icon="arrow_back"
              @click="pasoAnterior"
              class="col"
            />
            <q-btn
              unelevated
              no-caps
              color="primary"
              label="Cambiar contraseña"
              icon="check"
              class="col"
              :loading="cargando"
              :disable="cargando"
              @click="cambiarPassword"
            />
          </div>
        </div>
      </q-card-section>

      <q-separator />

      <q-card-actions class="justify-center q-py-md">
        <q-btn
          flat
          no-caps
          color="grey-7"
          icon="arrow_back"
          label="Volver al login"
          to="/login"
        />
      </q-card-actions>
    </q-card>
  </div>
</template>

<style scoped>
.recuperar-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  background: var(--bg);
}

.recuperar-card {
  width: 100%;
  max-width: 480px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 20px 40px -20px rgba(0, 0, 0, 0.15);
}

.paso-indicator {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-hover);
  border: 1px solid var(--border-subtle);
  transition: all 0.2s;
}

.paso-indicator.paso-activo {
  color: white;
  background: var(--primary);
  border-color: var(--primary);
}

.paso-indicator.paso-completo {
  color: var(--primary);
  background: var(--primary-soft);
  border-color: var(--primary);
}

.requisitos {
  padding: 12px 14px;
  background: var(--bg-hover);
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
}

.req-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  padding: 3px 0;
  transition: color 0.2s;
}

.req-item.req-ok {
  color: var(--success);
  font-weight: 600;
}

@media (max-width: 500px) {
  .paso-indicator span {
    display: none;
  }
  .paso-indicator {
    padding: 4px 8px;
  }
}
</style>
