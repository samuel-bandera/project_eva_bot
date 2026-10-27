import { Server } from 'socket.io';
import { verificarToken } from '../utils/jwt.js';

let io = null;

const usuariosConectados = new Map();

export function inicializarWebSocket(servidorHttp) {
  io = new Server(servidorHttp, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
      credentials: true,
    },
    path: '/socket.io',
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error('Token no provisto'));
      }

      const payload = verificarToken(token);
      socket.usuarioId = payload.sub;
      socket.usuarioTipo = payload.tipo;
      socket.usuarioNombre = payload.usuario;

      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { usuarioId, usuarioTipo, usuarioNombre } = socket;

    if (process.env.NODE_ENV !== 'production') console.log(`[Socket] Usuario conectado: ${usuarioNombre} (id=${usuarioId}, tipo=${usuarioTipo})`);

    socket.join(`usuario:${usuarioId}`);

    if (usuarioTipo === 'docente' || usuarioTipo === 'admin' || usuarioTipo === 'coordinador') {
      socket.join('docentes');
    }

    if (usuarioTipo === 'alumno') {
      socket.join('alumnos');
    }

    usuariosConectados.set(usuarioId, socket.id);

    socket.on('unirse', ({ usuarioId: uid }) => {
      if (uid) socket.join(`usuario:${uid}`);
    });

    socket.on('unirse-examen', ({ evaluacionId }) => {
      if (evaluacionId) {
        socket.join(`examen:${evaluacionId}`);
        if (process.env.NODE_ENV !== 'production') console.log(`[Socket] ${usuarioNombre} monitorea examen ${evaluacionId}`);
      }
    });

    socket.on('salir-examen', ({ evaluacionId }) => {
      if (evaluacionId) socket.leave(`examen:${evaluacionId}`);
    });

    socket.on('disconnect', () => {
      if (process.env.NODE_ENV !== 'production') console.log(`[Socket] Usuario desconectado: ${usuarioNombre}`);
      usuariosConectados.delete(usuarioId);
    });
  });

  return io;
}

export function emitirNotificacion(usuarioId, notificacion) {
  if (!io) return;
  io.to(`usuario:${usuarioId}`).emit('notificacion', notificacion);
}

export function emitirNotificacionAProfesores(notificacion) {
  if (!io) return;
  io.to('docentes').emit('notificacion', notificacion);
}

export function emitirNotificacionAAlumnos(notificacion) {
  if (!io) return;
  io.to('alumnos').emit('notificacion', notificacion);
}

export function emitirEventoExamen(evaluacionId, evento) {
  if (!io) return;
  io.to(`examen:${evaluacionId}`).emit('evento-examen', evento);
}

export function estaConectado(usuarioId) {
  return usuariosConectados.has(usuarioId);
}

export function contarConectados() {
  return usuariosConectados.size;
}

export function obtenerIo() {
  return io;
}

