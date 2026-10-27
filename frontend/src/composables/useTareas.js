import { ref, computed, onMounted, onBeforeUnmount } from 'vue';
import * as alumnoApi from '../api/alumno.api.js';
import { estaVencida, estaEntregada } from '../utils/tareas.js';

export function useTareas() {
  const cargando = ref(true);
  const tareas = ref([]);
  const materiales = ref([]);
  const filtroEstado = ref('pendientes');
  const filtroMateria = ref('todas');
  const ahora = ref(Date.now());
  let temporizador = null;

  const materias = computed(() => {
    const mapa = new Map();
    tareas.value.forEach((t) => mapa.set(t.materia_id, t.materia_nombre));
    materiales.value.forEach((m) => mapa.set(m.materia_id, m.materia_nombre));
    return Array.from(mapa.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  const tareasFiltradas = computed(() => {
    let lista = tareas.value;
    if (filtroMateria.value !== 'todas') {
      lista = lista.filter((t) => Number(t.materia_id) === Number(filtroMateria.value));
    }
    if (filtroEstado.value === 'pendientes') return lista.filter((t) => !estaEntregada(t) && !estaVencida(t, ahora.value));
    if (filtroEstado.value === 'vencidas') return lista.filter((t) => !estaEntregada(t) && estaVencida(t, ahora.value));
    if (filtroEstado.value === 'entregadas') return lista.filter((t) => estaEntregada(t));
    return lista;
  });

  const materialesFiltrados = computed(() => {
    let lista = materiales.value;
    if (filtroMateria.value !== 'todas') {
      lista = lista.filter((m) => Number(m.materia_id) === Number(filtroMateria.value));
    }
    return lista;
  });

  const materialesAgrupados = computed(() => {
    const grupos = {};
    materialesFiltrados.value.forEach((m) => {
      const tema = m.tema || 'General';
      if (!grupos[tema]) grupos[tema] = [];
      grupos[tema].push(m);
    });
    return Object.keys(grupos).map((tema) => ({ tema, items: grupos[tema] }));
  });

  const contadores = computed(() => {
    let lista = tareas.value;
    if (filtroMateria.value !== 'todas') {
      lista = lista.filter((t) => Number(t.materia_id) === Number(filtroMateria.value));
    }
    return {
      pendientes: lista.filter((t) => !estaEntregada(t) && !estaVencida(t, ahora.value)).length,
      vencidas: lista.filter((t) => !estaEntregada(t) && estaVencida(t, ahora.value)).length,
      entregadas: lista.filter((t) => estaEntregada(t)).length,
      todas: lista.length,
    };
  });

  async function cargar() {
    cargando.value = true;
    try {
      const [respuestaTareas, respuestaMateriales] = await Promise.all([
        alumnoApi.getMisTareas().catch((e) => { console.error('Error tareas:', e); return []; }),
        alumnoApi.getMisMateriales().catch((e) => { console.error('Error materiales:', e); return []; }),
      ]);
      tareas.value = respuestaTareas || [];
      materiales.value = respuestaMateriales || [];
    } catch (e) {
      console.error(e);
    } finally {
      cargando.value = false;
    }
  }

  onMounted(() => {
    cargar();
    temporizador = setInterval(() => { ahora.value = Date.now(); }, 60000);
  });

  onBeforeUnmount(() => {
    if (temporizador) clearInterval(temporizador);
  });

  return {
    cargando,
    tareas,
    materiales,
    filtroEstado,
    filtroMateria,
    ahora,
    materias,
    tareasFiltradas,
    materialesFiltrados,
    materialesAgrupados,
    contadores,
    cargar,
  };
}
