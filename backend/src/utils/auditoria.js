

import * as logModel from '../models/admin/log_model.js';

function extraerContexto(req) {
  return {
    ip: req.ip || req.connection?.remoteAddress || null,
    userAgent: (req.get?.('user-agent') || '').slice(0, 255) || null,
  };
}

function extraerUsuarioId(req) {
  return req?.usuario?.id ?? null;
}

export async function registrarLoginFallido(req, { usuarioId = null, usuarioIntentado = null, intento = null } = {}) {
  try {
    const { ip, userAgent } = extraerContexto(req);
    const detalle = intento
      ? `Intento ${intento} fallido para usuario "${usuarioIntentado}"`
      : `Intento fallido para usuario "${usuarioIntentado}"`;

    await logModel.registrarEvento(null, {
      tipo: 'login_fallido',
      gravedad: 'baja',
      usuarioId,
      entidad: 'usuarios',
      entidadId: usuarioId,
      ip,
      userAgent,
      detalle,
    });
  } catch (e) {
    console.warn('auditoria.loginFallido:', e.message);
  }
}

export async function registrarLoginExitoso(req, usuario) {
  try {
    const { ip, userAgent } = extraerContexto(req);
    await logModel.registrarEvento(null, {
      tipo: 'login_exitoso',
      gravedad: 'info',
      usuarioId: usuario.id,
      entidad: 'usuarios',
      entidadId: usuario.id,
      ip,
      userAgent,
      detalle: `Login exitoso de ${usuario.usuario} (${usuario.tipo})`,
    });
  } catch (e) {
    console.warn('auditoria.loginExitoso:', e.message);
  }
}

export async function registrarBloqueoCuenta(req, usuario, minutosBloqueo = 15) {
  try {
    const { ip, userAgent } = extraerContexto(req);
    await logModel.registrarEvento(null, {
      tipo: 'bloqueo_cuenta',
      gravedad: 'alta',
      usuarioId: usuario.id,
      entidad: 'usuarios',
      entidadId: usuario.id,
      ip,
      userAgent,
      detalle: `Cuenta bloqueada por ${minutosBloqueo} min tras múltiples intentos fallidos`,
    });
  } catch (e) {
    console.warn('auditoria.bloqueoCuenta:', e.message);
  }
}

export async function registrarCambioPassword(req, usuarioId) {
  try {
    const { ip, userAgent } = extraerContexto(req);
    await logModel.registrarEvento(null, {
      tipo: 'cambio_password',
      gravedad: 'media',
      usuarioId,
      entidad: 'usuarios',
      entidadId: usuarioId,
      ip,
      userAgent,
      detalle: 'Contraseña cambiada',
    });
  } catch (e) {
    console.warn('auditoria.cambioPassword:', e.message);
  }
}

export async function registrarAccesoDenegado(req, entidad, entidadId, motivo) {
  try {
    const { ip, userAgent } = extraerContexto(req);
    await logModel.registrarEvento(null, {
      tipo: 'acceso_denegado',
      gravedad: 'media',
      usuarioId: extraerUsuarioId(req),
      entidad,
      entidadId,
      ip,
      userAgent,
      detalle: motivo || `Acceso denegado a ${entidad}/${entidadId}`,
    });
  } catch (e) {
    console.warn('auditoria.accesoDenegado:', e.message);
  }
}

export async function registrarIntentoIdor(req, entidad, entidadId, contexto = '') {
  try {
    const { ip, userAgent } = extraerContexto(req);
    await logModel.registrarEvento(null, {
      tipo: 'intento_idor',
      gravedad: 'alta',
      usuarioId: extraerUsuarioId(req),
      entidad,
      entidadId,
      ip,
      userAgent,
      detalle: `Intento de acceso a recurso ajeno ${entidad}/${entidadId}${contexto ? ' — ' + contexto : ''}`,
    });
  } catch (e) {
    console.warn('auditoria.intentoIdor:', e.message);
  }
}

export async function registrarCambioNota(req, { alumnoId, evaluacionAlumnoId = null, tareaId = null, notaAnterior, notaNueva, motivo = '' }) {
  try {
    const { ip, userAgent } = extraerContexto(req);
    const entidad = tareaId ? 'tareas' : 'rendiciones';
    const entidadId = tareaId || evaluacionAlumnoId;
    await logModel.registrarEvento(null, {
      tipo: 'modificacion_nota',
      gravedad: 'alta',
      usuarioId: extraerUsuarioId(req),
      entidad,
      entidadId,
      ip,
      userAgent,
      detalle: `Nota alumno ${alumnoId}: ${notaAnterior} → ${notaNueva}${motivo ? ' | ' + motivo : ''}`,
    });
  } catch (e) {
    console.warn('auditoria.cambioNota:', e.message);
  }
}

export async function registrarEliminacion(req, entidad, entidadId, detalleExtra = '') {
  try {
    const { ip, userAgent } = extraerContexto(req);
    await logModel.registrarEvento(null, {
      tipo: 'eliminacion_registro',
      gravedad: 'media',
      usuarioId: extraerUsuarioId(req),
      entidad,
      entidadId,
      ip,
      userAgent,
      detalle: `Eliminación de ${entidad}/${entidadId}${detalleExtra ? ' — ' + detalleExtra : ''}`,
    });
  } catch (e) {
    console.warn('auditoria.eliminacion:', e.message);
  }
}

export async function registrarRateLimitExcedido(req, ruta) {
  try {
    const { ip, userAgent } = extraerContexto(req);
    await logModel.registrarEvento(null, {
      tipo: 'rate_limit_excedido',
      gravedad: 'media',
      usuarioId: extraerUsuarioId(req),
      entidad: 'rate_limit',
      entidadId: null,
      ip,
      userAgent,
      detalle: `Rate limit excedido en ${ruta}`,
    });
  } catch (e) {
    console.warn('auditoria.rateLimit:', e.message);
  }
}

export async function auditar(req, accion, { entidad = null, entidadId = null, detalle = null } = {}) {
  try {
    const { ip, userAgent } = extraerContexto(req);
    await logModel.registrarAuditoria(null, {
      usuarioId: extraerUsuarioId(req),
      accion,
      entidad,
      entidadId,
      detalle,
      ip,
      userAgent,
    });
  } catch (e) {
    console.warn('auditoria.auditar:', e.message);
  }
}

export function safe(fn) {
  return (...args) => {
    Promise.resolve(fn(...args)).catch((e) => {
      console.warn('auditoria.safe:', e.message);
    });
  };
}

