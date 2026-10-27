import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as ctrl from '../../../../controllers/acad/ia_controller.js';
import { requiereAuth, requiereTipo } from '../../../../middlewares/auth_middleware.js';

const router = Router();


const iaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiadas llamadas a IA. Esperá un minuto.' },
});

router.use(requiereAuth);
router.use(requiereTipo('docente', 'admin', 'coordinador'));
router.use(iaLimiter);

router.get('/estado', ctrl.estado);
router.post('/generar-preguntas', ctrl.generarPreguntas);
router.post('/generar-instrucciones', ctrl.generarInstrucciones);

export default router;
