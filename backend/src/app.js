import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { testConnection } from './config/db.js';
import authRoutes from './routes/api/v1/auth.routes.js';
import evaluarRoutes from './routes/api/v1/evaluar.routes.js';

dotenv.config();

const app = express();

// ---------- Middlewares globales ----------
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Health check ----------
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------- Rutas API ----------
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/evaluaciones', evaluarRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ---------- Manejo centralizado de errores (inline) ----------
app.use((err, req, res, next) => {
  console.error('💥 Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ---------- Arranque ----------
const PORT = process.env.PORT || 3000;

async function start() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`🚀 Backend EvalBot en http://localhost:${PORT}`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`   API:    http://localhost:${PORT}/api/v1`);
  });
}

start();