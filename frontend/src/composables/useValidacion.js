import { ref, computed } from 'vue';

export function useValidacion(schema) {
  const errores = ref({});
  const tocado = ref({});
  const valido = ref(false);

  function validar(data) {
    const resultado = schema.safeParse(data);

    if (resultado.success) {
      errores.value = {};
      valido.value = true;
      return { ok: true, data: resultado.data };
    }

    const nuevos = {};
    for (const issue of resultado.error.issues) {
      const campo = issue.path[0] ?? '_';
      if (!nuevos[campo]) nuevos[campo] = issue.message;
    }
    errores.value = nuevos;
    valido.value = false;
    return { ok: false, errores: nuevos };
  }

  function limpiarErrores() {
    errores.value = {};
    tocado.value = {};
    valido.value = false;
  }

  function marcarTocado(campo) {
    tocado.value = { ...tocado.value, [campo]: true };
  }

  const hayErrores = computed(() => Object.keys(errores.value).length > 0);

  return {
    errores,
    tocado,
    valido,
    hayErrores,
    validar,
    limpiarErrores,
    marcarTocado,
  };
}
