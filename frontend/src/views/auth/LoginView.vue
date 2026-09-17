<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.js';

const router = useRouter();
const auth = useAuthStore();

const usuario = ref('');
const contrasena = ref('');
const error = ref('');
const cargando = ref(false);

async function onSubmit() {
  error.value = '';
  cargando.value = true;
  try {
    const user = await auth.login(usuario.value, contrasena.value);
    router.push(user.tipo === 'profesor' ? '/profesor' : '/alumno');
  } catch (e) {
    error.value = e.response?.data?.error || 'Error al iniciar sesión';
  } finally {
    cargando.value = false;
  }
}
</script>

<template>
  <div class="login">
    <h1>🎓 EvalBot</h1>
    <form @submit.prevent="onSubmit">
      <input v-model="usuario" placeholder="Usuario" required />
      <input v-model="contrasena" type="password" placeholder="Contraseña" required />
      <button type="submit" :disabled="cargando">
        {{ cargando ? 'Ingresando...' : 'Ingresar' }}
      </button>
      <p v-if="error" class="error">{{ error }}</p>
    </form>
  </div>
</template>

<style scoped>
.login {
  max-width: 320px;
  margin: 4rem auto;
  padding: 2rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0,0,0,.1);
}
h1 { text-align: center; margin-bottom: 1.5rem; }
input, button {
  width: 100%;
  padding: .75rem;
  margin-bottom: .75rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 1rem;
}
button {
  background: #42b883;
  color: white;
  border: none;
  cursor: pointer;
}
button:disabled { opacity: .5; cursor: not-allowed; }
.error { color: #c00; font-size: .9rem; text-align: center; }
</style>