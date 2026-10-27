
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
DROP TABLE IF EXISTS `alertas_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alertas_config` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `horas_antes` int DEFAULT '24',
  `notificar_email` tinyint(1) DEFAULT '1',
  `notificar_app` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `fk_alertas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `aprobaciones_materia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `aprobaciones_materia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `materia_id` int NOT NULL,
  `aprobado_por` int NOT NULL,
  `tipo_aprobador` enum('docente','coordinador','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('aprobado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_aprob_materia` (`alumno_id`,`materia_id`),
  KEY `fk_aprob_aprobador` (`aprobado_por`),
  KEY `idx_aprob_materia` (`materia_id`),
  CONSTRAINT `fk_aprob_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_aprob_aprobador` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_aprob_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `archivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archivos` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `nombre_original` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_interno` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tamaño_bytes` bigint NOT NULL,
  `hash_sha256` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subido_por` int NOT NULL,
  `tipo_entidad` enum('material','entrega_codigo','avatar','entrega_grupal','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad_id` int DEFAULT NULL,
  `estado_analisis` enum('pendiente','limpio','infectado','sospechoso') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `descargas` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre_interno` (`nombre_interno`),
  KEY `idx_archivos_usuario` (`subido_por`),
  KEY `idx_archivos_hash` (`hash_sha256`),
  KEY `idx_archivos_entidad` (`tipo_entidad`,`entidad_id`),
  CONSTRAINT `fk_archivo_usuario` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `archivos_chunks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archivos_chunks` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `upload_id` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `archivo_hash` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `chunk_index` int NOT NULL,
  `total_chunks` int NOT NULL,
  `ruta_chunk` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tamaño_bytes` bigint NOT NULL,
  `estado` enum('pendiente','subido','unido','error') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `subido_por` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chunk` (`upload_id`,`chunk_index`),
  KEY `fk_chunk_usuario` (`subido_por`),
  KEY `idx_chunk_upload` (`upload_id`),
  KEY `idx_chunk_hash` (`archivo_hash`),
  KEY `idx_chunk_estado` (`estado`),
  CONSTRAINT `fk_chunk_usuario` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `archivos_entrega`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archivos_entrega` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `entrega_id` int NOT NULL,
  `archivo_id` bigint NOT NULL,
  `subido_por` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_entrega_archivo` (`entrega_id`,`archivo_id`),
  KEY `fk_ae_usuario` (`subido_por`),
  KEY `idx_ae_entrega` (`entrega_id`),
  KEY `idx_ae_archivo` (`archivo_id`),
  CONSTRAINT `fk_ae_archivo` FOREIGN KEY (`archivo_id`) REFERENCES `archivos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ae_entrega` FOREIGN KEY (`entrega_id`) REFERENCES `entregas_grupales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ae_usuario` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `asistencia`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `asistencia` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `materia_id` int NOT NULL,
  `docente_id` int DEFAULT NULL,
  `sesion_id` int DEFAULT NULL,
  `fecha` date NOT NULL,
  `estado` enum('presente','ausente','tarde','justificado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'presente',
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_asistencia` (`alumno_id`,`materia_id`,`fecha`),
  KEY `fk_asist_materia` (`materia_id`),
  KEY `idx_asist_alumno` (`alumno_id`),
  KEY `idx_asist_sesion` (`sesion_id`),
  KEY `idx_asist_fecha` (`fecha`),
  KEY `fk_asistencia_docente` (`docente_id`),
  CONSTRAINT `fk_asistencia_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `banco_preguntas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `banco_preguntas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `materia_id` int NOT NULL,
  `pregunta` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `respuesta_correcta` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `dificultad` enum('facil','media','dificil') COLLATE utf8mb4_unicode_ci DEFAULT 'media',
  `tema` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `agregada_por` int NOT NULL,
  `veces_usada` int DEFAULT '0',
  `activa` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tipo` enum('multiple_choice','true_false','short_answer') COLLATE utf8mb4_unicode_ci DEFAULT 'short_answer',
  `opciones` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_banco_usuario` (`agregada_por`),
  KEY `idx_banco_materia` (`materia_id`),
  KEY `idx_banco_dificultad` (`dificultad`),
  KEY `idx_banco_tema` (`tema`),
  KEY `idx_banco_tipo_dificultad` (`materia_id`,`tipo`,`dificultad`,`activa`),
  CONSTRAINT `fk_banco_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_banco_usuario` FOREIGN KEY (`agregada_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=255 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `calendario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `calendario` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('institucion','materia','docente','personal','grupo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `materia_id` int DEFAULT NULL,
  `grupo_id` int DEFAULT NULL,
  `usuario_id` int NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime DEFAULT NULL,
  `todo_el_dia` tinyint(1) DEFAULT '0',
  `privado` tinyint(1) DEFAULT '0',
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#42b883',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_calendario_materia` (`materia_id`),
  KEY `fk_calendario_grupo` (`grupo_id`),
  KEY `idx_calendario_tipo` (`tipo`),
  KEY `idx_calendario_fecha` (`fecha_inicio`),
  KEY `idx_calendario_usuario` (`usuario_id`),
  CONSTRAINT `fk_calendario_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_calendario_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_calendario_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `candidatos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `candidatos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eleccion_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `tipo` enum('principal','subdelegado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `propuesta` text COLLATE utf8mb4_unicode_ci,
  `aceptado` tinyint(1) DEFAULT '1',
  `fecha_postulacion` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_candidato` (`eleccion_id`,`alumno_id`,`tipo`),
  KEY `fk_candidato_alumno` (`alumno_id`),
  KEY `idx_candidato_eleccion` (`eleccion_id`),
  CONSTRAINT `fk_candidato_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_candidato_eleccion` FOREIGN KEY (`eleccion_id`) REFERENCES `elecciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `carreras`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carreras` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `nivel` enum('ciclo_basico','bachillerato','terciario') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'terciario',
  `duracion_anios` tinyint unsigned DEFAULT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '#722f37',
  `icono` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'school',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_carreras_codigo` (`codigo`),
  KEY `idx_carreras_nivel` (`nivel`),
  KEY `idx_carreras_activo` (`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cartelera`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cartelera` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('general','materia','grupo') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'general',
  `materia_id` int DEFAULT NULL,
  `grupo_id` int DEFAULT NULL,
  `autor_id` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fijado` tinyint(1) DEFAULT '0',
  `imagen_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_cartelera_autor` (`autor_id`),
  KEY `idx_cartelera_tipo` (`tipo`),
  KEY `idx_cartelera_materia` (`materia_id`),
  KEY `idx_cartelera_grupo` (`grupo_id`),
  KEY `idx_cartelera_fecha` (`fecha`),
  CONSTRAINT `fk_cartelera_autor` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_cartelera_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cartelera_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cartelera_comentarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cartelera_comentarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `anuncio_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `anuncio_id` (`anuncio_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `cartelera_comentarios_ibfk_1` FOREIGN KEY (`anuncio_id`) REFERENCES `cartelera` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cartelera_comentarios_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cartelera_likes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cartelera_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `anuncio_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_like` (`anuncio_id`,`usuario_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `cartelera_likes_ibfk_1` FOREIGN KEY (`anuncio_id`) REFERENCES `cartelera` (`id`) ON DELETE CASCADE,
  CONSTRAINT `cartelera_likes_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `ciclos_electivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ciclos_electivos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` date NOT NULL,
  `fecha_fin` date NOT NULL,
  `activo` tinyint(1) DEFAULT '0',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ciclos_activo` (`activo`),
  CONSTRAINT `ciclos_electivos_chk_1` CHECK ((`fecha_fin` >= `fecha_inicio`))
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `codigos_invitacion_docente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `codigos_invitacion_docente` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creado_por` int NOT NULL,
  `usado` tinyint(1) DEFAULT '0',
  `usado_por` int DEFAULT NULL,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_uso` datetime DEFAULT NULL,
  `expira_en` datetime NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `fk_codigo_creador` (`creado_por`),
  KEY `fk_codigo_usuarios` (`usado_por`),
  KEY `idx_codigo` (`codigo`),
  KEY `idx_usado` (`usado`),
  CONSTRAINT `fk_codigo_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`),
  CONSTRAINT `fk_codigo_usuarios` FOREIGN KEY (`usado_por`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comunicados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comunicados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `autor_id` int NOT NULL,
  `destinatario` enum('todos','docentes','alumnos','materia','grupo') COLLATE utf8mb4_unicode_ci NOT NULL,
  `materia_id` int DEFAULT NULL,
  `grupo_id` int DEFAULT NULL,
  `fijado` tinyint(1) DEFAULT '0',
  `requiere_confirmacion` tinyint(1) DEFAULT '0',
  `enviar_email` tinyint(1) DEFAULT '1',
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `imagen_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_comunicado_autor` (`autor_id`),
  KEY `fk_comunicado_materia` (`materia_id`),
  KEY `fk_comunicado_grupo` (`grupo_id`),
  KEY `idx_comunicados_destinatario` (`destinatario`),
  KEY `idx_comunicados_fecha` (`fecha`),
  CONSTRAINT `fk_comunicado_autor` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_comunicado_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_comunicado_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comunicados_coordinacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comunicados_coordinacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `emisor_id` int NOT NULL,
  `emisor_tipo` enum('bedelia','coordinador','admin','sistema') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'coordinador',
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel_alerta` enum('critico','alto','medio','bajo','info') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'info',
  `enviar_email_todos` tinyint(1) NOT NULL DEFAULT '0',
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comcoord_emisor` (`emisor_id`),
  KEY `idx_comcoord_nivel` (`nivel_alerta`),
  KEY `idx_comcoord_creado` (`creado_en`),
  CONSTRAINT `fk_comcoord_emisor` FOREIGN KEY (`emisor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comunicados_coordinacion_lecturas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comunicados_coordinacion_lecturas` (
  `comunicado_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `leido_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`comunicado_id`,`usuario_id`),
  KEY `fk_comcoordlec_usuario` (`usuario_id`),
  CONSTRAINT `fk_comcoordlec_comunicado` FOREIGN KEY (`comunicado_id`) REFERENCES `comunicados_coordinacion` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comcoordlec_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `comunicados_destinatarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comunicados_destinatarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comunicado_id` int NOT NULL,
  `tipo` enum('rol','carrera','usuario') COLLATE utf8mb4_unicode_ci NOT NULL,
  `rol` enum('alumno','docente','coordinador','admin') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carrera_id` int DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comdes_comunicado` (`comunicado_id`),
  KEY `idx_comdes_carrera` (`carrera_id`),
  KEY `idx_comdes_usuario` (`usuario_id`),
  CONSTRAINT `fk_comdes_carrera` FOREIGN KEY (`carrera_id`) REFERENCES `carreras` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comdes_comunicado` FOREIGN KEY (`comunicado_id`) REFERENCES `comunicados_coordinacion` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_comdes_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `confirmaciones_comunicados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `confirmaciones_comunicados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `comunicado_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `confirmado` tinyint(1) DEFAULT '0',
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conf` (`comunicado_id`,`usuario_id`),
  KEY `idx_conf_comunicado` (`comunicado_id`),
  KEY `idx_conf_usuario` (`usuario_id`),
  CONSTRAINT `fk_conf_comunicado` FOREIGN KEY (`comunicado_id`) REFERENCES `comunicados` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_conf_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `coordinadores_carrera`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coordinadores_carrera` (
  `coordinador_id` int NOT NULL,
  `carrera_id` int NOT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`coordinador_id`,`carrera_id`),
  KEY `idx_coordcar_carrera` (`carrera_id`),
  CONSTRAINT `fk_coordcar_carrera` FOREIGN KEY (`carrera_id`) REFERENCES `carreras` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_coordcar_coordinador` FOREIGN KEY (`coordinador_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `correos_pendientes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `correos_pendientes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `destinatario` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `asunto` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cuerpo_html` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','enviado','error') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `intentos` int DEFAULT '0',
  `error_mensaje` text COLLATE utf8mb4_unicode_ci,
  `fecha_creacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_envio` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_email_estado` (`estado`),
  KEY `idx_email_fecha` (`fecha_creacion`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `delegados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `delegados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `tipo` enum('principal','subdelegado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `periodo_inicio` date NOT NULL,
  `periodo_fin` date DEFAULT NULL,
  `votos_obtenidos` int DEFAULT '0',
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_delegado_grupo_tipo` (`grupo_id`,`tipo`,`periodo_inicio`),
  KEY `idx_delegado_grupo` (`grupo_id`),
  KEY `idx_delegado_alumno` (`alumno_id`),
  CONSTRAINT `fk_delegado_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_delegado_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `elecciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `elecciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime NOT NULL,
  `estado` enum('borrador','postulacion','votacion','cerrada','finalizada') COLLATE utf8mb4_unicode_ci DEFAULT 'borrador',
  `creado_por` int NOT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_eleccion_creador` (`creado_por`),
  KEY `idx_eleccion_grupo` (`grupo_id`),
  KEY `idx_eleccion_estado` (`estado`),
  CONSTRAINT `fk_eleccion_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_eleccion_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `elecciones_chk_1` CHECK ((`fecha_fin` >= `fecha_inicio`))
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `entregas_codigo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entregas_codigo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `docente_id` int DEFAULT NULL,
  `tarea_id` int DEFAULT NULL,
  `evaluacion_id` int DEFAULT NULL,
  `archivo_id` bigint DEFAULT NULL,
  `nombre_archivo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ruta_archivo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('pendiente','revisado','aprobado','rechazado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `nota` decimal(4,2) DEFAULT NULL,
  `comentario` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  KEY `fk_entrega_tarea` (`tarea_id`),
  KEY `fk_entrega_evaluacion` (`evaluacion_id`),
  KEY `fk_entrega_archivo` (`archivo_id`),
  KEY `idx_entregas_alumno` (`alumno_id`),
  KEY `idx_entregas_docente` (`docente_id`),
  KEY `idx_entregas_estado` (`estado`),
  CONSTRAINT `fk_entregas_codigo_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `entregas_grupales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `entregas_grupales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subgrupo_id` int NOT NULL,
  `tarea_id` int DEFAULT NULL,
  `evaluacion_id` int DEFAULT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `estado` enum('pendiente','parcial','completa','revisada','aprobada','rechazada') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `nota` decimal(4,2) DEFAULT NULL,
  `comentario_docente` text COLLATE utf8mb4_unicode_ci,
  `fecha_entrega` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_eg_evaluacion` (`evaluacion_id`),
  KEY `idx_eg_subgrupo` (`subgrupo_id`),
  KEY `idx_eg_tarea` (`tarea_id`),
  KEY `idx_eg_estado` (`estado`),
  CONSTRAINT `fk_eg_evaluacion` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_eg_subgrupo` FOREIGN KEY (`subgrupo_id`) REFERENCES `subgrupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_eg_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `entregas_grupales_chk_1` CHECK (((`nota` is null) or (`nota` >= 0)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `evaluaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `codigo_publico` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `modelo` tinyint unsigned NOT NULL DEFAULT '1',
  `cantidad_modelos` tinyint unsigned NOT NULL DEFAULT '3',
  `titulo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `instrucciones` text COLLATE utf8mb4_unicode_ci,
  `mostrar_instrucciones` tinyint(1) NOT NULL DEFAULT '1',
  `docente_id` int NOT NULL,
  `materia_id` int NOT NULL,
  `ciclo_id` int DEFAULT NULL,
  `tipo` enum('parcial','tp','recuperatorio','final') COLLATE utf8mb4_unicode_ci DEFAULT 'parcial',
  `fecha_publicacion` datetime NOT NULL,
  `fecha_apertura` datetime NOT NULL,
  `fecha_cierre` datetime NOT NULL,
  `fecha_correccion` datetime DEFAULT NULL,
  `duracion_minutos` int DEFAULT NULL,
  `preguntas_aleatorias` int DEFAULT '0',
  `intentos_permitidos` int DEFAULT '1',
  `nota_maxima` decimal(4,2) DEFAULT '12.00',
  `estado` enum('borrador','publicada','abierta','cerrada','corregida') COLLATE utf8mb4_unicode_ci DEFAULT 'borrador',
  `ponderacion` decimal(4,2) DEFAULT '1.00',
  `version` int DEFAULT '1',
  `bloquear_salida` tinyint(1) DEFAULT '0' COMMENT 'Si TRUE, salir de la página cierra la rendición',
  `monitoreo_en_vivo` tinyint(1) DEFAULT '1' COMMENT 'Si TRUE, el profesor ve progreso en tiempo real',
  `mostrar_tiempo` tinyint(1) DEFAULT '1' COMMENT 'Si TRUE, el alumno ve el contador',
  `permitir_extension` tinyint(1) DEFAULT '1' COMMENT 'Si TRUE, el profesor puede agregar tiempo',
  `permitir_salida` tinyint(1) DEFAULT '1',
  `bloquear_navegacion` tinyint(1) DEFAULT '0',
  `max_salidas` int DEFAULT NULL,
  `tiempo_max_fuera_segundos` int DEFAULT NULL,
  `registrar_salidas` tinyint(1) DEFAULT '0',
  `requiere_pantalla_completa` tinyint(1) DEFAULT '0',
  `modo_examen_seguro` tinyint(1) DEFAULT '0',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo_publico` (`codigo_publico`),
  KEY `idx_eval_docente` (`docente_id`),
  KEY `idx_eval_materia` (`materia_id`),
  KEY `idx_eval_estado` (`estado`),
  KEY `idx_eval_fechas` (`fecha_apertura`,`fecha_cierre`),
  KEY `fk_evaluaciones_ciclo` (`ciclo_id`),
  CONSTRAINT `fk_evaluaciones_ciclo` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos_electivos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_evaluaciones_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_evaluaciones_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `evaluaciones_chk_1` CHECK ((`fecha_cierre` >= `fecha_apertura`)),
  CONSTRAINT `evaluaciones_chk_2` CHECK ((`nota_maxima` > 0))
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE `evaluaciones_destinatarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluacion_id` int NOT NULL,
  `grupo_id` int DEFAULT NULL,
  `subgrupo_id` int DEFAULT NULL,
  `alcance` enum('materia','grupo','subgrupo') NOT NULL DEFAULT 'materia',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_eval_destino` (`evaluacion_id`,`grupo_id`,`subgrupo_id`),
  CONSTRAINT `fk_dest_evaluacion` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dest_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dest_subgrupo` FOREIGN KEY (`subgrupo_id`) REFERENCES `subgrupos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `faltas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `faltas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `docente_id` int DEFAULT NULL,
  `materia_id` int DEFAULT NULL,
  `fecha` date NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `justificada` tinyint(1) DEFAULT '0',
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_faltas_alumno` (`alumno_id`),
  KEY `idx_faltas_materia` (`materia_id`),
  KEY `idx_faltas_fecha` (`fecha`),
  KEY `fk_faltas_docente` (`docente_id`),
  CONSTRAINT `fk_faltas_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_faltas_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_faltas_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `grupo_alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupo_alumnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `carga_horaria` enum('completa','parcial') COLLATE utf8mb4_unicode_ci DEFAULT 'completa',
  `fecha_ingreso` datetime DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_grupo_alumno` (`grupo_id`,`alumno_id`),
  KEY `idx_ga_grupo` (`grupo_id`),
  KEY `idx_ga_alumno` (`alumno_id`),
  CONSTRAINT `fk_ga_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ga_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `grupos_principales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `grupos_principales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `carrera` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `carrera_id` int DEFAULT NULL,
  `ciclo_id` int DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `capacidad_max` int DEFAULT '50',
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#42b883',
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  KEY `idx_grupos_codigo` (`codigo`),
  KEY `idx_grupos_ciclo` (`ciclo_id`),
  CONSTRAINT `fk_grupo_ciclo` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos_electivos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `historial_cambios_notas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_cambios_notas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `evaluacion_alumno_id` int DEFAULT NULL,
  `tarea_id` int DEFAULT NULL,
  `materia_id` int DEFAULT NULL,
  `tipo_calificacion` enum('evaluacion','tarea','final') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nota_anterior` decimal(4,2) DEFAULT NULL,
  `nota_nueva` decimal(4,2) NOT NULL,
  `modificado_por` int NOT NULL,
  `rol_modificador` enum('docente','coordinador','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `motivo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `origen` enum('manual','ia_aprobada','recuperatorio','ajuste') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_hist_nota_materia` (`materia_id`),
  KEY `fk_hist_nota_usuario` (`modificado_por`),
  KEY `idx_hist_alumno` (`alumno_id`),
  KEY `idx_hist_eval` (`evaluacion_alumno_id`),
  KEY `idx_hist_tarea` (`tarea_id`),
  KEY `idx_hist_fecha` (`fecha`),
  CONSTRAINT `fk_hist_nota_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hist_nota_eval` FOREIGN KEY (`evaluacion_alumno_id`) REFERENCES `rendiciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hist_nota_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hist_nota_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_hist_nota_usuario` FOREIGN KEY (`modificado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `historial_evaluaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `historial_evaluaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluacion_id` int NOT NULL,
  `version` int NOT NULL,
  `snapshot_json` json NOT NULL,
  `preguntas_json` json NOT NULL,
  `creado_por` int NOT NULL,
  `motivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_version` (`evaluacion_id`,`version`),
  KEY `fk_version_usuario` (`creado_por`),
  KEY `idx_versiones_eval` (`evaluacion_id`),
  CONSTRAINT `fk_version_eval` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_version_usuario` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `incidentes_seguridad`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidentes_seguridad` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `tipo` enum('login_exitoso','login_fallido','bloqueo_cuenta','cambio_password','recuperacion_password','cambio_permisos','acceso_denegado','modificacion_nota','eliminacion_registro','carga_archivo','descarga_archivo','intento_idor','rate_limit_excedido') COLLATE utf8mb4_unicode_ci NOT NULL,
  `gravedad` enum('info','baja','media','alta','critica') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `usuario_id` int DEFAULT NULL,
  `entidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidad_id` int DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `detalle` text COLLATE utf8mb4_unicode_ci,
  `resuelto` tinyint(1) DEFAULT '0',
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_eventos_tipo` (`tipo`),
  KEY `idx_eventos_gravedad` (`gravedad`),
  KEY `idx_eventos_fecha` (`fecha`),
  KEY `idx_eventos_usuario` (`usuario_id`),
  CONSTRAINT `fk_evento_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=451 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `inscripciones_ciclo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inscripciones_ciclo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ciclo_id` int NOT NULL,
  `materia_id` int NOT NULL,
  `cupos` int DEFAULT '0',
  `activa` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_insc_ciclo` (`ciclo_id`,`materia_id`),
  KEY `fk_insc_materia` (`materia_id`),
  KEY `idx_insc_ciclo` (`ciclo_id`),
  CONSTRAINT `fk_insc_ciclo` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos_electivos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_insc_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `materiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materiales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('apunte','video','link','ejercicio','otro') COLLATE utf8mb4_unicode_ci DEFAULT 'apunte',
  `materia_id` int DEFAULT NULL,
  `subido_por` int NOT NULL,
  `archivo_id` bigint DEFAULT NULL,
  `nombre_archivo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ruta_archivo` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `url_externa` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `destacado` tinyint(1) DEFAULT '0',
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `tema` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'General',
  PRIMARY KEY (`id`),
  KEY `fk_material_archivo` (`archivo_id`),
  KEY `idx_materiales_materia` (`materia_id`),
  KEY `idx_materiales_usuario` (`subido_por`),
  CONSTRAINT `fk_material_archivo` FOREIGN KEY (`archivo_id`) REFERENCES `archivos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_material_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_material_usuario` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `materias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materias` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `abreviatura` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `ciclo_id` int DEFAULT NULL,
  `carrera_id` int DEFAULT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#42b883',
  `icono` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aula` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `horario` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `es_publica` tinyint(1) DEFAULT '0',
  `codigo_inscripcion` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `permite_solicitudes` tinyint(1) DEFAULT '1',
  `nota_aprobacion` decimal(4,2) DEFAULT '6.00',
  `activa` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `usos_maximos` int DEFAULT NULL,
  `usos_actuales` int DEFAULT '0',
  `programa` text COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`),
  UNIQUE KEY `codigo` (`codigo`),
  UNIQUE KEY `codigo_inscripcion` (`codigo_inscripcion`),
  KEY `idx_materias_codigo` (`codigo`),
  KEY `idx_materias_ciclo` (`ciclo_id`),
  KEY `idx_materias_publica` (`es_publica`,`activa`),
  KEY `idx_materias_carrera` (`carrera_id`),
  CONSTRAINT `fk_materia_ciclo` FOREIGN KEY (`ciclo_id`) REFERENCES `ciclos_electivos` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_materias_carrera` FOREIGN KEY (`carrera_id`) REFERENCES `carreras` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `materias_docente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `materias_docente` (
  `id` int NOT NULL AUTO_INCREMENT,
  `docente_id` int NOT NULL,
  `materia_id` int NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_docente_materia` (`docente_id`,`materia_id`),
  KEY `idx_mat_docente_docente` (`docente_id`),
  KEY `idx_mat_prof_materia` (`materia_id`),
  CONSTRAINT `fk_materias_docente_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_materias_docente_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `matriculas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `matriculas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `materia_id` int NOT NULL,
  `estado` enum('activa','aprobada','reprobada','abandonada') COLLATE utf8mb4_unicode_ci DEFAULT 'activa',
  `nota_final` decimal(4,2) DEFAULT NULL,
  `origen` enum('solicitud','asignacion_automatica','directa','importacion') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'solicitud',
  `creada_por` int DEFAULT NULL,
  `tipo_creador` enum('alumno','docente','coordinador','admin','sistema') COLLATE utf8mb4_unicode_ci NOT NULL,
  `aprobada_por` int DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `observacion` text COLLATE utf8mb4_unicode_ci,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_matricula` (`alumno_id`,`materia_id`),
  KEY `fk_matricula_creador` (`creada_por`),
  KEY `fk_matricula_aprobador` (`aprobada_por`),
  KEY `idx_matriculas_alumno` (`alumno_id`),
  KEY `idx_matriculas_materia` (`materia_id`),
  KEY `idx_matriculas_origen` (`origen`,`estado`),
  CONSTRAINT `fk_matricula_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_matricula_aprobador` FOREIGN KEY (`aprobada_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_matricula_creador` FOREIGN KEY (`creada_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_matricula_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=276 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `monitoreo_examen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `monitoreo_examen` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `evaluacion_alumno_id` int NOT NULL,
  `evaluacion_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `tipo` enum('inicio','heartbeat','cambio_pregunta','salida_pagina','vuelta_pagina','tiempo_agregado','cierre_manual','entrega_automatica') COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalle` json DEFAULT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_eventos_vivo_evaluacion` (`evaluacion_id`,`fecha`),
  KEY `idx_eventos_vivo_alumno` (`alumno_id`,`fecha`),
  KEY `idx_eventos_vivo_rendicion` (`evaluacion_alumno_id`,`fecha`),
  CONSTRAINT `fk_evento_vivo_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_evento_vivo_evaluacion` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_evento_vivo_rendicion` FOREIGN KEY (`evaluacion_alumno_id`) REFERENCES `rendiciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=651 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `notificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensaje` text COLLATE utf8mb4_unicode_ci,
  `tipo` enum('info','alerta','exito','error') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `leida` tinyint(1) DEFAULT '0',
  `url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `enviada_email` tinyint(1) DEFAULT '0',
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_usuario` (`usuario_id`),
  KEY `idx_notif_leida` (`leida`),
  CONSTRAINT `fk_notif_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=183 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pentest_findings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pentest_findings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `run_id` int NOT NULL,
  `seccion` varchar(100) DEFAULT NULL,
  `severidad` enum('CRITICAL','HIGH','MEDIUM','LOW','INFO') NOT NULL,
  `categoria` varchar(100) DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `detalle` text,
  `payload` text,
  `endpoint` varchar(255) DEFAULT NULL,
  `metodo` varchar(10) DEFAULT NULL,
  `status_code` int DEFAULT NULL,
  `evidencia` text,
  `creado` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_run` (`run_id`),
  KEY `idx_sev` (`severidad`),
  CONSTRAINT `pentest_findings_ibfk_1` FOREIGN KEY (`run_id`) REFERENCES `pentest_runs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pentest_runs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pentest_runs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `inicio` datetime NOT NULL,
  `fin` datetime DEFAULT NULL,
  `duracion_seg` decimal(10,2) DEFAULT NULL,
  `target` varchar(255) DEFAULT NULL,
  `pass_count` int DEFAULT '0',
  `fail_count` int DEFAULT '0',
  `warn_count` int DEFAULT '0',
  `rate_limited` tinyint DEFAULT '0',
  `notas` text,
  PRIMARY KEY (`id`),
  KEY `idx_inicio` (`inicio`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `modulo` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`),
  KEY `idx_permisos_modulo` (`modulo`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permisos_especiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos_especiales` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `permiso` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `otorgado_por` int NOT NULL,
  `fecha_expiracion` datetime DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permiso` (`usuario_id`,`permiso`),
  KEY `fk_permiso_otorgante` (`otorgado_por`),
  KEY `idx_permisos_usuario` (`usuario_id`),
  CONSTRAINT `fk_permiso_otorgante` FOREIGN KEY (`otorgado_por`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_permiso_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `pesos_calificacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pesos_calificacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `materia_id` int NOT NULL,
  `ciclo_id` int NOT NULL DEFAULT '0',
  `tipo` enum('evaluaciones','tareas','participacion','asistencia') COLLATE utf8mb4_unicode_ci NOT NULL,
  `peso` decimal(5,2) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_pond` (`materia_id`,`ciclo_id`,`tipo`),
  KEY `idx_pond_materia` (`materia_id`),
  CONSTRAINT `fk_pond_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `pesos_calificacion_chk_1` CHECK (((`peso` >= 0) and (`peso` <= 100)))
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `preferencias_dashboard`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `preferencias_dashboard` (
  `id` int NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `rol` enum('alumno','docente','coordinador','admin') COLLATE utf8mb4_unicode_ci NOT NULL,
  `layout_json` json NOT NULL,
  `version` int DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario_id` (`usuario_id`),
  KEY `idx_layout_rol` (`rol`),
  CONSTRAINT `fk_layout_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `preguntas_evaluacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `preguntas_evaluacion` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluacion_id` int NOT NULL,
  `banco_pregunta_id` int DEFAULT NULL,
  `pregunta` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `respuesta_correcta` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `orden` int DEFAULT '0',
  `puntaje` decimal(4,2) DEFAULT '1.00',
  `tipo` enum('multiple_choice','short_answer','true_false') COLLATE utf8mb4_unicode_ci DEFAULT 'short_answer',
  `opciones` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_eval_preg_banco` (`banco_pregunta_id`),
  KEY `idx_eval_preg_evaluacion` (`evaluacion_id`),
  CONSTRAINT `fk_eval_preg_banco` FOREIGN KEY (`banco_pregunta_id`) REFERENCES `banco_preguntas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_eval_preg_evaluacion` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `preguntas_evaluacion_chk_1` CHECK ((`puntaje` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=214 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `publicaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `publicaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `materia_id` int NOT NULL,
  `autor_id` int NOT NULL,
  `titulo` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `padre_id` int DEFAULT NULL,
  `fijado` tinyint(1) DEFAULT '0',
  `cerrado` tinyint(1) DEFAULT '0',
  `eliminado` tinyint(1) DEFAULT '0',
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `etiquetas` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_foro_autor` (`autor_id`),
  KEY `idx_foro_materia` (`materia_id`),
  KEY `idx_foro_padre` (`padre_id`),
  KEY `idx_foro_fecha` (`fecha`),
  CONSTRAINT `fk_foro_autor` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_foro_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_foro_padre` FOREIGN KEY (`padre_id`) REFERENCES `publicaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reclamos_calificaciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reclamos_calificaciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `evaluacion_alumno_id` int DEFAULT NULL,
  `evaluacion_pregunta_id` int DEFAULT NULL,
  `tarea_id` int DEFAULT NULL,
  `materia_id` int NOT NULL,
  `tipo_reclamo` enum('evaluacion','tarea','final') COLLATE utf8mb4_unicode_ci NOT NULL,
  `nota_cuestionada` decimal(4,2) NOT NULL,
  `motivo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado` enum('pendiente','en_revision','resuelto','rechazado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `revisor_id` int DEFAULT NULL,
  `resolucion` text COLLATE utf8mb4_unicode_ci,
  `nota_final` decimal(4,2) DEFAULT NULL,
  `fecha_reclamo` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_resolucion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_reclamo_eval` (`evaluacion_alumno_id`),
  KEY `fk_reclamo_materia` (`materia_id`),
  KEY `fk_reclamo_revisor` (`revisor_id`),
  KEY `idx_reclamo_alumno` (`alumno_id`),
  KEY `idx_reclamo_tarea` (`tarea_id`),
  KEY `idx_reclamo_estado` (`estado`),
  KEY `idx_reclamo_pregunta` (`evaluacion_pregunta_id`),
  CONSTRAINT `fk_reclamo_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reclamo_eval` FOREIGN KEY (`evaluacion_alumno_id`) REFERENCES `rendiciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reclamo_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_reclamo_revisor` FOREIGN KEY (`revisor_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reclamo_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `recuperatorios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `recuperatorios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluacion_original_id` int NOT NULL,
  `evaluacion_recupero_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `nota_original` decimal(4,2) DEFAULT NULL,
  `nota_recupero` decimal(4,2) DEFAULT NULL,
  `nota_final` decimal(4,2) DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_recup` (`evaluacion_original_id`,`alumno_id`),
  KEY `fk_recup_recupero` (`evaluacion_recupero_id`),
  KEY `fk_recup_alumno` (`alumno_id`),
  CONSTRAINT `fk_recup_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_recup_original` FOREIGN KEY (`evaluacion_original_id`) REFERENCES `evaluaciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_recup_recupero` FOREIGN KEY (`evaluacion_recupero_id`) REFERENCES `evaluaciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `registro_auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registro_auditoria` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` int DEFAULT NULL,
  `accion` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entidad` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `entidad_id` int DEFAULT NULL,
  `detalle` text COLLATE utf8mb4_unicode_ci,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_logs_usuario` (`usuario_id`),
  KEY `idx_logs_accion` (`accion`),
  KEY `idx_logs_fecha` (`fecha`),
  CONSTRAINT `fk_log_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rendiciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rendiciones` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluacion_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `intento` int DEFAULT '1',
  `modelo_asignado` tinyint unsigned DEFAULT NULL,
  `fecha_inicio` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_envio` datetime DEFAULT NULL,
  `nota` decimal(4,2) DEFAULT NULL,
  `estado` enum('en_progreso','enviada','corregida') COLLATE utf8mb4_unicode_ci DEFAULT 'en_progreso',
  `motivo_rechazo` text COLLATE utf8mb4_unicode_ci,
  `tiempo_extra_segundos` int DEFAULT '0' COMMENT 'Segundos extra otorgados por el profesor',
  `ultima_actividad` datetime DEFAULT NULL COMMENT 'Último heartbeat del alumno',
  `pregunta_actual` int DEFAULT '0' COMMENT 'Índice de la pregunta que está respondiendo',
  `salidas_detectadas` int DEFAULT '0' COMMENT 'Cuántas veces salió de la página',
  `pendiente_autorizacion` tinyint(1) NOT NULL DEFAULT '0',
  `motivo_cierre` enum('normal','salida_pagina','tiempo_agotado','cierre_docente','abandono') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cerrada_en` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_evaluacion_alumno_intento` (`evaluacion_id`,`alumno_id`,`intento`),
  KEY `idx_eval_alumno_alumno` (`alumno_id`),
  KEY `idx_rendiciones_en_curso` (`evaluacion_id`,`estado`,`ultima_actividad`),
  CONSTRAINT `fk_eval_alumno_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_eval_alumno_evaluacion` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `rendiciones_chk_1` CHECK (((`nota` is null) or (`nota` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=144 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reportes_contenido`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reportes_contenido` (
  `id` int NOT NULL AUTO_INCREMENT,
  `mensaje_id` int NOT NULL,
  `reportado_por` int DEFAULT NULL,
  `motivo` enum('spam','ofensivo','fuera_de_tema','otro') COLLATE utf8mb4_unicode_ci NOT NULL,
  `detalle` text COLLATE utf8mb4_unicode_ci,
  `detectado_por` enum('usuario','bot') COLLATE utf8mb4_unicode_ci DEFAULT 'usuario',
  `estado` enum('pendiente','revisado','eliminado','ignorado') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `resuelto_por` int DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_reporte_usuario` (`reportado_por`),
  KEY `fk_reporte_resolutor` (`resuelto_por`),
  KEY `idx_reportes_estado` (`estado`),
  KEY `idx_reportes_mensaje` (`mensaje_id`),
  CONSTRAINT `fk_reporte_mensaje` FOREIGN KEY (`mensaje_id`) REFERENCES `publicaciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_reporte_resolutor` FOREIGN KEY (`resuelto_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_reporte_usuario` FOREIGN KEY (`reportado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `respuestas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `respuestas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evaluacion_alumno_id` int NOT NULL,
  `evaluacion_pregunta_id` int NOT NULL,
  `evaluacion_id` int NOT NULL,
  `respuesta` text COLLATE utf8mb4_unicode_ci,
  `correccion_ia` text COLLATE utf8mb4_unicode_ci,
  `nota` decimal(4,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_respuesta` (`evaluacion_alumno_id`,`evaluacion_pregunta_id`),
  KEY `idx_respuestas_eval_alumno` (`evaluacion_alumno_id`),
  KEY `idx_respuestas_pregunta` (`evaluacion_pregunta_id`),
  KEY `idx_respuestas_evaluacion` (`evaluacion_id`),
  CONSTRAINT `fk_respuesta_eval_alumno` FOREIGN KEY (`evaluacion_alumno_id`) REFERENCES `rendiciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_respuesta_evaluacion` FOREIGN KEY (`evaluacion_id`) REFERENCES `evaluaciones` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_respuesta_pregunta` FOREIGN KEY (`evaluacion_pregunta_id`) REFERENCES `preguntas_evaluacion` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `respuestas_chk_1` CHECK (((`nota` is null) or (`nota` >= 0)))
) ENGINE=InnoDB AUTO_INCREMENT=279 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `rol_permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rol_permisos` (
  `rol_id` int NOT NULL,
  `permiso_id` int NOT NULL,
  PRIMARY KEY (`rol_id`,`permiso_id`),
  KEY `fk_rp_permiso` (`permiso_id`),
  CONSTRAINT `fk_rp_permiso` FOREIGN KEY (`permiso_id`) REFERENCES `permisos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_rp_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `es_sistema` tinyint(1) DEFAULT '0',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sesiones_clase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesiones_clase` (
  `id` int NOT NULL AUTO_INCREMENT,
  `materia_id` int NOT NULL,
  `docente_id` int NOT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha` date NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `aula` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('teorica','practica','laboratorio','examen') COLLATE utf8mb4_unicode_ci DEFAULT 'teorica',
  `observaciones` text COLLATE utf8mb4_unicode_ci,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_sesion` (`materia_id`,`fecha`,`hora_inicio`),
  KEY `idx_sesion_fecha` (`fecha`),
  KEY `idx_sesion_materia` (`materia_id`),
  KEY `fk_sesiones_docente` (`docente_id`),
  CONSTRAINT `fk_sesiones_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sesiones_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `sesiones_clase_chk_1` CHECK ((`hora_fin` > `hora_inicio`))
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sesiones_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sesiones_usuarios` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `usuario_id` int NOT NULL,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dispositivo` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `ultima_actividad` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime NOT NULL,
  `revocada` tinyint(1) DEFAULT '0',
  `motivo_revocacion` enum('logout','cambio_password','admin_revoke','expirada','sospechosa') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_revocacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_sesiones_usuario` (`usuario_id`),
  KEY `idx_sesiones_hash` (`token_hash`),
  KEY `idx_sesiones_activa` (`revocada`,`fecha_expiracion`),
  CONSTRAINT `fk_sesion_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=580 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `solicitudes_matricula`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `solicitudes_matricula` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `materia_id` int NOT NULL,
  `estado` enum('pendiente','aprobada','rechazada') COLLATE utf8mb4_unicode_ci DEFAULT 'pendiente',
  `mensaje` text COLLATE utf8mb4_unicode_ci,
  `respuesta` text COLLATE utf8mb4_unicode_ci,
  `aprobado_por` int DEFAULT NULL,
  `fecha_solicitud` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_respuesta` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_solicitud` (`alumno_id`,`materia_id`),
  KEY `fk_solicitud_aprobador` (`aprobado_por`),
  KEY `idx_solicitud_estado` (`estado`),
  KEY `idx_solicitud_materia` (`materia_id`),
  CONSTRAINT `fk_solicitud_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitud_aprobador` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_solicitud_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=212 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subgrupo_alumnos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subgrupo_alumnos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `subgrupo_id` int NOT NULL,
  `alumno_id` int NOT NULL,
  `rol` enum('integrante','lider') COLLATE utf8mb4_unicode_ci DEFAULT 'integrante',
  `fecha_union` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subgrupo_alumno` (`subgrupo_id`,`alumno_id`),
  KEY `idx_sa_subgrupo` (`subgrupo_id`),
  KEY `idx_sa_alumno` (`alumno_id`),
  CONSTRAINT `fk_sa_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_sa_subgrupo` FOREIGN KEY (`subgrupo_id`) REFERENCES `subgrupos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `subgrupos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subgrupos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `grupo_id` int NOT NULL,
  `materia_id` int DEFAULT NULL,
  `tarea_id` int DEFAULT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `tipo_creacion` enum('autogestion','aleatorio','docente') COLLATE utf8mb4_unicode_ci NOT NULL,
  `max_integrantes` int DEFAULT '5',
  `min_integrantes` int DEFAULT '2',
  `creado_por` int NOT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_subgrupo_creador` (`creado_por`),
  KEY `idx_subgrupo_grupo` (`grupo_id`),
  KEY `idx_subgrupo_materia` (`materia_id`),
  KEY `idx_subgrupo_tarea` (`tarea_id`),
  CONSTRAINT `fk_subgrupo_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_subgrupo_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_subgrupo_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_subgrupo_tarea` FOREIGN KEY (`tarea_id`) REFERENCES `tareas` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `subgrupos_chk_1` CHECK ((`min_integrantes` >= 2)),
  CONSTRAINT `subgrupos_chk_2` CHECK ((`max_integrantes` >= `min_integrantes`))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tareas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tareas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci,
  `materia_id` int DEFAULT NULL,
  `asignada_por` int NOT NULL,
  `fecha_publicacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `fecha_entrega` datetime NOT NULL,
  `fecha_cierre` datetime DEFAULT NULL,
  `estado` enum('borrador','publicada','cerrada') COLLATE utf8mb4_unicode_ci DEFAULT 'borrador',
  `ponderacion` decimal(4,2) DEFAULT '1.00',
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#42b883',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `acepta_tardias` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_tarea_usuario` (`asignada_por`),
  KEY `idx_tareas_materia` (`materia_id`),
  KEY `idx_tareas_fecha` (`fecha_entrega`),
  CONSTRAINT `fk_tarea_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_tarea_usuario` FOREIGN KEY (`asignada_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `tareas_chk_1` CHECK ((`fecha_entrega` >= `fecha_publicacion`))
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tickets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets` (
  `id` int NOT NULL AUTO_INCREMENT,
  `alumno_id` int NOT NULL,
  `destinatario` enum('docente','admin') NOT NULL,
  `docente_id` int DEFAULT NULL,
  `materia_id` int DEFAULT NULL,
  `asunto` varchar(200) NOT NULL,
  `descripcion` text NOT NULL,
  `estado` enum('abierto','en_proceso','resuelto','cerrado') NOT NULL DEFAULT 'abierto',
  `prioridad` enum('baja','media','alta') NOT NULL DEFAULT 'media',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ticket_alumno` (`alumno_id`),
  KEY `idx_ticket_destinatario` (`destinatario`,`estado`),
  KEY `idx_ticket_docente` (`docente_id`),
  KEY `idx_ticket_estado` (`estado`),
  KEY `fk_tickets_materia` (`materia_id`),
  CONSTRAINT `fk_tickets_alumno` FOREIGN KEY (`alumno_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tickets_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tickets_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tickets_respuestas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tickets_respuestas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `ticket_id` int NOT NULL,
  `autor_id` int NOT NULL,
  `autor_tipo` enum('alumno','docente','coordinador','admin') NOT NULL,
  `mensaje` text NOT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `autor_id` (`autor_id`),
  KEY `idx_respuesta_ticket` (`ticket_id`),
  CONSTRAINT `tickets_respuestas_ibfk_1` FOREIGN KEY (`ticket_id`) REFERENCES `tickets` (`id`) ON DELETE CASCADE,
  CONSTRAINT `tickets_respuestas_ibfk_2` FOREIGN KEY (`autor_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `tokens_revocados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens_revocados` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `token_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario_id` int DEFAULT NULL,
  `fecha_expiracion` datetime NOT NULL,
  `motivo` enum('logout','cambio_password','admin_revoke','expirada','sospechosa') COLLATE utf8mb4_unicode_ci DEFAULT 'logout',
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token_hash` (`token_hash`),
  KEY `fk_sesion_inv_usuario` (`usuario_id`),
  KEY `idx_sesiones_inv_hash` (`token_hash`),
  KEY `idx_sesiones_inv_expira` (`fecha_expiracion`),
  CONSTRAINT `fk_sesion_inv_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuario_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario_roles` (
  `usuario_id` int NOT NULL,
  `rol_id` int NOT NULL,
  `asignado_por` int DEFAULT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`usuario_id`,`rol_id`),
  KEY `fk_ur_rol` (`rol_id`),
  KEY `fk_ur_asignador` (`asignado_por`),
  CONSTRAINT `fk_ur_asignador` FOREIGN KEY (`asignado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `fk_ur_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_ur_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellido` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cedula` varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verificado` tinyint(1) DEFAULT '0',
  `contrasena` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tipo` enum('alumno','docente','coordinador','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'alumno',
  `tipo_coordinacion` enum('ninguno','carrera','pasantia','general') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ninguno',
  `estado` enum('pendiente','aprobado','rechazado') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente',
  `aprobado_por` int DEFAULT NULL,
  `fecha_aprobacion` datetime DEFAULT NULL,
  `intentos_fallidos` int DEFAULT '0',
  `bloqueado_hasta` datetime DEFAULT NULL,
  `ultimo_login` datetime DEFAULT NULL,
  `activo` tinyint(1) DEFAULT '1',
  `debe_cambiar_pass` tinyint(1) DEFAULT '0',
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `solo_un_admin` varchar(10) COLLATE utf8mb4_unicode_ci GENERATED ALWAYS AS ((case when (`tipo` = _utf8mb4'admin') then _latin1'ADMIN' else NULL end)) STORED,
  `preferencias` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `cedula` (`cedula`),
  UNIQUE KEY `uq_usuarios_solo_un_admin` (`solo_un_admin`),
  KEY `fk_usuario_aprobador` (`aprobado_por`),
  KEY `idx_usuarios_tipo` (`tipo`),
  KEY `idx_usuarios_estado` (`estado`),
  KEY `idx_usuarios_email_verificado` (`email_verificado`),
  KEY `idx_usuarios_tipo_coord` (`tipo_coordinacion`),
  CONSTRAINT `fk_usuario_aprobador` FOREIGN KEY (`aprobado_por`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `verificaciones_codigo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `verificaciones_codigo` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `codigo_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `ip` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `usado` tinyint(1) DEFAULT '0',
  `expira_en` datetime NOT NULL,
  `creado_en` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_email` (`email`),
  KEY `idx_expira` (`expira_en`)
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `votos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `votos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `eleccion_id` int NOT NULL,
  `votante_id` int NOT NULL,
  `candidato_id` int NOT NULL,
  `tipo` enum('principal','subdelegado') COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_voto` (`eleccion_id`,`votante_id`,`tipo`),
  KEY `fk_voto_votante` (`votante_id`),
  KEY `idx_voto_eleccion` (`eleccion_id`),
  KEY `idx_voto_candidato` (`candidato_id`),
  CONSTRAINT `fk_voto_candidato` FOREIGN KEY (`candidato_id`) REFERENCES `candidatos` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_voto_eleccion` FOREIGN KEY (`eleccion_id`) REFERENCES `elecciones` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_voto_votante` FOREIGN KEY (`votante_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=59 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

CREATE TABLE `docentes_grupos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `docente_id` int NOT NULL,
  `grupo_id` int NOT NULL,
  `materia_id` int NOT NULL,
  `asignado_por` int NOT NULL,
  `tipo_asignador` enum('admin','coordinador') NOT NULL,
  `fecha_asignacion` datetime DEFAULT CURRENT_TIMESTAMP,
  `activo` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_docente_grupo_materia` (`docente_id`,`grupo_id`,`materia_id`),
  KEY `idx_dg_docente` (`docente_id`),
  KEY `idx_dg_grupo` (`grupo_id`),
  KEY `idx_dg_materia` (`materia_id`),
  CONSTRAINT `fk_dg_docente` FOREIGN KEY (`docente_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dg_grupo` FOREIGN KEY (`grupo_id`) REFERENCES `grupos_principales` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dg_materia` FOREIGN KEY (`materia_id`) REFERENCES `materias` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_dg_asignador` FOREIGN KEY (`asignado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

