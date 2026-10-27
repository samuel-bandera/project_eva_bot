
import { Router } from 'express';
import nokyRoutes from './api/v1/noky_routes.js';

import authRoutes           from './api/v1/auth/auth_routes.js';
import usuarioRoutes        from './api/v1/admin/usuario_routes.js';
import materiaRoutes        from './api/v1/acad/materia_routes.js';
import matriculaRoutes      from './api/v1/admin/matricula_routes.js';
import evaluacionRoutes     from './api/v1/acad/evaluacion_routes.js';
import tareaRoutes          from './api/v1/acad/tarea_routes.js';
import asistenciaRoutes     from './api/v1/acad/asistencia_routes.js';
import notificacionRoutes   from './api/v1/comm/notificacion_routes.js';
import cicloRoutes          from './api/v1/admin/ciclo_routes.js';
import grupoRoutes          from './api/v1/grp/grupo_routes.js';
import bancoPreguntaRoutes  from './api/v1/acad/banco_pregunta_routes.js';
import archivoRoutes        from './api/v1/acad/archivo_routes.js';
import materialRoutes       from './api/v1/acad/material_routes.js';
import entregaCodigoRoutes  from './api/v1/admin/entrega_codigo_routes.js';
import calendarioRoutes     from './api/v1/acad/calendario_routes.js';
import carteleraRoutes      from './api/v1/comm/cartelera_routes.js';
import comunicadoRoutes     from './api/v1/comm/comunicado_routes.js';
import foroRoutes           from './api/v1/comm/foro_routes.js';
import subgrupoRoutes       from './api/v1/grp/subgrupo_routes.js';
import delegadoRoutes       from './api/v1/grp/delegado_routes.js';
import logRoutes            from './api/v1/admin/log_routes.js';
import emailRoutes          from './api/v1/auth/email_routes.js';
import ticketRoutes         from './api/v1/comm/ticket_routes.js';
import carreraRoutes        from './api/v1/acad/carrera_routes.js';
import comunicadoCoordRoutes from './api/v1/comm/comunicado_coordinacion_routes.js';
import iaRoutes             from './api/v1/acad/ia_routes.js';
import evaluacionExtrasRoutes from './api/v1/acad/evaluacion_extras_routes.js';
import testPublicRoutes from './api/v1/test_public_routes.js';

const router = Router();

router.use('/auth',            authRoutes);
router.use('/usuarios',        usuarioRoutes);
router.use('/ciclos',          cicloRoutes);
router.use('/grupos',          grupoRoutes);
router.use('/materias',        materiaRoutes);
router.use('/matriculas',      matriculaRoutes);
router.use('/banco-preguntas', bancoPreguntaRoutes);
router.use('/evaluaciones',    evaluacionRoutes);
router.use('/tareas',          tareaRoutes);
router.use('/entregas-codigo', entregaCodigoRoutes);
router.use('/asistencia',      asistenciaRoutes);
router.use('/archivos',        archivoRoutes);
router.use('/materiales',      materialRoutes);
router.use('/notificaciones',  notificacionRoutes);
router.use('/calendario',      calendarioRoutes);
router.use('/cartelera',       carteleraRoutes);


router.post('/test-public/notificacion', async (req, res) => {
  try {
    const { emitirNotificacion } = await import('../services/socket_service.js');
    const { pool } = await import('../config/db.js');
    const { usuarioId, titulo, mensaje } = req.body;
    const [users] = await pool.query("SELECT id, usuario FROM usuarios WHERE id = ?", [usuarioId]);
    if (!users.length) return res.status(404).json({ ok: false });
    emitirNotificacion(usuarioId, {
      id: Date.now(),
      titulo: titulo || 'Prueba',
      mensaje: mensaje || 'Notificación en vivo',
      leida: false,
      fecha: new Date().toISOString()
    });
    res.json({ ok: true, usuario: users[0].usuario });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

router.use('/test', testPublicRoutes);
router.use('/noky', nokyRoutes);
router.use('/comunicados',     comunicadoRoutes);
router.use('/foro',            foroRoutes);
router.use('/subgrupos',       subgrupoRoutes);
router.use('/delegados',       delegadoRoutes);
router.use('/logs',            logRoutes);
router.use('/email',           emailRoutes);
router.use('/tickets',         ticketRoutes);
router.use('/carreras',        carreraRoutes);
router.use('/comunicados-coordinacion', comunicadoCoordRoutes);

router.use('/ia',              iaRoutes);

router.use('/evaluaciones/extras', evaluacionExtrasRoutes);

export default router;

