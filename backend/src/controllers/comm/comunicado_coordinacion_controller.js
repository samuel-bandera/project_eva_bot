import { emitirNotificacion } from '../../services/socket_service.js';
import * as modelo from '../../models/comm/comunicado_coordinacion_model.js';
import { crearNotificacionMasiva } from '../../services/notificacion_service.js';
import { ok} from '../../utils/respuestas.js';
import { pool } from '../../config/db.js';

const CANAL_EMAIL_POR_NIVEL = {
  critico: ['coordinador', 'docente'],
  alto:    ['coordinador'],
  medio:   [],
  bajo:    [],
  info:    [],
};

export async function recibidos(req, res) {
  return ok(res, await modelo.listarRecibidos(req.usuario.id));
}

export async function enviados(req, res) {
  return ok(res, await modelo.listarEnviados(req.usuario.id));
}

export async function crear(req, res) {
  try {
    const { titulo, contenido, destinatario, requiere_confirmacion, enviar_email } = req.body;
    const autorId = req.usuario.id;
    const imagenUrl = req.file ? `comunicados/${req.file.filename}` : null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();


      const [result] = await conn.query(
        `INSERT INTO comunicados (titulo, contenido, autor_id, destinatario, requiere_confirmacion, imagen_url, enviar_email)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [titulo, contenido, autorId, destinatario || 'todos', requiere_confirmacion ? 1 : 0, imagenUrl, enviar_email !== '0' ? 1 : 0]
      );
      const comunicadoId = result.insertId;


      let selectDestinatarios = "SELECT id FROM usuarios WHERE tipo = 'alumno'";
      if (destinatario === 'docentes') selectDestinatarios = "SELECT id FROM usuarios WHERE tipo = 'docente'";
      else if (destinatario === 'todos') selectDestinatarios = "SELECT id FROM usuarios WHERE activo = 1";

      const [destinatarios] = await conn.query(selectDestinatarios);
      if (destinatarios.length > 0) {
        const values = destinatarios.map(u => [u.id, `Nuevo comunicado: ${titulo}`, contenido.substring(0, 100), 0]);
        await conn.query("INSERT INTO notificaciones (usuario_id, titulo, mensaje, leida) VALUES ?", [values]);
      }

      await conn.commit();


      if (destinatarios.length > 0) {
        destinatarios.forEach(u => {
          emitirNotificacion(u.id, {
            id: Date.now(),
            titulo: `Nuevo comunicado: ${titulo}`,
            mensaje: contenido.substring(0, 100),
            leida: false,
            fecha: new Date().toISOString()
          });
        });
        if (process.env.NODE_ENV !== 'production') console.log(`📢 WebSocket: Notificado a ${destinatarios.length} usuarios`);
      }






      return res.status(201).json({ ok: true, data: { id: comunicadoId, titulo } });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
}

export async function marcarLeido(req, res) {
  await modelo.marcarLeido(req.params.id, req.usuario.id);
  return ok(res, { mensaje: 'Marcado como leído' });
}
