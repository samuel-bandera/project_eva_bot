-- ============================================================
-- EvalBot — Schema inicial de base de datos
-- Archivo: docker/mysql/init/01-schema.sql
-- Motor: MySQL 8.0
-- Charset: utf8mb4 / utf8mb4_unicode_ci
-- ============================================================
-- Este script se ejecuta AUTOMÁTICAMENTE la primera vez que
-- se levanta el contenedor MySQL (cuando el volumen está vacío).
--
-- ⚠️ Si modificás este archivo y querés que se re-aplique:
--     docker compose down -v
--     docker compose up -d
-- (el -v borra los datos)
-- ============================================================

-- ------------------------------------------------------------
-- 0. Crear la base de datos (por si acaso)
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS sistema_evaluaciones
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE sistema_evaluaciones;

-- ============================================================
-- 1. TABLA: usuarios
-- Almacena alumnos, profesores y admins (rol discriminado por 'tipo')
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(50)  NOT NULL,
    apellido    VARCHAR(50)  NOT NULL,
    usuario     VARCHAR(50)  NOT NULL UNIQUE,
    contrasena  VARCHAR(255) NOT NULL,
    tipo        ENUM('alumno', 'profesor', 'admin') NOT NULL DEFAULT 'alumno',
    creado_en   DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usuarios_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 2. TABLA: evaluaciones
-- Evaluaciones creadas por profesores
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluaciones (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    titulo       VARCHAR(100) NOT NULL,
    descripcion  TEXT,
    profesor_id  INT NOT NULL,
    fecha        DATE NOT NULL,
    creado_en    DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_evaluacion_profesor
        FOREIGN KEY (profesor_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_evaluaciones_profesor (profesor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. TABLA: preguntas
-- Preguntas que componen cada evaluación
-- ============================================================
CREATE TABLE IF NOT EXISTS preguntas (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_id       INT  NOT NULL,
    pregunta            TEXT NOT NULL,
    respuesta_correcta  TEXT NOT NULL,
    CONSTRAINT fk_pregunta_evaluacion
        FOREIGN KEY (evaluacion_id)
        REFERENCES evaluaciones(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_preguntas_evaluacion (evaluacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. TABLA: evaluaciones_alumnos
-- Registra qué alumno rindió qué evaluación + nota final
-- ============================================================
CREATE TABLE IF NOT EXISTS evaluaciones_alumnos (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_id   INT NOT NULL,
    alumno_id       INT NOT NULL,
    fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
    nota            DECIMAL(4,2),
    CONSTRAINT fk_eval_alumno_evaluacion
        FOREIGN KEY (evaluacion_id)
        REFERENCES evaluaciones(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_eval_alumno_alumno
        FOREIGN KEY (alumno_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uk_evaluacion_alumno (evaluacion_id, alumno_id),
    INDEX idx_eval_alumno_alumno (alumno_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. TABLA: respuestas
-- Respuestas del alumno + corrección y nota parcial de la IA
-- ============================================================
CREATE TABLE IF NOT EXISTS respuestas (
    id                      INT AUTO_INCREMENT PRIMARY KEY,
    evaluacion_alumno_id    INT NOT NULL,
    pregunta_id             INT NOT NULL,
    respuesta               TEXT,
    correccion_ia           TEXT,
    nota                    DECIMAL(4,2),
    CONSTRAINT fk_respuesta_eval_alumno
        FOREIGN KEY (evaluacion_alumno_id)
        REFERENCES evaluaciones_alumnos(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_respuesta_pregunta
        FOREIGN KEY (pregunta_id)
        REFERENCES preguntas(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_respuestas_eval_alumno (evaluacion_alumno_id),
    INDEX idx_respuestas_pregunta (pregunta_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. TABLA: entregas_codigo
-- Entregas de archivos de código que suben los alumnos
-- ============================================================
CREATE TABLE IF NOT EXISTS entregas_codigo (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id       INT NOT NULL,
    profesor_id     INT NOT NULL,
    nombre_archivo  VARCHAR(150) NOT NULL,
    ruta_archivo    VARCHAR(255) NOT NULL,
    fecha           DATETIME DEFAULT CURRENT_TIMESTAMP,
    estado          ENUM('pendiente', 'revisado', 'aprobado', 'rechazado')
                    DEFAULT 'pendiente',
    CONSTRAINT fk_entrega_alumno
        FOREIGN KEY (alumno_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_entrega_profesor
        FOREIGN KEY (profesor_id)
        REFERENCES usuarios(id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_entregas_alumno (alumno_id),
    INDEX idx_entregas_profesor (profesor_id),
    INDEX idx_entregas_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
