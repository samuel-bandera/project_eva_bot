<script setup>
import { ref, computed, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import * as coordApi from '../../api/coordinador.api.js';

const $q = useQuasar();

const cargando = ref(true);
const codigos = ref([]);

const disponibles = computed(() => codigos.value.filter(c => !c.usado && !c.revocado));

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function estadoBadge(c) {
  if (c.revocado) return { color: 'negative', label: 'Revocado' };
  if (c.usado) return { color: 'grey-6', label: 'Usado' };
  return { color: 'positive', label: 'Disponible' };
}

async function cargar() {
  cargando.value = true;
  try {
    codigos.value = await coordApi.listarCodigosProfesor();
  } catch (e) {
    $q.notify({ type: 'negative', message: 'Error al cargar códigos' });
  } finally {
    cargando.value = false;
  }
}

function generar() {
  $q.dialog({
    title: 'Generar código de invitación',
    message: 'Código para registrar un nuevo docente',
    prompt: { model: '', label: 'Motivo (opcional)', outlined: true },
    cancel: true,
    persistent: true,
  }).onOk(async (motivo) => {
    try {
      const nuevo = await coordApi.generarCodigoProfesor(motivo || null);
      $q.notify({ type: 'positive', message: `Código creado: ${nuevo?.codigo || nuevo?.code || ''}` });
      await cargar();
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al generar' });
    }
  });
}

function revocar(c) {
  $q.dialog({
    title: 'Revocar código',
    message: '¿Estás seguro? El docente ya no podrá usarlo.',
    cancel: true,
    persistent: true,
  }).onOk(async () => {
    try {
      await coordApi.revocarCodigoProfesor(c.id);
      $q.notify({ type: 'positive', message: 'Código revocado' });
      await cargar();
    } catch (e) {
      $q.notify({ type: 'negative', message: 'Error al revocar' });
    }
  });
}

function copiar(codigo) {
  navigator.clipboard?.writeText(codigo);
  $q.notify({ type: 'positive', message: 'Copiado' });
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md coord-page">
    <div class="page-head q-mb-md">
      <div>
        <h1 class="page-title">Códigos de invitación</h1>
        <p class="page-sub">{{ disponibles.length }} disponibles · {{ codigos.length }} en total</p>
      </div>
      <q-btn unelevated color="primary" icon="add" label="Generar código" no-caps @click="generar" />
    </div>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !codigos.length" flat bordered class="empty-card">
      <q-card-section class="text-center q-pa-xl">
        <q-icon name="vpn_key" size="56px" color="grey-5" class="q-mb-sm" />
        <div class="text-h6">Sin códigos</div>
        <div class="text-caption text-grey-7 q-mb-md">Generá el primero para invitar docentes</div>
        <q-btn unelevated color="primary" icon="add" label="Generar código" no-caps @click="generar" />
      </q-card-section>
    </q-card>

    <div v-else class="row q-col-gutter-md">
      <div v-for="c in codigos" :key="c.id" class="col-12 col-md-6">
        <q-card flat bordered class="codigo-card">
          <q-card-section>
            <div class="row items-center justify-between q-mb-sm">
              <q-badge :color="estadoBadge(c).color" :label="estadoBadge(c).label" />
              <q-btn flat dense round icon="content_copy" size="sm" @click="copiar(c.codigo || c.code)">
                <q-tooltip>Copiar código</q-tooltip>
              </q-btn>
            </div>
            <div class="codigo-numero">{{ c.codigo || c.code || '—' }}</div>
            <div class="codigo-meta">
              <q-icon name="schedule" size="13px" />
              Creado {{ formatearFecha(c.creado_en) }}
            </div>
            <div v-if="c.motivo" class="codigo-motivo">{{ c.motivo }}</div>
          </q-card-section>
          <q-separator />
          <q-card-actions align="right">
            <q-btn
              v-if="!c.usado && !c.revocado"
              flat dense no-caps color="negative"
              label="Revocar"
              icon="block"
              @click="revocar(c)"
            />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.coord-page { max-width: 1280px; margin: 0 auto; }
.page-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.page-title { font-size: 26px; font-weight: 800; margin: 0; letter-spacing: -0.02em; color: var(--text); }
.page-sub { margin: 4px 0 0 0; color: var(--text-muted); font-size: 13px; }
.empty-card { border-radius: 14px; }

.codigo-card { border-radius: 14px; height: 100%; }
.codigo-numero {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: 4px;
  color: var(--primary);
  padding: 4px 0;
}
.codigo-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}
.codigo-motivo {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--bg-hover);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
}
</style>
