
import { Router } from 'express';
import * as ctrl from '../../../../controllers/comm/foro_controller.js';
import { requiereAuth, requiereTipo, requierePermiso } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/reportes',              requierePermiso('foro.moderar'), ctrl.listarReportes);
router.put('/reportes/:id/resolver', requierePermiso('foro.moderar'), ctrl.resolverReporte);

router.get('/',                  ctrl.listar);
router.get('/:id/respuestas',    ctrl.verRespuestas);
router.get('/:id',               ctrl.obtener);
router.post('/',                 requiereTipo('docente', 'admin', 'coordinador'), ctrl.crear);
router.patch('/:id',             ctrl.actualizar);
router.delete('/:id',            ctrl.eliminar);
router.put('/:id/fijar',         requiereTipo('docente', 'admin'), ctrl.fijar);
router.put('/:id/cerrar',        requiereTipo('docente', 'admin'), ctrl.cerrar);
router.post('/:id/reportar',     ctrl.reportar);

export default router;

