<template>
  <div class="solicitud-item">
    <div class="solicitud-header">
      <div>
        <div class="solicitud-title">{{ solicitud.materia_nombre || ('Materia #' + solicitud.materia_id) }}</div>
        <div v-if="solicitud.materia_codigo" class="solicitud-code">{{ solicitud.materia_codigo }}</div>
      </div>
      <span class="badge" :class="claseEstado(solicitud.estado)">{{ solicitud.estado || 'pendiente' }}</span>
    </div>
    <div v-if="solicitud.mensaje" class="solicitud-mensaje">
      <q-icon name="chat" size="14px" /> {{ solicitud.mensaje }}
    </div>
    <div v-if="solicitud.respuesta" class="solicitud-respuesta">
      <q-icon name="reply" size="14px" /> {{ solicitud.respuesta }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  solicitud: { type: Object, required: true }
});

function claseEstado(estado) {
  if (estado === 'aprobada') return 'success';
  if (estado === 'rechazada') return 'danger';
  return 'warning';
}
</script>

<style scoped>
.solicitud-item {
  background: var(--bg-elevated);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid var(--border-subtle);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.solicitud-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}
.solicitud-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: -0.2px;
}
.solicitud-code {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
  margin-top: 2px;
}
.badge {
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 8px;
  text-transform: capitalize;
  letter-spacing: 0.2px;
}
.badge.success {
  background: color-mix(in srgb, var(--q-positive) 15%, transparent);
  color: var(--q-positive);
}
.badge.warning {
  background: color-mix(in srgb, var(--q-warning) 20%, transparent);
  color: color-mix(in srgb, var(--q-warning) 80%, var(--text));
}
.badge.danger {
  background: color-mix(in srgb, var(--q-negative) 15%, transparent);
  color: var(--q-negative);
}
.solicitud-mensaje {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--bg);
  border-radius: 10px;
  line-height: 1.5;
}
.solicitud-respuesta {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 13px;
  color: var(--text);
  margin-top: 8px;
  padding: 10px 12px;
  background: color-mix(in srgb, var(--q-info) 10%, var(--bg));
  border-radius: 10px;
  line-height: 1.5;
}
</style>
