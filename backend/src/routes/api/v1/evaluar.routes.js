import { Router } from 'express';
import * as evaluarController from '../../../controllers/evaluar.controller.js';
import { authRequired, requireRole } from '../../../middlewares/auth.middleware.js';

const router = Router();

// Listar evaluaciones
router.get('/', authRequired, evaluarController.listar);

// Crear evaluación (solo profesor)
router.post('/', authRequired, requireRole('profesor'), evaluarController.crear);

// Ver detalle
router.get('/:id', authRequired, evaluarController.detalle);

// Responder una evaluación (solo alumno)
router.post('/:id/responder', authRequired, requireRole('alumno'), evaluarController.responder);

// Ver rendiciones (solo profesor)
router.get('/:id/rendiciones', authRequired, requireRole('profesor'), evaluarController.rendiciones);

export default router;