import { ref, computed, watch } from 'vue';

const STORAGE_KEY = 'evalbot_tema';
const temasValidos = ['auto', 'light', 'dark'];

function leerTemaGuardado() {
  const t = localStorage.getItem(STORAGE_KEY);
  if (t === 'auto') return 'light';
  return temasValidos.includes(t) ? t : 'light';
}

function prefiereOscuro() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

const tema = ref(leerTemaGuardado());
const soPrefiereOscuro = ref(prefiereOscuro());

if (typeof window !== 'undefined' && window.matchMedia) {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', (e) => {
      soPrefiereOscuro.value = e.matches;
    });
  } else {
    mediaQuery.addListener((e) => {
      soPrefiereOscuro.value = e.matches;
    });
  }
}

const temaAplicado = computed(() => {
  if (tema.value === 'auto') {
    return soPrefiereOscuro.value ? 'dark' : 'light';
  }
  return tema.value;
});

watch(
  temaAplicado,
  (nuevoTema) => {
    document.documentElement.setAttribute('data-theme', nuevoTema);
    if (nuevoTema === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  { immediate: true }
);

watch(tema, (nuevoTemaSeleccionado) => {
  localStorage.setItem(STORAGE_KEY, nuevoTemaSeleccionado);
});

export function useTheme() {
  function ciclarTema() {
    const indiceActual = temasValidos.indexOf(tema.value);
    const siguienteIndice = (indiceActual + 1) % temasValidos.length;
    tema.value = temasValidos[siguienteIndice];
  }

  function cambiarTema(nuevoTema) {
    if (temasValidos.includes(nuevoTema)) {
      tema.value = nuevoTema;
    }
  }

  return {
    tema,
    temaAplicado,
    ciclarTema,
    cambiar: cambiarTema,
    ciclar: ciclarTema,
    resetearAuto: () => { tema.value = 'auto'; },
  };
}
