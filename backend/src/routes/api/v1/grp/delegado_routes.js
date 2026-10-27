
import { Router } from 'express';
import * as ctrl from '../../../../controllers/grp/delegado_controller.js';
import { requiereAuth, requiereTipo, requierePermiso } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/mios',                       requiereTipo('alumno'), ctrl.misDelegados);
router.get('/grupo/:grupoId',             ctrl.listarDelegadosDeGrupo);
router.post('/delegados',                 requierePermiso('delegados.gestionar'), ctrl.crearDelegado);

router.get('/elecciones',                 ctrl.listarElecciones);
router.get('/elecciones/:id',             ctrl.obtenerEleccion);
router.get('/elecciones/:id/resultados',  ctrl.verResultados);
router.post('/elecciones',                requierePermiso('delegados.gestionar'), ctrl.crearEleccion);
router.put('/elecciones/:id/estado',      requierePermiso('delegados.gestionar'), ctrl.cambiarEstadoEleccion);
router.post('/elecciones/:id/postular',   requiereTipo('alumno'), ctrl.postular);
router.post('/elecciones/:id/votar',      requiereTipo('alumno'), ctrl.votar);

export default router;

