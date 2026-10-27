

export function esCedulaUruguayaValida(cedula) {
  if (!cedula) return false;
  const limpia = String(cedula).replace(/[.\-\s]/g, '');
  if (!/^\d{8}$/.test(limpia)) return false;

  const factores = [2, 9, 8, 7, 6, 3, 4];
  let suma = 0;
  for (let i = 0; i < 7; i++) {
    suma += parseInt(limpia[i], 10) * factores[i];
  }
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === parseInt(limpia[7], 10);
}


export function normalizarCedula(cedula) {
  if (!cedula) return '';
  return String(cedula).replace(/[.\-\s]/g, '');
}


export function formatearCedula(cedula) {
  const limpia = normalizarCedula(cedula);
  if (limpia.length !== 8) return limpia;
  return `${limpia[0]}.${limpia.slice(1, 4)}.${limpia.slice(4, 7)}-${limpia[7]}`;
}


export function esTelefonoUruguayoValido(telefono) {
  if (!telefono) return false;
  const limpio = String(telefono).replace(/[\s\-().+]/g, '');
  return /^(598)?(9\d{7}|[24]\d{7})$/.test(limpio);
}


export function normalizarTelefono(telefono) {
  if (!telefono) return '';
  return String(telefono).replace(/\D/g, '');
}

export function formatearTelefono(telefono) {
  const limpio = normalizarTelefono(telefono);
  if (limpio.length === 9) {
    return `${limpio.slice(0, 3)} ${limpio.slice(3, 6)} ${limpio.slice(6, 9)}`;
  }
  if (limpio.length === 8) {
    return `${limpio.slice(0, 2)} ${limpio.slice(2, 5)} ${limpio.slice(5, 8)}`;
  }
  return limpio;
}

