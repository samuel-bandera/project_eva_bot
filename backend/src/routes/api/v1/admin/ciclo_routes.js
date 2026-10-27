
import { Router } from 'express';
import * as ctrl from '../../../../controllers/admin/ciclo_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',         ctrl.listar);
router.get('/activo',   ctrl.obtenerActivo);
router.get('/:id',      ctrl.obtener);
router.post('/',        requiereTipo('admin', 'coordinador'), ctrl.crear);
router.patch('/:id',    requiereTipo('admin', 'coordinador'), ctrl.actualizar);

export default router;

