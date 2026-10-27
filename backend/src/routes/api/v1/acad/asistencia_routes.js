
import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/asistencia_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';
import { uploadJustificacion } from '../../../../middlewares/upload_middleware.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/mis-registros', requiereTipo('alumno'), ctrl.listarMiAsistencia);
router.get('/mi-resumen',    requiereTipo('alumno'), ctrl.resumenMiAsistencia);
router.get('/mis-faltas',    requiereTipo('alumno'), ctrl.listarMisFaltas);

router.post('/registrar',         requiereTipo('docente'), ctrl.registrar);
router.post('/registrar-masiva',  requiereTipo('docente'), ctrl.registrarMasiva);
router.post('/faltas',            requiereTipo('docente'), ctrl.registrarFalta);
router.put('/faltas/:id/justificar', requiereTipo('docente', 'admin'), ctrl.justificarFalta);
router.get('/faltas/materia/:materiaId', requiereTipo('docente', 'admin'), ctrl.listarFaltasDeMateria);
router.post('/faltas/:id/documento', requiereTipo('docente', 'admin'), uploadJustificacion(), ctrl.subirDocumentoJustificacion);

router.get('/grupos/:materiaId',              requiereTipo('docente'), ctrl.listarGruposDeMateria);
router.get('/grupos/:grupoId/alumnos',        requiereTipo('docente'), ctrl.listarAlumnosDeGrupo);
router.get('/sesiones/materia/:materiaId',    ctrl.listarSesionesDeMateria);
router.post('/sesiones',                   requiereTipo('admin', 'coordinador'), ctrl.crearSesion);

export default router;

