import http from './http.js';

export async function getMisMaterias() {
  const { data } = await http.get('/materias/mis-materias');
  return data.data;
}

export async function getDetalleMateria(id) {
  const { data } = await http.get(`/materias/${id}`);
  return data.data;
}

export async function getMaterialesDeMateria(materiaId) {
  const { data } = await http.get(`/materiales?materiaId=${materiaId}`);
  return data.data;
}

export async function getTareasDeMateria(materiaId) {
  const { data } = await http.get(`/tareas/materia/${materiaId}`);
  return data.data;
}

export async function getForoDeMateria(materiaId) {
  const { data } = await http.get(`/foro?materiaId=${materiaId}&soloRaiz=true`);
  return data.data;
}

export async function getMisTareas() {
  const { data } = await http.get('/tareas/alumno/mias');
  return data.data;
}

export async function getEntregaDeTarea(tareaId) {
  const { data } = await http.get(`/entregas-codigo/tarea/${tareaId}`);
  return data.data;
}

export async function getMisEvaluaciones() {
  const { data } = await http.get('/evaluaciones/alumno/mias');
  return data.data;
}

export async function getMiResumenAsistencia() {
  const { data } = await http.get('/asistencia/mi-resumen');
  return data.data;
}

export async function getMisFaltas() {
  const { data } = await http.get('/asistencia/mis-faltas');
  return data.data;
}

export async function getMisRegistrosAsistencia(materiaId = null) {
  const url = materiaId ? `/asistencia/mis-registros?materiaId=${materiaId}` : '/asistencia/mis-registros';
  const { data } = await http.get(url);
  return data.data;
}

export async function getMisMatriculas() {
  const { data } = await http.get('/matriculas/mis-matriculas');
  return data.data;
}

export async function getCartelera() {
  const { data } = await http.get('/cartelera');
  return data.data;
}
 
export async function getProximosEventos() {
  const { data } = await http.get('/calendario/proximos');
  return data.data;
}

export async function getEventos({ desde = null, hasta = null } = {}) {
  const params = new URLSearchParams();
  if (desde) params.set('desde', desde);
  if (hasta) params.set('hasta', hasta);
  const { data } = await http.get(`/calendario?${params.toString()}`);
  return data.data;
}

export async function getNotificaciones(limit = 20) {
  const { data } = await http.get(`/notificaciones?limit=${limit}`);
  return data.data;
}

export async function getNotificacionesNoLeidas() {
  const { data } = await http.get('/notificaciones/no-leidas/count');
  return data.data.total;
}

export async function getMisGrupos() {
  const { data } = await http.get('/grupos/mios');
  return data.data;
}

export async function getForosActivos() {
  const { data } = await http.get('/foro?materiaId=1');
  return data.data;
}

export async function entregarTarea(tareaId, contenido, esTardia = false, archivos = []) {
  const fd = new FormData();
  fd.append('tareaId', String(tareaId));
  fd.append('contenido', contenido || '');
  if (esTardia) fd.append('esTardia', '1');

  const lista = Array.isArray(archivos) ? archivos.filter(Boolean) : [];
  if (lista.length > 0) {
    fd.append('archivo', lista[0]);
  } else {
    const blob = new Blob([contenido || 'Entrega sin archivos adjuntos'], { type: 'text/plain' });
    fd.append('archivo', blob, `entrega_${tareaId}.txt`);
  }

  const { data } = await http.post('/entregas-codigo', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data || data;
}


export async function getEntregaPorId(entregaId) {
  const { data } = await http.get(`/entregas-codigo/${entregaId}`);
  return data.data || data;
}

export async function descargarArchivoEntrega(entregaId) {
  const { data } = await http.get(`/entregas-codigo/${entregaId}/descargar`, { responseType: 'blob' });
  return data;
}


export async function unirseAMateria(codigo) {
  const { data } = await http.post('/materias/unirse', { codigo });
  return data;
}

export async function getMateriasPublicas() {
  const { data } = await http.get('/materias/publicas');
  return data.data;
}

export async function getMateriasSolicitables() {
  const { data } = await http.get('/materias/solicitables');
  return data.data;
}


export async function getMisMateriales() {
  const { data } = await http.get('/materiales/mis-materiales');
  return data.data;
}


export async function descargarMaterial(id) {
  const { data } = await http.get(`/materiales/${id}/descargar`, { responseType: 'blob' });
  return data;
}

export async function solicitarMateria(materiaId, mensaje = null) {
  const body = { materiaId };
  if (mensaje) body.mensaje = mensaje;
  const { data } = await http.post('/matriculas/solicitar', body);
  return data.data || data;
}

export async function getMisSolicitudes() {
  const { data } = await http.get('/matriculas/mis-solicitudes');
  return data.data;
}
