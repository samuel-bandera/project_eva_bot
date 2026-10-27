
import { Router } from 'express';
import * as ctrl from '../../../../controllers/acad/evaluacion_controller.js';
import * as rendCtrl from '../../../../controllers/acad/evaluacion_rendicion_controller.js';
import * as monCtrl from '../../../../controllers/acad/evaluacion_monitoreo_controller.js';
import * as streamCtrl from '../../../../controllers/acad/evaluacion_stream_controller.js';
import * as corrCtrl from '../../../../controllers/acad/evaluacion_correccion_controller.js';
import * as genCtrl from '../../../../controllers/acad/evaluacion_generacion_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';
import { registrarValidacionParams } from '../../../../middlewares/validar_params.js';

const router = Router();

router.use(requiereAuth);
registrarValidacionParams(router);

router.get('/profesor/mias', requiereTipo('docente'), ctrl.listarDeProfesor);
router.get('/alumno/mias',   requiereTipo('alumno'),   ctrl.listarDeAlumno);

router.post('/generar-automatico',           requiereTipo('docente'), genCtrl.generarAutomatico);
router.post('/generar-automatico/confirmar', requiereTipo('docente'), genCtrl.confirmarGenerado);
router.get('/banco/estadisticas/:materiaId', requiereTipo('docente'), genCtrl.estadisticasBanco);

router.post('/:id/iniciar',                          requiereTipo('alumno'), rendCtrl.iniciar);
router.post('/rendiciones/:rendicionId/responder',   requiereTipo('alumno'), rendCtrl.responder);
router.post('/rendiciones/:rendicionId/enviar',      requiereTipo('alumno'), rendCtrl.enviar);
router.post('/rendiciones/:rendicionId/heartbeat',   requiereTipo('alumno'), monCtrl.heartbeat);
router.post('/rendiciones/:rendicionId/evento',      requiereTipo('alumno'), monCtrl.reportarEvento);

router.get('/:id/rendiciones',                       requiereTipo('docente', 'admin'), rendCtrl.listarRendiciones);
router.get('/rendiciones/:rendicionId/respuestas',   requiereTipo('docente', 'admin'), corrCtrl.verRespuestasDeRendicion);
router.get('/rendiciones/:rendicionId/mia',          requiereTipo('alumno'),          rendCtrl.verMiRendicion);
router.post('/rendiciones/:rendicionId/autorizar',  requiereTipo('docente', 'admin'), rendCtrl.autorizarContinuidad);
router.get('/rendiciones/pendientes-autorizacion',     requiereTipo('docente', 'admin'), rendCtrl.listarPendientesAutorizacion);
router.put('/rendiciones/:rendicionId/corregir',     requiereTipo('docente', 'admin'), corrCtrl.corregir);

router.get('/:id/progreso-en-vivo',                  requiereTipo('docente', 'admin'), streamCtrl.progresoEnVivo);
router.get('/:id/progreso-stream',                   requiereTipo('docente', 'admin'), streamCtrl.streamProgreso);
router.get('/:id/historial-eventos',                 requiereTipo('docente', 'admin'), streamCtrl.historialEventos);
router.post('/rendiciones/:rendicionId/agregar-tiempo',
                                                     requiereTipo('docente', 'admin'), monCtrl.agregarTiempo);
router.post('/rendiciones/:rendicionId/forzar-cierre',
                                                     requiereTipo('docente', 'admin'), monCtrl.forzarCierre);

router.post('/reclamos',                    requiereTipo('alumno'), corrCtrl.crearReclamo);
router.get('/rendiciones/:rendicionId/reclamos',  requiereAuth,                    corrCtrl.listarReclamosDeRendicion);
router.get('/reclamos/mios',                requiereTipo('alumno'), corrCtrl.listarMisReclamos);
router.get('/reclamos/pendientes',          requiereTipo('docente', 'admin', 'coordinador'), corrCtrl.listarReclamosPendientes);
router.put('/reclamos/:id/resolver',        requiereTipo('docente', 'admin', 'coordinador'), corrCtrl.resolverReclamo);

router.post('/:id/abrir',        requiereTipo('docente', 'admin'), ctrl.abrir);
router.post('/:id/cerrar',       requiereTipo('docente', 'admin'), ctrl.cerrar);
router.post('/:id/despublicar',  requiereTipo('docente', 'admin'), ctrl.despublicar);
router.post('/:id/preguntas',  requiereTipo('docente', 'admin'), ctrl.agregarPregunta);

router.get('/:id/estadisticas',  requiereTipo('docente', 'admin'), genCtrl.estadisticas);
router.get('/:id/resultados',    requiereTipo('docente', 'admin'), genCtrl.resultados);

router.get('/:id',            ctrl.obtener);
router.post('/',              requiereTipo('docente'), ctrl.crear);
router.post('/:id/publicar',  requiereTipo('docente'), ctrl.publicar);
router.patch('/:id',          requiereTipo('docente', 'admin'), ctrl.actualizar);


router.get('/:id/calcular-max-modelos', requiereTipo('docente', 'admin'), ctrl.calcularMaxModelos);
router.put('/:id/cantidad-modelos',     requiereTipo('docente', 'admin'), ctrl.actualizarCantidadModelos);

export default router;

