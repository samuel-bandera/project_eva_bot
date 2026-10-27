
import { Router } from 'express';
import * as ctrl from '../../../../controllers/admin/matricula_controller.js';
import * as ctrlSolicitudes from '../../../../controllers/admin/matricula_solicitudes_controller.js';
import { requiereAuth, requiereTipo, requierePermiso } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',                  requiereTipo('admin', 'coordinador'), ctrl.listarTodas);
router.get('/todas',             requiereTipo('admin', 'coordinador'), ctrl.listarTodas);
router.get('/solicitudes/todas', requiereTipo('admin', 'coordinador'), ctrl.listarTodasLasSolicitudes);

router.get('/mis-matriculas',    requiereTipo('alumno'), ctrl.listarMisMatriculas);
router.get('/mis-solicitudes',   requiereTipo('alumno'), ctrl.listarMisSolicitudes);
router.post('/solicitar',        requiereTipo('alumno'), ctrlSolicitudes.solicitar);

router.get('/solicitudes-para-mi', requiereTipo('docente'), ctrl.listarSolicitudesParaMi);
router.get('/materia/:materiaId',  requiereTipo('docente', 'admin', 'coordinador'), ctrl.listarMatriculasDeMateria);

router.post('/solicitudes/:id/resolver', requiereTipo('docente', 'admin', 'coordinador'), ctrlSolicitudes.resolverSolicitud);

router.post('/masivo', requierePermiso('grupos.editar'), ctrl.matricularMasivo);

router.delete('/:id', ctrl.cancelar);

router.patch('/:id/nota-final', requiereTipo('docente','admin','coordinador'), ctrl.actualizarNotaFinal);

export default router;

