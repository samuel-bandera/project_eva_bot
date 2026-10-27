import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/evaluacion_extras_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';

const router = Router();
router.use(requiereAuth);

router.post('/preview-modelos',  requiereTipo('docente', 'admin'), ctrl.previewModelos);
router.get('/plantilla/:formato', ctrl.descargarPlantilla);
router.put('/:id/cantidad-modelos', requiereTipo('docente', 'admin'), ctrl.setCantidadModelos);
router.get('/:id/pdf',           requiereTipo('docente', 'admin'), ctrl.exportarPDF);

export default router;
