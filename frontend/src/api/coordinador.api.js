import http from './http.js';

export {
  listarUsuarios,
  listarPendientes,
  aprobarUsuario,
  rechazarUsuario,
  actualizarUsuario,
  listarTodasLasSolicitudes,
  resolverSolicitud,
  listarCiclos,
  obtenerCicloActivo,
  listarEventos,
  listarAuditoria,
  listarCodigosProfesor,
  generarCodigoProfesor,
  revocarCodigoProfesor,
} from './admin.api.js';

export async function listarMaterias({ cicloId = null } = {}) {
  const params = new URLSearchParams();
  if (cicloId) params.append('cicloId', cicloId);
  const qs = params.toString();
  const { data } = await http.get(`/materias${qs ? `?${qs}` : ''}`);
  return data.data?.materias || data.data || [];
}

export async function obtenerMateria(id) {
  const { data } = await http.get(`/materias/${id}`);
  return data.data;
}

export async function listarAlumnosConNotas(materiaId) {
  const { data } = await http.get(`/materias/${materiaId}/alumnos-con-notas`);
  return data.data;
}

export async function listarReclamosPendientes() {
  const { data } = await http.get('/evaluaciones/reclamos/pendientes');
  return data.data;
}

export async function resolverReclamo(id, payload) {
  const { data } = await http.put(`/evaluaciones/reclamos/${id}/resolver`, payload);
  return data;
}

export async function listarCarreras() {
  const { data } = await http.get('/carreras');
  return data.data;
}

export async function obtenerCarrera(id) {
  const { data } = await http.get(`/carreras/${id}`);
  return data.data;
}

export async function comunicadosRecibidos() {
  const { data } = await http.get('/comunicados-coordinacion/recibidos');
  return data.data;
}

export async function comunicadosEnviados() {
  const { data } = await http.get('/comunicados-coordinacion/enviados');
  return data.data;
}

export async function crearComunicado({ titulo, contenido, nivelAlerta, enviarEmailTodos, destinatarios }) {
  const { data } = await http.post('/comunicados-coordinacion', {
    titulo,
    contenido,
    nivelAlerta,
    enviarEmailTodos,
    destinatarios,
  });
  return data.data;
}

export async function listarDocentes() {
  const { data } = await http.get('/usuarios?tipo=docente&limit=500');
  return data.data?.usuarios || [];
}

export async function listarAlumnos() {
  const { data } = await http.get('/usuarios?tipo=alumno&limit=500');
  return data.data?.usuarios || [];
}

export async function listarCoordinadores() {
  const { data } = await http.get('/usuarios?tipo=coordinador&limit=100');
  return data.data?.usuarios || [];
}

export async function marcarComunicadoLeido(id) {
  const { data } = await http.post(`/comunicados-coordinacion/${id}/leido`);
  return data;
}
