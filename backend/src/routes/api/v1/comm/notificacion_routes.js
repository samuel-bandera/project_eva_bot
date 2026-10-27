
import { Router } from 'express';
import * as ctrl from '../../../../controllers/comm/notificacion_controller.js';
import { requiereAuth } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',                 ctrl.listar);
router.get('/no-leidas/count',  ctrl.contarNoLeidas);
router.put('/:id/leer',         ctrl.marcarLeida);
router.put('/leer-todas',       ctrl.marcarTodasLeidas);
router.delete('/:id',           ctrl.eliminar);

export default router;

