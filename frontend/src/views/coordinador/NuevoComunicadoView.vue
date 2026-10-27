<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useQuasar } from 'quasar';
import * as coordApi from '../../api/coordinador.api.js';

const router = useRouter();
const $q = useQuasar();

const pasoActual = ref(1);
const pasoTotal = 3;
const cargando = ref(false);
const enviando = ref(false);

const carreras = ref([]);
const docentes = ref([]);
const alumnos = ref([]);
const coordinadores = ref([]);

const form = ref({
  titulo: '',
  contenido: '',
  nivelAlerta: 'info',
  roles: [],
  carreras: [],
  usuarios: [],
  enviarEmailTodos: false,
});

const pasos = [
  { num: 1, label: 'Mensaje',        icon: 'edit_note' },
  { num: 2, label: 'Destinatarios',  icon: 'groups' },
  { num: 3, label: 'Revisar',        icon: 'send' },
];

const niveles = [
  { value: 'critico', label: 'Crítico', desc: 'Web + email a coordinadores y docentes', color: 'negative' },
  { value: 'alto',    label: 'Alto',    desc: 'Web + email a coordinadores',            color: 'orange' },
  { value: 'medio',   label: 'Medio',   desc: 'Solo web',                                color: 'warning' },
  { value: 'bajo',    label: 'Bajo',    desc: 'Solo web',                                color: 'info' },
  { value: 'info',    label: 'Info',    desc: 'Solo web',                                color: 'grey-6' },
];

const rolesDisponibles = [
  { value: 'alumno',      label: 'Alumnos',         icon: 'school' },
  { value: 'docente',     label: 'Docentes',        icon: 'groups' },
  { value: 'coordinador', label: 'Coordinadores',   icon: 'supervisor_account' },
];

const carrerasFiltradas = ref([]);

const opcionesUsuarios = computed(() => {
  const all = [...docentes.value, ...alumnos.value, ...coordinadores.value];
  return all.map(u => ({
    label: `${u.nombre} ${u.apellido} (${u.tipo})`,
    value: u.id,
  }));
});

const totalSeleccionados = computed(() =>
  form.value.roles.length + form.value.carreras.length + form.value.usuarios.length
);

const resumenDestinatarios = computed(() => {
  const partes = [];
  if (form.value.roles.length) {
    const labels = form.value.roles.map(r =>
      rolesDisponibles.find(x => x.value === r)?.label || r
    );
    partes.push(`Roles: ${labels.join(', ')}`);
  }
  if (form.value.carreras.length) {
    const labels = form.value.carreras.map(id =>
      carreras.value.find(c => c.id === id)?.nombre || `#${id}`
    );
    partes.push(`Carreras: ${labels.join(', ')}`);
  }
  if (form.value.usuarios.length) {
    const labels = form.value.usuarios.map(id => {
      const u = [...docentes.value, ...alumnos.value, ...coordinadores.value].find(x => x.id === id);
      return u ? `${u.nombre} ${u.apellido}` : `#${id}`;
    });
    partes.push(`Usuarios: ${labels.join(', ')}`);
  }
  return partes;
});

const nivelActual = computed(() =>
  niveles.find(n => n.value === form.value.nivelAlerta) || niveles[4]
);

const puedeSiguiente = computed(() => {
  if (pasoActual.value === 1) {
    return form.value.titulo.trim().length > 0 && form.value.contenido.trim().length > 0;
  }
  if (pasoActual.value === 2) return totalSeleccionados.value > 0;
  return true;
});

function pasoAnterior() {
  if (pasoActual.value > 1) pasoActual.value--;
  else router.push('/coordinador/comunicados');
}

function pasoSiguiente() {
  if (!puedeSiguiente.value) {
    $q.notify({ type: 'warning', message: 'Completá los campos requeridos' });
    return;
  }
  if (pasoActual.value < pasoTotal) pasoActual.value++;
}

async function cargar() {
  cargando.value = true;
  try {
    const [c, d, a, co] = await Promise.all([
      coordApi.listarCarreras().catch(() => []),
      coordApi.listarDocentes().catch(() => []),
      coordApi.listarAlumnos().catch(() => []),
      coordApi.listarCoordinadores().catch(() => []),
    ]);
    carreras.value = c || [];
    docentes.value = d || [];
    alumnos.value = a || [];
    coordinadores.value = co || [];
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al cargar datos' });
  } finally {
    cargando.value = false;
  }
}

function filtrarCarreras(val, update) {
  if (!val) {
    update(() => { carrerasFiltradas.value = carreras.value; });
    return;
  }
  const aguja = val.toLowerCase();
  update(() => {
    carrerasFiltradas.value = carreras.value.filter(c =>
      (c.nombre || '').toLowerCase().includes(aguja)
      || (c.codigo || '').toLowerCase().includes(aguja)
    );
  });
}

async function enviar() {
  if (!puedeSiguiente.value) {
    $q.notify({ type: 'warning', message: 'Faltan datos' });
    return;
  }

  const destinatarios = [];
  for (const rol of form.value.roles) destinatarios.push({ tipo: 'rol', rol });
  for (const carreraId of form.value.carreras) destinatarios.push({ tipo: 'carrera', carreraId });
  for (const usuarioId of form.value.usuarios) destinatarios.push({ tipo: 'usuario', usuarioId });

  enviando.value = true;
  try {
    const res = await coordApi.crearComunicado({
      titulo: form.value.titulo.trim(),
      contenido: form.value.contenido.trim(),
      nivelAlerta: form.value.nivelAlerta,
      enviarEmailTodos: form.value.enviarEmailTodos,
      destinatarios,
    });
    $q.notify({
      type: 'positive',
      message: `Enviado a ${res?.total_destinatarios || 0} destinatarios${res?.total_con_email ? ` (${res.total_con_email} por email)` : ''}`,
      timeout: 4500,
    });
    router.push('/coordinador/comunicados');
  } catch (e) {
    $q.notify({
      type: 'negative',
      message: e.response?.data?.error || 'Error al enviar',
    });
  } finally {
    enviando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <div class="wizard-page">
    <div class="wizard-container">
      <header class="wizard-header">
        <h1 class="wizard-title">Nuevo comunicado</h1>
        <p class="wizard-sub">Completá los 3 pasos para enviar el aviso.</p>
      </header>

      <nav class="stepper" aria-label="Progreso">
        <div
          v-for="(p, i) in pasos"
          :key="p.num"
          class="step"
          :class="{
            activo: pasoActual === p.num,
            completado: pasoActual > p.num,
          }"
        >
          <div class="step-circle">
            <q-icon v-if="pasoActual > p.num" name="check" size="16px" />
            <span v-else>{{ p.num }}</span>
          </div>
          <div class="step-label">{{ p.label }}</div>
          <div v-if="i < pasos.length - 1" class="step-line" />
        </div>
      </nav>

      <q-inner-loading :showing="cargando">
        <q-spinner size="40px" color="primary" />
      </q-inner-loading>

      <section v-if="pasoActual === 1 && !cargando" class="paso">
        <h2 class="paso-titulo">Mensaje</h2>
        <p class="paso-desc">¿Qué querés comunicar y con qué urgencia?</p>

        <div class="campo">
          <label class="campo-label">Título <span class="req">*</span></label>
          <q-input
            v-model="form.titulo"
            outlined dense
            placeholder="Ej: Reunión de coordinación"
            maxlength="200"
            :rules="[v => !!v.trim() || 'El título es obligatorio']"
          />
        </div>

        <div class="campo">
          <label class="campo-label">Contenido <span class="req">*</span></label>
          <q-input
            v-model="form.contenido"
            outlined type="textarea" rows="5"
            placeholder="Escribí el mensaje..."
            :rules="[v => !!v.trim() || 'El contenido es obligatorio']"
          />
        </div>

        <div class="campo">
          <label class="campo-label">Nivel de alerta</label>
          <div class="niveles-grid">
            <button
              v-for="n in niveles"
              :key="n.value"
              type="button"
              class="nivel-card"
              :class="{ activo: form.nivelAlerta === n.value }"
              @click="form.nivelAlerta = n.value"
            >
              <q-badge :color="n.color" :label="n.label" class="q-mb-xs" />
              <div class="nivel-desc">{{ n.desc }}</div>
            </button>
          </div>
        </div>
      </section>

      <section v-if="pasoActual === 2 && !cargando" class="paso">
        <h2 class="paso-titulo">Destinatarios</h2>
        <p class="paso-desc">Podés combinar roles, carreras y usuarios específicos.</p>

        <div class="campo">
          <label class="campo-label">Roles</label>
          <div class="chips">
            <button
              v-for="r in rolesDisponibles"
              :key="r.value"
              type="button"
              class="chip"
              :class="{ activo: form.roles.includes(r.value) }"
              @click="() => {
                const i = form.roles.indexOf(r.value);
                if (i >= 0) form.roles.splice(i, 1);
                else form.roles.push(r.value);
              }"
            >
              <q-icon :name="r.icon" size="16px" />
              {{ r.label }}
            </button>
          </div>
        </div>

        <div class="campo">
          <label class="campo-label">Carreras</label>
          <q-select
            v-model="form.carreras"
            outlined dense multiple use-chips
            :options="carrerasFiltradas"
            option-value="id" option-label="nombre"
            emit-value map-options
            use-input input-debounce="200"
            @filter="filtrarCarreras"
            placeholder="Buscar y elegir carreras..."
            :hint="`${carreras.length} carreras disponibles`"
          >
            <template #option="scope">
              <q-item v-bind="scope.itemProps">
                <q-item-section avatar>
                  <div class="chip-dot" :style="{ background: scope.opt.color }" />
                </q-item-section>
                <q-item-section>
                  <q-item-label>{{ scope.opt.nombre }}</q-item-label>
                  <q-item-label caption>{{ scope.opt.codigo }}</q-item-label>
                </q-item-section>
              </q-item>
            </template>
          </q-select>
        </div>

        <div class="campo">
          <label class="campo-label">Usuarios específicos</label>
          <q-select
            v-model="form.usuarios"
            outlined dense multiple use-chips
            :options="opcionesUsuarios"
            option-value="value" option-label="label"
            emit-value map-options
            use-input input-debounce="200"
            placeholder="Buscar y seleccionar personas..."
          />
        </div>

        <div class="contador">
          <q-icon name="people" size="16px" />
          {{ totalSeleccionados }} criterio(s) seleccionado(s)
          <span v-if="totalSeleccionados === 0" class="req">— elegí al menos uno</span>
        </div>
      </section>

      <section v-if="pasoActual === 3 && !cargando" class="paso">
        <h2 class="paso-titulo">Revisar y enviar</h2>
        <p class="paso-desc">Revisá el resumen antes de confirmar.</p>

        <div class="preview-card">
          <div class="preview-head">
            <q-badge :color="nivelActual.color" :label="nivelActual.label" />
            <span class="preview-fecha">Ahora</span>
          </div>
          <h3 class="preview-titulo">{{ form.titulo }}</h3>
          <p class="preview-contenido">{{ form.contenido }}</p>
        </div>

        <div class="resumen">
          <div class="resumen-title">Destinatarios</div>
          <ul v-if="resumenDestinatarios.length" class="resumen-lista">
            <li v-for="(item, i) in resumenDestinatarios" :key="i">{{ item }}</li>
          </ul>
          <p v-else class="req">No hay destinatarios seleccionados</p>
        </div>

        <q-checkbox
          v-model="form.enviarEmailTodos"
          label="Forzar email a TODOS los destinatarios (ignora el nivel)"
          color="primary"
        />

        <div class="aviso-email">
          <q-icon name="info" size="16px" />
          <span v-if="form.enviarEmailTodos">Se enviará email a todos los destinatarios.</span>
          <span v-else-if="form.nivelAlerta === 'critico'">Se enviará email a coordinadores y docentes.</span>
          <span v-else-if="form.nivelAlerta === 'alto'">Se enviará email solo a coordinadores.</span>
          <span v-else>Solo se enviará notificación web.</span>
        </div>
      </section>

      <footer class="wizard-nav">
        <q-btn
          flat no-caps
          :label="pasoActual === 1 ? 'Cancelar' : 'Atrás'"
          icon="arrow_back"
          @click="pasoAnterior"
        />
        <q-btn
          v-if="pasoActual < pasoTotal"
          unelevated no-caps
          color="primary"
          label="Siguiente"
          icon-right="arrow_forward"
          :disable="!puedeSiguiente"
          @click="pasoSiguiente"
        />
        <q-btn
          v-else
          unelevated no-caps
          color="primary"
          :label="enviando ? 'Enviando...' : 'Enviar comunicado'"
          icon="send"
          :loading="enviando"
          :disable="!puedeSiguiente"
          @click="enviar"
        />
      </footer>
    </div>
  </div>
</template>

<style scoped>
.wizard-page {
  min-height: 100%;
  background: var(--bg);
  padding: 32px 20px 60px;
}
.wizard-container {
  max-width: 720px;
  margin: 0 auto;
}
.wizard-header { margin-bottom: 24px; }
.wizard-title {
  font-size: 28px;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
  color: var(--text);
}
.wizard-sub {
  margin: 4px 0 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.stepper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 24px 0 32px;
  padding: 0 8px;
}
.step {
  display: flex;
  align-items: center;
  gap: 10px;
  position: relative;
  flex: 1;
}
.step:last-child { flex: 0 0 auto; }
.step-circle {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  background: var(--bg-elevated);
  border: 2px solid var(--border);
  color: var(--text-muted);
  flex-shrink: 0;
  z-index: 1;
  transition: all 0.2s;
}
.step.activo .step-circle {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
  box-shadow: 0 0 0 4px var(--primary-soft);
}
.step.completado .step-circle {
  background: var(--primary);
  border-color: var(--primary);
  color: white;
}
.step-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  white-space: nowrap;
}
.step.activo .step-label { color: var(--text); font-weight: 700; }
.step-line {
  flex: 1;
  height: 2px;
  background: var(--border);
  margin: 0 8px;
  align-self: center;
}
.step.completado .step-line { background: var(--primary); }

.paso {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 28px;
  margin-bottom: 20px;
}
.paso-titulo {
  font-size: 20px;
  font-weight: 800;
  margin: 0 0 4px 0;
  color: var(--text);
  letter-spacing: -0.01em;
}
.paso-desc {
  margin: 0 0 20px 0;
  color: var(--text-muted);
  font-size: 13px;
}

.campo { margin-bottom: 20px; }
.campo-label {
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.req { color: var(--error); font-weight: 800; }

.niveles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 8px;
}
.nivel-card {
  padding: 12px;
  background: var(--bg-hover);
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  text-align: left;
  font: inherit;
  transition: all 0.15s;
}
.nivel-card:hover { border-color: var(--border); }
.nivel-card.activo {
  border-color: var(--primary);
  background: var(--primary-soft);
}
.nivel-desc {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  line-height: 1.35;
}

.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--bg-hover);
  border: 2px solid transparent;
  border-radius: 100px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  font: inherit;
  transition: all 0.15s;
}
.chip:hover { border-color: var(--border); }
.chip.activo {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.chip-dot { width: 8px; height: 8px; border-radius: 50%; }

.contador {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  padding: 10px 14px;
  background: var(--bg-hover);
  border-radius: 10px;
  font-size: 12px;
  color: var(--text-secondary);
}

.preview-card {
  padding: 18px;
  background: var(--bg-hover);
  border: 1px solid var(--border);
  border-radius: 12px;
  margin-bottom: 16px;
}
.preview-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.preview-fecha { font-size: 11px; color: var(--text-muted); }
.preview-titulo {
  font-size: 16px;
  font-weight: 800;
  margin: 0 0 6px 0;
  color: var(--text);
}
.preview-contenido {
  margin: 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.resumen {
  margin: 16px 0;
  padding: 14px;
  background: var(--bg-hover);
  border-radius: 10px;
}
.resumen-title {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.resumen-lista {
  margin: 0;
  padding-left: 18px;
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.65;
}

.aviso-email {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  padding: 10px 14px;
  background: var(--primary-soft);
  border-radius: 8px;
  font-size: 12px;
  color: var(--primary);
}

.wizard-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-top: 20px;
}

@media (max-width: 600px) {
  .wizard-page { padding: 16px 12px 40px; }
  .wizard-title { font-size: 22px; }
  .paso { padding: 20px 16px; }
  .step-label { display: none; }
  .step { flex: 0 0 auto; }
  .step-line { min-width: 20px; }
}
</style>
