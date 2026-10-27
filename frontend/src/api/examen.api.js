import http from './http.js';

export async function obtenerEvaluacion(id) {
  const { data } = await http.get(`/evaluaciones/${id}`);
  return data.data;
}

export async function iniciarExamen(evaluacionId) {
  const { data } = await http.post(`/evaluaciones/${evaluacionId}/iniciar`);
  return data.data;
}

export async function guardarRespuesta(rendicionId, evaluacionPreguntaId, respuesta) {
  const { data } = await http.post(
    `/evaluaciones/rendiciones/${rendicionId}/responder`,
    { evaluacionPreguntaId, respuesta }
  );
  return data;
}

export async function enviarExamen(rendicionId) {
  const { data } = await http.post(`/evaluaciones/rendiciones/${rendicionId}/enviar`);
  return data;
}

export async function heartbeat(rendicionId, preguntaActual = null) {
  const { data } = await http.post(
    `/evaluaciones/rendiciones/${rendicionId}/heartbeat`,
    { preguntaActual }
  );
  return data.data;
}

export async function reportarEvento(rendicionId, tipo, detalle = null) {
  const { data } = await http.post(
    `/evaluaciones/rendiciones/${rendicionId}/evento`,
    { tipo, detalle }
  );
  return data;
}

export async function progresoEnVivo(evaluacionId) {
  const { data } = await http.get(`/evaluaciones/${evaluacionId}/progreso-en-vivo`);
  return data.data;
}

export async function historialEventos(evaluacionId) {
  const { data } = await http.get(`/evaluaciones/${evaluacionId}/historial-eventos`);
  return data.data;
}

export async function agregarTiempo(rendicionId, segundos) {
  const { data } = await http.post(
    `/evaluaciones/rendiciones/${rendicionId}/agregar-tiempo`,
    { segundos }
  );
  return data;
}

export async function forzarCierre(rendicionId) {
  const { data } = await http.post(
    `/evaluaciones/rendiciones/${rendicionId}/forzar-cierre`
  );
  return data;
}

export function conectarStreamProgreso(evaluacionId, token, onMensaje) {
  const controller = new AbortController();

  fetch(`http://localhost:3000/api/v1/evaluaciones/${evaluacionId}/progreso-stream`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: controller.signal,
  })
    .then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const bloques = buffer.split('\n\n');
        buffer = bloques.pop();

        for (const bloque of bloques) {
          const lineas = bloque.split('\n');
          for (const linea of lineas) {
            if (linea.startsWith('data: ')) {
              try {
                onMensaje(JSON.parse(linea.slice(6)));
              } catch (e) {  }
            }
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') console.error('SSE error:', err);
    });

  return () => controller.abort();
}

export async function verMiRendicion(rendicionId) {
  const { data } = await http.get(`/evaluaciones/rendiciones/${rendicionId}/mia`);
  return data.data;
}

export async function autorizarRendicion(rendicionId) {
  const { data } = await http.post(`/evaluaciones/rendiciones/${rendicionId}/autorizar`);
  return data;
}

export async function listarPendientesAutorizacion() {
  const { data } = await http.get('/evaluaciones/rendiciones/pendientes-autorizacion');
  return data.data;
}
