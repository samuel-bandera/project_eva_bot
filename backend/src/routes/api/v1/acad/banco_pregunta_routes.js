
import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/banco_pregunta_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',                    ctrl.listar);
router.get('/estadisticas/:materiaId', ctrl.estadisticas);
router.get('/:id',                 ctrl.obtener);
router.post('/',        requiereTipo('docente', 'admin'), ctrl.crear);
router.patch('/:id',    requiereTipo('docente', 'admin'), ctrl.actualizar);
router.delete('/:id',   requiereTipo('docente', 'admin'), ctrl.desactivar);

export default router;

