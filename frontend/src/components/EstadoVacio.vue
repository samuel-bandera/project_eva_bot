<script setup>
defineProps({
  icono: {
    type: String,
    default: 'inbox',
  },
  titulo: {
    type: String,
    required: true,
  },
  descripcion: {
    type: String,
    default: '',
  },
  accionTexto: {
    type: String,
    default: '',
  },
  accionIcono: {
    type: String,
    default: 'add',
  },
});

const emit = defineEmits(['accion']);
</script>

<template>
  <div class="empty-state">
    <div class="es-icon">
      <div class="es-icon-bg" />
      <q-icon :name="icono" size="44px" />
    </div>

    <h3 class="es-titulo">{{ titulo }}</h3>
    <p v-if="descripcion" class="es-descripcion">{{ descripcion }}</p>

    <q-btn
      v-if="accionTexto"
      unelevated
      no-caps
      color="primary"
      :icon="accionIcono"
      :label="accionTexto"
      class="es-accion"
      @click="emit('accion')"
    />
  </div>
</template>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60px 24px;
  text-align: center;
}

.es-icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 90px;
  height: 90px;
  margin-bottom: 20px;
  color: var(--primary);
}

.es-icon-bg {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, var(--primary-soft), transparent 70%);
  animation: pulse-bg 3s ease-in-out infinite;
}

@keyframes pulse-bg {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%      { transform: scale(1.1); opacity: 1; }
}

.es-icon .q-icon {
  position: relative;
  z-index: 1;
  color: var(--primary);
}

.es-titulo {
  margin: 0 0 8px;
  font-size: 17px;
  font-weight: 750;
  color: var(--text);
  letter-spacing: -0.3px;
}

.es-descripcion {
  margin: 0 0 20px;
  max-width: 380px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.55;
}

.es-accion {
  text-transform: none;
  font-weight: 600;
  border-radius: 10px;
  padding: 10px 24px;
  min-height: 42px;
  box-shadow: 0 4px 12px rgba(114, 47, 55, 0.2);
}
</style>
