
import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/archivo_controller.js';
import { requiereAuth} from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';
import { uploadEntrega } from '../../../../middlewares/upload_middleware.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.post('/subir',         uploadEntrega, ctrl.subir);
router.get('/entidad',        ctrl.listarDeEntidad);
router.get('/:id',            ctrl.obtener);
router.get('/:id/descargar',  ctrl.descargar);
router.delete('/:id',         ctrl.eliminar);

export default router;

