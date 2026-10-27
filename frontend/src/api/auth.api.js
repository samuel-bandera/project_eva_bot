import http from './http.js';
import {
  loginSchema,
  registroSchema,
  verificacionCodigoSchema
} from './auth.schema.js';

export async function login(usuario, contrasena) {
  const validacion = loginSchema.safeParse({ usuario, contrasena });

  if (!validacion.success) {
    throw new Error(validacion.error.errors[0].message);
  }

  try {
    const response = await http.post('/auth/login', validacion.data);
    return response.data?.data ?? response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function registro(payload) {
  const validacion = registroSchema.safeParse(payload);

  if (!validacion.success) {
    const primerError = validacion.error.errors[0].message;
    throw new Error(primerError);
  }

  try {
    const response = await http.post('/auth/registro', validacion.data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function verificarCodigo(codigo) {
  const validacion = verificacionCodigoSchema.safeParse({ codigo });

  if (!validacion.success) {
    throw new Error(validacion.error.errors[0].message);
  }

  try {
    const response = await http.post('/auth/verificar-codigo', validacion.data);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function logout() {
  try {
    await http.post('/auth/logout');
  } catch (error) {
    console.warn('Advertencia al cerrar sesión en el servidor:', error);
  }
}

export async function perfil() {
  try {
    const response = await http.get('/auth/perfil');
    return response.data?.data ?? response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function actualizarPerfil(datos) {
  try {
    const response = await http.patch('/auth/perfil', datos);
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function cambiarPassword({ contrasenaActual, contrasenaNueva }) {
  try {
    const response = await http.post('/auth/cambiar-password', {
      contrasenaActual,
      contrasenaNueva,
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function subirAvatar(archivo) {
  try {
    const formData = new FormData();
    formData.append('avatar', archivo);
    const response = await http.post('/auth/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function solicitarCodigo(email, proposito = 'registro') {
  try {
    const { data } = await http.post('/auth/solicitar-codigo', { email, proposito });
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function verificarCodigoEmail(email, codigo) {
  try {
    const { data } = await http.post('/auth/verificar-codigo', { email, codigo });
    return data;
  } catch (error) {
    throw error.response?.data || error;
  }
}

export async function resetearPassword({ email, codigo, nuevaContrasena }) {
  const { data } = await http.post('/auth/resetear-password', {
    email, codigo, nuevaContrasena,
  });
  return data;
}
