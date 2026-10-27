import { ref, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { useAuthStore } from '../stores/auth.store.js';

const URL_WEBSOCKET = import.meta.env.VITE_WS_URL || 'http://localhost:3000';

let socket = null;
const conectado = ref(false);
const oyentes = new Map();

export function useWebSocket() {
  const auth = useAuthStore();

  function conectar() {
    if (socket?.connected) return;

    socket = io(URL_WEBSOCKET, {
      auth: { token: auth.token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      conectado.value = true;
      if (import.meta.env.DEV) console.log('[WebSocket] Conectado');

      if (auth.user?.id) {
        socket.emit('unirse', { usuarioId: auth.user.id });
      }
    });

    socket.on('disconnect', () => {
      conectado.value = false;
      if (import.meta.env.DEV) console.log('[WebSocket] Desconectado');
    });

    socket.on('connect_error', (err) => {
      console.warn('Error WebSocket:', err.message);
    });

    socket.on('notificacion', (datos) => {
      const callback = oyentes.get('notificacion');
      if (callback) callback(datos);
    });

    socket.on('evento-examen', (datos) => {
      const callback = oyentes.get('evento-examen');
      if (callback) callback(datos);
    });
  }

  function desconectar() {
    if (socket) {
      socket.disconnect();
      socket = null;
      conectado.value = false;
    }
  }

  function escuchar(evento, callback) {
    oyentes.set(evento, callback);
    return () => oyentes.delete(evento);
  }

  function emitir(evento, datos) {
    if (socket?.connected) socket.emit(evento, datos);
  }

  onUnmounted(() => {
  });

  return {
    conectado,
    conectar,
    desconectar,
    escuchar,
    emitir,
  };
}
