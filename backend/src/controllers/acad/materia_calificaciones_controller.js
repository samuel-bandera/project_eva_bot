import { z } from 'zod';
import * as materiaModel from '../../models/acad/materia_model.js';
import * as matriculaModel from '../../models/admin/matricula_model.js';
import { pool } from '../../config/db.js';
import { ok, noEncontrado, error, prohibido } from '../../utils/respuestas.js';

const esquemaPonderaciones = z.object({
  pesos_calificacion: z.record(z.coerce.number().min(0).max(100))
});

export async function guardarPonderaciones(req, res) {
  const { id } = req.params;
  const { pesos_calificacion } = esquemaPonderaciones.parse(req.body);

  const suma = Object.values(pesos_calificacion).reduce((a, b) => a + Number(b), 0);
  if (Math.abs(suma - 100) > 0.01) {
    return error(res, 422, `Las pesos_calificacion deben sumar 100 (actual: ${suma})`);
  }

  await materiaModel.guardarPonderaciones(null, Number(id), 0, pesos_calificacion);
  return ok(res, null, 'Ponderaciones guardadas');
}

export async function misCalificacionesDeMateria(req, res) {
  const materiaId = Number(req.params.id);
  const alumnoId = req.usuario.id;

  const datos = await materiaModel.obtenerCalificacionesDeMateria(alumnoId, materiaId);
  if (!datos) return noEncontrado(res, 'No estás matriculado en esta materia');

  const { matricula, pesos_calificacion, evaluaciones } = datos;

  const pesoPorTipo = Object.fromEntries(pesos_calificacion.map(p => [p.tipo, Number(p.peso)]));

  const desglose = evaluaciones.map(e => {

    let tipoPeso = 'evaluaciones';
    if (e.tipo === 'tp') tipoPeso = 'tareas';

    return {
      id: e.id,
      titulo: e.titulo,
      tipo: e.tipo,
      nota: e.nota !== null ? Number(e.nota) : null,
      notaMaxima: Number(e.nota_maxima) || 12,
      estado: e.estado,
      fecha: e.fecha_envio || e.fecha_inicio,
      peso: pesoPorTipo[tipoPeso] || null,
    };
  });

  let promedioCalculado = null;
  const conNota = desglose.filter(d => d.nota !== null && d.peso !== null);
  if (conNota.length > 0) {
    const sumaPesos = conNota.reduce((s, d) => s + d.peso, 0);
    const suma = conNota.reduce((s, d) => s + d.nota * d.peso, 0);
    promedioCalculado = sumaPesos > 0 ? (suma / sumaPesos).toFixed(2) : null;
  }

  return ok(res, {
    matricula_id: matricula.id,
    estado: matricula.estado,
    nota_final: matricula.nota_final !== null ? Number(matricula.nota_final) : null,
    nota_aprobacion: Number(matricula.nota_aprobacion) || 6,
    observacion: matricula.observacion,
    pesos_calificacion,
    evaluaciones: desglose,
    promedio_calculado: promedioCalculado,
  });
}

export async function actualizarNotaAprobacion(req, res) {
  const materiaId = Number(req.params.id);
  const { nota_aprobacion } = req.body;

  if (!nota_aprobacion || nota_aprobacion < 0 || nota_aprobacion > 12) {
    return error(res, 422, 'nota_aprobacion debe estar entre 0 y 12');
  }

  const materia = await materiaModel.obtenerMateria(materiaId);
  if (!materia) return noEncontrado(res, 'Materia no encontrada');


  if (!['admin', 'coordinador'].includes(req.usuario.tipo)) {
    if (req.usuario.tipo !== 'docente') {
      return prohibido(res, 'Sin permisos');
    }
    const [profesores] = await pool.query(
      'SELECT 1 FROM materias_docente WHERE materia_id = ? AND docente_id = ?',
      [materiaId, req.usuario.id]
    );
    if (!profesores.length) {
      return prohibido(res, 'No sos profesor de esta materia');
    }
  }

  await pool.query(
    'UPDATE materias SET nota_aprobacion = ? WHERE id = ?',
    [nota_aprobacion, materiaId]
  );

  return ok(res, { nota_aprobacion: Number(nota_aprobacion) }, 'Nota de aprobación actualizada');
}

export async function listarAlumnosConNotas(req, res) {
  const materiaId = Number(req.params.id);

  const [profesores] = await pool.query(
    'SELECT 1 FROM materias_docente WHERE materia_id = ? AND docente_id = ?',
    [materiaId, req.usuario.id]
  );
  if (!profesores.length && !['admin', 'coordinador'].includes(req.usuario.tipo)) {
    return prohibido(res, 'No sos profesor de esta materia');
  }

  const alumnos = await matriculaModel.listarAlumnosConNotas(materiaId);
  return ok(res, alumnos);
}

