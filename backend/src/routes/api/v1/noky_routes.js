import { Router } from 'express';
import { requiereAuth } from '../../../middlewares/auth_middleware.js';
import { chatNoky, streamNoky } from '../../../services/noky_agent_service.js';

const router = Router();
router.use(requiereAuth);

router.post('/chat', async (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje) return res.status(422).json({ ok: false, error: 'Mensaje requerido' });

    const respuesta = await chatNoky(mensaje, req.usuario);

    return res.json({ ok: true, data: { text: respuesta } });
  } catch (e) {
    console.error('Error en Mochi:', e);
    res.status(500).json({ ok: false, error: e.message });
  }
});



router.post('/test/emitir-notificacion', async (req, res) => {
  try {
    const { emitirNotificacion } = await import('../../../services/socket_service.js');
    const { pool } = await import('../../../config/db.js');
    const { usuarioId, titulo, mensaje } = req.body;
    if (!usuarioId) return res.status(422).json({ ok: false, error: 'Falta usuarioId' });

    const [users] = await pool.query("SELECT id, usuario FROM usuarios WHERE id = ?", [usuarioId]);
    if (!users.length) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    emitirNotificacion(usuarioId, {
      id: Date.now(),
      titulo: titulo || 'Notificación de prueba',
      mensaje: mensaje || 'Esto llegó sin recargar.',
      leida: false,
      fecha: new Date().toISOString()
    });

    res.json({ ok: true, mensaje: `Enviado a ${users[0].usuario}` });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});



router.post('/chat/stream', async (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) return res.status(422).json({ ok: false, error: 'Mensaje requerido' });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const result = await streamNoky(mensaje, req.usuario);
    for await (const chunk of result.textStream) {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (e) {
    console.error('[Noky SSE] Error:', e);
    res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
    res.end();
  }
});

export default router;
