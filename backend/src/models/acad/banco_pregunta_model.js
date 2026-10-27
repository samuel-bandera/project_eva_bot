
import { pool } from '../../config/db.js';

export async function listarPorMateria(materiaId, { dificultad = null, tema = null, activa = true } = {}) {
  const where = ['b.materia_id = ?', 'b.activa = ?'];
  const params = [materiaId, activa];
  if (dificultad) { where.push('b.dificultad = ?'); params.push(dificultad); }
  if (tema)       { where.push('b.tema = ?');       params.push(tema); }

  const [rows] = await pool.query(
    `SELECT b.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido
     FROM banco_preguntas b
     JOIN usuarios u ON u.id = b.agregada_por
     WHERE ${where.join(' AND ')}
     ORDER BY b.creado_en DESC`,
    params
  );
  return rows;
}

export async function obtenerPregunta(id) {
  const [rows] = await pool.query(`SELECT * FROM banco_preguntas WHERE id = ?`, [id]);
  return rows[0] || null;
}

export async function crearPregunta(conn, {
  materiaId, pregunta, respuestaCorrecta, dificultad = 'media',
  tema = null, agregadaPor
}) {
  const conexion = conn || pool;
  const [result] = await conexion.query(
    `INSERT INTO banco_preguntas
       (materia_id, pregunta, respuesta_correcta, dificultad, tema, agregada_por)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [materiaId, pregunta, respuestaCorrecta, dificultad, tema, agregadaPor]
  );
  return result.insertId;
}

export async function actualizarPregunta(conn, id, datos) {
  const campos = [];
  const valores = [];
  const permitidos = ['pregunta', 'respuesta_correcta', 'dificultad', 'tema', 'activa'];
  for (const k of permitidos) {
    if (datos[k] !== undefined) { campos.push(`${k} = ?`); valores.push(datos[k]); }
  }
  if (!campos.length) return;
  valores.push(id);
  await conn.query(`UPDATE banco_preguntas SET ${campos.join(', ')} WHERE id = ?`, valores);
}

export async function desactivarPregunta(conn, id) {
  await conn.query(`UPDATE banco_preguntas SET activa = FALSE WHERE id = ?`, [id]);
}

export async function incrementarUso(conn, ids) {
  if (!ids.length) return;
  await conn.query(
    `UPDATE banco_preguntas SET veces_usada = veces_usada + 1 WHERE id IN (?)`,
    [ids]
  );
}

export async function estadisticasPorMateria(materiaId) {
  const [rows] = await pool.query(
    `SELECT dificultad, COUNT(*) AS total
     FROM banco_preguntas
     WHERE materia_id = ? AND activa = TRUE
     GROUP BY dificultad`,
    [materiaId]
  );
  return rows;
}

export async function seleccionarAleatorias(conn, {
  materiaId,
  tipo,
  dificultad = null,
  cantidad = 1,
}) {
  const conexion = conn || pool;
  const params = [materiaId, tipo];
  let where = 'materia_id = ? AND tipo = ? AND activa = TRUE';

  if (dificultad) {
    where += ' AND dificultad = ?';
    params.push(dificultad);
  }

  params.push(cantidad);

  const [rows] = await conexion.query(
    `SELECT id, pregunta, respuesta_correcta, dificultad, tema, tipo, opciones
     FROM banco_preguntas
     WHERE ${where}
     ORDER BY RAND()
     LIMIT ?`,
    params
  );

  return rows;
}

export async function marcarComoUsadas(conn, ids) {
  if (!ids || !ids.length) return;
  await conn.query(
    `UPDATE banco_preguntas SET veces_usada = veces_usada + 1 WHERE id IN (?)`,
    [ids]
  );
}

export async function estadisticasBanco(materiaId) {
  const [porTipo] = await pool.query(
    `SELECT tipo, dificultad, COUNT(*) AS total
     FROM banco_preguntas
     WHERE materia_id = ? AND activa = TRUE
     GROUP BY tipo, dificultad`,
    [materiaId]
  );

  const resultado = {};
  for (const row of porTipo) {
    if (!resultado[row.tipo]) resultado[row.tipo] = {};
    resultado[row.tipo][row.dificultad] = row.total;
  }
  return resultado;
}

