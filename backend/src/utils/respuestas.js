export function ok(res, data = null, mensaje = null) {
  const cuerpo = { ok: true };
  if (data !== null) cuerpo.data = data;
  if (mensaje) cuerpo.mensaje = mensaje;
  return res.status(200).json(cuerpo);
}

export function creado(res, data = null, mensaje = 'Creado') {
  const cuerpo = { ok: true, mensaje };
  if (data !== null) cuerpo.data = data;
  return res.status(201).json(cuerpo);
}

export function sinContenido(res) {
  return res.status(204).send();
}

export function error(res, codigo = 500, mensaje = 'Error interno', detalles = null) {
  const cuerpo = { ok: false, error: mensaje };
  if (detalles) cuerpo.detalles = detalles;
  return res.status(codigo).json(cuerpo);
}

export function noAutorizado(res, mensaje = 'No autorizado') {
  return error(res, 401, mensaje);
}

export function prohibido(res, mensaje = 'Acceso denegado') {
  return error(res, 403, mensaje);
}

export function noEncontrado(res, mensaje = 'Recurso no encontrado') {
  return error(res, 404, mensaje);
}

export function validacion(res, detalles) {
  return error(res, 422, 'Datos inválidos', detalles);
}
