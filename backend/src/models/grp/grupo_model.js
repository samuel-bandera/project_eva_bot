
import { pool } from '../../config/db.js';

export async function listarGrupos({ cicloId = null, activo = null } = {}) {
  const where = [];
  const params = [];
  if (cicloId) { where.push('g.ciclo_id = ?'); params.push(cicloId); }
  if (activo !== null) { where.push('g.activo = ?'); params.push(activo); }
  const sql = `
    SELECT g.*,
           c.nombre AS ciclo_nombre,
           (SELECT COUNT(*) FROM grupo_alumnos ga
            WHERE ga.grupo_id = g.id AND ga.activo = TRUE) AS total_alumnos
    FROM grupos_principales g
    LEFT JOIN ciclos_electivos c ON c.id = g.ciclo_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY g.nombre ASC`;
  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function obtenerGrupo(id) {
  const [rows] = await pool.query(
    `SELECT g.*, c.nombre AS ciclo_nombre
     FROM grupos_principales g
     LEFT JOIN ciclos_electivos c ON c.id = g.ciclo_id
     WHERE g.id = ?`,
    [id]
  );
  return rows[0] || null;
}

export async function obtenerGrupoPorCodigo(codigo) {
  const [rows] = await pool.query(`SELECT * FROM grupos_principales WHERE codigo = ?`, [codigo]);
  return rows[0] || null;
}

export async function listarAlumnosDeGrupo(grupoId, { activo = true } = {}) {
  const [rows] = await pool.query(
    `SELECT ga.id AS grupo_alumno_id, ga.carga_horaria, ga.fecha_ingreso, ga.activo,
            u.id, u.nombre, u.apellido, u.usuario, u.email, u.avatar
     FROM grupo_alumnos ga
     JOIN usuarios u ON u.id = ga.alumno_id
     WHERE ga.grupo_id = ? AND ga.activo = ?
     ORDER BY u.apellido ASC, u.nombre ASC`,
    [grupoId, activo]
  );
  return rows;
}

export async function listarGruposDeAlumno(alumnoId) {
  const [rows] = await pool.query(
    `SELECT g.*, ga.carga_horaria, ga.fecha_ingreso
     FROM grupo_alumnos ga
     JOIN grupos_principales g ON g.id = ga.grupo_id
     WHERE ga.alumno_id = ? AND ga.activo = TRUE
     ORDER BY g.nombre ASC`,
    [alumnoId]
  );
  return rows;
}

export async function crearGrupo(conn, {
  nombre, codigo, carrera = null, cicloId = null, descripcion = null,
  capacidadMax = 50, color = '#42b883'
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO grupos_principales
       (nombre, codigo, carrera, ciclo_id, descripcion, capacidad_max, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nombre, codigo, carrera, cicloId, descripcion, capacidadMax, color]
  );
  return result.insertId;
}

export async function actualizarGrupo(conn, id, datos) {
  const campos = [];
  const valores = [];
  const permitidos = ['nombre','codigo','carrera','ciclo_id','descripcion','capacidad_max','color','activo'];
  for (const k of permitidos) {
    if (datos[k] !== undefined) { campos.push(`${k} = ?`); valores.push(datos[k]); }
  }
  if (!campos.length) return;
  valores.push(id);
  await conn.query(`UPDATE grupos_principales SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function agregarAlumno(conn, { grupoId, alumnoId, cargaHoraria = 'completa' }) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO grupo_alumnos (grupo_id, alumno_id, carga_horaria)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE activo = TRUE, carga_horaria = VALUES(carga_horaria)`,
    [grupoId, alumnoId, cargaHoraria]
  );
  return result.insertId;
}

export async function quitarAlumno(conn, { grupoId, alumnoId }) {
  await conn.query(
    `UPDATE grupo_alumnos SET activo = FALSE WHERE grupo_id = ? AND alumno_id = ?`,
    [grupoId, alumnoId]
  );
}

export async function contarAlumnos(grupoId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) AS total FROM grupo_alumnos WHERE grupo_id = ? AND activo = TRUE`,
    [grupoId]
  );
  return rows[0].total;
}

export async function listarGruposPorMateria(materiaId, docenteId = null) {
  let sql, params;

  if (docenteId) {
    sql = `
      SELECT DISTINCT
        g.id, g.nombre, g.codigo, g.carrera, g.ciclo_id,
        g.carrera_id, g.division_numero, g.turno, g.paralelo,
        COALESCE(c.nombre, g.carrera) AS carrera_nombre,
        (SELECT COUNT(DISTINCT ga.alumno_id)
         FROM grupo_alumnos ga
         JOIN matriculas m ON m.alumno_id = ga.alumno_id
           AND m.materia_id = ? AND m.estado = 'activa'
         WHERE ga.grupo_id = g.id AND ga.activo = 1) AS alumnos_count
      FROM grupos_principales g
      LEFT JOIN carreras c ON c.id = g.carrera_id
      JOIN docentes_grupos dg ON dg.grupo_id = g.id
        AND dg.docente_id = ? AND dg.materia_id = ? AND dg.activo = 1
      WHERE g.activo = 1
      ORDER BY COALESCE(c.nombre, g.carrera), g.division_numero, g.turno
    `;
    params = [materiaId, docenteId, materiaId];
  } else {
    sql = `
      SELECT DISTINCT
        g.id, g.nombre, g.codigo, g.carrera, g.ciclo_id,
        g.carrera_id, g.division_numero, g.turno, g.paralelo,
        COALESCE(c.nombre, g.carrera) AS carrera_nombre,
        (SELECT COUNT(DISTINCT ga.alumno_id)
         FROM grupo_alumnos ga
         JOIN matriculas m ON m.alumno_id = ga.alumno_id
           AND m.materia_id = ? AND m.estado = 'activa'
         WHERE ga.grupo_id = g.id AND ga.activo = 1) AS alumnos_count
      FROM grupos_principales g
      LEFT JOIN carreras c ON c.id = g.carrera_id
      WHERE g.activo = 1
      ORDER BY COALESCE(c.nombre, g.carrera), g.division_numero, g.turno
    `;
    params = [materiaId];
  }

  const [rows] = await pool.query(sql, params);
  return rows;
}

export async function sugerirCodigoGrupo(carreraId, turno = null, paralelo = null) {
  const [carreras] = await pool.query(
    `SELECT codigo, tipo_division, total_divisiones, usa_turnos, usa_paralelos
     FROM carreras WHERE id = ? AND activo = 1`,
    [carreraId]
  );
  if (!carreras.length) return null;
  const c = carreras[0];

  const [grupos] = await pool.query(
    `SELECT MAX(division_numero) AS max_div
     FROM grupos_principales
     WHERE carrera_id = ? AND activo = 1`,
    [carreraId]
  );

  const siguienteDiv = (grupos[0].max_div || 0) + 1;

  let codigo = `${c.codigo}-${c.tipo_division === 'semestre' ? 'SEM' : 'ANO'}-${siguienteDiv}`;
  if (c.usa_turnos && turno) codigo += `-${turno}`;
  if (c.usa_paralelos && paralelo) codigo += `-${paralelo}`;

  return {
    codigo_sugerido: codigo,
    carrera_codigo: c.codigo,
    tipo_division: c.tipo_division,
    division_numero: siguienteDiv,
    usa_turnos: c.usa_turnos,
    usa_paralelos: c.usa_paralelos,
    total_divisiones: c.total_divisiones,
    puede_crear_mas: siguienteDiv <= c.total_divisiones
  };
}
