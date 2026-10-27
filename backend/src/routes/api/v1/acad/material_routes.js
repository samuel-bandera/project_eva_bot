import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/material_controller.js';
import { requiereAuth } from '../../../../middlewares/auth_middleware.js';

const router = Router();
router.use(requiereAuth);


router.get('/mis-materiales', ctrl.misMateriales);
router.get('/', ctrl.listar);


router.get('/:id/descargar', ctrl.descargarMaterial);
router.get('/:id', ctrl.obtener);

export default router;
