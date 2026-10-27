DROP TABLE IF EXISTS comunicados_destinatarios;

ALTER TABLE comunicados_coordinacion
  DROP FOREIGN KEY fk_comcoord_carrera,
  DROP COLUMN carrera_id,
  DROP COLUMN alcance;

ALTER TABLE comunicados_coordinacion
  ADD COLUMN enviar_email_todos TINYINT(1) NOT NULL DEFAULT 0 AFTER nivel_alerta;

CREATE TABLE comunicados_destinatarios (
  id             INT NOT NULL AUTO_INCREMENT,
  comunicado_id  INT NOT NULL,
  tipo           ENUM('rol','carrera','usuario') NOT NULL,
  rol            ENUM('alumno','docente','coordinador','admin') NULL,
  carrera_id     INT NULL,
  usuario_id     INT NULL,
  creado_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comdes_comunicado (comunicado_id),
  KEY idx_comdes_carrera    (carrera_id),
  KEY idx_comdes_usuario    (usuario_id),
  CONSTRAINT fk_comdes_comunicado FOREIGN KEY (comunicado_id) REFERENCES comunicados_coordinacion(id) ON DELETE CASCADE,
  CONSTRAINT fk_comdes_carrera    FOREIGN KEY (carrera_id)    REFERENCES carreras(id) ON DELETE CASCADE,
  CONSTRAINT fk_comdes_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
