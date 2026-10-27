import { ZodError } from 'zod';

export function noEncontrado(req, res) {
  res.status(404).json({
    ok: false,
    error: `Ruta no encontrada: ${req.method} ${req.originalUrl}`
  });
}

export function manejadorErrores(err, req, res, next) {
  if (err instanceof ZodError || err.name === 'ZodError') {
    const issues = err.issues || err.errors || [];
    console.warn('Zod:', issues.map(i => `${i.path.join('.')}: ${i.message}`).join(' | '));

    return res.status(422).json({
      ok: false,
      error: 'Datos inválidos',
      detalles: issues.map(i => ({
        campo: i.path.join('.'),
        mensaje: i.message,
        recibido: i.received
      }))
    });
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      ok: false,
      error: 'Registro duplicado',
      detalles: err.sqlMessage
    });
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      ok: false,
      error: 'Referencia inválida (FK inexistente)',
      detalles: err.sqlMessage
    });
  }
  if (err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      ok: false,
      error: 'No se puede eliminar: hay registros relacionados'
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ ok: false, error: 'Token inválido' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ ok: false, error: 'Token expirado' });
  }

  console.error('Error:', err.message);
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  const estado = err.status || 500;
  res.status(estado).json({
    ok: false,
    error: err.message || 'Error interno del servidor'
  });
}

