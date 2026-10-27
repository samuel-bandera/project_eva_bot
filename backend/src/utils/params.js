

export function parsearEntero(valor) {
  const n = Number(valor);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

export function validarIdParam(nombre = 'id') {
  return (req, res, next) => {
    const n = parsearEntero(req.params[nombre]);
    if (n === null) {
      return res.status(400).json({
        ok: false,
        error: `Parámetro "${nombre}" inválido`,
        valorRecibido: req.params[nombre]
      });
    }
    req.params[nombre] = n;
    next();
  };
}

