
import { z } from 'zod';
import * as usuarioModel from '../../models/admin/usuario_model.js';
import { ok, noEncontrado, error , prohibido } from '../../utils/respuestas.js'
import * as auditoria from '../../utils/auditoria.js';
import { pool } from '../../config/db.js';
import { hashearPassword } from '../../utils/hash.js';

const esquemaAprobar = z.object({
  usuarioId: z.coerce.number().int().positive()
});

const esquemaCambiarRol = z.object({
  usuarioId: z.coerce.number().int().positive(),
  rolId:     z.coerce.number().int().positive()
});

const esquemaActualizar = z.object({
  nombre:   z.string().min(2).max(50).optional(),
  apellido: z.string().min(2).max(50).optional(),
  email:    z.string().email().optional(),
  avatar:   z.string().url().optional().nullable(),
  activo:   z.boolean().optional(),
  tipo:     z.enum(['alumno', 'docente', 'coordinador', 'admin']).optional(),
});

export async function listar(req, res) {
  const { tipo, estado, activo, limit = 50, offset = 0 } = req.query;
  const usuarios = await usuarioModel.listarUsuarios({
    tipo: tipo || null,
    estado: estado || null,
    activo: activo === undefined ? null : activo === 'true',
    limit: Number(limit),
    offset: Number(offset)
  });
  const total = await usuarioModel.contarUsuarios({ tipo, estado });
  return ok(res, { usuarios, total });
}

export async function obtener(req, res) {
  const { id } = req.params;
  const usuario = await usuarioModel.buscarUsuarioPorId(Number(id));
  if (!usuario) return noEncontrado(res, 'Usuario no encontrado');

  const roles = await usuarioModel.obtenerRolesDeUsuario(usuario.id);
  const permisos = await usuarioModel.obtenerPermisosDeUsuario(usuario.id);

  return ok(res, {
    usuario,
    roles,
    permisos: permisos.map(p => p.nombre)
  });
}

export async function listarPendientes(req, res) {
  const usuarios = await usuarioModel.listarUsuarios({
    estado: 'pendiente',
    limit: 100,
    offset: 0
  });
  return ok(res, usuarios);
}

export async function aprobar(req, res) {
  const { usuarioId } = esquemaAprobar.parse(req.params);

  const usuario = await usuarioModel.buscarUsuarioPorId(usuarioId);
  if (!usuario) return noEncontrado(res, 'Usuario no encontrado');

  if (usuario.estado === 'aprobado') {
    return error(res, 409, 'El usuario ya está aprobado');
  }

  auditoria.auditar(req, 'aprobar_usuario', {
    entidad: 'usuarios',
    entidadId: usuarioId,
    detalle: `Aprobación de ${usuario.usuario}`,
  });

  await usuarioModel.aprobarUsuario(null, {
    usuarioId,
    aprobadoPor: req.usuario.id
  });

  return ok(res, null, 'Usuario aprobado');
}

export async function rechazar(req, res) {
  const { usuarioId } = esquemaAprobar.parse(req.params);

  const usuario = await usuarioModel.buscarUsuarioPorId(usuarioId);
  if (!usuario) return noEncontrado(res, 'Usuario no encontrado');

  auditoria.auditar(req, 'rechazar_usuario', {
    entidad: 'usuarios',
    entidadId: usuarioId,
    detalle: `Rechazo de ${usuario.usuario}`,
  });

  await usuarioModel.rechazarUsuario(null, {
    usuarioId,
    aprobadoPor: req.usuario.id
  });

  return ok(res, null, 'Usuario rechazado');
}

export async function asignarRol(req, res) {
  const datos = esquemaCambiarRol.parse(req.body);

  await usuarioModel.asignarRol(null, {
    usuarioId: datos.usuarioId,
    rolId: datos.rolId,
    asignadoPor: req.usuario.id
  });

  return ok(res, null, 'Rol asignado');
}

export async function quitarRol(req, res) {
  const datos = esquemaCambiarRol.parse(req.body);
  await usuarioModel.quitarRol(null, datos.usuarioId, datos.rolId);
  return ok(res, null, 'Rol removido');
}

export async function listarRoles(req, res) {
  const { id } = req.params;
  const roles = await usuarioModel.obtenerRolesDeUsuario(Number(id));
  return ok(res, roles);
}

async function esUnicoAdmin(usuarioId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM usuarios WHERE tipo='admin' AND id != ?",
    [usuarioId]
  );
  return rows[0].total === 0;
}

async function esUltimoAdminActivo(usuarioId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM usuarios WHERE tipo='admin' AND id != ? AND estado='aprobado' AND activo=1",
    [usuarioId]
  );
  return rows[0].total === 0;
}

export async function actualizar(req, res) {
  const { id } = req.params;
  const datos = esquemaActualizar.parse(req.body);

  const usuario = await usuarioModel.buscarUsuarioPorId(Number(id));
  if (!usuario) return noEncontrado(res, 'Usuario no encontrado');


  if (datos.tipo && datos.tipo !== 'admin' && usuario.tipo === 'admin') {
    if (await esUnicoAdmin(usuario.id)) {
      return prohibido(res, 'No se puede quitar el rol admin al último administrador del sistema');
    }
  }


  if (datos.activo === false && usuario.tipo === 'admin' && usuario.activo) {
    if (await esUltimoAdminActivo(usuario.id)) {
      return prohibido(res, 'No se puede desactivar al último administrador activo');
    }
  }


  if (datos.tipo && req.usuario.id === usuario.id && datos.tipo !== 'admin' && usuario.tipo === 'admin') {
    return prohibido(res, 'No podés cambiarte el rol a vos mismo siendo admin');
  }

  const conn = await (await import('../../config/db.js')).pool.getConnection();
  try {
    await conn.beginTransaction();

    const campos = [];
    const valores = [];
    if (datos.nombre !== undefined)   { campos.push('nombre = ?');   valores.push(datos.nombre); }
    if (datos.apellido !== undefined) { campos.push('apellido = ?'); valores.push(datos.apellido); }
    if (datos.email !== undefined)    { campos.push('email = ?');    valores.push(datos.email); }
    if (datos.avatar !== undefined)   { campos.push('avatar = ?');   valores.push(datos.avatar); }
    if (datos.activo !== undefined)   { campos.push('activo = ?');   valores.push(datos.activo); }
    if (datos.tipo !== undefined)     { campos.push('tipo = ?');     valores.push(datos.tipo); }

    if (campos.length) {
      valores.push(id);
      await conn.query(
        `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`,
        valores
      );
    }


    if (datos.tipo && datos.tipo !== usuario.tipo) {
      try {
        await auditoria.auditar(req, 'cambio_tipo_usuario', {
          entidad: 'usuarios',
          entidadId: usuario.id,
          detalle: `Tipo: ${usuario.tipo} → ${datos.tipo}`,
        });
      } catch (e) { console.error('Error de auditoría:', e); }
    }

    await conn.commit();
    return ok(res, null, 'Usuario actualizado');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function resetearPassword(req, res) {
  const { id } = req.params;
  const { contrasena } = z.object({
    contrasena: z.string().min(6).max(100)
  }).parse(req.body);

  const usuario = await usuarioModel.buscarUsuarioPorId(Number(id));
  if (!usuario) return noEncontrado(res, 'Usuario no encontrado');

  const hash = await hashearPassword(contrasena);
  await usuarioModel.actualizarPassword(null, Number(id), hash, true);

  return ok(res, null, 'Contraseña reseteada. El usuario deberá cambiarla en el próximo login.');
}

export async function obtenerPreferencias(req, res) {
  const prefs = await usuarioModel.obtenerPreferencias(req.usuario.id);
  return ok(res, prefs || {});
}

export async function actualizarPreferencias(req, res) {
  const { preferencias } = req.body;
  if (!preferencias || typeof preferencias !== 'object') {
    return error(res, 422, 'preferencias debe ser un objeto');
  }
  const resultado = await usuarioModel.actualizarPreferencias(req.usuario.id, preferencias);
  return ok(res, resultado, 'Preferencias guardadas');
}

export async function buscarAlumnos(req, res) {
  const { q = '', materiaId = null } = req.query;

  const alumnos = await usuarioModel.buscarAlumnos({
    q: String(q).slice(0, 100),
    excluirMateriaId: materiaId ? Number(materiaId) : null,
    limit: 20,
  });

  return ok(res, alumnos);
}

