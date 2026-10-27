<template>
  <div class="loading-grid">
    <div v-for="n in cantidad" :key="n" class="skeleton-card">
      <div class="skeleton-avatar"></div>
      <div class="skeleton-lines">
        <div class="skeleton-line" style="width: 70%;"></div>
        <div class="skeleton-line" style="width: 40%;"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cantidad: { type: Number, default: 3 }
});
</script>

<style scoped>
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}
.skeleton-card {
  background: var(--bg-elevated);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.skeleton-avatar {
  width: 44px;
  height: 44px;
  border-radius: 13px;
  background: linear-gradient(90deg, var(--bg) 25%, var(--bg-hover) 50%, var(--bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  margin-bottom: 14px;
}
.skeleton-lines { display: flex; flex-direction: column; gap: 8px; }
.skeleton-line {
  height: 14px;
  border-radius: 6px;
  background: linear-gradient(90deg, var(--bg) 25%, var(--bg-hover) 50%, var(--bg) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
