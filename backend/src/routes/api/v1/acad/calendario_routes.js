
import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/calendario_controller.js';
import { requiereAuth } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',          ctrl.listar);
router.get('/proximos',  ctrl.proximos);
router.get('/completo',   ctrl.listarCompleto);
router.get('/:id',       ctrl.obtener);
router.post('/',         ctrl.crear);
router.patch('/:id',     ctrl.actualizar);
router.delete('/:id',    ctrl.eliminar);

export default router;

