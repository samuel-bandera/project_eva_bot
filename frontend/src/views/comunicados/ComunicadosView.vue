<script setup>
import { ref, computed, onMounted } from 'vue';
import { Notify } from 'quasar';
import { useAuthStore } from '../../stores/auth.store.js';
import * as comunicadoApi from '../../api/comunicado.api.js';

const auth = useAuthStore();

const cargando = ref(true);
const error = ref('');
const comunicados = ref([]);
const filtro = ref('todos');
const modalCrear = ref(false);
const crearForm = ref({
  titulo: '', contenido: '', destinatario: 'todos', requiereConfirmacion: true,
});
const imagenFile = ref(null);
const previewImagen = ref(null);

const puedeCrear = computed(() => ['docente', 'coordinador', 'admin'].includes(auth.user?.tipo));

const contadores = computed(() => {
  const pendientes = comunicados.value.filter(c => c.requiere_confirmacion && !c.confirmado).length;
  const leidos = comunicados.value.filter(c => c.confirmado || !c.requiere_confirmacion).length;
  return { todos: comunicados.value.length, pendientes, leidos };
});

const comunicadosFiltrados = computed(() => {
  if (filtro.value === 'pendientes') return comunicados.value.filter(c => c.requiere_confirmacion && !c.confirmado);
  if (filtro.value === 'leidos') return comunicados.value.filter(c => c.confirmado || !c.requiere_confirmacion);
  return comunicados.value;
});

function fechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

async function cargar() {
  cargando.value = true;
  try {
    const datos = await comunicadoApi.listarComunicados();
    comunicados.value = (datos || []).map(c => ({ ...c, confirmado: Boolean(c.confirmado) }));
  } catch (e) {
    error.value = e.response?.data?.error || 'No se pudieron cargar los comunicados';
  } finally {
    cargando.value = false;
  }
}

async function confirmar(c) {
  try {
    await comunicadoApi.confirmarComunicado(c.id);
    c.confirmado = true;
    Notify.create({ message: 'Lectura confirmada', color: 'positive', icon: 'check_circle', position: 'bottom' });
  } catch (e) {
    Notify.create({ message: 'No se pudo confirmar', color: 'negative', position: 'bottom' });
  }
}

function onFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  imagenFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => { previewImagen.value = e.target.result; };
  reader.readAsDataURL(file);
}

async function crearComunicado() {
  if (!crearForm.value.titulo.trim() || !crearForm.value.contenido.trim()) {
    Notify.create({ message: 'Título y contenido son obligatorios', color: 'warning', position: 'bottom' });
    return;
  }
  try {
    const fd = new FormData();
    fd.append('titulo', crearForm.value.titulo.trim());
    fd.append('contenido', crearForm.value.contenido.trim());
    fd.append('destinatario', crearForm.value.destinatario);
    fd.append('requiere_confirmacion', crearForm.value.requiereConfirmacion ? '1' : '0');
    if (imagenFile.value) fd.append('imagen', imagenFile.value);

    await comunicadoApi.crearComunicado(fd);
    Notify.create({ message: 'Comunicado publicado', color: 'positive', icon: 'campaign', position: 'bottom' });
    modalCrear.value = false;
    crearForm.value = { titulo: '', contenido: '', destinatario: 'todos', requiereConfirmacion: true };
    cargar();
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al crear', color: 'negative', position: 'bottom' });
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="com-page">
    <header class="page-header">
      <div class="page-header-icon"><q-icon name="campaign" size="24px" /></div>
      <div class="col">
        <h1 class="page-title">Comunicados</h1>
        <p class="page-sub">Anuncios institucionales y avisos oficiales</p>
      </div>
      <q-btn v-if="puedeCrear" unelevated rounded no-caps color="primary" icon="add" label="Nuevo comunicado" @click="modalCrear = true" />
    </header>

    <div v-if="!cargando && comunicados.length" class="filtros">
      <button v-for="f in [{id:'todos', label:'Todos'},{id:'pendientes', label:'Pendientes'},{id:'leidos', label:'Leídos'}]" :key="f.id"
        :class="['chip', { activo: filtro === f.id }]" @click="filtro = f.id">
        {{ f.label }}
        <span class="chip-count">{{ contadores[f.id] }}</span>
      </button>
    </div>

    <div v-if="cargando" class="text-center q-py-xl">
      <q-spinner color="primary" size="40px" />
    </div>

    <div v-else-if="!comunicadosFiltrados.length" class="empty-state">
      <div class="empty-illustration"><q-icon name="mark_email_unread" size="40px" /></div>
      <h3 class="empty-titulo">Sin comunicados</h3>
      <p class="empty-desc">Cuando haya novedades, aparecerán acá.</p>
    </div>

    <div v-else class="comunicados-lista">
      <div v-for="c in comunicadosFiltrados" :key="c.id" class="com-card" :class="{ 'com-pendiente': c.requiere_confirmacion && !c.confirmado }">
        <div class="com-header">
          <div class="com-icon" :class="{ 'com-icon--alerta': c.fijado }">
            <q-icon :name="c.fijado ? 'push_pin' : 'campaign'" size="20px" />
          </div>
          <div class="com-info">
            <h3 class="com-titulo">{{ c.titulo }}</h3>
            <div class="com-meta">
              <span><q-icon name="event" size="12px" /> {{ fechaCorta(c.fecha) }}</span>
              <span v-if="c.autor_nombre"><q-icon name="person" size="12px" /> {{ c.autor_nombre }} {{ c.autor_apellido }}</span>
            </div>
          </div>
          <div class="com-badges">
            <span v-if="c.requiere_confirmacion && c.confirmado" class="badge badge--ok"><q-icon name="check" size="12px" /> Confirmado</span>
            <span v-if="c.requiere_confirmacion && !c.confirmado" class="badge badge--warn"><q-icon name="priority_high" size="12px" /> Requiere confirmación</span>
          </div>
        </div>
        <div class="com-body">{{ c.contenido }}</div>
        <div v-if="c.imagen_url" class="com-imagen">
          <img :src="`http://localhost:3000/uploads/${c.imagen_url}`" alt="Imagen del comunicado" />
        </div>
        <div v-if="c.requiere_confirmacion && !c.confirmado" class="com-actions">
          <q-btn unelevated rounded no-caps color="primary" icon="check" label="Confirmar lectura" @click="confirmar(c)" />
        </div>
      </div>
    </div>

    <q-dialog v-model="modalCrear" persistent>
      <q-card style="border-radius: 20px; max-width: 600px; width: 100%;">
        <q-card-section class="row items-center">
          <div>
            <div class="text-h6 text-weight-bold">Nuevo comunicado</div>
            <div class="text-caption text-grey-7">Se enviará según el destinatario</div>
          </div>
          <q-space />
          <q-btn flat round dense icon="close" @click="modalCrear = false" />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-input v-model="crearForm.titulo" label="Título" outlined dense maxlength="150" class="q-mb-md" />
          <q-input v-model="crearForm.contenido" label="Contenido" type="textarea" outlined dense rows="5" maxlength="2000" counter class="q-mb-md" />
          <q-select v-model="crearForm.destinatario" :options="[{label:'Todos',value:'todos'},{label:'Solo alumnos',value:'alumnos'},{label:'Solo profesores',value:'docentes'}]" emit-value map-options label="Destinatario" outlined dense class="q-mb-md" />
          <q-toggle v-model="crearForm.requiereConfirmacion" label="Requiere confirmación de lectura" color="primary" />

          <div class="q-mt-md">
            <div class="text-caption text-weight-bold q-mb-xs">Imagen (opcional)</div>
            <input type="file" accept="image/*" @change="onFileSelected" class="file-input" />
            <div v-if="previewImagen" class="preview-box q-mt-sm">
              <img :src="previewImagen" alt="Preview" />
            </div>
          </div>
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancelar" @click="modalCrear = false" />
          <q-btn unelevated rounded no-caps color="primary" icon="send" label="Publicar" @click="crearComunicado" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.com-page { max-width: 1000px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
.page-header-icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }
.page-title { font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin: 0; line-height: 1.1; color: var(--text); }
.page-sub { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }

.filtros { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
.chip { display: inline-flex; align-items: center; gap: 8px; padding: 9px 16px; background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 100px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.chip:hover { border-color: var(--primary); transform: translateY(-1px); }
.chip.activo { background: var(--primary); color: white; border-color: var(--primary); }
.chip-count { padding: 1px 8px; border-radius: 100px; background: var(--bg-hover); font-size: 11px; font-weight: 700; min-width: 22px; text-align: center; }
.chip.activo .chip-count { background: rgba(255, 255, 255, 0.25); }

.comunicados-lista { display: flex; flex-direction: column; gap: 14px; }
.com-card { background: var(--bg-elevated); border: 1px solid var(--border); border-radius: 18px; padding: 18px; transition: all 0.25s; }
.com-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -10px rgba(74, 7, 18, 0.12); border-color: rgba(74, 7, 18, 0.15); }
.com-pendiente { border-left: 4px solid var(--primary); }

.com-header { display: flex; gap: 14px; align-items: flex-start; }
.com-icon { width: 40px; height: 40px; border-radius: 10px; background: var(--bg-hover); display: grid; place-items: center; color: var(--text-muted); flex-shrink: 0; }
.com-icon--alerta { background: rgba(198, 40, 40, 0.12); color: #c62828; }
.com-info { flex: 1; min-width: 0; }
.com-titulo { font-size: 16px; font-weight: 700; color: var(--text); letter-spacing: -0.01em; margin: 0 0 4px; }
.com-meta { display: flex; gap: 12px; font-size: 11.5px; color: var(--text-muted); flex-wrap: wrap; }
.com-meta span { display: flex; align-items: center; gap: 4px; }
.com-badges { display: flex; gap: 6px; flex-shrink: 0; flex-wrap: wrap; }
.badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.04em; }
.badge--ok { background: rgba(46, 125, 50, 0.12); color: #2e7d32; }
.badge--warn { background: rgba(245, 124, 0, 0.12); color: #e65100; }

.com-body { padding: 14px 0 0 54px; font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; white-space: pre-line; }
.com-actions { padding: 14px 0 0 54px; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 24px; text-align: center; }
.empty-illustration { display: grid; place-items: center; width: 90px; height: 90px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); margin-bottom: 20px; }
.empty-titulo { font-size: 18px; font-weight: 800; margin: 0 0 6px; color: var(--text); }
.empty-desc { font-size: 13px; color: var(--text-muted); margin: 0; }

.file-input {
  display: block;
  padding: 8px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  width: 100%;
  background: var(--bg-hover);
  font-size: 13px;
}
.preview-box {
  border-radius: 12px;
  overflow: hidden;
  max-height: 200px;
}
.preview-box img {
  width: 100%;
  height: auto;
  display: block;
}
.com-imagen {
  margin: 12px 0 0 54px;
  border-radius: 12px;
  overflow: hidden;
  max-height: 400px;
}
.com-imagen img {
  width: 100%;
  height: auto;
  display: block;
}
</style>
