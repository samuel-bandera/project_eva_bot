import http from './http.js';

export async function listarUsuarios({ tipo = null, estado = null, limit = 50, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (tipo) params.append('tipo', tipo);
  if (estado) params.append('estado', estado);
  params.append('limit', limit);
  params.append('offset', offset);
  const { data } = await http.get(`/usuarios?${params}`);
  return data.data?.usuarios || (Array.isArray(data.data) ? data.data : []);
}

export async function listarPendientes() {
  const { data } = await http.get('/usuarios/pendientes');
  return data.data;
}

export async function obtenerUsuario(id) {
  const { data } = await http.get(`/usuarios/${id}`);
  return data.data;
}

export async function aprobarUsuario(id) {
  const { data } = await http.post(`/usuarios/${id}/aprobar`);
  return data;
}

export async function rechazarUsuario(id, motivo) {
  const { data } = await http.post(`/usuarios/${id}/rechazar`, { motivo });
  return data;
}

export async function listarRolesDeUsuario(id) {
  const { data } = await http.get(`/usuarios/${id}/roles`);
  return data.data;
}

export async function asignarRol(usuarioId, rolId) {
  const { data } = await http.post('/usuarios/roles/asignar', { usuarioId, rolId });
  return data;
}

export async function quitarRol(usuarioId, rolId) {
  const { data } = await http.post('/usuarios/roles/quitar', { usuarioId, rolId });
  return data;
}

export async function actualizarUsuario(id, payload) {
  const { data } = await http.patch(`/usuarios/${id}`, payload);
  return data;
}

export async function resetearPasswordUsuario(id, nuevaContrasena) {
  const { data } = await http.post(`/usuarios/${id}/reset-password`, { nuevaContrasena });
  return data;
}

export async function listarMatriculas({ limit = 50, offset = 0 } = {}) {
  const { data } = await http.get(`/matriculas?limit=${limit}&offset=${offset}`);
  return data.data;
}

export async function listarTodasLasSolicitudes(estado = 'pendiente') {
  const { data } = await http.get(`/matriculas/solicitudes/todas?estado=${estado}`);
  return data.data;
}

export async function resolverSolicitud(id, { estado, respuesta = null }) {
  const { data } = await http.post(`/matriculas/solicitudes/${id}/resolver`, {
    estado, respuesta,
  });
  return data;
}

export async function matricularMasivo(payload) {
  const { data } = await http.post('/matriculas/masivo', payload);
  return data;
}

export async function listarCiclos() {
  const { data } = await http.get('/ciclos');
  return data.data;
}

export async function obtenerCicloActivo() {
  const { data } = await http.get('/ciclos/activo');
  return data.data;
}

export async function crearCiclo(payload) {
  const { data } = await http.post('/ciclos', payload);
  return data;
}

export async function actualizarCiclo(id, payload) {
  const { data } = await http.patch(`/ciclos/${id}`, payload);
  return data;
}

export async function listarEventos({ tipo = null, gravedad = null, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (tipo) params.append('tipo', tipo);
  if (gravedad) params.append('gravedad', gravedad);
  params.append('limit', limit);
  const { data } = await http.get(`/logs/eventos?${params}`);
  return data.data;
}

export async function resolverEvento(id) {
  const { data } = await http.put(`/logs/eventos/${id}/resolver`);
  return data;
}

export async function listarAuditoria({ accion = null, limit = 50 } = {}) {
  const params = new URLSearchParams();
  if (accion) params.append('accion', accion);
  params.append('limit', limit);
  const { data } = await http.get(`/logs/auditoria?${params}`);
  return data.data;
}

export async function listarCodigosProfesor() {
  const { data } = await http.get('/auth/codigos-profesor');
  return data.data;
}

export async function generarCodigoProfesor(motivo = null) {
  const { data } = await http.post('/auth/codigos-profesor', { motivo });
  return data.data;
}

export async function revocarCodigoProfesor(id) {
  const { data } = await http.delete(`/auth/codigos-profesor/${id}`);
  return data;
}

export async function listarMaterias({ cicloId = null } = {}) {
  const params = new URLSearchParams();
  if (cicloId) params.set('cicloId', cicloId);
  const qs = params.toString();
  const { data } = await http.get(`/materias${qs ? '?' + qs : ''}`);
  return data.data;
}
