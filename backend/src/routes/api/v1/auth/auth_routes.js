
import { Router } from 'express';
import * as authController from '../../../../controllers/auth/auth_controller.js';
import * as registroController from '../../../../controllers/auth/auth_registro_controller.js';
import * as codigosController from '../../../../controllers/auth/auth_codigos_controller.js';
import { requiereAuth } from '../../../../middlewares/auth_middleware.js';
import { uploadAvatar } from '../../../../middlewares/upload_middleware.js';

const router = Router();

router.post('/registro', registroController.registrar);
router.post('/login',    authController.login);
router.post('/logout',   requiereAuth, authController.logout);
router.get('/perfil',            requiereAuth, authController.perfil);
router.patch('/perfil',          requiereAuth, authController.actualizarPerfil);
router.post('/cambiar-password', requiereAuth, authController.cambiarPassword);
router.post('/avatar',           requiereAuth, uploadAvatar(), authController.subirAvatar);

router.post('/solicitar-codigo', codigosController.solicitarCodigoVerificacion);
router.post('/resetear-password', codigosController.resetearPassword);
router.post('/verificar-codigo', codigosController.verificarCodigoEmail);

router.post('/codigos-profesor',          requiereAuth, codigosController.generarCodigoProfesor);
router.get('/codigos-profesor',           requiereAuth, codigosController.listarCodigosProfesor);
router.delete('/codigos-profesor/:id',    requiereAuth, codigosController.revocarCodigoProfesor);

export default router;


