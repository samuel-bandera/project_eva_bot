import { ref, computed } from 'vue'

export function useTemporizadorExamen(onFinalizar) {
  const segundosRestantes = ref(0)
  const estaActivo = ref(false)
  let intervalo = null

  const iniciar = (segundosIniciales) => {
    detener()
    segundosRestantes.value = segundosIniciales
    estaActivo.value = true
    intervalo = setInterval(() => {
      if (segundosRestantes.value > 0) {
        segundosRestantes.value--
      } else {
        detener()
        if (typeof onFinalizar === 'function') {
          onFinalizar(true)
        }
      }
    }, 1000)
  }

  const detener = () => {
    if (intervalo) {
      clearInterval(intervalo)
      intervalo = null
    }
    estaActivo.value = false
  }

  const reiniciar = (segundos) => {
    iniciar(segundos)
  }

  const tiempoFormateado = computed(() => {
    const m = Math.floor(segundosRestantes.value / 60)
    const s = segundosRestantes.value % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  })

  return {
    segundosRestantes,
    estaActivo,
    tiempoFormateado,
    iniciar,
    detener,
    reiniciar
  }
}
