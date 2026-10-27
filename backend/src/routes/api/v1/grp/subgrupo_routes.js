
import { Router } from 'express';
import * as ctrl from '../../../../controllers/grp/subgrupo_controller.js';
import { requiereAuth, requiereTipo, requierePermiso } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.put('/entregas/:entregaId/calificar', requiereTipo('docente', 'admin'), ctrl.calificarEntregaGrupal);

router.get('/',     ctrl.listar);
router.get('/:id',  ctrl.obtener);
router.post('/',    requierePermiso('subgrupos.crear'), ctrl.crear);
router.patch('/:id', requierePermiso('subgrupos.crear'), ctrl.actualizar);
router.post('/:id/integrantes',             requiereTipo('docente', 'admin'), ctrl.agregarIntegrante);
router.delete('/:id/integrantes/:alumnoId', requiereTipo('docente', 'admin'), ctrl.quitarIntegrante);
router.post('/:id/entregas',                requiereTipo('docente', 'admin'), ctrl.crearEntregaGrupal);

export default router;

