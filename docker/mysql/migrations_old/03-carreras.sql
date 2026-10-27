CREATE TABLE IF NOT EXISTS carreras (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  codigo          VARCHAR(20)  NOT NULL,
  nombre          VARCHAR(150) NOT NULL,
  descripcion     TEXT         NULL,
  nivel           ENUM('ciclo_basico','bachillerato','terciario') NOT NULL DEFAULT 'terciario',
  duracion_anios  TINYINT UNSIGNED NULL,
  color           VARCHAR(7)   NOT NULL DEFAULT '#722f37',
  icono           VARCHAR(50)  NOT NULL DEFAULT 'school',
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_carreras_codigo (codigo),
  KEY idx_carreras_nivel (nivel),
  KEY idx_carreras_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE materias
  ADD COLUMN carrera_id INT UNSIGNED NULL AFTER ciclo_id,
  ADD KEY idx_materias_carrera (carrera_id),
  ADD CONSTRAINT fk_materias_carrera FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS coordinadores_carrera (
  coordinador_id  INT UNSIGNED NOT NULL,
  carrera_id      INT UNSIGNED NOT NULL,
  creado_en       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (coordinador_id, carrera_id),
  KEY idx_coordcar_carrera (carrera_id),
  CONSTRAINT fk_coordcar_coordinador FOREIGN KEY (coordinador_id) REFERENCES usuarios(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_coordcar_carrera    FOREIGN KEY (carrera_id)    REFERENCES carreras(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE usuarios
  ADD COLUMN tipo_coordinacion ENUM('ninguno','carrera','pasantia','general') NOT NULL DEFAULT 'ninguno' AFTER tipo,
  ADD KEY idx_usuarios_tipo_coord (tipo_coordinacion);

CREATE TABLE IF NOT EXISTS comunicados_coordinacion (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  emisor_id     INT UNSIGNED NOT NULL,
  emisor_tipo   ENUM('bedelia','coordinador','admin','sistema') NOT NULL DEFAULT 'coordinador',
  titulo        VARCHAR(200) NOT NULL,
  contenido     TEXT         NOT NULL,
  nivel_alerta  ENUM('critico','alto','medio','bajo','info') NOT NULL DEFAULT 'info',
  alcance       ENUM('carrera','otros_coordinadores','todos_coordinadores','global') NOT NULL DEFAULT 'carrera',
  carrera_id    INT UNSIGNED NULL,
  activo        TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comcoord_emisor  (emisor_id),
  KEY idx_comcoord_carrera (carrera_id),
  KEY idx_comcoord_nivel   (nivel_alerta),
  KEY idx_comcoord_creado  (creado_en),
  CONSTRAINT fk_comcoord_emisor  FOREIGN KEY (emisor_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_comcoord_carrera FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS comunicados_coordinacion_lecturas (
  comunicado_id INT UNSIGNED NOT NULL,
  usuario_id    INT UNSIGNED NOT NULL,
  leido_en      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (comunicado_id, usuario_id),
  CONSTRAINT fk_comcoordlec_comunicado FOREIGN KEY (comunicado_id) REFERENCES comunicados_coordinacion(id) ON DELETE CASCADE,
  CONSTRAINT fk_comcoordlec_usuario    FOREIGN KEY (usuario_id)    REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO carreras (id, codigo, nombre, descripcion, nivel, duracion_anios, color, icono) VALUES
(1, 'CB-2026',   'Ciclo Básico 2026',          'Formación general obligatoria',        'ciclo_basico', 3, '#607d8b', 'school'),
(2, 'BACH-INFO', 'Bachillerato Informático',   'Bachillerato orientado a informática', 'bachillerato', 3, '#9c27b0', 'code'),
(3, 'TEC-REDES', 'Tecnicatura en Redes',       'Terciaria en redes e infraestructura', 'terciario',    3, '#2196f3', 'router'),
(4, 'TEC-SOFT',  'Tecnicatura en Software',    'Terciaria en desarrollo de software',  'terciario',    3, '#4caf50', 'computer');

INSERT IGNORE INTO coordinadores_carrera (coordinador_id, carrera_id) VALUES
(1, 2), (1, 4), (2, 1), (2, 3);

UPDATE usuarios SET tipo_coordinacion = 'carrera' WHERE id IN (1, 2);
UPDATE materias SET carrera_id = 4 WHERE id IN (1, 4, 7, 8);
UPDATE materias SET carrera_id = 1 WHERE id IN (2, 5);
UPDATE materias SET carrera_id = 3 WHERE id IN (3, 6);
