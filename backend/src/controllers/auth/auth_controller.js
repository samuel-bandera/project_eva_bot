import { z } from 'zod';
import * as usuarioModel from '../../models/admin/usuario_model.js';
import * as sesionModel from '../../models/admin/usuario_sesiones_model.js';
import { pool } from '../../config/db.js';
import { hashearPassword, verificarPassword } from '../../utils/hash.js';
import { firmarToken, hashToken, calcularExpiracion } from '../../utils/jwt.js';
import { ok, noAutorizado, error } from '../../utils/respuestas.js';
import * as auditoria from '../../utils/auditoria.js';

const DUMMY_HASH = '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

function normalizarUsuario(str) {
  if (typeof str !== 'string') return '';
  return str
    .normalize('NFKC')

    .replace(new RegExp('[\\u200B-\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069' + String.fromCharCode(0) + '-' + String.fromCharCode(31) + ']', 'g'), '')
    .trim()
    .toLowerCase();
}

export { normalizarUsuario };

const esquemaLogin = z.object({
  usuario:    z.string().min(1),
  contrasena: z.string().min(1),
});

const esquemaActualizarPerfil = z.object({
  nombre:   z.string().min(2).max(50).optional(),
  apellido: z.string().min(2).max(50).optional(),
  email:    z.string().email().optional(),
}).strict();

const esquemaCambiarPassword = z.object({
  contrasenaActual: z.string().min(1),
  contrasenaNueva:  z.string()
    .min(8, 'Mínimo 8 caracteres')
    .max(100)
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/[a-z]/, 'Debe tener al menos una minúscula')
    .regex(/\d/,   'Debe tener al menos un número'),
}).strict();

export async function login(req, res) {

  const { usuario, contrasena } = esquemaLogin.parse(req.body);
  const usuarioNorm = normalizarUsuario(usuario);

  const user = await usuarioModel.buscarPorIdentificador(usuarioNorm);

  const hashAComparar = user ? user.contrasena : DUMMY_HASH;
  const valida = await verificarPassword(contrasena, hashAComparar);

  if (user && user.bloqueado_hasta && new Date(user.bloqueado_hasta) > new Date()) {
    return error(res, 423, 'Cuenta bloqueada temporalmente. Intente más tarde.');
  }

  if (!user || !valida) {
    if (user) await usuarioModel.sumarIntentoFallido(null, user.id);
    auditoria.registrarLoginFallido(req, {
      usuarioId: user?.id || null,
      usuarioIntentado: usuarioNorm,
    });
    return noAutorizado(res, 'Credenciales inválidas');
  }

  if (user.estado !== 'aprobado') {
    return error(res, 403, `Cuenta en estado: ${user.estado}`);
  }

  if (!user.activo) {
    return error(res, 403, 'Cuenta desactivada');
  }

  await usuarioModel.resetearIntentosFallidos(null, user.id);
  await usuarioModel.actualizarUltimoLogin(null, user.id);
  auditoria.registrarLoginExitoso(req, user);

  const token = firmarToken({
    sub: user.id,
    usuario: user.usuario,
    tipo: user.tipo,
  });

  await sesionModel.crearSesion(null, {
    usuarioId: user.id,
    tokenHash: hashToken(token),
    ip: req.ip,
    userAgent: req.get('user-agent') || null,
    dispositivo: null,
    fechaExpiracion: calcularExpiracion(7),
  });

  return ok(res, {
    token,
    usuario: {
      id: user.id,
      nombre: user.nombre,
      apellido: user.apellido,
      usuario: user.usuario,
      email: user.email,
      tipo: user.tipo,
      avatar: user.avatar,
    },
  }, 'Login exitoso');
}

export async function logout(req, res) {
  try {
    const token = req.token;
    if (token) {
      await sesionModel.revocarSesion(null, hashToken(token), 'logout');
    }
    return ok(res, null, 'Sesión cerrada');
  } catch {
    return ok(res, null, 'Sesión cerrada');
  }
}

export async function perfil(req, res) {
  const permisos = await usuarioModel.obtenerPermisosDeUsuario(req.usuario.id);
  const roles = await usuarioModel.obtenerRolesDeUsuario(req.usuario.id);

  return ok(res, {
    usuario: req.usuario,
    roles,
    permisos: permisos.map((p) => p.nombre),
  });
}

export async function actualizarPerfil(req, res) {
  const datos = esquemaActualizarPerfil.parse(req.body);


  if (datos.email) {
    const existe = await usuarioModel.buscarUsuarioPorEmail(datos.email);
    if (existe && existe.id !== req.usuario.id) {
      return error(res, 409, 'Ese email ya está en uso');
    }
  }

  const campos = [];
  const valores = [];
  for (const [k, v] of Object.entries(datos)) {
    if (v !== undefined) {
      campos.push(`${k} = ?`);
      valores.push(v);
    }
  }
  if (campos.length === 0) {
    return error(res, 400, 'No hay campos para actualizar');
  }
  valores.push(req.usuario.id);

  await pool.query(
    `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
    valores
  );


  const actualizado = await usuarioModel.buscarUsuarioPorId(req.usuario.id);
  delete actualizado.contrasena;

  return ok(res, {
    usuario: {
      id: actualizado.id,
      nombre: actualizado.nombre,
      apellido: actualizado.apellido,
      usuario: actualizado.usuario,
      email: actualizado.email,
      tipo: actualizado.tipo,
      avatar: actualizado.avatar,
    }
  }, 'Perfil actualizado');
}

export async function cambiarPassword(req, res) {
  const { contrasenaActual, contrasenaNueva } = esquemaCambiarPassword.parse(req.body);

  const user = await usuarioModel.buscarUsuarioPorId(req.usuario.id);
  if (!user) return noAutorizado(res, 'Usuario no encontrado');


  const valida = await verificarPassword(contrasenaActual, user.contrasena);
  if (!valida) {
    return noAutorizado(res, 'La contraseña actual es incorrecta');
  }


  const igual = await verificarPassword(contrasenaNueva, user.contrasena);
  if (igual) {
    return error(res, 400, 'La nueva contraseña debe ser distinta a la actual');
  }


  const nuevoHash = await hashearPassword(contrasenaNueva);
  await usuarioModel.actualizarPassword(null, user.id, nuevoHash, false);


  await sesionModel.revocarTodasLasSesiones(null, user.id, 'cambio_password');

  return ok(res, null, 'Contraseña actualizada. Todas las demás sesiones fueron cerradas.');
}

export async function subirAvatar(req, res) {
  if (!req.file) {
    return error(res, 422, 'No se recibió ningún archivo');
  }

  const ruta = `/uploads/avatares/${req.file.filename}`;
  await usuarioModel.actualizarAvatar(null, req.usuario.id, ruta);

  return ok(res, { avatar: ruta }, 'Avatar actualizado');
}

