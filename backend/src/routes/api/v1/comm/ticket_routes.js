import { Router } from 'express';
import * as ctrl from '../../../../controllers/comm/ticket_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';

const router = Router();
router.use(requiereAuth);

router.post('/', requiereTipo('alumno'), ctrl.crear);
router.get('/mios', requiereTipo('alumno'), ctrl.listarMios);
router.get('/para-mi', requiereTipo('docente', 'admin', 'coordinador'), ctrl.listarParaMi);
router.get('/todos', requiereTipo('admin', 'coordinador'), ctrl.listarTodos);
router.get('/stats', requiereTipo('admin', 'coordinador'), ctrl.estadisticas);
router.get('/profesores', ctrl.profesoresDisponibles);
router.get('/:id', ctrl.obtener);
router.post('/:id/responder', ctrl.responder);
router.patch('/:id/estado', requiereTipo('docente', 'admin', 'coordinador'), ctrl.cambiarEstado);

export default router;
