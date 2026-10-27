<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.js';
import * as alumnoApi from '../../api/alumno.api.js';

const auth = useAuthStore();
const router = useRouter();

const cargando = ref(true);
const mensajeError = ref('');

const misCursos = ref([]);
const tareasPendientes = ref([]);
const evaluaciones = ref([]);
const resumenAsistencia = ref({});
const avisos = ref([]);
const proximosEventos = ref([]);
const notificacionesNoLeidas = ref(0);

const ahora = ref(Date.now());

const iniciales = computed(() => auth.iniciales);
const nombreCompleto = computed(() => auth.nombreCompleto || 'Estudiante');

const saludo = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
});

const promedioGeneral = computed(() => {
  const conNota = misCursos.value.filter(
    c => c.promedio !== null && c.promedio !== undefined
  );
  if (!conNota.length) return '—';
  const suma = conNota.reduce((s, c) => s + Number(c.promedio), 0);
  return (suma / conNota.length).toFixed(1);
});

const totalTareasPendientes = computed(() => tareasPendientes.value.length);

const totalClasesHoy = computed(() => {
  const hoy = new Date(ahora.value).toISOString().slice(0, 10);
  return proximosEventos.value.filter(
    e => e.fecha_inicio?.slice(0, 10) === hoy
  ).length;
});

function estaDisponible(e) {
  const n = new Date(ahora.value);
  return new Date(e.fecha_apertura) <= n && new Date(e.fecha_cierre) >= n;
}

const evaluacionesDisponibles = computed(() =>
  evaluaciones.value
    .filter(e => estaDisponible(e) && !e.rendicion_id)
    .slice(0, 3)
);

const examenesUrgentes = computed(() =>
  evaluacionesDisponibles.value.filter(e => {
    const diff = new Date(e.fecha_cierre).getTime() - ahora.value;
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  })
);

function urgenciaPorFecha(fechaEntrega) {
  if (!fechaEntrega) return 'baja';
  const dias = (new Date(fechaEntrega).getTime() - ahora.value) / (1000 * 60 * 60 * 24);
  if (dias < 1) return 'alta';
  if (dias < 3) return 'media';
  return 'baja';
}

function venceTexto(fechaEntrega) {
  if (!fechaEntrega) return 'Sin fecha';
  const dias = Math.ceil((new Date(fechaEntrega).getTime() - ahora.value) / (1000 * 60 * 60 * 24));
  if (dias < 0) return 'Vencida';
  if (dias === 0) return 'Hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

function tiempoRestante(iso) {
  const diff = new Date(iso).getTime() - ahora.value;
  if (diff <= 0) return 'Cerrada';
  const horas = Math.floor(diff / (1000 * 60 * 60));
  if (horas < 1) {
    const min = Math.floor(diff / (1000 * 60));
    return `Cierra en ${min} min`;
  }
  if (horas < 24) return `Cierra en ${horas}h`;
  const dias = Math.floor(horas / 24);
  return `Cierra en ${dias} días`;
}

function rendirExamen(id) {
  router.push(`/alumno/evaluaciones/${id}/rendir`);
}

function navegarA(ruta) {
  router.push(ruta);
}

async function cargarTodo() {
  cargando.value = true;
  mensajeError.value = '';
  ahora.value = Date.now();

  try {
    const [materias, tareas, evals, asistencia, cartelera, eventos, noLeidas] =
      await Promise.all([
        alumnoApi.getMisMaterias().catch(() => []),
        alumnoApi.getMisTareas().catch(() => []),
        alumnoApi.getMisEvaluaciones().catch(() => []),
        alumnoApi.getMiResumenAsistencia().catch(() => ({})),
        alumnoApi.getCartelera().catch(() => []),
        alumnoApi.getProximosEventos().catch(() => []),
        alumnoApi.getNotificacionesNoLeidas().catch(() => 0),
      ]);

    misCursos.value = (materias || []).map((m) => ({
      id: m.id,
      nombre: m.nombre,
      profesor: m.profesor_nombre || 'Sin asignar',
      promedio: m.nota_final !== null && m.nota_final !== undefined
        ? Number(m.nota_final) : null,
    }));

    tareasPendientes.value = (tareas || [])
      .filter(t => new Date(t.fecha_entrega).getTime() > ahora.value)
      .slice(0, 5)
      .map(t => ({
        id: t.id,
        titulo: t.titulo,
        curso: t.materia_nombre || 'Sin materia',
        vence: venceTexto(t.fecha_entrega),
        urgencia: urgenciaPorFecha(t.fecha_entrega),
      }));

    evaluaciones.value = evals || [];
    resumenAsistencia.value = asistencia || {};

    avisos.value = (cartelera || []).slice(0, 4).map(a => ({
      id: a.id,
      texto: a.titulo,
      tipo: a.fijado ? 'warning' : 'info',
    }));

    proximosEventos.value = eventos || [];
    notificacionesNoLeidas.value = noLeidas;
  } catch (e) {
    console.error('Error cargando dashboard:', e);
    mensajeError.value = 'No se pudieron cargar algunos datos';
  } finally {
    cargando.value = false;
  }
}

onMounted(cargarTodo);
</script>

<template>
  <q-page class="q-pa-md">
    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <div v-if="mensajeError" class="q-mb-md">
      <q-banner rounded class="bg-negative text-white">
        <template #avatar>
          <q-icon name="warning" />
        </template>
        {{ mensajeError }}
        <template #action>
          <q-btn flat color="white" label="Reintentar" @click="cargarTodo" />
        </template>
      </q-banner>
    </div>

    <q-banner
      v-if="examenesUrgentes.length"
      rounded
      class="bg-warning text-white q-mb-md"
    >
      <template #avatar>
        <q-icon name="alarm" size="28px" />
      </template>
      <div class="text-weight-bold">
        {{ examenesUrgentes.length }} examen{{ examenesUrgentes.length > 1 ? 'es' : '' }} por cerrar
      </div>
      <div class="text-caption">
        {{ examenesUrgentes[0].titulo }} — {{ tiempoRestante(examenesUrgentes[0].fecha_cierre) }}
      </div>
      <template #action>
        <q-btn
          unelevated
          color="white"
          text-color="warning"
          label="Rendir ahora"
          no-caps
          @click="rendirExamen(examenesUrgentes[0].id)"
        />
      </template>
    </q-banner>

    <q-card flat class="hero-card q-mb-md">
      <q-card-section class="q-pa-lg">
        <div class="row items-center justify-between">
          <div class="col-12 col-md-8">
            <q-badge
              color="white"
              text-color="primary"
              class="q-mb-sm text-uppercase hero-badge"
            >
              {{ saludo }}
            </q-badge>
            <div class="text-h4 text-weight-bold q-mb-sm hero-titulo">
              Hola, {{ auth.user?.nombre ?? 'estudiante' }}
            </div>
            <div class="text-body1 hero-descripcion">
              Tenés <strong>{{ totalTareasPendientes }} tareas pendientes</strong> y
              <strong>{{ evaluacionesDisponibles.length }} exámenes disponibles</strong>.
            </div>
            <div class="row q-gutter-sm q-mt-md">
              <q-btn
                unelevated
                no-caps
                color="white"
                text-color="primary"
                icon="quiz"
                label="Ver evaluaciones"
                @click="navegarA('/alumno/evaluaciones')"
              />
              <q-btn
                outline
                no-caps
                color="white"
                icon="menu_book"
                label="Ver mis cursos"
                @click="navegarA('/alumno/materias')"
              />
            </div>
          </div>
          <div class="col-md-4 gt-sm">
            <q-icon name="school" size="120px" class="hero-icono-decorativo" />
          </div>
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-sm-3">
        <q-card flat bordered class="kpi-card cursor-pointer" @click="navegarA('/alumno/materias')">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="menu_book" size="32px" color="primary" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ misCursos.length }}</div>
                <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Cursos</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-sm-3">
        <q-card flat bordered class="kpi-card cursor-pointer" @click="navegarA('/alumno/tareas')">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="assignment" size="32px" color="warning" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ totalTareasPendientes }}</div>
                <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Tareas</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-sm-3">
        <q-card flat bordered class="kpi-card cursor-pointer" @click="navegarA('/alumno/notas')">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="grade" size="32px" color="primary" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ promedioGeneral }}</div>
                <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Promedio</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-sm-3">
        <q-card flat bordered class="kpi-card cursor-pointer" @click="navegarA('/alumno/asistencia')">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="event_available" size="32px" color="positive" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ totalClasesHoy }}</div>
                <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Clases hoy</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Mis cursos</div>
            <q-btn flat dense no-caps color="primary" label="Ver todos" @click="navegarA('/alumno/materias')" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !misCursos.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="menu_book" size="40px" class="q-mb-sm" />
            <div>Todavía no tenés materias asignadas.</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item
              v-for="c in misCursos.slice(0, 6)"
              :key="c.id"
              clickable
              @click="navegarA(`/alumno/materias/${c.id}`)"
            >
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="36px">
                  <q-icon name="menu_book" size="18px" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ c.nombre }}</q-item-label>
                <q-item-label caption>{{ c.profesor }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <div class="text-h6 text-primary text-weight-bold">
                  {{ c.promedio !== null ? c.promedio.toFixed(1) : '—' }}
                </div>
                <div class="text-caption text-grey-6">promedio</div>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Próximas evaluaciones</div>
            <q-badge
              v-if="evaluacionesDisponibles.length"
              color="primary"
              :label="`${evaluacionesDisponibles.length} disponibles`"
            />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !evaluacionesDisponibles.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="quiz" size="40px" class="q-mb-sm" />
            <div>No hay evaluaciones disponibles ahora.</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="e in evaluacionesDisponibles" :key="e.id">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="36px">
                  <q-icon name="quiz" size="18px" />
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ e.titulo }}</q-item-label>
                <q-item-label caption>
                  {{ e.materia_nombre }} · {{ tiempoRestante(e.fecha_cierre) }}
                </q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-btn
                  unelevated
                  no-caps
                  dense
                  color="primary"
                  label="Rendir"
                  @click.stop="rendirExamen(e.id)"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Tareas pendientes</div>
            <q-badge color="warning" :label="`${totalTareasPendientes} activas`" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !tareasPendientes.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="check_circle" size="40px" color="positive" class="q-mb-sm" />
            <div>¡No tenés tareas pendientes!</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="t in tareasPendientes" :key="t.id">
              <q-item-section avatar>
                <q-badge
                  :color="t.urgencia === 'alta' ? 'negative' : t.urgencia === 'media' ? 'warning' : 'positive'"
                  rounded
                />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ t.titulo }}</q-item-label>
                <q-item-label caption>{{ t.curso }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge
                  :color="t.urgencia === 'alta' ? 'negative' : t.urgencia === 'media' ? 'warning' : 'positive'"
                  :label="t.vence"
                />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Avisos</div>
            <q-btn flat dense no-caps color="primary" label="Ver todos" @click="navegarA('/comunicados')" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !avisos.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="campaign" size="40px" class="q-mb-sm" />
            <div>Sin novedades por ahora.</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="a in avisos" :key="a.id">
              <q-item-section avatar>
                <q-icon
                  :name="a.tipo === 'warning' ? 'push_pin' : 'campaign'"
                  :color="a.tipo === 'warning' ? 'warning' : 'primary'"
                />
              </q-item-section>
              <q-item-section>
                <q-item-label>{{ a.texto }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.hero-card {
  border-radius: 16px;
  box-shadow: 0 20px 40px -20px rgba(114, 47, 55, 0.6);
  background: linear-gradient(135deg, var(--primary) 0%, #5d252d 100%);
  color: white;
}

.kpi-card {
  transition: transform 0.15s, border-color 0.15s;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: var(--primary);
}
.hero-badge {
  letter-spacing: 0.1em;
  font-weight: 700;
}
.hero-titulo {
  color: white;
}
.hero-descripcion {
  opacity: 0.95;
}
.hero-icono-decorativo {
  opacity: 0.15;
  color: white;
}
</style>
