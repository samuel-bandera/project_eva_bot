<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useExamen } from '../../composables/useExamen.js';
import { useReclamos } from '../../composables/useReclamos.js';
import DialogoCompromiso from '../../components/examen/DialogoCompromiso.vue';
import PantallaAntiCopia from '../../components/examen/PantallaAntiCopia.vue';
import PantallaPuntaje from '../../components/examen/PantallaPuntaje.vue';
import PantallaBloqueo from '../../components/examen/PantallaBloqueo.vue';
import DialogoRevision from '../../components/examen/DialogoRevision.vue';
import NavegadorPreguntas from '../../components/examen/NavegadorPreguntas.vue';
import PreguntaActual from '../../components/examen/PreguntaActual.vue';

const route = useRoute();
const router = useRouter();
const evaluacionId = Number(route.params.id);

const {
  cargando, error, examen, rendicion, preguntas, respuestas, indiceActual,
  guardando, ultimoGuardado, enviando, rendicionBloqueada, motivoBloqueo,
  tiempoExtra, mostrarOverlayAntiCopia, notaActual,
  modalApertura, pasoModal, aceptoResponsabilidad, solicitarPantallaCompleta,
  mostrarPuntaje, datosPuntaje, mostrarRevision, datosRevision,
  tiempoFormateado, tiempoUrgente, tiempoCritico, colorTimer,
  totalPreguntas, preguntaActual, totalRespondidas, porcentajeAvance,
  seleccionarOpcion, marcarVerdaderoFalso, actualizarRespuesta,
  irA, anterior, siguiente, finalizarExamen,
  iniciarExamenDesdeModal, continuarACompromiso, verMisRespuestas,
} = useExamen(evaluacionId);

const {
  dialogoReclamo, reclamoActual, cargarReclamosDeRendicion, enviarReclamo,
} = useReclamos();

const mostrarGrid = ref(false);

function volverAEvaluaciones() {
  router.push('/alumno/evaluaciones');
}

async function abrirRevision() {
  await cargarReclamosDeRendicion(rendicion.value?.id);
  await verMisRespuestas();
}
</script>

<template>
  <q-page class="exam-page">
    <DialogoCompromiso
      :abierto="modalApertura"
      :paso="pasoModal"
      :examen="examen"
      :acepto="aceptoResponsabilidad"
      :pantalla-completa="solicitarPantallaCompleta"
      @update:acepto="aceptoResponsabilidad = $event"
      @update:pantalla-completa="solicitarPantallaCompleta = $event"
      @cancelar="volverAEvaluaciones"
      @continuar-a-compromiso="continuarACompromiso"
      @comenzar="iniciarExamenDesdeModal"
    />

    <PantallaAntiCopia
      :abierto="mostrarOverlayAntiCopia"
      :nota-actual="notaActual"
      :nota-maxima="examen?.nota_maxima || 10"
    />

    <PantallaPuntaje
      :abierto="mostrarPuntaje"
      :datos="datosPuntaje"
      @ver-respuestas="abrirRevision"
      @volver="volverAEvaluaciones"
    />

    <DialogoRevision
      :abierto="mostrarRevision"
      :datos="datosRevision"
      @cerrar="mostrarRevision = false"
    />

    <div v-if="cargando" class="full-center">
      <q-spinner color="primary" size="56px" />
      <div class="text-grey-7 q-mt-md">Preparando tu examen…</div>
    </div>

    <div v-else-if="error" class="full-center">
      <q-icon name="error_outline" size="72px" color="negative" />
      <div class="text-h5 q-mt-md">No se pudo iniciar el examen</div>
      <div class="text-grey-7 q-mt-sm">{{ error }}</div>
      <q-btn color="primary" unelevated no-caps label="Volver" class="q-mt-lg" @click="volverAEvaluaciones" />
    </div>

    <div v-else class="exam-layout">

      <q-card flat bordered class="exam-topbar-mobile mobile-only">
        <div class="mobile-bar">
          <q-btn flat round dense icon="grid_view" color="primary" @click="mostrarGrid = true">
            <q-badge v-if="totalPreguntas - totalRespondidas > 0" color="warning" floating rounded>
              {{ totalPreguntas - totalRespondidas }}
            </q-badge>
            <q-tooltip>Ver todas las preguntas</q-tooltip>
          </q-btn>
          <div class="mobile-center">
            <div class="mobile-title">{{ examen.titulo }}</div>
            <div class="mobile-sub">{{ indiceActual + 1 }} de {{ totalPreguntas }} · {{ totalRespondidas }} resp.</div>
          </div>
          <div class="mobile-timer" :class="'bg-' + colorTimer">
            <q-icon name="timer" size="14px" />
            <span>{{ tiempoFormateado }}</span>
          </div>
        </div>
      </q-card>

      <div class="exam-footer-mobile mobile-only">
        <q-btn flat round icon="chevron_left" :disable="indiceActual === 0" @click="anterior" />
        <div class="mobile-progress-bar">
          <q-linear-progress :value="porcentajeAvance / 100" color="primary" size="8px" rounded />
          <div class="mobile-progress-text">{{ totalRespondidas }} / {{ totalPreguntas }} respondidas</div>
        </div>
        <q-btn flat round icon="chevron_right" :disable="indiceActual === totalPreguntas - 1" @click="siguiente" />
        <q-btn unelevated color="primary" icon="send" round size="md" @click="finalizarExamen(false)">
          <q-tooltip>Enviar examen</q-tooltip>
        </q-btn>
      </div>

      <q-dialog v-model="mostrarGrid" position="bottom">
        <q-card class="grid-dialog-card">
          <q-card-section>
            <div class="row items-center justify-between q-mb-md">
              <div class="text-h6 text-weight-bold">Ir a pregunta</div>
              <q-btn flat round icon="close" @click="mostrarGrid = false" />
            </div>
            <div class="grid-legend q-mb-md">
              <span><div class="legend-dot bg-primary"></div>Actual</span>
              <span><div class="legend-dot bg-positive"></div>Respondida</span>
              <span><div class="legend-dot bg-grey-4"></div>Sin responder</span>
            </div>
            <div class="q-grid-mobile">
              <q-btn
                v-for="(p, i) in preguntas"
                :key="p.id"
                :color="i === indiceActual ? 'primary' : (respuestas[p.id] && String(respuestas[p.id]).trim() ? 'positive' : 'grey-4')"
                :text-color="i === indiceActual ? 'white' : (respuestas[p.id] && String(respuestas[p.id]).trim() ? 'white' : 'grey-8')"
                :unelevated="i === indiceActual || (respuestas[p.id] && String(respuestas[p.id]).trim())"
                :outline="i !== indiceActual && !(respuestas[p.id] && String(respuestas[p.id]).trim())"
                :label="String(i + 1)"
                dense
                no-caps
                class="q-grid-btn-mobile"
                @click="irA(i); mostrarGrid = false"
              />
            </div>
          </q-card-section>
        </q-card>
      </q-dialog>

      <q-card flat bordered class="exam-topbar desktop-only">
        <q-card-section>
          <div class="row items-center justify-between q-col-gutter-md">
            <div class="col-12 col-md">
              <div class="text-caption text-primary text-uppercase text-weight-bold etiqueta-examen">
                Examen en curso
              </div>
              <div class="text-h6 text-weight-bold q-mt-xs">{{ examen.titulo }}</div>
              <div class="text-caption text-grey-7">
                {{ examen.materia_nombre }} · {{ examen.profesor_nombre }} {{ examen.profesor_apellido }}
              </div>
            </div>
            <div class="col-auto">
              <q-card
                flat
                :class="['bg-' + colorTimer, { 'timer-urgente': tiempoUrgente, 'timer-critico': tiempoCritico }]"
                class="timer-card"
              >
                <q-card-section class="q-py-sm q-px-md">
                  <div class="row items-center no-wrap q-gutter-sm">
                    <q-icon name="timer" size="28px" color="white" />
                    <div>
                      <div class="text-caption text-white text-uppercase text-weight-bold etiqueta-timer">Tiempo restante</div>
                      <div class="text-h5 text-white text-weight-bold tiempo-timer">{{ tiempoFormateado }}</div>
                      <div v-if="tiempoExtra > 0" class="text-caption text-white">
                        +{{ Math.floor(tiempoExtra / 60) }} min extra
                      </div>
                    </div>
                  </div>
                </q-card-section>
              </q-card>
            </div>
            <div class="col-auto">
              <q-circular-progress
                :value="porcentajeAvance"
                size="56px"
                :thickness="0.22"
                color="primary"
                track-color="grey-4"
                show-value
              >
                <div class="text-caption text-weight-bold">{{ totalRespondidas }}/{{ totalPreguntas }}</div>
              </q-circular-progress>
            </div>
          </div>
        </q-card-section>
      </q-card>

      <div class="row q-col-gutter-md q-mt-md">
        <div class="col-12 col-md-3 col-lg-2 desktop-only">
          <NavegadorPreguntas
            :preguntas="preguntas"
            :respuestas="respuestas"
            :indice-actual="indiceActual"
            @ir-a="irA"
          />
        </div>

        <div class="col-12 col-md-9 col-lg-10">
          <div v-if="preguntaActual" class="column q-gutter-md">
            <PreguntaActual
              :pregunta="preguntaActual"
              :respuesta-actual="respuestas[preguntaActual.id] || ''"
              :guardando="guardando"
              :ultimo-guardado="ultimoGuardado"
              :indice-actual="indiceActual"
              :total-preguntas="totalPreguntas"
              @seleccionar-opcion="seleccionarOpcion"
              @marcar-vf="marcarVerdaderoFalso"
              @actualizar-respuesta="actualizarRespuesta"
              @anterior="anterior"
              @siguiente="siguiente"
            />

            <q-card flat bordered>
              <q-card-section>
                <div class="row items-center q-col-gutter-md">
                  <div class="col-12 col-md">
                    <div class="text-caption text-grey-7 q-mb-xs text-weight-bold">
                      {{ porcentajeAvance }}% completado · {{ totalRespondidas }} de {{ totalPreguntas }} respondidas
                    </div>
                    <q-linear-progress
                      :value="porcentajeAvance / 100"
                      color="primary"
                      track-color="grey-3"
                      size="8px"
                      rounded
                    />
                  </div>
                  <div class="col-auto">
                    <q-btn
                      unelevated
                      no-caps
                      color="positive"
                      icon="send"
                      :label="enviando ? 'Enviando…' : 'Enviar examen'"
                      :loading="enviando"
                      :disable="enviando"
                      @click="finalizarExamen(false)"
                    />
                  </div>
                </div>
              </q-card-section>
            </q-card>
          </div>
        </div>
      </div>
    </div>

    <PantallaBloqueo
      :abierto="rendicionBloqueada"
      :motivo="motivoBloqueo"
      @volver="volverAEvaluaciones"
    />

    <q-dialog v-model="dialogoReclamo" persistent>
      <q-card class="reclamo-dialog">
        <q-card-section>
          <div class="text-h6 text-weight-bold">Reclamar pregunta</div>
          <div class="text-caption text-grey-7 q-mt-xs">{{ reclamoActual.preguntaTexto }}</div>
        </q-card-section>
        <q-card-section>
          <q-input
            v-model="reclamoActual.texto"
            outlined type="textarea" rows="5"
            label="Explicá por qué reclamás esta pregunta"
            placeholder="Ej: Considero que mi respuesta es correcta porque..."
            maxlength="1000"
            counter
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn flat no-caps label="Cancelar" @click="dialogoReclamo = false" />
          <q-btn
            unelevated no-caps color="warning" text-color="white"
            icon="send" label="Enviar reclamo"
            :loading="reclamoActual.enviando"
            :disable="!reclamoActual.texto.trim()"
            @click="enviarReclamo(rendicion?.id)"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.exam-page { min-height: 100vh; background: var(--bg); }
.full-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 2rem;
  text-align: center;
}
.exam-layout { max-width: 1400px; margin: 0 auto; padding: 1rem; }
.exam-topbar {
  position: sticky;
  top: 8px;
  z-index: 10;
  background: var(--bg-elevated);
  box-shadow: 0 4px 20px -8px rgba(0, 0, 0, 0.1);
}
.timer-card { min-width: 180px; }
.etiqueta-examen, .etiqueta-timer { letter-spacing: 0.1em; }
.tiempo-timer { font-variant-numeric: tabular-nums; }
.legend-dot { width: 12px; height: 12px; border-radius: 3px; }

.exam-topbar-mobile {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--bg-elevated);
  border-bottom: 1px solid var(--border);
}
.mobile-bar { display: flex; align-items: center; gap: 8px; padding: 8px 12px; }
.mobile-center { flex: 1; min-width: 0; }
.mobile-title {
  font-size: 13px; font-weight: 700; color: var(--text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.mobile-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.mobile-timer {
  display: flex; align-items: center; gap: 4px;
  padding: 6px 10px; border-radius: 8px; color: white;
  font-weight: 700; font-size: 13px; font-variant-numeric: tabular-nums;
}
.mobile-timer.bg-negative { background: #c62828 !important; }
.mobile-timer.bg-warning { background: #b8721e !important; }
.mobile-timer.bg-primary { background: var(--primary) !important; }

.exam-footer-mobile {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 20;
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px calc(8px + env(safe-area-inset-bottom, 0px));
  background: var(--bg-elevated); border-top: 1px solid var(--border);
  box-shadow: 0 -4px 20px -8px rgba(0, 0, 0, 0.15);
}
.mobile-progress-bar { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.mobile-progress-text { font-size: 10px; text-align: center; color: var(--text-muted); font-weight: 700; }

.grid-dialog-card {
  width: 100%; max-width: 100vw; max-height: 80vh;
  border-radius: 20px 20px 0 0;
}
.q-grid-mobile {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;
  max-height: 55vh; overflow-y: auto; padding: 4px;
}
.q-grid-btn-mobile { aspect-ratio: 1; min-width: 0; font-weight: 700; font-size: 13px; }
.grid-legend {
  display: flex; flex-wrap: wrap; gap: 14px;
  font-size: 11px; color: var(--text-muted);
}
.grid-legend span { display: flex; align-items: center; gap: 5px; }

@keyframes pulso-soft {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.06); }
}
@keyframes pulso-hard {
  0%, 100% { transform: scale(1) rotate(0deg); }
  25% { transform: scale(1.15) rotate(-1.5deg); }
  75% { transform: scale(1.15) rotate(1.5deg); }
}
.timer-urgente { animation: pulso-soft 1.4s ease-in-out infinite; }
.timer-critico {
  animation: pulso-hard 0.6s ease-in-out infinite;
  box-shadow: 0 0 0 3px rgba(198, 40, 40, 0.3);
}

.reclamo-dialog { min-width: 420px; max-width: 560px; width: 100%; }

@media (max-width: 899px) {
  .desktop-only { display: none !important; }
  .exam-layout { padding: 0 !important; }
  .exam-layout .row.q-mt-md { margin-top: 0 !important; }
  .exam-layout .col-12.col-md-9.col-lg-10 { padding: 12px 12px 88px 12px !important; }
  .exam-layout .text-h6 { font-size: 15px !important; }
  .exam-layout .q-card__section { padding: 12px !important; }
}
@media (min-width: 900px) {
  .mobile-only { display: none !important; }
}

.examen-pregunta,
.examen-pregunta .q-field__native,
.examen-pregunta textarea,
.examen-pregunta input {
  -webkit-user-select: none;
  user-select: none;
}
</style>
