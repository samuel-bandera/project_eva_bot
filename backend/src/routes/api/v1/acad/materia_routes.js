
import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/materia_controller.js';
import * as calCtrl from '../../../../controllers/acad/materia_calificaciones_controller.js';
import { requiereAuth, requiereTipo, requierePermiso } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';
import { validarIdParam } from '../../../../utils/params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',              ctrl.listar);
router.get('/publicas',      ctrl.listarPublicas);
router.get('/solicitables',  requiereTipo('alumno'), ctrl.listarSolicitables);
router.get('/mias',          requiereTipo('docente'), ctrl.listarMias);
router.get('/mis-materias',  requiereTipo('alumno'), ctrl.listarMisMateriasAlumno);
router.get('/profesor/:profesorId', validarIdParam('profesorId'), ctrl.listarDeProfesor);
router.get('/codigo/:codigo', ctrl.buscarPorCodigoInscripcion);

router.get('/:id/mis-calificaciones', requiereTipo('alumno'), calCtrl.misCalificacionesDeMateria);
router.patch('/:id/nota-aprobacion', requiereTipo('docente','admin','coordinador'), calCtrl.actualizarNotaAprobacion);
router.get('/:id/alumnos-con-notas', requiereTipo('docente','admin','coordinador'), calCtrl.listarAlumnosConNotas);
router.post('/unirse', requiereTipo('alumno'), ctrl.unirsePorCodigo);

router.get('/:id', validarIdParam('id'), ctrl.obtener);

router.post('/',     requierePermiso('materias.crear'),    ctrl.crear);
router.patch('/:id', validarIdParam('id'), requierePermiso('materias.editar'),   ctrl.actualizar);
router.delete('/:id', validarIdParam('id'), requierePermiso('materias.eliminar'), ctrl.desactivar);

router.post('/:id/profesores',
  validarIdParam('id'),
  requierePermiso('materias.editar'),
  ctrl.asignarProfesor);

router.delete('/:id/profesores/:profesorId',
  validarIdParam('id'),
  validarIdParam('profesorId'),
  requierePermiso('materias.editar'),
  ctrl.quitarProfesor);

router.post('/:id/alumnos',
  validarIdParam('id'),
  requiereTipo('docente', 'admin', 'coordinador'),
  ctrl.agregarAlumno);

router.put('/:id/pesos_calificacion',
  validarIdParam('id'),
  requierePermiso('materias.editar'),
  calCtrl.guardarPonderaciones);

export default router;

