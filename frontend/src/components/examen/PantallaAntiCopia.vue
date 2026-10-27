<script setup>
defineProps({
  abierto: { type: Boolean, required: true },
  notaActual: { type: Number, default: null },
  notaMaxima: { type: Number, default: 10 },
});
</script>

<template>
  <q-dialog :model-value="abierto" persistent maximized>
    <q-card class="overlay-anticopia">
      <q-card-section class="column items-center text-center q-pa-xl">
        <q-icon name="warning" size="72px" color="negative" class="q-mb-md icon-pulse" />
        <div class="text-h5 text-weight-bold q-mb-md text-white">Salida de pantalla detectada</div>
        <div class="overlay-texto q-mb-lg text-white">
          Detectamos que saliste de la pantalla durante el examen.<br>
          <strong>Tu nota actual es {{ notaActual != null ? notaActual.toFixed(2) : '—' }}/{{ notaMaxima }}</strong>
          <br><br>
          Esperando que el docente autorice tu continuidad...
        </div>
        <q-spinner-dots color="white" size="48px" />
        <div class="text-caption text-white q-mt-md leyenda-espera">
          Se verifica el estado cada 5 segundos
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.overlay-anticopia {
  background: linear-gradient(135deg, var(--primary) 0%, #4a1e24 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}
.overlay-texto {
  font-size: 16px;
  line-height: 1.7;
  max-width: 480px;
}
.icon-pulse { animation: pulso-hard 0.8s ease-in-out infinite; }
.leyenda-espera { opacity: 0.7; }
@keyframes pulso-hard {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.15) rotate(-1.5deg); }
  75% { transform: scale(1.15) rotate(1.5deg); }
}
</style>
