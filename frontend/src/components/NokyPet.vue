<template>
  <div class="noky-wrapper" @click.stop="handleClick" @mouseenter="handleMouseEnter" @contextmenu.prevent>
    <canvas ref="canvasRef" class="noky-canvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { BotEngine, hexToRGB } from './noky/mochi/engine';
import { Sound } from './noky/core/sound';
import { useNokyStore } from '../stores/noky.store.js';

const props = defineProps({
  expanded: { type: Boolean, default: false },
  size: { type: Number, default: 0 },
  state: { type: String, default: 'idle' },
  hat: { type: String, default: 'witchHat' },
  color: { type: String, default: 'default' },
  emote: { type: String, default: '' }
});

const emit = defineEmits(['dizzy']);
const store = useNokyStore();
const canvasRef = ref(null);
let engine = null;
let ctx = null;
let rafId = null;
let lastTime = performance.now();

const IDLE_TIMEOUT_MS = 60000;
const SLEEP_YAWN_MS = 5 * 60 * 1000;
let idleTimer = null;
let sleepStartedAt = 0;
let hiddenAt = 0;
let lastScrollCheckAt = 0;
let lastScrollY = 0;

let clickCount = 0;
let clickTimer = null;

const getSize = () => props.expanded ? 130 : (props.size || 50);

const applyColor = () => {
  if (!engine) return;
  if (props.color === 'default') {
    engine.bodyColor = null;
  } else {
    engine.bodyColor = hexToRGB(props.color);
  }
};

const _resetIdleTimer = () => {
  if (idleTimer !== null) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (engine && engine.state === 'idle') {
      engine.setState('sleeping');
      sleepStartedAt = performance.now();
    }
  }, IDLE_TIMEOUT_MS);
};

const _onActivity = () => {
  if (engine && engine.state === 'sleeping') {
    const slept = performance.now() - sleepStartedAt;
    engine.setState('idle');
    if (slept > SLEEP_YAWN_MS) engine.triggerEmote('yawn', 2.2);
    else engine.blink();
  }
  _resetIdleTimer();
};

const _onScroll = () => {
  const t = performance.now();
  const y = window.scrollY;
  const dt = t - lastScrollCheckAt;
  const dy = y - lastScrollY;
  lastScrollCheckAt = t;
  lastScrollY = y;
  if (dt > 0 && dt < 300 && Math.abs(dy) > 40) {
    if (engine && engine.state !== 'dizzy' && engine.state !== 'sleeping' && Math.random() < 0.25) {
      engine.triggerEmote('surprised', 1.2);
    }
  }
};

const _onVisibilityChange = () => {
  if (document.hidden) {
    hiddenAt = performance.now();
  } else if (hiddenAt > 0) {
    const away = performance.now() - hiddenAt;
    if (engine) {
      if (engine.state === 'sleeping') { engine.setState('idle'); engine.blink(); }
      else if (away > 120000) { engine.triggerEmote('happy', 1.8); engine.greet(); }
    }
    hiddenAt = 0;
    _resetIdleTimer();
  }
};

const _onKeydown = () => _onActivity();

const handleMouseMove = (e) => {
  if (!store.eyeTracking || !engine || !canvasRef.value) return;
  const rect = canvasRef.value.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  engine.lookX = Math.max(-1, Math.min(1, (e.clientX - cx) / 300));
  engine.lookY = Math.max(-1, Math.min(1, -(e.clientY - cy) / 300));
};

const handleMouseEnter = () => {
  _onActivity();
  if (engine && engine.state !== 'dizzy') {
    engine.triggerEmote('happy', 2.5);
    if (store.soundEnabled) Sound.play('blip');
  }
};

let _lastClickAt = 0;
const handleClick = () => {
  const _t = performance.now();
  if (_t - _lastClickAt < 80) return;
  _lastClickAt = _t;
  _onActivity();
  if (!engine || engine.state === 'dizzy') return;

  engine.squash();
  engine.slap();
  if (store.soundEnabled) Sound.play('slap');

  clickCount++;
  if (clickTimer) clearTimeout(clickTimer);

  if (clickCount >= 4) {
    engine.setState('dizzy');
    emit('dizzy');
    clickCount = 0;
    setTimeout(() => { if (engine) engine.setState(props.state); }, 4000);
  } else {
    clickTimer = setTimeout(() => { clickCount = 0; }, 1000);
  }
};

const makeAngry = () => handleClick();
defineExpose({ makeAngry });

onMounted(() => {
  ctx = canvasRef.value.getContext('2d');
  engine = new BotEngine();
  engine.setState(props.state);
  engine.setOutfit(props.hat, false);
  applyColor();

  setTimeout(() => engine.greet(), 500);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('keydown', _onKeydown, { passive: true });
  window.addEventListener('scroll', _onScroll, { passive: true });
  window.addEventListener('touchstart', _onActivity, { passive: true });
  document.addEventListener('visibilitychange', _onVisibilityChange);
  lastScrollCheckAt = performance.now();
  lastScrollY = window.scrollY;
  _resetIdleTimer();

  const loop = (time) => {
    const dt = Math.min(0.05, (time - lastTime) / 1000);
    lastTime = time;
    engine.update(dt);

    if (!store.eyeTracking) { engine.lookX = 0; engine.lookY = 0; }

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = getSize();
    const H = getSize();

    if (canvasRef.value.width !== W * dpr) {
      canvasRef.value.width = W * dpr;
      canvasRef.value.height = H * dpr;
      canvasRef.value.style.width = W + 'px';
      canvasRef.value.style.height = H + 'px';
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    engine.draw(ctx, W, H);

    rafId = requestAnimationFrame(loop);
  };

  rafId = requestAnimationFrame(loop);
});

watch(() => props.hat, (newHat) => { if (engine) engine.setOutfit(newHat, true); });
watch(() => props.color, applyColor);
watch(() => props.state, (newState) => { if (engine) engine.setState(newState); });
watch(() => props.emote, (newEmote) => { if (engine && newEmote) engine.triggerEmote(newEmote, 2); });

onUnmounted(() => {
  if (rafId) cancelAnimationFrame(rafId);
  window.removeEventListener('mousemove', handleMouseMove);
  window.removeEventListener('keydown', _onKeydown);
  window.removeEventListener('scroll', _onScroll);
  window.removeEventListener('touchstart', _onActivity);
  document.removeEventListener('visibilitychange', _onVisibilityChange);
  if (idleTimer !== null) clearTimeout(idleTimer);
});
</script>

<style scoped>
.noky-wrapper { display: flex; align-items: center; justify-content: center; cursor: pointer; }
.noky-canvas { display: block; }
</style>
