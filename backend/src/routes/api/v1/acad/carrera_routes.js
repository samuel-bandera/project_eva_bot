import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/carrera_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';

const router = Router();
router.use(requiereAuth);
router.use(requiereTipo('admin', 'coordinador'));

router.get('/', ctrl.listar);
router.get('/:id', ctrl.obtener);
router.get('/:id/materias', ctrl.materias);
router.get('/:id/docentes', ctrl.docentes);
router.get('/:id/alumnos', ctrl.alumnos);

export default router;
