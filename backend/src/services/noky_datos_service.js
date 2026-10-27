import * as tareaModel from '../models/acad/tarea_model.js';
import * as materiaModel from '../models/acad/materia_model.js';
import * as matriculaModel from '../models/admin/matricula_model.js';
import * as materialModel from '../models/acad/material_model.js';
import * as comunicadoModel from '../models/comm/comunicado_model.js';

async function obtenerDatos(intencion, alumnoId, filtros = {}) {
  if (!alumnoId) return [];
  try {
    if (intencion === 'materias') {
      const mats = await matriculaModel.listarMatriculasDeAlumno(alumnoId);
      if (!mats.length) return ['(no hay materias inscriptas)'];
      return mats.map(m => {
        let linea = `- ${m.materia_nombre} (${m.materia_codigo}) — ${m.estado}`;
        if (m.nota_final != null) linea += ` — nota final: ${m.nota_final}`;
        if (m.materia_descripcion) {
          const desc = m.materia_descripcion.length > 200
            ? m.materia_descripcion.substring(0, 200) + '...'
            : m.materia_descripcion;
          linea += `\n  Descripción: ${desc}`;
        }
        return linea;
      });
    }

    if (intencion === 'tareas' || intencion === 'examenes') {
      let tareas = await tareaModel.listarTareasDeAlumno(alumnoId);
      if (!tareas.length) return ['(no hay tareas asignadas)'];
      const ahora = Date.now();


      if (filtros.materia) {
        const f = filtros.materia.toLowerCase();
        tareas = tareas.filter(t =>
          (t.materia_nombre || '').toLowerCase().includes(f) ||
          (t.materia_codigo || '').toLowerCase().includes(f)
        );
      }


      if (filtros.estado === 'pendientes') tareas = tareas.filter(t => !t.entrega_id);
      if (filtros.estado === 'entregadas') tareas = tareas.filter(t => t.entrega_id);
      if (filtros.estado === 'vencidas') tareas = tareas.filter(t => !t.entrega_id && new Date(t.fecha_entrega).getTime() < ahora);


      if (filtros.fecha === 'hoy') {
        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const manana = new Date(hoy); manana.setDate(hoy.getDate() + 1);
        tareas = tareas.filter(t => {
          const f = new Date(t.fecha_entrega);
          return f >= hoy && f < manana;
        });
      } else if (filtros.fecha === 'manana') {
        const manana = new Date(); manana.setHours(0, 0, 0, 0); manana.setDate(manana.getDate() + 1);
        const pasado = new Date(manana); pasado.setDate(manana.getDate() + 1);
        tareas = tareas.filter(t => {
          const f = new Date(t.fecha_entrega);
          return f >= manana && f < pasado;
        });
      } else if (filtros.fecha === 'semana') {
        const en7dias = new Date(Date.now() + 7 * 86400000);
        tareas = tareas.filter(t => new Date(t.fecha_entrega) <= en7dias);
      } else if (filtros.fecha === 'ayer') {
        const ayer = new Date(); ayer.setHours(0, 0, 0, 0); ayer.setDate(ayer.getDate() - 1);
        const hoy = new Date(ayer); hoy.setDate(ayer.getDate() + 1);
        tareas = tareas.filter(t => {
          const f = new Date(t.fecha_entrega);
          return f >= ayer && f < hoy;
        });
      }

      if (!tareas.length) return ['(no hay tareas que coincidan con el filtro)'];

      return tareas.map(t => {
        const fecha = new Date(t.fecha_entrega).getTime();
        const dias = Math.ceil((fecha - ahora) / 86400000);
        let estado;
        if (t.entrega_id) estado = 'entregada';
        else if (dias < 0) estado = `vencida hace ${-dias} día(s)`;
        else if (dias === 0) estado = 'vence HOY';
        else if (dias === 1) estado = 'vence MAÑANA';
        else estado = `vence en ${dias} días`;
        let linea = `- ${t.titulo} (${t.materia_nombre}) — ${estado}`;
        if (t.nota != null) linea += ` — nota: ${t.nota}`;
        return linea;
      });
    }

    if (intencion === 'notas') {
      const mats = await matriculaModel.listarMatriculasDeAlumno(alumnoId);
      if (!mats.length) return ['(no hay materias inscriptas)'];
      const lineas = [];
      for (const m of mats) {
        const calif = await materiaModel.obtenerCalificacionesDeMateria(alumnoId, m.materia_id);
        if (calif) {
          const prom = calif.promedio_calculado || 'sin calificaciones';
          const nota = calif.nota_final != null ? calif.nota_final : m.nota_final;
          lineas.push(`- ${m.materia_nombre}: promedio ${prom}${nota != null ? ` (nota final: ${nota})` : ''}`);
        }
      }
      return lineas.length ? lineas : ['(sin calificaciones registradas aún)'];
    }

    if (intencion === 'materiales') {
      const mats = await matriculaModel.listarMatriculasDeAlumno(alumnoId);
      const lineas = [];
      for (const m of mats) {
        try {
          const materiales = await materialModel.listarMateriales({ materiaId: m.materia_id });
          for (const mat of materiales) {
            const fecha = mat.fecha ? new Date(mat.fecha).toLocaleDateString('es-UY') : 's/f';
            let linea = `- [${mat.materia_nombre || m.materia_nombre}] "${mat.titulo}" (${mat.tipo || 'material'}) — ${fecha}`;
            if (mat.descripcion) linea += ` — ${String(mat.descripcion).slice(0, 140)}`;
            if (mat.url || mat.archivo_url) linea += ` — link: ${mat.url || mat.archivo_url}`;
            lineas.push(linea);
          }
        } catch (e) {
          console.error('[Noky] Error materiales materia', m.materia_id, e.message);
        }
      }
      return lineas.length ? lineas : ['(no hay materiales subidos a tus materias)'];
    }

    if (intencion === 'comunicados') {
      const todos = await comunicadoModel.listarComunicados({});
      const filtrados = todos.filter(c =>
        !c.destinatario ||
        c.destinatario === 'todos' ||
        c.destinatario === 'alumnos' ||
        c.destinatario === 'alumno'
      ).slice(0, 10);
      if (!filtrados.length) return ['(no hay comunicados nuevos)'];
      return filtrados.map(c => {
        const fecha = c.fecha ? new Date(c.fecha).toLocaleDateString('es-UY') : 's/f';
        let linea = `- "${c.titulo}" — ${fecha}`;
        if (c.autor_nombre) linea += ` — por ${c.autor_nombre} ${c.autor_apellido || ''}`;
        if (c.contenido) linea += ` — ${String(c.contenido).slice(0, 160)}`;
        return linea;
      });
    }

    if (['saludo', 'gracias', 'animo_bien', 'animo_mal', 'sobre_noky'].includes(intencion)) return [];

    if (intencion === 'general' || intencion === 'ayuda') {
      const tareas = await tareaModel.listarTareasDeAlumno(alumnoId);
      const mats = await matriculaModel.listarMatriculasDeAlumno(alumnoId);
      const pendientes = tareas.filter(t => !t.entrega_id && new Date(t.fecha_entrega).getTime() > Date.now());
      const lineas = [
        `- Materias inscriptas: ${mats.length}`,
        `- Tareas pendientes: ${pendientes.length}`,
      ];
      if (pendientes.length > 0) {
        const prox = pendientes.sort((a, b) => new Date(a.fecha_entrega) - new Date(b.fecha_entrega))[0];
        const dias = Math.ceil((new Date(prox.fecha_entrega).getTime() - Date.now()) / 86400000);
        lineas.push(`- Próxima entrega: "${prox.titulo}" (${prox.materia_nombre}) en ${dias} día(s)`);
      }
      return lineas;
    }

    return [];
  } catch (e) {
    console.error('[Noky] Error obteniendo datos:', e);
    return [];
  }
}

export { obtenerDatos };
