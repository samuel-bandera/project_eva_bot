import { Router } from 'express';
import { emitirNotificacion } from '../../../services/socket_service.js';
import { pool } from '../../../config/db.js';

const router = Router();


router.post('/emitir-notificacion', async (req, res) => {
  try {
    const { usuarioId, titulo, mensaje } = req.body;
    if (!usuarioId) return res.status(422).json({ ok: false, error: 'Falta usuarioId' });

    const [users] = await pool.query("SELECT id, usuario FROM usuarios WHERE id = ?", [usuarioId]);
    if (!users.length) return res.status(404).json({ ok: false, error: 'Usuario no encontrado' });

    emitirNotificacion(usuarioId, {
      id: Date.now(),
      titulo: titulo || '¡Notificación en Vivo!',
      mensaje: mensaje || 'Esto llegó sin recargar la página.',
      leida: false,
      fecha: new Date().toISOString()
    });

    console.log(`📢 Notificación emitida a ${users[0].usuario} (id: ${usuarioId})`);
    res.json({ ok: true, mensaje: `Enviado a ${users[0].usuario}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
