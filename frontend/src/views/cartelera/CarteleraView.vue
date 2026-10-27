<script setup>
import { ref, computed, onMounted } from 'vue';
import { useNokyStore } from '../../stores/noky.store.js';
import { Notify } from 'quasar';
import { useAuthStore } from '../../stores/auth.store.js';
import * as carteleraApi from '../../api/cartelera.api.js';

const auth = useAuthStore();
const cargando = ref(true);
const avisos = ref([]);
const modalCrear = ref(false);

const form = ref({ titulo: '', contenido: '', fijado: false });
const imagenFile = ref(null);
const previewImagen = ref(null);

const puedePublicar = computed(() => ['admin', 'coordinador'].includes(auth.user?.tipo));

function formatearFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const ahora = new Date();
  const dif = Math.floor((ahora - d) / 1000);

  if (dif < 60) return 'Hace un momento';
  if (dif < 3600) return `Hace ${Math.floor(dif / 60)} min`;
  if (dif < 86400) return `Hace ${Math.floor(dif / 3600)} h`;
  return d.toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

function onFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  imagenFile.value = file;
  const reader = new FileReader();
  reader.onload = (e) => { previewImagen.value = e.target.result; };
  reader.readAsDataURL(file);
}

async function cargar() {
  cargando.value = true;
  try {
    avisos.value = await carteleraApi.listarAvisos();
  } catch (e) {
    console.error(e);
  } finally {
    cargando.value = false;
  }
}

async function publicar() {
  if (!form.value.titulo.trim() || !form.value.contenido.trim()) {
    Notify.create({ message: 'Título y contenido requeridos', color: 'warning', position: 'bottom' });
    return;
  }
  if (form.value.contenido.length > 250) {
    Notify.create({ message: 'El texto no puede superar 250 caracteres', color: 'warning', position: 'bottom' });
    return;
  }

  try {
    const fd = new FormData();
    fd.append('titulo', form.value.titulo.trim());
    fd.append('contenido', form.value.contenido.trim());
    fd.append('fijado', form.value.fijado ? '1' : '0');
    if (imagenFile.value) fd.append('imagen', imagenFile.value);

    await carteleraApi.crearAviso(fd);
    Notify.create({ message: 'Publicación creada', color: 'positive', position: 'bottom', icon: 'campaign' });

    modalCrear.value = false;
    form.value = { titulo: '', contenido: '', fijado: false };
    imagenFile.value = null;
    previewImagen.value = null;
    cargar();
  } catch (e) {
    Notify.create({ message: e.response?.data?.error || 'Error al publicar', color: 'negative', position: 'bottom' });
  }
}

const comentariosAbiertos = ref({});
const perfilAbierto = ref(false);
const perfilData = ref(null);
const likeAnim = ref({});

function verPerfil(a) {
  perfilData.value = {
    nombre: a.autor_nombre,
    apellido: a.autor_apellido,
    avatar: a.autor_avatar,
    rol: 'Miembro de la comunidad'
  };
  perfilAbierto.value = true;
}
const comentariosData = ref({});
const nuevoComentario = ref({});

async function toggleLike(a) {
  try {
    const res = await carteleraApi.toggleLike(a.id);
    a.has_liked = res.liked;
    a.likes_count += res.liked ? 1 : -1;
    if (res.liked) {
      likeAnim.value[a.id] = true;
      setTimeout(() => { likeAnim.value[a.id] = false; }, 300);
    }
  } catch (e) { console.error(e); }
}

async function abrirComentarios(a) {
  comentariosAbiertos.value[a.id] = !comentariosAbiertos.value[a.id];
  if (comentariosAbiertos.value[a.id] && !comentariosData.value[a.id]) {
    try {
      comentariosData.value[a.id] = await carteleraApi.getComentarios(a.id);
    } catch (e) { console.error(e); }
  }
}

async function enviarComentario(a) {
  const txt = nuevoComentario.value[a.id];
  if (!txt || !txt.trim()) return;
  try {
    await carteleraApi.addComentario(a.id, txt);
    nuevoComentario.value[a.id] = '';
    comentariosData.value[a.id] = await carteleraApi.getComentarios(a.id);
    a.comentarios_count += 1;
  } catch (e) { console.error(e); }
}

function compartirInterno(a) {
  const assistantStore = useNokyStore();
  assistantStore.isOpen = true;
  assistantStore.messages.push({
    id: Date.now(),
    sender: 'user',
    text: `Te comparto esta publicación: "${a.titulo}" - ${a.contenido}`
  });
  setTimeout(() => {
    assistantStore.messages.push({
      id: Date.now() + 1,
      sender: 'bot',
      text: '¡Gracias por compartirlo! Ya lo guardé en mi memoria para que no lo pierdas. 📌'
    });
  }, 1000);
  Notify.create({ message: 'Enviado al chat de Mochi', color: 'info', position: 'bottom' });
}

onMounted(cargar);

</script>

<template>
  <q-page class="cartelera-page">
    <header class="page-header">
      <div class="page-header-icon"><q-icon name="campaign" size="24px" /></div>
      <div class="col">
        <h1 class="page-title">Cartelera</h1>
        <p class="page-sub">Comunidad EvalBot</p>
      </div>
      <q-btn v-if="puedePublicar" unelevated rounded no-caps color="primary" icon="add" label="Nueva publicación" @click="modalCrear = true" />
    </header>

    <div v-if="cargando" class="text-center q-py-xl">
      <q-spinner color="primary" size="40px" />
    </div>

    <div v-else-if="!avisos.length" class="empty-state">
      <div class="empty-illustration"><q-icon name="photo_library" size="44px" /></div>
      <h3 class="empty-titulo">Sin publicaciones</h3>
      <p class="empty-desc">Las novedades de la comunidad aparecerán acá.</p>
    </div>

    <div v-else class="feed-container">
      <article v-for="a in avisos" :key="a.id" class="insta-card">

        <header class="insta-header">
          <div class="avatar-ring" @click="verPerfil(a)" style="cursor: pointer;">
            <div class="author-avatar">
              <img v-if="a.autor_avatar" :src="`http://localhost:3000/uploads/${a.autor_avatar}`" class="avatar-img" />
              <span v-else-if="a.autor_nombre">{{ a.autor_nombre.charAt(0) }}{{ a.autor_apellido?.charAt(0) }}</span>
              <q-icon v-else name="person" />
            </div>
          </div>
          <div class="author-info">
            <div class="author-name" @click="verPerfil(a)" style="cursor: pointer;">{{ a.autor_nombre ? `${a.autor_nombre} ${a.autor_apellido}` : 'Coordinación' }}</div>
            <div class="post-date">{{ formatearFecha(a.creado_en || a.fecha) }}</div>
          </div>
          <q-icon v-if="a.fijado" name="push_pin" color="primary" size="20px" />
        </header>

        <div v-if="a.imagen_url" class="insta-image-container">
          <img :src="`http://localhost:3000/uploads/${a.imagen_url}`" alt="Imagen de la publicación" loading="lazy" />
        </div>
        <div v-else class="insta-image-container insta-image-container--empty">
          <div class="insta-title-placeholder">{{ a.titulo }}</div>
        </div>

        <div class="insta-actions">
          <div class="actions-left">
            <q-btn flat round dense :icon="a.has_liked ? 'favorite' : 'favorite_border'" :color="a.has_liked ? 'red' : ''" size="md" class="action-btn" :class="{ 'like-pop': likeAnim[a.id] }" @click="toggleLike(a)" />
            <span class="likes-count" v-if="a.likes_count > 0">{{ a.likes_count }}</span>

            <q-btn flat round dense icon="chat_bubble_outline" size="md" class="action-btn" @click="abrirComentarios(a)" />
            <span class="likes-count" v-if="a.comentarios_count > 0">{{ a.comentarios_count }}</span>

            <q-btn flat round dense icon="send" size="md" class="action-btn" @click="compartirInterno(a)" />
          </div>
        </div>

        <q-slide-transition>
        <div v-show="comentariosAbiertos[a.id]" class="comentarios-section">
          <div v-for="c in comentariosData[a.id]" :key="c.id" class="comentario-item">
            <span class="comentario-user">{{ c.nombre }}</span>: {{ c.contenido }}
          </div>
          <div class="comentario-input">
            <q-input v-model="nuevoComentario[a.id]" placeholder="Agregar un comentario..." dense outlined @keyup.enter="enviarComentario(a)" />
            <q-btn flat round dense icon="send" color="primary" @click="enviarComentario(a)" />
          </div>
        </div>
        </q-slide-transition>

        <div class="insta-caption">
          <span class="caption-user">{{ a.autor_nombre ? a.autor_nombre.toLowerCase() : 'coordinacion' }}</span>
          <span v-if="a.titulo" class="caption-title">{{ a.titulo }}.</span>
          <span class="caption-text">{{ a.contenido }}</span>
        </div>

      </article>
    </div>

    <q-dialog v-model="perfilAbierto">
      <q-card style="border-radius: 20px; max-width: 350px; width: 100%; text-align: center;">
        <q-card-section class="q-pt-lg">
          <div class="avatar-ring" style="width: 80px; height: 80px; margin: 0 auto 16px auto;">
            <div class="author-avatar" style="width: 76px; height: 76px; font-size: 24px;">
              <img v-if="perfilData?.avatar" :src="`http://localhost:3000/uploads/${perfilData.avatar}`" class="avatar-img" />
              <span v-else>{{ perfilData?.nombre?.charAt(0) }}{{ perfilData?.apellido?.charAt(0) }}</span>
            </div>
          </div>
          <div class="text-h6 text-weight-bold">{{ perfilData?.nombre }} {{ perfilData?.apellido }}</div>
          <div class="text-caption text-grey-7">{{ perfilData?.rol }}</div>
        </q-card-section>
        <q-card-actions align="center" class="q-pb-md">
          <q-btn flat no-caps label="Cerrar" color="primary" @click="perfilAbierto = false" />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <q-dialog v-model="modalCrear" persistent>
      <q-card style="border-radius: 20px; max-width: 500px; width: 100%;">
        <q-card-section class="row items-center">
          <div class="text-h6 text-weight-bold">Nueva Publicación</div>
          <q-space />
          <q-btn flat round dense icon="close" @click="modalCrear = false" />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <q-input v-model="form.titulo" label="Título" outlined dense maxlength="100" class="q-mb-md" />
          <q-input
            v-model="form.contenido"
            label="Descripción"
            type="textarea"
            outlined dense
            rows="3"
            maxlength="250"
            counter
            class="q-mb-md"
            placeholder="Escribe un pie de foto..."
          />

          <div class="q-mb-md">
            <div class="text-caption text-weight-bold q-mb-xs">Imagen (obligatoria para IG style)</div>
            <input type="file" accept="image/*" @change="onFileSelected" class="file-input" />
            <div v-if="previewImagen" class="preview-box q-mt-sm">
              <img :src="previewImagen" alt="Preview" />
            </div>
          </div>

          <q-toggle v-model="form.fijado" label="Fijar en la parte superior" color="primary" />
        </q-card-section>
        <q-card-actions align="right" class="q-pa-md">
          <q-btn flat no-caps label="Cancelar" @click="modalCrear = false" />
          <q-btn unelevated rounded no-caps color="primary" label="Compartir" @click="publicar" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<style scoped>
.cartelera-page { max-width: 600px; margin: 0 auto; padding: 24px; }
.page-header { display: flex; align-items: center; gap: 14px; margin-bottom: 24px; flex-wrap: wrap; }
.page-header-icon { display: grid; place-items: center; width: 52px; height: 52px; border-radius: 14px; background: var(--primary-soft); color: var(--primary); flex-shrink: 0; }
.page-title { font-size: 24px; font-weight: 800; letter-spacing: -0.025em; margin: 0; line-height: 1.1; color: var(--text); }
.page-sub { margin: 4px 0 0; font-size: 13px; color: var(--text-muted); }

.feed-container { display: flex; flex-direction: column; gap: 24px; }
.insta-card { background: var(--bg-elevated); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; }

.insta-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; }
.avatar-ring { padding: 2px; border-radius: 50%; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); }
.author-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--bg-elevated); color: var(--text); display: grid; place-items: center; font-weight: 700; font-size: 13px; border: 2px solid var(--bg-elevated); }
.author-info { flex: 1; }
.author-name { font-size: 13.5px; font-weight: 700; color: var(--text); }
.post-date { font-size: 11px; color: var(--text-muted); }

.insta-image-container { width: 100%; aspect-ratio: 1 / 1; background: #000; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.insta-image-container img { width: 100%; height: 100%; object-fit: cover; }
.insta-image-container--empty { aspect-ratio: auto; min-height: 200px; background: var(--primary-soft); padding: 24px; text-align: center; }
.insta-title-placeholder { font-size: 20px; font-weight: 800; color: var(--primary); }

.insta-actions { display: flex; justify-content: space-between; padding: 8px 12px 4px; }
.actions-left { display: flex; gap: 4px; }
.action-btn { color: var(--text); }

.insta-caption { padding: 4px 16px 16px; font-size: 13.5px; line-height: 1.5; color: var(--text-secondary); }
.caption-user { font-weight: 800; color: var(--text); margin-right: 6px; }
.caption-title { font-weight: 700; color: var(--text); margin-right: 4px; }
.caption-text { white-space: pre-wrap; }

.file-input { display: block; padding: 8px; border: 1px dashed var(--border); border-radius: 8px; width: 100%; background: var(--bg-hover); font-size: 13px; }
.preview-box { border-radius: 12px; overflow: hidden; max-height: 200px; }
.preview-box img { width: 100%; height: auto; display: block; }

.empty-state { display: flex; flex-direction: column; align-items: center; padding: 60px 24px; text-align: center; }
.empty-illustration { display: grid; place-items: center; width: 90px; height: 90px; border-radius: 50%; background: var(--primary-soft); color: var(--primary); margin-bottom: 20px; }
.empty-titulo { font-size: 18px; font-weight: 800; margin: 0 0 6px; color: var(--text); }
.empty-desc { font-size: 13px; color: var(--text-muted); margin: 0; }

.likes-count { font-size: 13px; font-weight: 600; margin-left: -8px; margin-right: 8px; color: var(--text); }
.comentarios-section { padding: 0 16px 16px; background: var(--bg-elevated); }
.comentario-item { font-size: 13px; margin-bottom: 6px; color: var(--text-secondary); }
.comentario-user { font-weight: 700; color: var(--text); }
.comentario-input { display: flex; align-items: center; gap: 8px; margin-top: 8px; }

.avatar-img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; display: block; }

@keyframes likePop {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}
.like-pop { animation: likePop 0.3s ease-in-out; }

.author-avatar { overflow: hidden; }
</style>
