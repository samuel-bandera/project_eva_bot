
import { Router } from 'express';
import * as ctrl from '../../../../controllers/admin/usuario_controller.js';
import { requiereAuth, requiereTipo, requierePermiso } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);


router.get('/preferencias', ctrl.obtenerPreferencias);
router.patch('/preferencias', ctrl.actualizarPreferencias);

registrarValidacionParams(router);

router.get('/buscar-alumnos', requiereTipo('docente', 'admin', 'coordinador'), ctrl.buscarAlumnos);

router.get('/',          requiereTipo('admin', 'coordinador'), ctrl.listar);
router.get('/pendientes', requierePermiso('usuarios.aprobar'), ctrl.listarPendientes);

router.get('/:id',       requiereTipo('admin', 'coordinador'), ctrl.obtener);
router.get('/:id/roles', requiereTipo('admin', 'coordinador'), ctrl.listarRoles);

router.post('/:usuarioId/aprobar',  requierePermiso('usuarios.aprobar'), ctrl.aprobar);
router.post('/:usuarioId/rechazar', requierePermiso('usuarios.aprobar'), ctrl.rechazar);

router.post('/roles/asignar', requiereTipo('admin'), ctrl.asignarRol);
router.post('/roles/quitar',  requiereTipo('admin'), ctrl.quitarRol);

router.patch('/:id', requiereTipo('admin', 'coordinador'), ctrl.actualizar);

router.post('/:id/reset-password', requiereTipo('admin'), ctrl.resetearPassword);

export default router;

