import { ref } from 'vue';
import { useQuasar } from 'quasar';
import * as alumnoApi from '../api/alumno.api.js';
import { estaVencida } from '../utils/tareas.js';

export function useEntregaTarea({ ahora, alSubir }) {
  const $q = useQuasar();

  const modalEntrega = ref(false);
  const tareaActiva = ref(null);
  const archivoSeleccionado = ref(null);
  const comentarioEntrega = ref('');
  const subiendo = ref(false);
  const arrastrandoArchivo = ref(false);

  function abrirModalEntrega(tarea) {
    tareaActiva.value = tarea;
    archivoSeleccionado.value = null;
    comentarioEntrega.value = '';
    modalEntrega.value = true;
  }

  function cerrarModalEntrega() {
    modalEntrega.value = false;
    tareaActiva.value = null;
    archivoSeleccionado.value = null;
    comentarioEntrega.value = '';
    arrastrandoArchivo.value = false;
  }

  function validarArchivo(archivo) {
    if (!archivo) return;
    if (archivo.size > 10 * 1024 * 1024) {
      $q.notify({ type: 'negative', message: 'El archivo supera los 10 MB', position: 'bottom' });
      return;
    }
    archivoSeleccionado.value = archivo;
  }

  function onArchivoSeleccionado(evento) {
    validarArchivo(evento.target.files?.[0]);
  }

  function onDrop(evento) {
    arrastrandoArchivo.value = false;
    validarArchivo(evento.dataTransfer?.files?.[0]);
  }

  async function subirEntrega() {
    if (!tareaActiva.value) return;
    subiendo.value = true;
    try {
      const esTardia = estaVencida(tareaActiva.value, ahora.value);
      const archivos = archivoSeleccionado.value ? [archivoSeleccionado.value] : [];
      const comentario = comentarioEntrega.value.trim() || 'Entrega adjunta';

      await alumnoApi.entregarTarea(tareaActiva.value.id, comentario, esTardia, archivos);
      $q.notify({
        type: 'positive',
        message: esTardia ? 'Entrega tardía registrada' : 'Tarea entregada correctamente',
        position: 'bottom',
      });
      cerrarModalEntrega();
      if (alSubir) await alSubir();
    } catch (e) {
      console.error(e);
      $q.notify({
        type: 'negative',
        message: e.response?.data?.error || 'No se pudo entregar',
        position: 'bottom',
      });
    } finally {
      subiendo.value = false;
    }
  }

  async function verEntrega(tarea) {
    if (!tarea.entrega_id) return;
    try {
      const blob = await alumnoApi.descargarArchivoEntrega(tarea.entrega_id);
      descargarBlob(blob, tarea.entrega_archivo || 'entrega_' + tarea.entrega_id);
    } catch (e) {
      console.error(e);
      $q.notify({ type: 'negative', message: 'No se pudo descargar la entrega', position: 'bottom' });
    }
  }

  async function descargarMaterial(id) {
    try {
      const blob = await alumnoApi.descargarMaterial(id);
      descargarBlob(blob, 'material.pdf');
    } catch (e) {
      console.error(e);
      $q.notify({ type: 'negative', message: 'No se pudo descargar el archivo', position: 'bottom' });
    }
  }

  function descargarBlob(blob, nombre) {
    const url = window.URL.createObjectURL(new Blob([blob]));
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.setAttribute('download', nombre);
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    window.URL.revokeObjectURL(url);
  }

  return {
    modalEntrega,
    tareaActiva,
    archivoSeleccionado,
    comentarioEntrega,
    subiendo,
    arrastrandoArchivo,
    abrirModalEntrega,
    cerrarModalEntrega,
    onArchivoSeleccionado,
    onDrop,
    subirEntrega,
    verEntrega,
    descargarMaterial,
  };
}
