export function estaVencida(tarea, ahora) {
  return new Date(tarea.fecha_entrega).getTime() < ahora;
}

export function estaEntregada(tarea) {
  return tarea.entrega_id != null;
}

export function aceptaTardia(tarea) {
  return tarea.acepta_tardias !== false && tarea.acepta_tardias !== 0;
}

export function estadoTarea(tarea, ahora) {
  if (estaEntregada(tarea)) {
    const entrega = tarea.entrega_fecha ? new Date(tarea.entrega_fecha).getTime() : 0;
    const limite = tarea.fecha_entrega ? new Date(tarea.fecha_entrega).getTime() : 0;
    if (entrega > limite) return 'entregada_tarde';
    return 'entregada';
  }
  if (estaVencida(tarea, ahora)) return aceptaTardia(tarea) ? 'tardia' : 'vencida';
  const dias = (new Date(tarea.fecha_entrega).getTime() - ahora) / 86400000;
  if (dias < 1) return 'urgente';
  if (dias < 3) return 'proxima';
  return 'pendiente';
}

export function estadoLabel(tarea, ahora) {
  const estado = estadoTarea(tarea, ahora);
  if (estado === 'entregada_tarde') {
    const dias = Math.ceil((new Date(tarea.entrega_fecha).getTime() - new Date(tarea.fecha_entrega).getTime()) / 86400000);
    return `Entregada +${dias}d`;
  }
  return {
    entregada: 'Entregada',
    vencida: 'Vencida',
    tardia: 'Acepta tardía',
    urgente: 'Urgente',
    proxima: 'Próxima',
    pendiente: 'Pendiente',
  }[estado];
}

export function estadoIcono(tarea, ahora) {
  const estado = estadoTarea(tarea, ahora);
  return {
    entregada: 'check_circle',
    entregada_tarde: 'schedule',
    vencida: 'lock',
    tardia: 'update',
    urgente: 'error',
    proxima: 'schedule',
    pendiente: 'event',
  }[estado];
}

export function venceTexto(fecha, ahora) {
  const dias = Math.ceil((new Date(fecha).getTime() - ahora) / 86400000);
  if (dias < 0) return `Venció hace ${-dias}d`;
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Mañana';
  return `En ${dias} días`;
}

export function formatearFechaCorta(fecha) {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-UY', { day: '2-digit', month: 'short' });
}

export function iconoPorTipoMaterial(tipo) {
  return {
    apunte: 'picture_as_pdf',
    video: 'smart_display',
    link: 'link',
    ejercicio: 'edit_note',
    otro: 'attach_file',
  }[tipo] || 'description';
}

export function iconoPorArchivo(nombre) {
  const ext = (nombre || '').split('.').pop().toLowerCase();
  const iconos = {
    pdf: 'picture_as_pdf',
    doc: 'description', docx: 'description',
    xls: 'table_chart', xlsx: 'table_chart',
    zip: 'folder_zip', rar: 'folder_zip',
    png: 'image', jpg: 'image', jpeg: 'image', gif: 'image',
    txt: 'text_snippet', md: 'text_snippet',
    py: 'code', js: 'code', sh: 'code', html: 'code', css: 'code',
  };
  return iconos[ext] || 'insert_drive_file';
}

export function formatearBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
