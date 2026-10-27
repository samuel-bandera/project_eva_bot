
import { z } from 'zod';
import * as materiaModel from '../../models/acad/materia_model.js';
import * as matriculaModel from '../../models/admin/matricula_model.js';
import * as usuarioModel from '../../models/admin/usuario_model.js';
import * as notificacionService from '../../services/notificacion_service.js';
import { pool } from '../../config/db.js';
import { ok, creado, noEncontrado, error, prohibido } from '../../utils/respuestas.js';

const esquemaAgregarAlumno = z.object({
  alumnoId: z.coerce.number().int().positive()
});

const esquemaCrear = z.object({
  nombre:             z.string().min(2).max(100),
  codigo:             z.string().min(2).max(20),
  descripcion:        z.string().optional().nullable(),
  cicloId:            z.coerce.number().int().positive().optional().nullable(),
  color:              z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icono:              z.string().max(50).optional().nullable(),
  aula:               z.string().max(50).optional().nullable(),
  horario:            z.string().max(100).optional().nullable(),
  esPublica:          z.boolean().optional(),
  codigoInscripcion:  z.string().max(20).optional().nullable(),
  permiteSolicitudes: z.boolean().optional()
});

const esquemaActualizar = esquemaCrear.partial().extend({
  activa: z.boolean().optional()
});

const esquemaAsignarProfesor = z.object({
  profesorId: z.coerce.number().int().positive()
});

export async function listar(req, res) {
  const { cicloId, activa } = req.query;
  const materias = await materiaModel.listarMaterias({
    cicloId: cicloId ? Number(cicloId) : null,
    activa: activa === undefined ? null : activa === 'true'
  });
  return ok(res, materias);
}


export async function listarDeProfesor(req, res) {
  const { profesorId } = req.params;
  const materias = await materiaModel.listarMateriasDeProfesor(Number(profesorId));
  return ok(res, materias);
}

export async function listarMias(req, res) {
  const materias = await materiaModel.listarMateriasDeProfesor(req.usuario.id);
  return ok(res, materias);
}

export async function listarMisMateriasAlumno(req, res) {
  const materias = await materiaModel.listarMateriasDeAlumno(req.usuario.id);
  return ok(res, materias);
}

export async function obtener(req, res) {
  const { id } = req.params;
  const materia = await materiaModel.obtenerMateria(Number(id));
  if (!materia) return noEncontrado(res, 'Materia no encontrada');

  const pesos_calificacion = await materiaModel.obtenerPonderaciones(materia.id, materia.ciclo_id || 0);
  return ok(res, { ...materia, pesos_calificacion });
}

export async function buscarPorCodigoInscripcion(req, res) {
  const { codigo } = req.params;
  const materia = await materiaModel.obtenerMateriaPorCodigoInscripcion(codigo);
  if (!materia) return noEncontrado(res, 'Código de inscripción inválido');
  return ok(res, materia);
}

export async function crear(req, res) {
  const datos = esquemaCrear.parse(req.body);

  const existente = await materiaModel.obtenerMateriaPorCodigo(datos.codigo);
  if (existente) return error(res, 409, 'Ya existe una materia con ese código');

  const id = await materiaModel.crearMateria(null, datos);
  return creado(res, { id }, 'Materia creada');
}

export async function actualizar(req, res) {
  const { id } = req.params;
  const datos = esquemaActualizar.parse(req.body);

  const materia = await materiaModel.obtenerMateria(Number(id));
  if (!materia) return noEncontrado(res, 'Materia no encontrada');

  await materiaModel.actualizarMateria(null, Number(id), datos);
  return ok(res, null, 'Materia actualizada');
}

export async function desactivar(req, res) {
  const { id } = req.params;
  await materiaModel.desactivarMateria(null, Number(id));
  return ok(res, null, 'Materia desactivada');
}

export async function asignarProfesor(req, res) {
  const { id } = req.params;
  const { profesorId } = esquemaAsignarProfesor.parse(req.body);

  await materiaModel.asignarProfesor(null, {
    profesorId,
    materiaId: Number(id)
  });
  return ok(res, null, 'Profesor asignado');
}

export async function quitarProfesor(req, res) {
  const { id, profesorId } = req.params;
  await materiaModel.quitarProfesor(null, {
    profesorId: Number(profesorId),
    materiaId: Number(id)
  });
  return ok(res, null, 'Profesor removido');
}

export async function agregarAlumno(req, res) {
  const materiaId = Number(req.params.id);
  const { alumnoId } = esquemaAgregarAlumno.parse(req.body);


  const materia = await materiaModel.obtenerMateria(materiaId);
  if (!materia) return noEncontrado(res, 'Materia no encontrada');
  if (!materia.activa) return error(res, 409, 'La materia no está activa');


  const esAdmin = ['admin', 'coordinador'].includes(req.usuario.tipo);
  if (!esAdmin) {
    const dicta = await matriculaModel.profesorDictaMateria(null, req.usuario.id, materiaId);
    if (!dicta) {
      return prohibido(res, 'No dictás esta materia');
    }
  }


  const alumno = await usuarioModel.buscarUsuarioPorId(alumnoId);
  if (!alumno) return noEncontrado(res, 'Alumno no encontrado');
  if (alumno.tipo !== 'alumno') return error(res, 400, 'El usuario no es alumno');
  if (alumno.estado !== 'aprobado') return error(res, 409, 'El alumno no está aprobado');
  if (!alumno.activo) return error(res, 409, 'El alumno está desactivado');


  const yaMatriculado = await matriculaModel.estaMatriculado(null, alumnoId, materiaId);
  if (yaMatriculado) {
    return error(res, 409, 'El alumno ya está matriculado en esta materia');
  }


  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const matriculaId = await matriculaModel.crearMatricula(conn, {
      alumnoId,
      materiaId,
      estado: 'activa',
      origen: 'directa',
      creadaPor: req.usuario.id,
      tipoCreador: req.usuario.tipo,
      aprobadaPor: req.usuario.id,
    });

    await conn.commit();


    try {
      await notificacionService.crearYEnviarNotificacion({
        usuarioId: alumnoId,
        titulo: `Te agregaron a ${materia.nombre}`,
        mensaje: `${req.usuario.nombre} ${req.usuario.apellido} te inscribió en la materia`,
        tipo: 'info',
        url: `/alumno/materias/${materiaId}`,
      });
    } catch (e) {
      console.warn('Notificación falló:', e.message);
    }

    return creado(res, { id: matriculaId }, 'Alumno agregado a la materia');
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}


export async function unirsePorCodigo(req, res) {
  const { codigo } = req.body;
  const alumnoId = req.usuario.id;

  if (!codigo) return res.status(422).json({ ok: false, error: 'Código requerido' });

  try {
    const [materias] = await pool.query(
      'SELECT id, nombre, usos_maximos, usos_actuales FROM materias WHERE UPPER(codigo_inscripcion) = UPPER(?) AND activa = 1',
      [codigo.trim()]
    );
    if (!materias.length) return res.status(404).json({ ok: false, error: 'Código inválido o materia inactiva' });

    const materia = materias[0];

    if (materia.usos_maximos !== null && materia.usos_actuales >= materia.usos_maximos) {
      return res.status(403).json({ ok: false, error: 'El código de invitación ha alcanzado su límite de usos' });
    }

    const [matriculas] = await pool.query('SELECT id FROM matriculas WHERE alumno_id = ? AND materia_id = ?', [alumnoId, materia.id]);
    if (matriculas.length) return res.status(409).json({ ok: false, error: 'Ya estás inscrito en esta materia' });

    await pool.query(
      "INSERT INTO matriculas (alumno_id, materia_id, estado, origen, tipo_creador) VALUES (?, ?, 'activa', 'directa', 'alumno')",
      [alumnoId, materia.id]
    );

    await pool.query('UPDATE materias SET usos_actuales = usos_actuales + 1 WHERE id = ?', [materia.id]);

    return res.status(201).json({ ok: true, data: { materiaId: materia.id, nombre: materia.nombre }, message: 'Inscripción exitosa' });
  } catch (e) {
    console.error("ERROR EN UNIRSE:", e.message);
    return res.status(500).json({ ok: false, error: 'Error interno del servidor' });
  }
}

export async function generarCodigo(req, res) {
  const { id } = req.params;
  const { usosMaximos } = req.body;
  try {
    const codigo = 'MAT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    await pool.query('UPDATE materias SET codigo_inscripcion = ?, usos_maximos = ?, usos_actuales = 0 WHERE id = ?', [codigo, usosMaximos || 30, id]);
    return res.json({ ok: true, data: { codigo } });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

export async function listarPublicas(req, res) {
  try {
    const rows = await materiaModel.listarMateriasPublicas({ limit: 100 });
    return ok(res, rows);
  } catch (e) {
    return error(res, 500, e.message);
  }
}

export async function listarSolicitables(req, res) {
  try {
    const rows = await materiaModel.listarMateriasSolicitables(req.usuario.id);
    return ok(res, rows);
  } catch (e) {
    return error(res, 500, e.message);
  }
}
