<script setup>
import { useAuthStore } from '../../stores/auth.store.js';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

function salir() {
  auth.logout();
  router.push('/login');
}
</script>

<template>
  <div class="dashboard">
    <header>
      <h1>Panel del Profesor</h1>
      <button @click="salir">Salir</button>
    </header>
    <p>Bienvenido, {{ auth.user?.nombre }} {{ auth.user?.apellido }}</p>
  </div>
</template>

<style scoped>
.dashboard { padding: 2rem; }
header { display: flex; justify-content: space-between; align-items: center; }
</style>