
import { z } from 'zod';
import { pool } from '../../config/db.js';
import * as matriculaModel from '../../models/admin/matricula_model.js';
import * as solicitudesModel from '../../models/admin/matricula_solicitudes_model.js';
import { ok, noEncontrado, error, prohibido } from '../../utils/respuestas.js';
import * as auditoria from '../../utils/auditoria.js';

const esquemaMasivo = z.object({
  materiaId: z.coerce.number().int().positive(),
  alumnoIds: z.array(z.coerce.number().int().positive()).min(1),
  observacion: z.string().max(500).optional().nullable()
});

export async function listarMisMatriculas(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  const matriculas = await matriculaModel.listarMatriculasDeAlumno(req.usuario.id, {
    limit: Number(limit),
    offset: Number(offset)
  });
  const total = await matriculaModel.contarMatriculasDeAlumno(req.usuario.id);
  return ok(res, { matriculas, total });
}

export async function listarMatriculasDeMateria(req, res) {
  const { materiaId } = req.params;
  const { limit = 100, offset = 0 } = req.query;


  if (req.usuario.tipo === 'docente') {
    const dicta = await matriculaModel.profesorDictaMateria(null, req.usuario.id, Number(materiaId));
    if (!dicta) return prohibido(res, 'No dictás esta materia');
  }


  const matriculas = await matriculaModel.listarPorMateria(Number(materiaId), {
    limit: Number(limit),
    offset: Number(offset)
  });

  return ok(res, matriculas);
}

export async function listarTodas(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  const matriculas = await matriculaModel.listarTodasLasMatriculas({
    limit: Number(limit),
    offset: Number(offset)
  });
  return ok(res, matriculas);
}

export async function listarMisSolicitudes(req, res) {
  const { estado } = req.query;
  const solicitudes = await solicitudesModel.listarSolicitudesDeAlumno(req.usuario.id, estado || null);
  return ok(res, solicitudes);
}

export async function listarSolicitudesParaMi(req, res) {
  const { estado = 'pendiente' } = req.query;
  const solicitudes = await solicitudesModel.listarSolicitudesDeProfesor(req.usuario.id, estado);
  return ok(res, solicitudes);
}

export async function listarTodasLasSolicitudes(req, res) {
  const estado = req.query.estado || 'pendiente';
  const solicitudes = await solicitudesModel.listarTodasLasSolicitudes(estado === 'todas' ? null : estado);
  return ok(res, solicitudes);
}

export async function matricularMasivo(req, res) {
  const datos = esquemaMasivo.parse(req.body);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();


    const validos = await matriculaModel.alumnosValidos(conn, datos.alumnoIds);
    if (validos.length === 0) {
      await conn.rollback();
      return error(res, 422, 'Ningún alumno válido en la lista');
    }


    const yaMatriculados = await matriculaModel.alumnosYaMatriculados(conn, datos.materiaId, validos);
    const nuevos = validos.filter(id => !yaMatriculados.includes(id));

    if (nuevos.length === 0) {
      await conn.rollback();
      return error(res, 409, 'Todos los alumnos ya están matriculados');
    }

    const filas = nuevos.map(alumnoId => [
      alumnoId,
      datos.materiaId,
      'asignacion_automatica',
      req.usuario.id,
      req.usuario.tipo
    ]);

    const insertados = await matriculaModel.crearMatriculasMasivo(conn, filas);


    const notifs = nuevos.map(alumnoId => [
      alumnoId,
      'Matriculado en nueva materia',
      'Fuiste matriculado automáticamente en una materia.',
      'info',
      '/matriculas'
    ]);
    await matriculaModel.crearNotificacionesMasivo(conn, notifs);

    await conn.commit();
    return ok(res, {
      total: validos.length,
      insertados,
      yaMatriculados: yaMatriculados.length,
      omitidos: validos.length - insertados
    }, `${insertados} matrículas creadas`);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export async function cancelar(req, res) {
  const { id } = req.params;

  const matricula = await matriculaModel.obtenerMatriculaPorId(null, Number(id));
  if (!matricula) return noEncontrado(res, 'Matrícula no encontrada');


  if (req.usuario.tipo === 'alumno' && matricula.alumno_id !== req.usuario.id) {
    return prohibido(res, 'No podés cancelar una matrícula que no es tuya');
  }

  auditoria.registrarEliminacion(req, 'matriculas', Number(id),
    `alumno ${matricula.alumno_id} materia ${matricula.materia_id}`);
  await matriculaModel.cancelarMatricula(null, Number(id), req.usuario.id);
  return ok(res, null, 'Matrícula cancelada');
}

export async function actualizarNotaFinal(req, res) {
  const matriculaId = Number(req.params.id);
  const { nota_final, observacion } = req.body;

  if (nota_final !== null && nota_final !== undefined && nota_final !== '') {
    const nota = Number(nota_final);
    if (isNaN(nota) || nota < 0 || nota > 12) {
      return error(res, 422, 'nota_final debe estar entre 0 y 12');
    }
  }
  if (observacion && String(observacion).length > 2000) {
    return error(res, 422, 'Observación muy larga (máx 2000 caracteres)');
  }


  const [info] = await pool.query(
    `SELECT m.materia_id FROM matriculas m WHERE m.id = ?`,
    [matriculaId]
  );
  if (!info.length) return noEncontrado(res, 'Matrícula no encontrada');

  const materiaId = info[0].materia_id;
  if (!['admin', 'coordinador'].includes(req.usuario.tipo)) {
    const [profesores] = await pool.query(
      'SELECT 1 FROM materias_docente WHERE materia_id = ? AND docente_id = ?',
      [materiaId, req.usuario.id]
    );
    if (!profesores.length) return prohibido(res, 'No sos profesor de esta materia');
  }

  await matriculaModel.actualizarNotaFinal(
    null,
    matriculaId,
    nota_final === '' || nota_final === undefined ? null : nota_final,
    observacion || null
  );

  return ok(res, null, 'Calificación actualizada');
}

export async function listarSegunRol(req, res) {
  const { limit = 50, offset = 0 } = req.query;
  const lim = Number(limit);
  const off = Number(offset);

  if (req.usuario.tipo === 'alumno') {
    const matriculas = await matriculaModel.listarMatriculasDeAlumno(req.usuario.id, {
      limit: lim,
      offset: off
    });
    return ok(res, matriculas);
  }

  if (req.usuario.tipo === 'docente') {
    const matriculas = await matriculaModel.listarMatriculasDeProfesor(req.usuario.id, {
      limit: lim,
      offset: off
    });
    return ok(res, matriculas);
  }


  const matriculas = await matriculaModel.listarTodasLasMatriculas({
    limit: lim,
    offset: off
  });
  return ok(res, matriculas);
}

