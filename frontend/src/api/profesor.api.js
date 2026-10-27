import http from './http.js';

export async function getMisEvaluaciones() {
  const { data } = await http.get('/evaluaciones/profesor/mias');
  return data.data;
}

export async function crearEvaluacion(payload) {
  const { data } = await http.post('/evaluaciones', payload);
  return data.data;
}

export async function publicarEvaluacion(id) {
  const { data } = await http.post(`/evaluaciones/${id}/publicar`);
  return data;
}

export async function obtenerEvaluacion(id) {
  const { data } = await http.get(`/evaluaciones/${id}`);
  return data.data;
}

export async function listarRendiciones(evaluacionId) {
  const { data } = await http.get(`/evaluaciones/${evaluacionId}/rendiciones`);
  return data.data;
}

export async function verRespuestasDeRendicion(rendicionId) {
  const { data } = await http.get(`/evaluaciones/rendiciones/${rendicionId}/respuestas`);
  return data.data;
}

export async function corregirRendicion(rendicionId, { nota, motivoRechazo = null }) {
  const { data } = await http.put(
    `/evaluaciones/rendiciones/${rendicionId}/corregir`,
    { nota, motivoRechazo }
  );
  return data;
}

export async function getMisMaterias() {
  const { data } = await http.get('/materias/mias');
  return data.data;
}

export async function getDetalleMateria(id) {
  const { data } = await http.get(`/materias/${id}`);
  return data.data;
}

export async function getAlumnosDeMateria(materiaId) {
  const { data } = await http.get(`/matriculas/materia/${materiaId}`);
  return data.data;
}

export async function getMaterialesDeMateria(materiaId) {
  const { data } = await http.get(`/materiales?materiaId=${materiaId}`);
  return data.data;
}

export async function crearMaterial(formData) {
  const { data } = await http.post('/materiales', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
}

export async function eliminarMaterial(id) {
  const { data } = await http.delete(`/materiales/${id}`);
  return data;
}

export async function getMisTareas() {
  const { data } = await http.get('/tareas/profesor/mias');
  return data.data;
}

export async function getTareasDeMateria(materiaId) {
  const { data } = await http.get(`/tareas/materia/${materiaId}`);
  return data.data;
}

export async function crearTarea(payload) {
  const { data } = await http.post('/tareas', payload);
  return data.data;
}

export async function cambiarEstadoTarea(id, estado) {
  const { data } = await http.patch(`/tareas/${id}/estado`, { estado });
  return data;
}

export async function eliminarTarea(id) {
  const { data } = await http.delete(`/tareas/${id}`);
  return data;
}

export async function getForoDeMateria(materiaId) {
  const { data } = await http.get(`/foro?materiaId=${materiaId}&soloRaiz=true`);
  return data.data;
}

export async function getSolicitudesPendientes() {
  const { data } = await http.get('/matriculas/solicitudes-para-mi?estado=pendiente');
  return data.data;
}

export async function resolverSolicitud(id, { estado, respuesta = null }) {
  const { data } = await http.post(
    `/matriculas/solicitudes/${id}/resolver`,
    { estado, respuesta }
  );
  return data;
}

export async function getNotificaciones(limit = 20) {
  const { data } = await http.get(`/notificaciones?limit=${limit}`);
  return data.data;
}

export async function getNotificacionesNoLeidas() {
  const { data } = await http.get('/notificaciones/no-leidas/count');
  return data.data.total;
}

export async function getCartelera() {
  const { data } = await http.get('/cartelera');
  return data.data;
}

export async function estadisticasBanco(materiaId) {
  const { data } = await http.get(`/evaluaciones/banco/estadisticas/${materiaId}`);
  return data.data;
}

export async function generarPreview(payload) {
  const { data } = await http.post('/evaluaciones/generar-automatico', payload);
  return data.data;
}

export async function confirmarGenerado(payload) {
  const { data } = await http.post('/evaluaciones/generar-automatico/confirmar', payload);
  return data.data;
}

export async function buscarAlumnosParaMateria(q, materiaId) {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (materiaId) params.set('materiaId', materiaId);
  const { data } = await http.get(`/usuarios/buscar-alumnos?${params.toString()}`);
  return data.data;
}

export async function agregarAlumnoAMateria(materiaId, alumnoId) {
  const { data } = await http.post(`/materias/${materiaId}/alumnos`, { alumnoId });
  return data;
}

export async function getAlumnosConNotas(materiaId) {
  const { data } = await http.get(`/materias/${materiaId}/alumnos-con-notas`);
  return data.data;
}

export async function actualizarNotaFinal(matriculaId, { nota_final, observacion }) {
  const { data } = await http.patch(`/matriculas/${matriculaId}/nota-final`, {
    nota_final, observacion,
  });
  return data;
}

export async function actualizarNotaAprobacion(materiaId, nota_aprobacion) {
  const { data } = await http.patch(`/materias/${materiaId}/nota-aprobacion`, {
    nota_aprobacion,
  });
  return data;
}

export async function previewModelos(payload) {
  const { data } = await http.post('/evaluaciones/extras/preview-modelos', payload);
  return data.data;
}

export async function setCantidadModelos(evaluacionId, cantidad) {
  const { data } = await http.put(`/evaluaciones/extras/${evaluacionId}/cantidad-modelos`, { cantidad });
  return data.data;
}

export async function descargarPlantilla(formato) {
  const res = await http.get(`/evaluaciones/extras/plantilla/${formato}`, { responseType: 'blob' });
  const blob = new Blob([res.data]);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `evalbot_plantilla_preguntas.${formato}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function descargarPDF(evaluacionId) {
  const res = await http.get(`/evaluaciones/extras/${evaluacionId}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `evalbot_evaluacion_${evaluacionId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getPreguntasBanco(materiaId) {
  const { data } = await http.get(`/banco-preguntas?materiaId=${materiaId}`);
  return data.data || [];
}
