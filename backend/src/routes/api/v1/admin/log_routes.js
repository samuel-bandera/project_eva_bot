
import { Router } from 'express';
import * as ctrl from '../../../../controllers/admin/log_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);
router.use(requiereTipo('admin', 'coordinador'));

router.get('/eventos',           ctrl.listarEventos);
router.put('/eventos/:id/resolver', ctrl.resolverEvento);
router.get('/auditoria',         ctrl.listarAuditoria);

export default router;

