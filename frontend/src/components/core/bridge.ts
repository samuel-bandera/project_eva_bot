// Puente falso para evitar que el código de Coucou busque a Tauri.
// Simula las funciones que el dibujo (Mochi) intenta llamar.

export const Bridge = {
  playSound: (name: string) => {
    // Silencio total en la web. El personaje se mueve pero no hace ruido.
    console.log('[Mochi] Sonido simulado:', name)
  },
  // Agregamos otros métodos comunes por si acaso
  invoke: async () => {},
  emit: () => {},
  listen: () => {},
  isTauri: false
}
