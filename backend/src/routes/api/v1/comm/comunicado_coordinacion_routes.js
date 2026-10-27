import { Router } from 'express';
import * as ctrl from '../../../../controllers/comm/comunicado_coordinacion_controller.js';
import { uploadComunicado } from '../../../../middlewares/upload_middleware.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';

const router = Router();
router.use(requiereAuth);
router.use(requiereTipo('admin', 'coordinador'));

router.get('/recibidos', ctrl.recibidos);
router.get('/enviados', ctrl.enviados);
router.post('/', uploadComunicado(), ctrl.crear);
router.post('/:id/leido', ctrl.marcarLeido);

export default router;
