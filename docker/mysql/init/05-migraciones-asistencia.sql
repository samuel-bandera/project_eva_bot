-- Migraciones aplicadas post-seed para soportar asistencia por grupo y sesión
-- Aplicar después de 01-schema.sql y 02-seed.sql

-- Migración 05: sesiones_clase + grupo_id
ALTER TABLE sesiones_clase
  ADD COLUMN grupo_id INT NULL AFTER materia_id,
  ADD CONSTRAINT fk_sesiones_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupos_principales(id) ON DELETE SET NULL;

ALTER TABLE sesiones_clase
  DROP INDEX uk_sesion,
  ADD UNIQUE KEY uk_sesion_grupo (materia_id, grupo_id, fecha, hora_inicio);

ALTER TABLE sesiones_clase
  ADD INDEX idx_sesiones_grupo_fecha (grupo_id, fecha);

-- Migración 06: asistencia + grupo_id
ALTER TABLE asistencia
  ADD COLUMN grupo_id INT NULL AFTER materia_id,
  ADD CONSTRAINT fk_asist_grupo
    FOREIGN KEY (grupo_id) REFERENCES grupos_principales(id) ON DELETE SET NULL;

ALTER TABLE asistencia
  ADD INDEX idx_asist_grupo_fecha (grupo_id, fecha);

ALTER TABLE asistencia
  DROP INDEX uk_asistencia,
  ADD UNIQUE KEY uk_asist_sesion (alumno_id, sesion_id);

-- Migración 07: faltas + documento
ALTER TABLE faltas
  ADD COLUMN documento_url VARCHAR(500) NULL AFTER observacion,
  ADD COLUMN documento_nombre VARCHAR(200) NULL AFTER documento_url,
  ADD COLUMN documento_mime VARCHAR(100) NULL AFTER documento_nombre,
  ADD COLUMN revisada_por INT NULL AFTER documento_mime,
  ADD CONSTRAINT fk_faltas_revisada
    FOREIGN KEY (revisada_por) REFERENCES usuarios(id) ON DELETE SET NULL;
