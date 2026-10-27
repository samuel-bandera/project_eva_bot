<script setup>
import { computed } from 'vue';

const props = defineProps({
  abierto: { type: Boolean, required: true },
  paso: { type: String, default: 'compromiso' },
  examen: { type: Object, default: null },
  acepto: { type: Boolean, default: false },
  pantallaCompleta: { type: Boolean, default: false },
});

const emit = defineEmits([
  'update:acepto',
  'update:pantallaCompleta',
  'cancelar',
  'continuar-a-compromiso',
  'comenzar',
]);

const enInstrucciones = computed(() => props.paso === 'instrucciones');

function cancelar() { emit('cancelar'); }
function continuar() { emit('continuar-a-compromiso'); }
function comenzar() { emit('comenzar'); }
function actualizarAcepto(v) { emit('update:acepto', v); }
function actualizarPantallaCompleta(v) { emit('update:pantallaCompleta', v); }
</script>

<template>
  <q-dialog :model-value="abierto" persistent maximized transition-show="fade" transition-hide="fade">
    <q-card class="modal-responsabilidad">
      <q-card-section class="column items-center text-center q-pa-xl">

        <template v-if="enInstrucciones">
          <q-icon name="menu_book" size="64px" color="primary" class="q-mb-md" />
          <div class="text-h5 text-weight-bold q-mb-md">Instrucciones del examen</div>
          <div class="compromiso-texto q-mb-lg texto-instrucciones">{{ examen?.instrucciones }}</div>
          <q-btn unelevated no-caps color="primary" label="Continuar" icon-right="arrow_forward" @click="continuar" />
        </template>

        <template v-else>
          <q-icon name="verified_user" size="64px" color="primary" class="q-mb-md" />
          <div class="text-h5 text-weight-bold q-mb-md">Compromiso académico</div>
          <div class="compromiso-texto q-mb-lg">
            <p>Al continuar con este examen, declaro que:</p>
            <ul>
              <li>Responderé <strong>sin ayuda externa</strong> ni material no autorizado.</li>
              <li><strong>No copiaré</strong> ni compartiré respuestas con otros estudiantes.</li>
              <li>Acepto que se <strong>registren las salidas de pantalla</strong> durante el examen.</li>
              <li>Comprendo que cualquier irregularidad puede anular mi evaluación.</li>
            </ul>
          </div>
          <q-checkbox
            :model-value="acepto"
            label="Acepto y me comprometo a cumplir estas reglas"
            color="primary"
            class="q-mb-sm"
            @update:model-value="actualizarAcepto"
          />
          <q-checkbox
            :model-value="pantallaCompleta"
            label="Activar pantalla completa durante el examen (recomendado)"
            color="primary"
            class="q-mb-lg"
            @update:model-value="actualizarPantallaCompleta"
          />
          <div class="row q-gutter-md">
            <q-btn flat no-caps color="grey-7" label="Cancelar" @click="cancelar" />
            <q-btn unelevated no-caps color="primary" label="Comenzar examen" :disable="!acepto" @click="comenzar" />
          </div>
        </template>

      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<style scoped>
.modal-responsabilidad {
  max-width: 580px;
  margin: auto;
  border-radius: 20px;
}
.compromiso-texto {
  text-align: left;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
  background: var(--bg-hover);
  padding: 16px 20px;
  border-radius: 12px;
}
.compromiso-texto p { margin: 0 0 10px 0; font-weight: 600; color: var(--text); }
.compromiso-texto ul { margin: 0; padding-left: 22px; }
.compromiso-texto li { margin-bottom: 6px; }
.compromiso-texto strong { color: var(--primary); }
.texto-instrucciones { white-space: pre-wrap; max-height: 50vh; overflow-y: auto; }

@media (max-width: 899px) {
  .modal-responsabilidad { margin: 12px; }
}
</style>
