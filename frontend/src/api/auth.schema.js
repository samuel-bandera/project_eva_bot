import { z } from 'zod';

const USUARIO_REGEX = /^[a-zA-Z0-9._-]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export const loginSchema = z.object({
  usuario: z.string().min(1, 'El usuario es obligatorio').trim(),
  contrasena: z.string().min(1, 'La contraseña es obligatoria'),
});

export const registroPaso1Schema = z.object({
  nombre: z
    .string()
    .min(2, 'Mínimo 2 letras')
    .max(50, 'Máximo 50 letras')
    .trim(),
  apellido: z
    .string()
    .min(2, 'Mínimo 2 letras')
    .max(50, 'Máximo 50 letras')
    .trim(),
  tipo: z.enum(['alumno', 'docente'], {
    errorMap: () => ({ message: 'Elegí un tipo de cuenta' }),
  }),
});

export const registroPaso2Schema = z.object({
  email: z
    .string()
    .email('Email inválido')
    .trim()
    .toLowerCase(),
  codigoEmail: z
    .string()
    .length(6, 'Debe tener 6 dígitos')
    .regex(/^\d+$/, 'Solo números'),
  telefono: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^[\d\s\-().+]+$/.test(val),
      'Formato de teléfono inválido'
    ),
  cedula: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || /^[\d.\-\s]+$/.test(val),
      'Formato de cédula inválido'
    ),
});

export const registroPaso3Schema = z
  .object({
    usuario: z
      .string()
      .min(4, 'Mínimo 4 caracteres')
      .max(20, 'Máximo 20 caracteres')
      .regex(USUARIO_REGEX, 'Solo letras, números, puntos y guiones')
      .trim(),
    contrasena: z
      .string()
      .regex(
        PASSWORD_REGEX,
        'Mínimo 8 caracteres: una mayúscula, una minúscula, un número y un símbolo (@$!%*?&)'
      ),
    confirmar: z.string().min(1, 'Confirmá la contraseña'),
    codigoProfesor: z.string().optional().nullable(),
    tipo: z.enum(['alumno', 'docente']),
  })
  .refine((data) => data.contrasena === data.confirmar, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmar'],
  })
  .refine(
    (data) =>
      data.tipo !== 'docente' || (data.codigoProfesor && data.codigoProfesor.trim().length > 0),
    {
      message: 'El código de invitación es obligatorio para profesores',
      path: ['codigoProfesor'],
    }
  );

export const registroCompletoSchema = z.object({
  nombre: z.string().min(2).max(50).trim(),
  apellido: z.string().min(2).max(50).trim(),
  usuario: z.string().min(4).max(20).regex(USUARIO_REGEX).trim(),
  email: z.string().email().trim().toLowerCase(),
  contrasena: z.string().regex(PASSWORD_REGEX),
  tipo: z.enum(['alumno', 'docente']),
  cedula: z.string().optional().nullable(),
  telefono: z.string().optional().nullable(),
  codigoProfesor: z.string().optional().nullable(),
  codigoEmail: z.string().length(6).regex(/^\d+$/),
});

export const verificacionCodigoSchema = z.object({
  email: z.string().email(),
  codigo: z
    .string()
    .length(6, 'Debe ser de exactamente 6 dígitos')
    .regex(/^\d+$/, 'Solo números enteros'),
});

export const registroSchema = registroCompletoSchema;
