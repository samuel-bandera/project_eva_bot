import { z } from 'zod';
import * as usuarioModel from '../../models/admin/usuario_model.js';
import * as sesionModel from '../../models/admin/usuario_sesiones_model.js';
import { hashearPassword } from '../../utils/hash.js';
import { creado, ok, error } from '../../utils/respuestas.js';
import * as auditoria from '../../utils/auditoria.js';
import * as codigosProfesor from '../../services/codigos_profesor_service.js';
import * as verificacionService from '../../services/verificacion_email_service.js';

const esquemaSolicitarCodigo = z.object({
  email: z.string().email(),
  proposito: z.enum(['registro', 'reset']).optional().default('registro'),
});

const esquemaGenerarCodigoProfesor = z.object({
  motivo: z.string().trim().max(255, 'Motivo muy largo').optional().nullable()
});

const esquemaResetearPassword = z.object({
  email: z.string().email('Email inválido'),
  codigo: z.string().length(6, 'El código debe tener 6 dígitos'),
  nuevaContrasena: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Debe tener al menos una mayúscula')
    .regex(/[0-9]/, 'Debe tener al menos un número'),
});

const esquemaVerificarCodigo = z.object({
  email: z.string().email(),
  codigo: z.string().length(6).regex(/^\d+$/),
});

export async function solicitarCodigoVerificacion(req, res) {
  const { email, proposito } = esquemaSolicitarCodigo.parse(req.body);

  const existe = await usuarioModel.buscarUsuarioPorEmail(email);

  if (proposito === 'registro') {
    if (existe) {
      return error(res, 409, 'Ese email ya está registrado');
    }
  } else if (proposito === 'reset') {

    if (!existe) {
      return ok(res, {
        mensaje: 'Si el email está registrado, recibirás un código.',
        ttlMinutos: 10,
      }, 'Código enviado');
    }
  }

  const resultado = await verificacionService.solicitarCodigoVerificacion(email, req.ip);

  return ok(res, {
    mensaje: 'Código enviado. Revisá tu email.',
    ttlMinutos: resultado.ttlMinutos,
  }, 'Código de verificación enviado');
}

export async function verificarCodigoEmail(req, res) {
  const { email, codigo } = esquemaVerificarCodigo.parse(req.body);

  const valido = await verificacionService.verificarCodigo(email, codigo);
  if (!valido) {
    return error(res, 400, 'Código inválido o expirado');
  }

  return ok(res, null, 'Email verificado correctamente');
}

export async function generarCodigoProfesor(req, res) {
  if (!['admin', 'coordinador'].includes(req.usuario.tipo)) {
    return error(res, 403, 'Solo admin o coordinador pueden generar códigos');
  }

  const { motivo = null } = esquemaGenerarCodigoProfesor.parse(req.body);
  const resultado = await codigosProfesor.generarCodigoInvitacion(req.usuario.id, motivo);
  return creado(res, resultado, 'Código de invitación generado');
}

export async function listarCodigosProfesor(req, res) {
  if (!['admin', 'coordinador'].includes(req.usuario.tipo)) {
    return error(res, 403, 'Solo admin o coordinador pueden listar códigos');
  }

  const { soloNoUsados } = req.query;
  const codigos = await codigosProfesor.listarCodigos({
    soloNoUsados: soloNoUsados === 'true',
  });
  return ok(res, codigos);
}

export async function resetearPassword(req, res) {
  const { email, codigo, nuevaContrasena } = esquemaResetearPassword.parse(req.body);



  const codigoOk = await verificacionService.verificarCodigo(email, codigo);
  if (!codigoOk) {

    const codigoHash = (await import('crypto')).default
      .createHash('sha256')
      .update(String(codigo))
      .digest('hex');
    const { pool } = await import('../config/db.js');
    const [rows] = await pool.query(
      `SELECT id FROM verificaciones_codigo
       WHERE email = ? AND codigo_hash = ? AND usado = TRUE
         AND creado_en > NOW() - INTERVAL 15 MINUTE
       ORDER BY id DESC LIMIT 1`,
      [email, codigoHash]
    );
    if (!rows.length) {
      return error(res, 400, 'Código inválido o expirado. Solicitá uno nuevo.');
    }
  }


  const usuario = await usuarioModel.buscarUsuarioPorEmail(email);
  if (!usuario) {

    return error(res, 400, 'Código inválido o expirado');
  }


  const nuevoHash = await hashearPassword(nuevaContrasena);


  await usuarioModel.actualizarPassword(null, usuario.id, nuevoHash, false);



  try {
    await sesionModel.revocarTodasLasSesiones(null, usuario.id, 'cambio_password');
  } catch (e) {
    console.warn('No se pudieron revocar sesiones:', e.message);
  }


  try {
    await auditoria.auditar(req, 'password_reset', {
      entidad: 'usuarios',
      entidadId: usuario.id,
      detalle: 'Contraseña reseteada por recuperación',
    });
  } catch (e) { console.error('Error de auditoría:', e); }

  return ok(res, null, 'Contraseña actualizada. Iniciá sesión con la nueva.');
}

export async function revocarCodigoProfesor(req, res) {
  if (!['admin', 'coordinador'].includes(req.usuario.tipo)) {
    return error(res, 403, 'Solo admin o coordinador pueden revocar códigos');
  }

  const { id } = req.params;
  await codigosProfesor.revocarCodigo(Number(id));
  return ok(res, null, 'Código revocado');
}

