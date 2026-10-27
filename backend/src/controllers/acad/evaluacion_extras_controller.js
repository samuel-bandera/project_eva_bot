import PDFDocument from 'pdfkit';
import { pool } from '../../config/db.js';
import * as evalModel from '../../models/acad/evaluacion_model.js';
import { ok, error, noEncontrado } from '../../utils/respuestas.js';
import { embarajar, embarajarOpciones, maxModelosPosibles } from '../../utils/embarajar.js';






export async function previewModelos(req, res) {
  const { preguntas = [], cantidadModelos = 3 } = req.body || {};

  if (!Array.isArray(preguntas) || preguntas.length === 0) {
    return error(res, 400, 'Enviá al menos 1 pregunta');
  }
  if (preguntas.length > 50) {
    return error(res, 400, 'Máximo 50 preguntas por evaluación');
  }

  const maxPosibles = maxModelosPosibles(preguntas.length);
  const cantidad = Math.max(1, Math.min(Number(cantidadModelos) || 1, maxPosibles));

  const modelos = [];
  for (let m = 1; m <= cantidad; m++) {
    const preguntasBarajadas = embarajar(preguntas, m);

    const conOpciones = preguntasBarajadas.map((p, idx) => {
      let opciones = p.opciones;
      if (typeof opciones === 'string') {
        try { opciones = JSON.parse(opciones); } catch { opciones = null; }
      }
      if (Array.isArray(opciones) && opciones.length > 1) {
        opciones = embarajarOpciones(opciones, m * 1000 + idx);
      }
      return {
        numero: idx + 1,
        pregunta: p.pregunta,
        tipo: p.tipo || 'multiple_choice',
        opciones,
        puntaje: p.puntaje || 1,

      };
    });

    modelos.push({
      numero: m,
      codigo: `PREVIEW-M${m}-XXXX`,
      preguntas: conOpciones,
    });
  }

  return ok(res, {
    total_modelos: cantidad,
    cantidad_preguntas: preguntas.length,
    max_posibles: maxPosibles,
    modelos,
  });
}





const PLANTILLA_EJEMPLO = [
  {
    pregunta: '¿Cuánto es 5 × 3?',
    respuesta_correcta: '15',
    tipo: 'multiple_choice',
    puntaje: 2,
    opciones: ['10', '12', '15', '18'],
  },
  {
    pregunta: '¿Qué lenguaje se ejecuta en el navegador?',
    respuesta_correcta: 'JavaScript',
    tipo: 'multiple_choice',
    puntaje: 2,
    opciones: ['Python', 'JavaScript', 'Java', 'C++'],
  },
  {
    pregunta: '¿Cuántos bytes tiene 1 KB?',
    respuesta_correcta: '1024',
    tipo: 'multiple_choice',
    puntaje: 2,
    opciones: ['100', '1000', '1024', '2048'],
  },
  {
    pregunta: '¿Cuál de estos es un gestor de bases de datos?',
    respuesta_correcta: 'MySQL',
    tipo: 'multiple_choice',
    puntaje: 2,
    opciones: ['MongoDB', 'MySQL', 'Redis', 'Cassandra'],
  },
  {
    pregunta: '¿Qué significa HTML?',
    respuesta_correcta: 'HyperText Markup Language',
    tipo: 'multiple_choice',
    puntaje: 2,
    opciones: [
      'High Tech Modern Language',
      'HyperText Markup Language',
      'Home Tool Management Layer',
      'Hyperlink and Text Mode Link',
    ],
  },
];

export async function descargarPlantilla(req, res) {
  const { formato } = req.params;

  if (formato === 'csv') {
    const esc = (v) => {
      const s = String(v ?? '');
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? '"' + s.replace(/"/g, '""') + '"'
        : s;
    };

    const lineas = ['pregunta,respuesta_correcta,tipo,puntaje,opciones'];
    for (const p of PLANTILLA_EJEMPLO) {
      const opciones = Array.isArray(p.opciones) ? p.opciones.join('|') : '';
      lineas.push(
        [esc(p.pregunta), esc(p.respuesta_correcta), esc(p.tipo), esc(p.puntaje), esc(opciones)].join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="evalbot_plantilla_preguntas.csv"');
    return res.send('\uFEFF' + lineas.join('\n'));
  }

  if (formato === 'json') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="evalbot_plantilla_preguntas.json"');
    return res.json({
      instrucciones: 'Cada pregunta debe tener pregunta, respuesta_correcta, tipo, puntaje y opciones. La respuesta_correcta debe coincidir exactamente con una de las opciones.',
      tipos_validos: ['multiple_choice', 'true_false', 'short_answer'],
      preguntas: PLANTILLA_EJEMPLO,
    });
  }

  return error(res, 400, 'Formato no soportado. Usá "csv" o "json".');
}

export async function exportarPDF(req, res) {
  const { id } = req.params;

  const ev = await evalModel.obtenerEvaluacion(Number(id));
  if (!ev) return noEncontrado(res, 'Evaluación no encontrada');

  if (ev.docente_id !== req.usuario.id && req.usuario.tipo !== 'admin') {
    return error(res, 403, 'No sos el docente de esta evaluación');
  }

  const preguntas = ev.preguntas || [];
  if (preguntas.length === 0) {
    return error(res, 422, 'La evaluación no tiene preguntas para exportar');
  }

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="evalbot_${ev.codigo_publico || 'parcial'}_M${ev.modelo || 1}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(res);

  doc.fontSize(9).fillColor('#722f37')
     .text('EVALBOT · POLO EDUCATIVO TECNOLÓGICO', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(18).fillColor('#1d1d1f').text(ev.titulo, { align: 'center' });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#6e6e73')
     .text(`${ev.materia_nombre || ''} · ${ev.tipo || 'parcial'} · Modelo M${ev.modelo || 1}`, { align: 'center' });
  doc.fontSize(9).fillColor('#86868b')
     .text(`Código: ${ev.codigo_publico || '—'}  ·  ${preguntas.length} preguntas  ·  Nota máxima: ${ev.nota_maxima || 10}`, { align: 'center' });

  doc.moveDown(0.8);

  doc.fontSize(10).fillColor('#1d1d1f');
  doc.text('Alumno: _______________________________________________________');
  doc.moveDown(0.3);
  doc.text('Cédula: ______________________     Fecha: ____/____/__________');
  doc.moveDown(0.3);
  doc.text('Firma: ________________________________________________________');

  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e4ddd4').stroke();
  doc.moveDown(0.5);

  if (ev.instrucciones && ev.mostrar_instrucciones) {
    doc.fontSize(9).fillColor('#6e6e73').text('INSTRUCCIONES', { continued: false });
    doc.moveDown(0.2);
    doc.fontSize(9).fillColor('#1d1d1f').text(ev.instrucciones, { lineGap: 2 });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e4ddd4').stroke();
    doc.moveDown(0.5);
  }

  const letras = ['A', 'B', 'C', 'D', 'E'];

  for (let i = 0; i < preguntas.length; i++) {
    const p = preguntas[i];

    if (doc.y > 680) {
      doc.addPage();
    }

    doc.fontSize(11).fillColor('#1d1d1f').text(`${i + 1}. ${p.pregunta}`, { lineGap: 3 });
    doc.moveDown(0.3);

    let opciones = p.opciones;
    if (typeof opciones === 'string') {
      try { opciones = JSON.parse(opciones); } catch { opciones = null; }
    }

    if (Array.isArray(opciones) && opciones.length > 0) {
      for (let j = 0; j < opciones.length; j++) {
        doc.fontSize(10).fillColor('#424245')
           .text(`     ${letras[j] || '•'} )  ${opciones[j]}`, { lineGap: 1 });
      }
      doc.moveDown(0.15);
    } else {
      doc.fontSize(9).fillColor('#86868b').text('     Respuesta: _______________________________________________');
      doc.moveDown(0.15);
    }

    doc.moveDown(0.3);
  }

  doc.addPage();
  doc.fontSize(14).fillColor('#1d1d1f').text('Hoja de respuestas', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(9).fillColor('#6e6e73')
     .text('Marcá con una X la opción elegida en cada pregunta', { align: 'center' });
  doc.moveDown(0.8);

  const porFila = 3;
  const anchoCol = 165;
  const inicioX = 50;
  const startY = doc.y;
  let fila = 0;

  for (let i = 0; i < preguntas.length; i++) {
    const col = i % porFila;
    const x = inicioX + col * anchoCol;
    const y = startY + fila * 60;

    doc.fontSize(10).fillColor('#1d1d1f').text(`${i + 1}.`, x, y);
    doc.fontSize(8).fillColor('#424245').text('[ A ]   [ B ]   [ C ]   [ D ]', x + 20, y + 2);

    if (col === porFila - 1) fila++;
  }

  doc.fontSize(8).fillColor('#86868b')
     .text(`EvalBot · ${ev.codigo_publico || '—'} · Generado el ${new Date().toLocaleString('es-UY')}`,
           50, 800, { align: 'center', width: 495 });

  doc.end();
}

export async function setCantidadModelos(req, res) {
  const { id } = req.params;
  const { cantidad } = req.body || {};
  const num = Number(cantidad);
  if (!Number.isInteger(num) || num < 1 || num > 100) {
    return error(res, 400, 'cantidad debe ser entero entre 1 y 100');
  }

  const [preguntas] = await pool.query(
    'SELECT COUNT(*) AS total FROM preguntas_evaluacion WHERE evaluacion_id = ?',
    [id]
  );
  if (!preguntas[0].total) {
    return error(res, 422, 'La evaluación no tiene preguntas');
  }

  const maxPosibles = maxModelosPosibles(Number(preguntas[0].total));
  if (num > maxPosibles) {
    return error(res, 422, `Máximo ${maxPosibles} modelos para ${preguntas[0].total} preguntas`);
  }

  await pool.query('UPDATE evaluaciones SET cantidad_modelos = ? WHERE id = ?', [num, id]);
  return ok(res, { cantidad_modelos: num, cantidad_preguntas: preguntas[0].total });
}
