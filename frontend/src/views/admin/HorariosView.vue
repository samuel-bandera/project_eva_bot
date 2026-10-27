<template>
  <q-page class="horarios-page">
    <header class="page-header">
      <h1>Gestión de Horarios</h1>
      <p class="subtitle">Programá clases para los docentes y grupos</p>
    </header>

    <div class="grid-layout">
      <q-card flat class="form-card">
        <q-card-section>
          <h2>Nueva Clase</h2>
          <div class="q-gutter-y-sm q-mt-md">
            <q-select v-model="form.materiaId" :options="materias" option-value="id" option-label="nombre" emit-value map-options outlined dense label="Materia" @update:model-value="alCambiarMateria" />
            <q-select v-model="form.grupoId" :options="gruposFiltrados" option-value="id" option-label="nombre" emit-value map-options outlined dense label="Grupo" />
            <q-select v-model="form.docenteId" :options="docentesFiltrados" option-value="id" option-label="nombreCompleto" emit-value map-options outlined dense label="Docente" />

            <div class="row q-col-gutter-sm">
              <div class="col-12"><q-input v-model="form.titulo" outlined dense label="Título (Ej: Clase 1 - Intro)" /></div>
              <div class="col-6"><q-input v-model="form.fecha" type="date" outlined dense label="Fecha" /></div>
              <div class="col-6"><q-select v-model="form.tipo" :options="['teorica', 'practica', 'laboratorio', 'examen']" outlined dense label="Tipo" /></div>
              <div class="col-6"><q-input v-model="form.horaInicio" type="time" outlined dense label="Inicio" /></div>
              <div class="col-6"><q-input v-model="form.horaFin" type="time" outlined dense label="Fin" /></div>
              <div class="col-12"><q-input v-model="form.aula" outlined dense label="Aula" /></div>
            </div>

            <q-btn unelevated color="primary" label="Agendar Clase" class="full-width q-mt-lg" no-caps :loading="guardando" @click="crearClase" />
          </div>
        </q-card-section>
      </q-card>

      <q-card flat class="list-card">
        <q-card-section>
          <h2>Próximas Clases</h2>
          <div v-if="cargando" class="flex justify-center q-pa-lg"><q-spinner color="primary" /></div>
          <div v-else-if="!clases.length" class="empty-state">No hay clases agendadas.</div>
          <div v-else class="lista-clases q-mt-md">
            <div v-for="c in clases" :key="c.id" class="clase-item">
              <div class="clase-fecha">
                <span class="dia">{{ new Date(c.fecha).getDate() }}</span>
                <span class="mes">{{ new Date(c.fecha).toLocaleDateString('es-UY', { month: 'short' }) }}</span>
              </div>
              <div class="clase-info">
                <div class="clase-titulo">{{ c.titulo || 'Clase' }}</div>
                <div class="clase-meta">
                  {{ c.materia_nombre }} · {{ c.grupo_nombre }} · {{ c.hora_inicio.slice(0,5) }} a {{ c.hora_fin.slice(0,5) }}
                </div>
              </div>
            </div>
          </div>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify } from 'quasar';
import http from '../../api/http.js';

const cargando = ref(true);
const guardando = ref(false);

const materias = ref([]);
const grupos = ref([]);
const docentes = ref([]);
const clases = ref([]);

const form = ref({
  materiaId: null,
  grupoId: null,
  docenteId: null,
  titulo: '',
  fecha: new Date().toISOString().slice(0, 10),
  tipo: 'teorica',
  horaInicio: '08:00',
  horaFin: '08:45',
  aula: ''
});

const gruposFiltrados = computed(() => {
  if (!form.value.materiaId) return grupos.value;
  return grupos.value.filter(g => g.materia_id === form.value.materiaId || !g.materia_id);
});

const docentesFiltrados = computed(() => {
  if (!form.value.materiaId) return docentes.value;
  return docentes.value.filter(d => d.materia_id === form.value.materiaId || !d.materia_id);
});

async function cargarDatos() {
  cargando.value = true;
  try {
    const [resMat, resGru, resDoc, resClases] = await Promise.all([
      http.get('/materias?limit=100'),
      http.get('/grupos'),
      http.get('/usuarios?tipo=docente'),
      http.get('/asistencia/sesiones/materia/1')
    ]);
    materias.value = resMat.data.data || [];
    grupos.value = resGru.data.data || [];
    docentes.value = (resDoc.data.data || []).map(d => ({ ...d, nombreCompleto: `${d.nombre} ${d.apellido}` }));
    clases.value = resClases.data.data || [];
  } catch {
    Notify.create({ message: 'Error al cargar datos', color: 'negative' });
  } finally {
    cargando.value = false;
  }
}

async function crearClase() {
  if (!form.value.materiaId || !form.value.grupoId || !form.value.docenteId || !form.value.fecha) {
    return Notify.create({ message: 'Completá los campos obligatorios', color: 'warning' });
  }
  guardando.value = true;
  try {
    await http.post('/asistencia/sesiones', {
      materiaId: form.value.materiaId,
      grupoId: form.value.grupoId,
      docenteId: form.value.docenteId,
      titulo: form.value.titulo,
      fecha: form.value.fecha,
      tipo: form.value.tipo,
      horaInicio: form.value.horaInicio,
      horaFin: form.value.horaFin,
      aula: form.value.aula
    });
    Notify.create({ message: 'Clase agendada con éxito', color: 'positive' });
    form.value.titulo = '';
    await cargarDatos();
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al crear clase', color: 'negative' });
  } finally {
    guardando.value = false;
  }
}

onMounted(cargarDatos);
</script>

<style scoped>
.horarios-page { padding: 32px 40px; max-width: 1200px; margin: 0 auto; color: var(--text); }
.page-header { margin-bottom: 24px; }
.page-header h1 { font-size: 24px; font-weight: 800; margin: 0 0 4px; }
.subtitle { font-size: 14px; color: var(--text-muted); margin: 0; }
.grid-layout { display: grid; grid-template-columns: 1fr 1.5fr; gap: 24px; align-items: start; }
.form-card, .list-card { background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: 12px; }
.form-card h2, .list-card h2 { font-size: 16px; font-weight: 700; margin: 0; color: var(--text); }
.full-width { width: 100%; }
.empty-state { text-align: center; padding: 40px 20px; color: var(--text-muted); font-size: 14px; }
.lista-clases { display: flex; flex-direction: column; gap: 12px; }
.clase-item { display: flex; gap: 16px; padding: 12px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border-subtle); align-items: center; }
.clase-fecha { display: flex; flex-direction: column; align-items: center; background: var(--primary-soft); color: var(--primary); padding: 8px; border-radius: 8px; min-width: 50px; }
.clase-fecha .dia { font-size: 18px; font-weight: 800; line-height: 1; }
.clase-fecha .mes { font-size: 10px; text-transform: uppercase; font-weight: 600; }
.clase-titulo { font-weight: 600; font-size: 15px; color: var(--text); }
.clase-meta { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
@media (max-width: 900px) { .grid-layout { grid-template-columns: 1fr; } }
</style>
