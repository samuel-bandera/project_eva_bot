
import { Router } from 'express';
import * as ctrl from '../../../../controllers/admin/entrega_codigo_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';
import { uploadEntrega } from '../../../../middlewares/upload_middleware.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/mias',              requiereTipo('alumno'),   ctrl.listarMias);
router.get('/tarea/:tareaId',    requiereTipo('docente', 'admin'), ctrl.listarDeTarea);
router.get('/:id/descargar', ctrl.descargar);
router.get('/:id',               ctrl.obtener);
router.post('/',                 requiereTipo('alumno'), uploadEntrega(), ctrl.crear);
router.patch('/:id/estado',      requiereTipo('docente', 'admin'), ctrl.cambiarEstado);


export default router;

