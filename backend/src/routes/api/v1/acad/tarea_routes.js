
import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/tarea_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/profesor/mias', requiereTipo('docente'), ctrl.listarDeProfesor);
router.get('/alumno/mias',   requiereTipo('alumno'),   ctrl.listarDeAlumno);
router.get('/materia/:materiaId', ctrl.listarDeMateria);

router.post('/',            requiereTipo('docente'), ctrl.crear);
router.get('/:id',          ctrl.obtener);
router.patch('/:id/estado', requiereTipo('docente', 'admin'), ctrl.cambiarEstado);
router.delete('/:id',       requiereTipo('docente', 'admin'), ctrl.eliminar);

export default router;

