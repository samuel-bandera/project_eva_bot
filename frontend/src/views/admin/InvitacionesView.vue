<script setup>
import { ref, onMounted } from 'vue';
import { Notify, Dialog } from 'quasar';
import * as adminApi from '../../api/admin.api.js';

const cargando = ref(true);
const codigos = ref([]);
const generando = ref(false);

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

async function cargar() {
  cargando.value = true;
  try {
    codigos.value = await adminApi.listarCodigosProfesor();
  } catch (e) {
    Notify.create({ type: 'negative', message: 'Error al cargar códigos', position: 'top' });
  } finally {
    cargando.value = false;
  }
}

async function generar() {
  const motivo = await new Promise((resolve) => {
    Dialog.create({
      title: 'Nuevo código de invitación',
      message: 'Este código permite que un docente se registre.',
      prompt: {
        model: '',
        type: 'text',
        label: 'Motivo (opcional)',
        placeholder: 'Ej: Nuevo docente de Redes',
      },
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Generar', color: 'primary', unelevated: true },
    })
      .onOk((data) => resolve(data || null))
      .onCancel(() => resolve(undefined));
  });
  if (motivo === undefined) return;
  generando.value = true;
  try {
    const res = await adminApi.generarCodigoProfesor(motivo);
    await cargar();
    Notify.create({
      type: 'positive',
      message: `Código generado: ${res.codigo}`,
      position: 'top',
      timeout: 5000,
    });
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  } finally {
    generando.value = false;
  }
}

async function revocar(codigo) {
  const ok = await new Promise((resolve) => {
    Dialog.create({
      title: 'Revocar código',
      message: `¿Revocar el código ${codigo.codigo}?`,
      cancel: { label: 'Cancelar', flat: true, color: 'grey-7' },
      ok: { label: 'Revocar', color: 'negative', unelevated: true },
    })
      .onOk(() => resolve(true))
      .onCancel(() => resolve(false));
  });
  if (!ok) return;
  try {
    await adminApi.revocarCodigoProfesor(codigo.id);
    Notify.create({ type: 'info', message: 'Código revocado', position: 'top' });
    await cargar();
  } catch (e) {
    Notify.create({ type: 'negative', message: e.response?.data?.error || 'Error', position: 'top' });
  }
}

async function copiarCodigo(texto) {
  try {
    await navigator.clipboard.writeText(texto);
    Notify.create({ type: 'positive', message: 'Código copiado', position: 'top' });
  } catch (e) {
    Notify.create({ type: 'warning', message: 'No se pudo copiar', position: 'top' });
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center justify-between q-mb-md">
      <div>
        <div class="text-h5">Invitaciones</div>
        <div class="text-caption text-grey-7">Códigos para registrar docentes</div>
      </div>
      <q-btn
        unelevated no-caps color="primary"
        icon="vpn_key" label="Generar código"
        :loading="generando"
        @click="generar"
      />
    </div>

    <q-banner rounded class="bg-primary-soft text-primary q-mb-md" v-if="!cargando">
      <template #avatar><q-icon name="info" /></template>
      Los códigos de invitación son necesarios para que un profesor pueda registrarse en el sistema.
      Cada código es de un solo uso.
    </q-banner>

    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card v-if="!cargando && !codigos.length" flat bordered>
      <q-card-section class="text-center text-grey-7 q-pa-xl">
        <q-icon name="vpn_key" size="48px" class="q-mb-sm" />
        <div>No hay códigos generados</div>
        <q-btn unelevated no-caps color="primary" class="q-mt-md" label="Generar el primero" @click="generar" />
      </q-card-section>
    </q-card>

    <div v-else class="row q-col-gutter-md">
      <div v-for="c in codigos" :key="c.id" class="col-12 col-md-6">
        <q-card flat bordered :class="{ 'bg-grey-3': c.usado }">
          <q-card-section>
            <div class="row items-center justify-between">
              <div>
                <div class="row items-center q-gutter-sm">
                  <q-icon name="vpn_key" :color="c.usado ? 'grey-6' : 'primary'" size="24px" />
                  <div class="text-h6 text-weight-bold" style="font-family: monospace; letter-spacing: 2px;">
                    {{ c.codigo }}
                  </div>
                  <q-btn
                    v-if="!c.usado"
                    flat round dense size="sm"
                    icon="content_copy"
                    color="primary"
                    @click="copiarCodigo(c.codigo)"
                  >
                    <q-tooltip>Copiar</q-tooltip>
                  </q-btn>
                </div>
                <div v-if="c.motivo" class="text-caption text-grey-7 q-mt-xs">
                  <q-icon name="label" size="14px" /> {{ c.motivo }}
                </div>
              </div>
              <q-badge
                :color="c.usado ? 'grey-6' : (c.revocado ? 'negative' : 'positive')"
                :label="c.usado ? 'USADO' : (c.revocado ? 'REVOCADO' : 'DISPONIBLE')"
              />
            </div>
            <div class="text-caption text-grey-6 q-mt-sm">
              Creado: {{ formatearFecha(c.creado_en) }}
              <span v-if="c.usado && c.usado_en"> · Usado: {{ formatearFecha(c.usado_en) }}</span>
            </div>
          </q-card-section>
          <q-card-actions v-if="!c.usado && !c.revocado">
            <q-btn flat no-caps color="negative" icon="block" label="Revocar" @click="revocar(c)" />
          </q-card-actions>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
