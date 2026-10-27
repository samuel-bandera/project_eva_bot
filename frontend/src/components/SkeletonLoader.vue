<script setup>
defineProps({
  tipo: {
    type: String,
    default: 'card',
  },
  cantidad: {
    type: Number,
    default: 3,
  },
});
</script>

<template>
  <div v-if="tipo === 'stats'" class="skeleton-stats">
    <div v-for="i in cantidad" :key="i" class="sk-stat">
      <div class="sk-line sk-short" />
      <div class="sk-line sk-big" />
    </div>
  </div>

  <div v-else-if="tipo === 'card'" class="skeleton-cards">
    <div v-for="i in cantidad" :key="i" class="sk-card">
      <div class="sk-row">
        <div class="sk-line sk-tag" />
        <div class="sk-line sk-tag-sm" />
      </div>
      <div class="sk-line sk-title" />
      <div class="sk-line sk-subtitle" />
      <div class="sk-line sk-divider" />
      <div class="sk-row sk-meta">
        <div class="sk-line" />
        <div class="sk-line" />
        <div class="sk-line" />
      </div>
      <div class="sk-line sk-button" />
    </div>
  </div>

  <div v-else-if="tipo === 'list'" class="skeleton-list">
    <div v-for="i in cantidad" :key="i" class="sk-list-item">
      <div class="sk-avatar" />
      <div class="sk-body">
        <div class="sk-line sk-title-sm" />
        <div class="sk-line sk-subtitle-sm" />
      </div>
      <div class="sk-line sk-action" />
    </div>
  </div>

  <div v-else-if="tipo === 'table'" class="skeleton-table">
    <div class="sk-table-head">
      <div class="sk-line" v-for="i in 5" :key="`h${i}`" />
    </div>
    <div v-for="i in cantidad" :key="i" class="sk-table-row">
      <div class="sk-line" v-for="j in 5" :key="`c${i}-${j}`" />
    </div>
  </div>
</template>

<style scoped>
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.sk-line,
.sk-avatar,
.sk-stat,
.sk-card,
.sk-list-item,
.sk-table-row {
  background: linear-gradient(
    90deg,
    var(--bg-hover) 0%,
    var(--bg-sunken) 50%,
    var(--bg-hover) 100%
  );
  background-size: 800px 100%;
  animation: shimmer 1.4s ease-in-out infinite;
  border-radius: 6px;
}

.skeleton-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.sk-stat {
  height: 90px;
  border-radius: 12px;
  background: var(--bg-hover);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
  overflow: hidden;
}

.sk-stat::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 100%
  );
  animation: shimmer 1.4s infinite;
}

.sk-short { width: 60%; height: 10px; background: var(--bg-sunken); }
.sk-big   { width: 40%; height: 24px; background: var(--bg-sunken); }

.skeleton-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.sk-card {
  height: 260px;
  border-radius: 14px;
  background: var(--bg-hover);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
  overflow: hidden;
}

.sk-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 100%
  );
  animation: shimmer 1.6s infinite;
}

.sk-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sk-tag    { width: 60px;  height: 20px; background: var(--bg-sunken); }
.sk-tag-sm { width: 42px;  height: 18px; background: var(--bg-sunken); }
.sk-title  { width: 85%;   height: 18px; background: var(--bg-sunken); }
.sk-subtitle { width: 60%; height: 12px; background: var(--bg-sunken); }
.sk-divider  { height: 1px; background: var(--bg-sunken); margin: 8px 0; }
.sk-meta .sk-line { flex: 1; height: 34px; background: var(--bg-sunken); }
.sk-button { height: 38px; background: var(--bg-sunken); margin-top: auto; }

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sk-list-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 10px;
  background: var(--bg-hover);
  position: relative;
  overflow: hidden;
}

.sk-list-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.35) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

.sk-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--bg-sunken);
  flex-shrink: 0;
}

.sk-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.sk-title-sm    { height: 13px; width: 50%; background: var(--bg-sunken); }
.sk-subtitle-sm { height: 10px; width: 35%; background: var(--bg-sunken); }
.sk-action      { width: 80px; height: 30px; background: var(--bg-sunken); }

.skeleton-table {
  padding: 16px;
  background: var(--bg-elevated);
  border-radius: 14px;
}

.sk-table-head,
.sk-table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
  gap: 16px;
  padding: 12px 16px;
  align-items: center;
}

.sk-table-head {
  background: transparent;
  border-bottom: 1px solid var(--border);
}

.sk-table-head .sk-line {
  height: 10px;
  background: var(--bg-sunken);
  width: 60%;
}

.sk-table-row {
  background: transparent;
  border-bottom: 1px solid var(--border-subtle);
  border-radius: 0;
}

.sk-table-row .sk-line {
  height: 12px;
  background: var(--bg-sunken);
}

@media (max-width: 700px) {
  .skeleton-stats { grid-template-columns: repeat(2, 1fr); }
  .skeleton-cards { grid-template-columns: 1fr; }
  .sk-table-head,
  .sk-table-row { grid-template-columns: 2fr 1fr 1fr; gap: 10px; }
}
</style>
