<script setup>
import { computed } from 'vue';
import { useIdleTimeout } from '../composables/useIdleTimeout.js';

const {
  segundosVisibles,
  minutosRestantes,
  advertenciaActiva,
  nivelAdvertencia,
  extenderSesion,
  cerrarSesionAhora,
} = useIdleTimeout();

const esCritico = computed(() => nivelAdvertencia.value === 2);

const titulo = computed(() =>
  esCritico.value ? 'Sesión por expirar' : 'Sesión inactiva'
);

const descripcion = computed(() => {
  const mins = minutosRestantes.value;
  if (esCritico.value) return 'Quedan menos de 60 segundos.';
  if (mins >= 5) return `Quedan ${mins} minutos.`;
  return `Quedan ${mins} minutos.`;
});

const minutos = computed(() => Math.floor(segundosVisibles.value / 60));
const segundos = computed(() => segundosVisibles.value % 60);
const segundosStr = computed(() => String(segundos.value).padStart(2, '0'));

function quedarse() {
  extenderSesion();
}

function salir() {
  cerrarSesionAhora('manual');
}
</script>

<template>
  <q-dialog
    v-model="advertenciaActiva"
    persistent
    transition-show="scale"
    transition-hide="scale"
  >
    <q-card class="aviso-card" :class="{ 'aviso-critico': esCritico }">
      <q-card-section class="aviso-head">
        <div class="aviso-icono">
          <q-icon :name="esCritico ? 'timer_off' : 'timer'" size="28px" />
        </div>
        <div class="aviso-texto">
          <div class="aviso-titulo">{{ titulo }}</div>
          <div class="aviso-subtitulo">{{ descripcion }}</div>
        </div>
      </q-card-section>

      <q-card-section class="aviso-mensaje">
        <div class="contador" :class="{ 'contador-critico': esCritico }">
          <div class="contador-grupo">
            <span class="contador-numero">{{ minutos }}</span>
            <span class="contador-label">min</span>
          </div>
          <span class="contador-sep">:</span>
          <div class="contador-grupo">
            <span class="contador-numero">{{ segundosStr }}</span>
            <span class="contador-label">seg</span>
          </div>
        </div>

        <p class="aviso-hint">
          Si no hacés nada, tu sesión se cerrará automáticamente y deberás volver a iniciar sesión.
        </p>
      </q-card-section>

      <q-card-actions class="aviso-acciones">
        <q-btn
          flat
          no-caps
          color="grey-7"
          icon="logout"
          label="Cerrar ahora"
          class="btn-accion btn-salir"
          @click="salir"
        />
        <q-btn
          unelevated
          no-caps
          color="primary"
          icon="check_circle"
          label="Seguir conectado"
          class="btn-accion btn-quedarse"
          @click="quedarse"
        />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.aviso-card {
  width: calc(100vw - 32px);
  max-width: 420px;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
  transition: border-color 0.2s;
}

.aviso-card.aviso-critico {
  border-top: 4px solid #c62828;
}

.aviso-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: linear-gradient(135deg, #faf6f0 0%, #f4f0e9 100%);
}

.aviso-critico .aviso-head {
  background: linear-gradient(135deg, #fdeaea 0%, #fbe5e5 100%);
}

.aviso-icono {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--primary);
  color: #ffffff;
  flex-shrink: 0;
  box-shadow: 0 6px 16px rgba(114, 47, 55, 0.25);
}

.aviso-critico .aviso-icono {
  background: #c62828;
  box-shadow: 0 6px 16px rgba(198, 40, 40, 0.3);
  animation: pulso-critico 1.5s ease-in-out infinite;
}

@keyframes pulso-critico {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.06); }
}

.aviso-texto {
  min-width: 0;
  flex: 1;
}

.aviso-titulo {
  font-size: 15px;
  font-weight: 700;
  color: #1f1c22;
  letter-spacing: -0.01em;
  line-height: 1.2;
}

.aviso-subtitulo {
  margin-top: 3px;
  font-size: 12px;
  color: #77716b;
  line-height: 1.4;
}

.aviso-mensaje {
  padding: 22px 20px 18px;
  text-align: center;
}

.contador {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: 14px;
  background: var(--bg-hover);
  border: 2px solid var(--border);
  font-variant-numeric: tabular-nums;
}

.contador-critico {
  background: #fdeaea;
  border-color: var(--error-bg);
  animation: pulso-contador 1s ease-in-out infinite;
}

@keyframes pulso-contador {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.02); }
}

.contador-grupo {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 48px;
}

.contador-numero {
  font-size: 30px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.aviso-critico .contador-numero {
  color: var(--error);
}

.contador-label {
  margin-top: 2px;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #a29aa0;
}

.contador-sep {
  font-size: 26px;
  font-weight: 700;
  color: #a29aa0;
  padding-bottom: 10px;
}

.aviso-hint {
  margin: 16px 0 0 !important;
  color: #858078 !important;
  font-size: 11.5px !important;
  line-height: 1.5;
}

.aviso-acciones {
  display: flex;
  padding: 12px 14px 16px;
  gap: 8px;
  justify-content: space-between;
  border-top: 1px solid var(--border-subtle);
}

.btn-accion {
  flex: 1;
  min-height: 42px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 12.5px;
  text-transform: none;
  letter-spacing: 0.01em;
}

@media (max-width: 480px) {
  .aviso-card {
    width: 100vw;
    max-width: 100vw;
    border-radius: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .aviso-head {
    padding: 22px 20px;
    justify-content: center;
    text-align: center;
    flex-direction: column;
    gap: 10px;
  }

  .aviso-icono {
    width: 54px;
    height: 54px;
  }

  .aviso-icono .q-icon {
    font-size: 30px !important;
  }

  .aviso-titulo {
    font-size: 17px;
  }

  .aviso-subtitulo {
    font-size: 13px;
  }

  .aviso-mensaje {
    padding: 28px 20px 24px;
  }

  .contador {
    padding: 16px 28px;
  }

  .contador-numero {
    font-size: 38px;
  }

  .contador-grupo {
    min-width: 60px;
  }

  .contador-sep {
    font-size: 32px;
  }

  .aviso-hint {
    font-size: 12.5px !important;
    margin-top: 20px !important;
  }

  .aviso-acciones {
    flex-direction: column-reverse;
    padding: 14px 16px 20px;
    gap: 10px;
  }

  .btn-accion {
    width: 100%;
    min-height: 48px;
    font-size: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aviso-critico .aviso-icono,
  .contador-critico {
    animation: none !important;
  }
}
</style>
