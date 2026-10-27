
import { Router } from 'express';
import * as ctrl from '../../../../controllers/auth/email_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);
router.use(requiereTipo('admin'));

router.get('/pendientes',    ctrl.listarPendientes);
router.get('/estadisticas',  ctrl.estadisticas);

export default router;

