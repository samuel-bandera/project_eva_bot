
import { parsearEntero } from '../utils/params.js';

const PARAMS_NUMERICOS = [
  'id',
  'rendicionId',
  'profesorId',
  'materiaId',
  'grupoId',
  'alumnoId',
  'usuarioId',
  'solicitudId',
  'reclamoId',
  'mensajeId',
  'entregaId',
  'tareaId',
  'evaluacionId',
  'archivoId',
];

export function registrarValidacionParams(router) {
  for (const nombre of PARAMS_NUMERICOS) {
    router.param(nombre, (req, res, next, valor) => {
      const num = parsearEntero(valor);
      if (num === null) {
        return res.status(400).json({
          ok: false,
          error: `Parámetro "${nombre}" inválido`,
          valorRecibido: valor,
          esperado: 'entero positivo'
        });
      }
      req.params[nombre] = num;
      next();
    });
  }
}

