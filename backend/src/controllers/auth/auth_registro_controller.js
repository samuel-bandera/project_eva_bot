import { z } from 'zod';
import * as usuarioModel from '../../models/admin/usuario_model.js';
import { pool } from '../../config/db.js';
import { hashearPassword } from '../../utils/hash.js';
import { creado, error } from '../../utils/respuestas.js';
import * as codigosProfesor from '../../services/codigos_profesor_service.js';
import * as verificacionService from '../../services/verificacion_email_service.js';
import { esCedulaUruguayaValida, esTelefonoUruguayoValido, normalizarCedula, normalizarTelefono } from '../../utils/validacion_uy.js';

const esquemaRegistro = z.object({
  nombre:     z.string().min(2).max(50),
  apellido:   z.string().min(2).max(50),
  usuario:    z.string().min(4).max(50).regex(/^[a-zA-Z0-9._-]+$/),
  email:      z.string().email(),
  contrasena: z.string().min(8).max(100),
  tipo:       z.enum(['alumno', 'docente']).default('alumno'),
  cedula:         z.string().optional().nullable(),
  telefono:       z.string().optional().nullable(),
  codigoProfesor: z.string().optional().nullable(),
  codigoEmail:    z.string().length(6, 'Código de email de 6 dígitos').optional().nullable(),
});

export async function registrar(req, res) {

  const datos = esquemaRegistro.parse(req.body);

  let emailOk = await verificacionService.emailEstaVerificado(datos.email);
  if (!emailOk && datos.codigoEmail) {
    emailOk = await verificacionService.verificarCodigo(datos.email, datos.codigoEmail);
  }
  if (!emailOk) {
    return error(res, 400, 'Debés verificar tu email antes de registrarte');
  }

  if (datos.tipo === 'docente' && !datos.codigoProfesor) {
    return error(res, 400, 'El código de invitación es obligatorio para profesores');
  }

  let codigoProfesorInfo = null;
  if (datos.tipo === 'docente') {
    const validacion = await codigosProfesor.validarCodigo(datos.codigoProfesor);
    if (!validacion.valido) {
      return error(res, 400, validacion.error);
    }
    codigoProfesorInfo = validacion;
  }

  let cedulaNorm = null;
  if (datos.cedula && String(datos.cedula).trim()) {
    if (!esCedulaUruguayaValida(datos.cedula)) {
      return error(res, 400, 'La cédula ingresada no es válida');
    }
    cedulaNorm = normalizarCedula(datos.cedula);
  }

  let telefonoNorm = null;
  if (datos.telefono && String(datos.telefono).trim()) {
    if (!esTelefonoUruguayoValido(datos.telefono)) {
      return error(res, 400, 'El teléfono ingresado no es válido');
    }
    telefonoNorm = normalizarTelefono(datos.telefono);
  }

  const existeUsuario = await usuarioModel.buscarUsuarioPorNombre(datos.usuario);
  if (existeUsuario) {
    return error(res, 409, 'El nombre de usuario ya está en uso');
  }
  const existeEmail = await usuarioModel.buscarUsuarioPorEmail(datos.email);
  if (existeEmail) {
    return error(res, 409, 'El email ya está registrado');
  }

  if (cedulaNorm) {
    const [rows] = await pool.query('SELECT id FROM usuarios WHERE cedula = ? LIMIT 1', [cedulaNorm]);
    if (rows.length) {
      return error(res, 409, 'La cédula ya está registrada');
    }
  }

  const contrasenaHash = await hashearPassword(datos.contrasena);
  const estado = datos.tipo === 'docente' ? 'aprobado' : 'pendiente';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const id = await usuarioModel.crearUsuario(conn, {
      nombre: datos.nombre,
      apellido: datos.apellido,
      usuario: datos.usuario,
      email: datos.email,
      contrasena: contrasenaHash,
      tipo: datos.tipo,
      estado,
      cedula: cedulaNorm,
      telefono: telefonoNorm,
      emailVerificado: true,
    });

    if (codigoProfesorInfo) {
      await codigosProfesor.marcarCodigoUsado(conn, codigoProfesorInfo.id, id);
    }

    const rolId = datos.tipo === 'docente' ? 2 : 1;
    await usuarioModel.asignarRol(conn, {
      usuarioId: id,
      rolId,
      asignadoPor: null,
    });

    await conn.commit();

    return creado(res, { id, estado }, datos.tipo === 'docente'
      ? 'Profesor registrado correctamente'
      : 'Usuario registrado. Esperando aprobación del coordinador.');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
