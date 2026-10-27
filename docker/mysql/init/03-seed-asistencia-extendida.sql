SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE sesiones_clase;
TRUNCATE TABLE asistencia;
TRUNCATE TABLE faltas;

SET FOREIGN_KEY_CHECKS = 1;

-- Sesiones para Base de Datos (materia 1, docente 86)
-- Grupo 9, 10, 11 y 12
INSERT INTO sesiones_clase (materia_id, docente_id, grupo_id, titulo, fecha, hora_inicio, hora_fin, aula, tipo) VALUES
-- Grupo 9
(1, 86, 9, 'Clase 1 - Intro SQL', '2026-10-19', '08:00:00', '08:45:00', 'Aula 3', 'teorica'),
(1, 86, 9, 'Clase 2 - SELECT', '2026-10-21', '08:00:00', '08:45:00', 'Lab 1', 'practica'),
(1, 86, 9, 'Clase 3 - JOINs', '2026-10-23', '08:00:00', '08:45:00', 'Aula 3', 'teorica'),
-- Grupo 10
(1, 86, 10, 'Clase 1 - Intro SQL', '2026-10-19', '09:00:00', '09:45:00', 'Aula 4', 'teorica'),
(1, 86, 10, 'Clase 2 - SELECT', '2026-10-21', '09:00:00', '09:45:00', 'Lab 2', 'practica'),
-- Grupo 11
(1, 86, 11, 'Clase 1 - Intro SQL', '2026-10-20', '10:00:00', '10:45:00', 'Aula 5', 'teorica'),
-- Grupo 12
(1, 86, 12, 'Clase 1 - Intro SQL', '2026-10-20', '11:00:00', '11:45:00', 'Aula 6', 'teorica');

-- Faltas pendientes para el grupo 9 (alumnos 56, 57, 59)
INSERT INTO faltas (alumno_id, docente_id, materia_id, fecha, motivo, justificada) VALUES
(56, 86, 1, '2026-10-19', 'Inasistencia sin aviso', 0),
(57, 86, 1, '2026-10-21', 'Problema de salud', 0),
(59, 86, 1, '2026-10-23', 'Trámite personal', 0);

-- Algunas faltas ya justificadas
INSERT INTO faltas (alumno_id, docente_id, materia_id, fecha, motivo, justificada, observacion) VALUES
(60, 86, 1, '2026-10-19', 'Certificado médico', 1, 'Presentó certificado en bedelía');
