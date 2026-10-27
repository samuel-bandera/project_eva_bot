

export function aMySQLDatetime(valor) {
    if (valor === null || valor === undefined || valor === '') return null;

    const d = valor instanceof Date ? valor : new Date(valor);
    if (isNaN(d.getTime())) return null;

    const pad = (n) => String(n).padStart(2, '0');

    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
         `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function aMySQLDate(valor) {
  if (valor === null || valor === undefined || valor === '') return null;

  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return null;

  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

