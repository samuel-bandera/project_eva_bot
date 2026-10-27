<template>
  <section class="configuracion-avanzada">
    <header class="encabezado">
      <h3 class="titulo">
        <q-icon name="tune" size="20px" />
        Configuración avanzada
      </h3>
      <p class="descripcion">
        Estas opciones modifican el comportamiento de la evaluación para los alumnos.
      </p>
    </header>

    <div class="opciones">
      <div class="opcion">
        <div class="opcion-info">
          <div class="opcion-titulo">Mostrar tiempo</div>
          <div class="opcion-descripcion">
            El alumno ve el reloj con el tiempo restante.
          </div>
        </div>
        <q-toggle
          :model-value="mostrarTiempo"
          @update:model-value="emit('update:mostrarTiempo', $event)"
          color="primary"
        />
      </div>

      <div class="opcion">
        <div class="opcion-info">
          <div class="opcion-titulo">Bloquear salida</div>
          <div class="opcion-descripcion">
            Advierte al alumno si intenta salir de la pestaña durante el examen.
          </div>
        </div>
        <q-toggle
          :model-value="bloquearSalida"
          @update:model-value="emit('update:bloquearSalida', $event)"
          color="primary"
        />
      </div>

      <div class="opcion">
        <div class="opcion-info">
          <div class="opcion-titulo">Monitoreo en vivo</div>
          <div class="opcion-descripcion">
            El docente ve el progreso del alumno en tiempo real.
          </div>
        </div>
        <q-toggle
          :model-value="monitoreoEnVivo"
          @update:model-value="emit('update:monitoreoEnVivo', $event)"
          color="primary"
        />
      </div>

      <div class="opcion">
        <div class="opcion-info">
          <div class="opcion-titulo">Permitir extensión</div>
          <div class="opcion-descripcion">
            El docente puede agregar tiempo extra al alumno.
          </div>
        </div>
        <q-toggle
          :model-value="permitirExtension"
          @update:model-value="emit('update:permitirExtension', $event)"
          color="primary"
        />
      </div>

      <div class="opcion">
        <div class="opcion-info">
          <div class="opcion-titulo">Intentos permitidos</div>
          <div class="opcion-descripcion">
            Cuántas veces puede rendir el alumno esta evaluación.
          </div>
        </div>
        <q-input
          :model-value="intentosPermitidos"
          @update:model-value="emit('update:intentosPermitidos', Number($event))"
          type="number"
          outlined
          dense
          min="1"
          max="10"
          class="input-intentos"
        />
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  mostrarTiempo: { type: Boolean, default: true },
  bloquearSalida: { type: Boolean, default: false },
  monitoreoEnVivo: { type: Boolean, default: true },
  permitirExtension: { type: Boolean, default: true },
  intentosPermitidos: { type: Number, default: 1 }
})

const emit = defineEmits([
  'update:mostrarTiempo',
  'update:bloquearSalida',
  'update:monitoreoEnVivo',
  'update:permitirExtension',
  'update:intentosPermitidos'
])
</script>

<style scoped>
.configuracion-avanzada {
  margin-top: 24px;
  padding: 20px;
  background: var(--bg-elevated, #ffffff);
  border: 1px solid var(--border, #e0e0e0);
  border-radius: 12px;
}

.encabezado {
  margin-bottom: 16px;
}

.titulo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px 0;
  color: var(--text, #1a1a1a);
}

.descripcion {
  font-size: 13px;
  color: var(--text-muted, #666);
  margin: 0;
}

.opciones {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.opcion {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 12px;
  border-radius: 8px;
  transition: background 0.15s ease;
}

.opcion:hover {
  background: var(--bg-hover, rgba(0, 0, 0, 0.02));
}

.opcion-info {
  flex: 1;
}

.opcion-titulo {
  font-size: 14px;
  font-weight: 500;
  color: var(--text, #1a1a1a);
  margin-bottom: 2px;
}

.opcion-descripcion {
  font-size: 12px;
  color: var(--text-muted, #666);
  line-height: 1.4;
}

.input-intentos {
  max-width: 90px;
}

@media (max-width: 600px) {
  .opcion {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }
  .opcion-titulo {
    font-size: 13px;
  }
  .opcion-descripcion {
    font-size: 11px;
  }
  .input-intentos {
    max-width: 100%;
    width: 100%;
  }
}
</style>
