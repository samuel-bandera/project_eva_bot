import http from './http.js';

export async function listarMateriales({ materiaId = null } = {}) {
  const url = materiaId ? `/material?materiaId=${materiaId}` : '/material';
  const { data } = await http.get(url);
  return data.data;
}

export async function obtenerMaterial(id) {
  const { data } = await http.get(`/material/${id}`);
  return data.data;
}

export async function subirMaterial(formData) {
  const { data } = await http.post('/material', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
}

export async function actualizarMaterial(id, payload) {
  const { data } = await http.patch(`/material/${id}`, payload);
  return data.data;
}

export async function eliminarMaterial(id) {
  const { data } = await http.delete(`/material/${id}`);
  return data;
}
