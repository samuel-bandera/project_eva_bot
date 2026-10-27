const colores = {
  fondo: '#f5f5f7',
  tarjeta: '#ffffff',
  tarjetaAlterna: '#fafafa',
  texto: '#1d1d1f',
  textoSecundario: '#6e6e73',
  textoTerciario: '#86868b',
  textoCuaternario: '#a1a1a6',
  borde: '#e8e8ed',
  bordeAlterno: '#f0f0f0',
  primario: '#722f37',
  primarioOscuro: '#4a1e24',
  alerta: '#b8721e',
  alertaFondo: '#fff4e6',
};

const fuenteTexto = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const fuenteMono = "'SF Mono', 'Menlo', 'Consolas', monospace";

const logoEvalbot = `<div style="display: inline-block; width: 56px; height: 56px; background: linear-gradient(135deg, ${colores.primario} 0%, ${colores.primarioOscuro} 100%); border-radius: 16px; margin-bottom: 24px; text-align: center;">
  <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display: block; margin: 12px auto;">
    <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#ffffff"/>
    <path d="M6 10V15.5C6 15.5 8.5 18 12 18C15.5 18 18 15.5 18 15.5V10" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M22 7V12.5" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="22" cy="13.5" r="1" fill="#ffffff"/>
  </svg>
</div>`;

export function plantilla({ titulo, tituloHtml, contenido }) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tituloHtml || titulo}</title>
</head>
<body style="margin: 0; padding: 0; background: ${colores.fondo}; font-family: ${fuenteTexto}; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background: ${colores.fondo}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; background: ${colores.tarjeta}; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);">
          <tr>
            <td style="padding: 40px 40px 24px 40px; text-align: center;">
              ${logoEvalbot}
              <h1 style="margin: 0; color: ${colores.texto}; font-size: 24px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.2;">
                ${titulo}
              </h1>
            </td>
          </tr>
          ${contenido}
          <tr>
            <td style="padding: 20px 40px; background: ${colores.tarjetaAlterna}; border-top: 1px solid ${colores.bordeAlterno}; text-align: center;">
              <p style="margin: 0; color: ${colores.textoTerciario}; font-size: 12px; font-weight: 500;">EvalBot</p>
              <p style="margin: 4px 0 0 0; color: ${colores.textoCuaternario}; font-size: 11px;">Polo Educativo Tecnológico</p>
            </td>
          </tr>
        </table>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 480px; margin-top: 16px;">
          <tr>
            <td style="padding: 0 20px; text-align: center;">
              <p style="margin: 0; color: ${colores.textoCuaternario}; font-size: 11px; line-height: 1.5;">
                Este es un mensaje automático de EvalBot. Por favor no respondas a este email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function plantillaCodigoVerificacion(codigo, minutosExpiracion = 10) {
  const contenido = `
    <tr>
      <td style="padding: 0 40px 24px 40px; text-align: center;">
        <p style="margin: 0; color: ${colores.textoSecundario}; font-size: 15px; line-height: 1.6;">
          Ingresá este código para completar tu registro en EvalBot
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 40px 24px 40px;">
        <div style="background: ${colores.tarjetaAlterna}; border: 1px solid ${colores.borde}; border-radius: 16px; padding: 28px 20px; text-align: center;">
          <div style="font-family: ${fuenteMono}; font-size: 40px; font-weight: 700; color: ${colores.primario}; letter-spacing: 12px; padding-left: 12px;">
            ${codigo}
          </div>
        </div>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 40px 32px 40px; text-align: center;">
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
          <tr>
            <td style="padding: 6px 14px; background: ${colores.alertaFondo}; border-radius: 100px; font-size: 13px; color: ${colores.alerta}; font-weight: 500;">
              ⏱  Expira en ${minutosExpiracion} minutos
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 0 40px;"><div style="height: 1px; background: ${colores.bordeAlterno};"></div></td>
    </tr>
    <tr>
      <td style="padding: 24px 40px 32px 40px; text-align: center;">
        <p style="margin: 0; color: ${colores.textoTerciario}; font-size: 13px; line-height: 1.5;">
          Si no solicitaste este código, podés ignorar este email.
        </p>
      </td>
    </tr>`;
  return plantilla({
    titulo: 'Verificá tu email',
    tituloHtml: 'Código de verificación',
    contenido,
  });
}
