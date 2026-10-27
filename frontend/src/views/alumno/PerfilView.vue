<script setup>
import { ref, onMounted, computed } from 'vue';
import { useNokyStore } from '../../stores/noky.store.js';
import { useAuthStore } from '../../stores/auth.store.js';
import * as alumnoApi from '../../api/alumno.api.js';

const auth = useAuthStore();
const asistente = useNokyStore();
const cargando = ref(true);
const notificaciones = ref([]);
const misGrupos = ref([]);

const iniciales = computed(() => auth.iniciales);
const nombreCompleto = computed(() => auth.nombreCompleto || 'Alumno');

function formatearFechaCorta(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function iconoPorTipo(tipo) {
  return { info: 'info', alerta: 'warning', exito: 'check_circle', error: 'error' }[tipo] || 'notifications';
}

function colorPorTipo(tipo) {
  return { info: 'primary', alerta: 'warning', exito: 'positive', error: 'negative' }[tipo] || 'grey-6';
}

async function cargarPerfil() {
  cargando.value = true;
  try {
    const [listaNotificaciones, listaGrupos] = await Promise.all([
      alumnoApi.getNotificaciones(20).catch(() => []),
      alumnoApi.getMisGrupos().catch(() => []),
    ]);
    notificaciones.value = listaNotificaciones || [];
    misGrupos.value = listaGrupos || [];
  } catch (e) {
    console.error(e);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargarPerfil);
</script>

<template>
  <q-page class="q-pa-md">
    <div class="row items-center q-mb-md">
      <div>
        <div class="text-h5">Mi Perfil</div>
        <div class="text-caption text-grey-7">Información personal y actividad</div>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-4">
        <q-card flat bordered class="fit">
          <q-card-section class="text-center">
            <q-avatar size="96px" color="primary" text-color="white" class="q-mb-md text-weight-bold avatar-iniciales">
              {{ iniciales }}
            </q-avatar>
            <div class="text-h6">{{ nombreCompleto }}</div>
            <div class="text-caption text-primary text-weight-bold q-mt-xs rol-etiqueta">
              ESTUDIANTE
            </div>
          </q-card-section>

          <q-separator />

          <q-card-section>
            <q-list dense>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Usuario</q-item-label>
                  <q-item-label class="text-weight-medium">{{ auth.user?.usuario }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Email</q-item-label>
                  <q-item-label class="text-weight-medium">{{ auth.user?.email }}</q-item-label>
                </q-item-section>
              </q-item>
              <q-item>
                <q-item-section>
                  <q-item-label caption>Estado</q-item-label>
                  <q-item-label>
                    <q-badge color="positive" :label="auth.user?.estado || 'activo'" />
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>
          </q-card-section>

          <template v-if="misGrupos.length">
            <q-separator />
            <q-card-section>
              <div class="text-caption text-uppercase text-grey-7 text-weight-bold q-mb-sm">
                Mis grupos
              </div>
              <div class="row q-gutter-xs">
                <q-chip
                  v-for="grupo in misGrupos" :key="grupo.id"
                  color="primary"
                  text-color="white"
                  dense
                  :label="grupo.nombre"
                />
              </div>
            </q-card-section>
          </template>
        </q-card>
      </div>

      <div class="col-12 col-md-8">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Notificaciones recientes</div>
            <q-badge v-if="notificaciones.length" color="primary" :label="notificaciones.length" />
          </q-card-section>

          <q-inner-loading :showing="cargando">
            <q-spinner size="32px" color="primary" />
          </q-inner-loading>

          <q-card-section v-if="!cargando && !notificaciones.length" class="text-center text-grey-7 q-pa-xl">
            <q-icon name="notifications_off" size="48px" class="q-mb-sm" />
            <div>Sin notificaciones</div>
          </q-card-section>

          <q-list v-else separator>
            <q-item
              v-for="notificacion in notificaciones" :key="notificacion.id"
              :class="{ 'bg-grey-1': !notificacion.leida }"
            >
              <q-item-section avatar>
                <q-icon :name="iconoPorTipo(notificacion.tipo)" :color="colorPorTipo(notificacion.tipo)" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ notificacion.titulo }}</q-item-label>
                <q-item-label v-if="n.mensaje" caption lines="2">{{ notificacion.mensaje }}</q-item-label>
                <q-item-label caption class="text-grey-6">{{ formatearFechaCorta(notificacion.fecha) }}</q-item-label>
              </q-item-section>
              <q-item-section side v-if="!notificacion.leida">
                <q-badge color="primary" rounded>Nueva</q-badge>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>

<style scoped>
.avatar-iniciales {
  font-size: 36px;
}
.rol-etiqueta {
  letter-spacing: 0.1em;
}
</style>
