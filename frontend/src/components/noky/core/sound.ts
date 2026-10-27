// Motor de sonido profesional usando Web Audio API (sin delays ni trabas)
let audioCtx: AudioContext | null = null;
const buffers = new Map<string, AudioBuffer>();

export class Sound {
  static enabled = true;
  static volume = 0.5;

  static async preload() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    const names = ['pop', 'send', 'finish', 'error', 'blip', 'peek', 'greet', 'work', 'think', 'slap', 'annoyed'];
    
    for (const name of names) {
      if (buffers.has(name)) continue;
      try {
        // Vite resuelve esta ruta en desarrollo
        const res = await fetch(`/src/assets/sounds/${name}.wav`);
        if (!res.ok) continue;
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        buffers.set(name, audioBuffer);
      } catch (e) {
        console.warn('No se pudo cargar el sonido:', name);
      }
    }
  }

  static play(name: string) {
    if (!this.enabled || !audioCtx || !buffers.has(name)) return;
    
    // Los navegadores bloquean el audio hasta que el usuario hace el primer clic
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    try {
      const source = audioCtx.createBufferSource();
      source.buffer = buffers.get(name)!;
      
      const gainNode = audioCtx.createGain();
      gainNode.gain.value = this.volume;
      
      source.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      source.start(0);
    } catch (e) {
      // Si falla un sonido, no rompemos la app
    }
  }

  static resume() {
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }
  
  static fadeOut(name: string, dur: number) {}
  static reload() { return Promise.resolve(); }
}
