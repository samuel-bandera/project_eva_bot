
import { Router } from 'express';
import * as ctrl from '../../../../controllers/comm/comunicado_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',            ctrl.listar);
router.get('/:id',         ctrl.obtener);
router.post('/',           requiereTipo('docente', 'admin', 'coordinador'), ctrl.crear);
router.post('/:id/confirmar', ctrl.confirmar);
router.delete('/:id',      requiereTipo('docente', 'admin', 'coordinador'), ctrl.eliminar);

export default router;

