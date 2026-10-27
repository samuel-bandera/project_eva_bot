
import { Router } from 'express';
import * as ctrl from '../../../../controllers/grp/grupo_controller.js';
import { requiereAuth, requierePermiso } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',           ctrl.listar);
router.get('/mios',       ctrl.misGrupos);
router.get('/por-materia/:materiaId', ctrl.listarPorMateria);
router.get('/sugerir-codigo/:carreraId', requierePermiso('grupos.crear'), ctrl.sugerirCodigo);
router.get('/:id',        ctrl.obtener);
router.post('/',          requierePermiso('grupos.crear'),    ctrl.crear);
router.patch('/:id',      requierePermiso('grupos.editar'),   ctrl.actualizar);
router.post('/:id/alumnos',                 requierePermiso('grupos.editar'), ctrl.agregarAlumno);
router.delete('/:id/alumnos/:alumnoId',     requierePermiso('grupos.editar'), ctrl.quitarAlumno);
router.get('/:id/docentes',                      requierePermiso('grupos.editar'), ctrl.listarDocentesDeGrupo);
router.post('/:id/docentes',                     requierePermiso('grupos.editar'), ctrl.asignarDocenteAGrupo);
router.delete('/:id/docentes/:asignacionId',     requierePermiso('grupos.editar'), ctrl.desasignarDocenteDeGrupo);

export default router;

