
import { Router } from 'express';
import * as ctrl from '../../../../controllers/comm/cartelera_controller.js';
import { uploadCartelera } from '../../../../middlewares/upload_middleware.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/',      ctrl.listar);
router.get('/:id',   ctrl.obtener);
router.post('/:id/like', ctrl.like);
router.post('/:id/comentar', ctrl.comentar);
router.get('/:id/comentarios', ctrl.listarComentarios);

router.post('/', uploadCartelera(),     requiereTipo('docente', 'admin', 'coordinador'), ctrl.crear);
router.patch('/:id', requiereTipo('docente', 'admin', 'coordinador'), ctrl.actualizar);
router.delete('/:id', requiereTipo('docente', 'admin', 'coordinador'), ctrl.eliminar);

export default router;

