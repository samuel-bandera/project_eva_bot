<template>
  <div class="materia-card" @click="$emit('ver', materia)">
    <div class="card-top">
      <div class="card-avatar">
        <q-icon name="school" size="22px" color="white" />
      </div>
      <span class="badge" :class="claseEstado(materia.estado_matricula)">
        {{ materia.estado_matricula || 'activa' }}
      </span>
    </div>
    <h3 class="card-title">{{ materia.materia_nombre || materia.nombre }}</h3>
    <p class="card-code">{{ materia.materia_codigo || materia.codigo || '—' }}</p>
    <div v-if="materia.profesor_nombre" class="card-docente">
      <q-icon name="person" size="14px" /> {{ materia.profesor_nombre }}
    </div>
  </div>
</template>

<script setup>
defineProps({
  materia: { type: Object, required: true }
});
defineEmits(['ver']);

function claseEstado(estado) {
  if (estado === 'aprobada' || estado === 'activa') return 'success';
  if (estado === 'pendiente') return 'warning';
  if (estado === 'rechazada') return 'danger';
  return 'neutral';
}
</script>

<style scoped>
.materia-card {
  background: var(--bg-elevated);
  border-radius: 18px;
  padding: 20px;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--border-subtle);
}
.materia-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.06);
}
.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}
.card-avatar {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  display: grid;
  place-items: center;
  box-shadow: 0 4px 10px color-mix(in srgb, var(--primary) 30%, transparent);
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
.badge.neutral {
  background: var(--bg);
  color: var(--text-muted);
}
.card-title {
  font-size: 17px;
  font-weight: 700;
  color: var(--text);
  margin: 0 0 4px 0;
  letter-spacing: -0.3px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.card-code {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  font-weight: 500;
}
.card-docente {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 12px;
  font-weight: 500;
}
</style>
