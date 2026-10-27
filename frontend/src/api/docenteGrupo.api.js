import http from './http.js';

export async function listarDocentesDeGrupo(grupoId) {
  const { data } = await http.get(`/grupos/${grupoId}/docentes`);
  return data.data || [];
}

export async function asignarDocenteAGrupo(grupoId, { docenteId, materiaId, tipoDocente = 'titular' }) {
  const { data } = await http.post(`/grupos/${grupoId}/docentes`, {
    docenteId,
    materiaId,
    tipoDocente
  });
  return data.data;
}

export async function desasignarDocente(grupoId, asignacionId) {
  const { data } = await http.delete(`/grupos/${grupoId}/docentes/${asignacionId}`);
  return data.data;
}
