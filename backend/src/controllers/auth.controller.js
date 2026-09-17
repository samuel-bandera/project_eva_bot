import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import {
  crearUsuario,
  buscarUsuarioPorNombre,
  buscarUsuarioPorId,
} from '../models/db.model.js';

function firmarToken(user) {
  return jwt.sign(
    { id: user.id, usuario: user.usuario, tipo: user.tipo },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '7d' }
  );
}

// POST /api/v1/auth/register
export async function register(req, res) {
  try {
    const { nombre, apellido, usuario, contrasena, tipo } = req.body;

    if (!nombre || !apellido || !usuario || !contrasena) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    const tipoFinal = ['alumno', 'profesor', 'admin'].includes(tipo) ? tipo : 'alumno';

    const existente = await buscarUsuarioPorNombre(usuario);
    if (existente) {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }

    const hash = await bcrypt.hash(contrasena, 10);
    const id = await crearUsuario({
      nombre, apellido, usuario,
      contrasena: hash,
      tipo: tipoFinal,
    });

    const user = { id, usuario, tipo: tipoFinal };
    const token = firmarToken(user);

    res.status(201).json({
      message: 'Usuario registrado',
      token,
      user,
    });
  } catch (err) {
    console.error('Error en register:', err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

// POST /api/v1/auth/login
export async function login(req, res) {
  try {
    const { usuario, contrasena } = req.body;
    if (!usuario || !contrasena) {
      return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
    }

    const user = await buscarUsuarioPorNombre(usuario);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const ok = await bcrypt.compare(contrasena, user.contrasena);
    if (!ok) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = firmarToken(user);

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        apellido: user.apellido,
        usuario: user.usuario,
        tipo: user.tipo,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

// GET /api/v1/auth/me
export async function me(req, res) {
  try {
    const user = await buscarUsuarioPorId(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Error en me:', err);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}