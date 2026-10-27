import { verificarToken, extraerToken, hashToken } from '../utils/jwt.js';
import * as usuarioModel from '../models/admin/usuario_model.js';
import * as sesionModel from '../models/admin/usuario_sesiones_model.js';

export async function requiereAuth(req, res, next) {
  try {
    const token = extraerToken(req);
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Token no provisto' });
    }

    const payload = verificarToken(token);
    const usuario = await usuarioModel.buscarUsuarioPorId(payload.sub);
    if (!usuario || !usuario.activo) {
      return res.status(401).json({ ok: false, error: 'Usuario inactivo o inexistente' });
    }

    const tokenHash = hashToken(token);
    const sesionActiva = await sesionModel.buscarSesionActiva(tokenHash);

    if (!sesionActiva) {
      return res.status(401).json({ ok: false, error: 'Sesión revocada o expirada' });
    }

    req.usuario = usuario;
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ ok: false, error: 'Token inválido o expirado' });
  }
}

export function requiereTipo(...tipos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, error: 'No autenticado' });
    }
    if (!tipos.includes(req.usuario.tipo)) {
      return res.status(403).json({
        ok: false,
        error: `Acceso restringido a: ${tipos.join(', ')}`,
      });
    }
    next();
  };
}

export function requierePermiso(permiso) {
  return async (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, error: 'No autenticado' });
    }
    const tiene = await usuarioModel.tienePermiso(req.usuario.id, permiso);
    if (!tiene) {
      return res.status(403).json({
        ok: false,
        error: `Permiso requerido: ${permiso}`,
      });
    }
    next();
  };
}


export function requiereSubrolCoordinador(...subroles) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ ok: false, error: 'No autenticado' });
    }

    if (req.usuario.tipo === 'admin') {
      return next();
    }

    if (req.usuario.tipo !== 'coordinador') {
      return res.status(403).json({
        ok: false,
        error: 'Acceso restringido a coordinadores'
      });
    }

    const subrol = req.usuario.tipo_coordinacion || 'ninguno';
    if (!subroles.includes(subrol)) {
      return res.status(403).json({
        ok: false,
        error: `Se requiere sub-rol de coordinador: ${subroles.join(' o ')}`
      });
    }
    next();
  };
}
