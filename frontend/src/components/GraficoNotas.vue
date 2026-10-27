<script setup>
import { computed } from 'vue';

const props = defineProps({
  notas: {
    type: Array,
    default: () => [],
  },
});

const buckets = computed(() => {
  const rangos = [
    { label: '0-2',  min: 0, max: 2 },
    { label: '2-4',  min: 2, max: 4 },
    { label: '4-6',  min: 4, max: 6 },
    { label: '6-8',  min: 6, max: 8 },
    { label: '8-10', min: 8, max: 10.01 },
  ];

  const notasValidas = props.notas.filter(n => n != null && !isNaN(Number(n))).map(Number);
  const total = notasValidas.length;

  return rangos.map(r => {
    const count = notasValidas.filter(n => n >= r.min && n < r.max).length;
    return {
      ...r,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
});

const total = computed(() => props.notas.filter(n => n != null).length);

const maxCount = computed(() => Math.max(...buckets.value.map(b => b.count), 1));

const promedio = computed(() => {
  const validas = props.notas.filter(n => n != null && !isNaN(Number(n))).map(Number);
  if (!validas.length) return null;
  return (validas.reduce((a, b) => a + b, 0) / validas.length).toFixed(2);
});

const aprobados = computed(() => {
  return props.notas.filter(n => n != null && Number(n) >= 6).length;
});

const rango = computed(() => {
  const validas = props.notas.filter(n => n != null && !isNaN(Number(n))).map(Number);
  if (!validas.length) return null;
  return {
    min: Math.min(...validas).toFixed(1),
    max: Math.max(...validas).toFixed(1),
  };
});

function colorBucket(label) {
  const n = parseFloat(label.split('-')[0]);
  if (n >= 8) return 'var(--success)';
  if (n >= 6) return 'var(--info)';
  if (n >= 4) return 'var(--warning)';
  return 'var(--error)';
}
</script>

<template>
  <div class="chart-notas">
    <div class="cn-header">
      <div class="cn-title">
        <q-icon name="bar_chart" size="20px" />
        <span>Distribución de notas</span>
      </div>
      <q-badge outline color="primary" :label="`${total} ${total === 1 ? 'nota' : 'notas'}`" />
    </div>

    <div v-if="!total" class="cn-empty">
      <q-icon name="bar_chart_off" size="40px" />
      <p>Sin notas registradas todavía</p>
    </div>

    <div v-else class="cn-bars">
      <div v-for="b in buckets" :key="b.label" class="cn-row">
        <div class="cn-label">{{ b.label }}</div>
        <div class="cn-bar-wrapper">
          <div
            class="cn-bar"
            :style="{
              width: `${(b.count / maxCount) * 100}%`,
              background: colorBucket(b.label),
            }"
          >
            <span v-if="b.count > 0" class="cn-bar-count">{{ b.count }}</span>
          </div>
        </div>
        <div class="cn-pct">{{ b.pct }}%</div>
      </div>
    </div>

    <div v-if="total" class="cn-footer">
      <div class="cn-stat">
        <span class="cn-stat-label">Promedio</span>
        <span class="cn-stat-value">{{ promedio }}</span>
      </div>
      <div class="cn-stat">
        <span class="cn-stat-label">Aprobados</span>
        <span class="cn-stat-value success">{{ aprobados }}/{{ total }}</span>
      </div>
      <div class="cn-stat">
        <span class="cn-stat-label">Rango</span>
        <span class="cn-stat-value">{{ rango.min }}–{{ rango.max }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chart-notas {
  padding: 20px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 14px;
}

.cn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle);
}

.cn-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  color: var(--text);
}

.cn-title .q-icon {
  color: var(--primary);
}

.cn-bars {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.cn-row {
  display: grid;
  grid-template-columns: 50px 1fr 50px;
  align-items: center;
  gap: 12px;
}

.cn-label {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-muted);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  letter-spacing: 0.02em;
}

.cn-bar-wrapper {
  height: 28px;
  background: var(--bg-hover);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

.cn-bar {
  height: 100%;
  border-radius: 6px;
  min-width: 2px;
  transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  position: relative;
}

.cn-bar-count {
  font-size: 11px;
  font-weight: 800;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.cn-pct {
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-secondary);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.cn-footer {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border-subtle);
}

.cn-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.cn-stat-label {
  font-size: 10.5px;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.cn-stat-value {
  font-size: 16px;
  font-weight: 800;
  color: var(--text);
  letter-spacing: -0.3px;
}

.cn-stat-value.success {
  color: var(--success);
}

.cn-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 40px 20px;
  color: var(--text-muted);
  text-align: center;
}

.cn-empty .q-icon {
  color: var(--text-disabled);
}

.cn-empty p {
  margin: 0;
  font-size: 13px;
}

@media (max-width: 700px) {
  .cn-row {
    grid-template-columns: 44px 1fr 42px;
    gap: 8px;
  }

  .cn-label {
    font-size: 10.5px;
  }

  .cn-bar-wrapper {
    height: 24px;
  }

  .cn-pct {
    font-size: 10.5px;
  }
}
</style>
