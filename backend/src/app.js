import 'express-async-errors';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { testConnection } from './config/db.js';
import routes from './routes/index.js';
import { noEncontrado, manejadorErrores } from './middlewares/error_middleware.js';
import { inicializarWebSocket } from './services/socket_service.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const servidorHttp = createServer(app);
const PORT = process.env.PORT || 3000;

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      scriptSrc:     ["'self'"],
      styleSrc:      ["'self'", "'unsafe-inline'"],
      imgSrc:        ["'self'", "data:", "blob:"],
      fontSrc:       ["'self'", "data:"],
      connectSrc:    ["'self'", "ws:", "wss:"],
      objectSrc:     ["'none'"],
      baseUri:       ["'self'"],
      formAction:    ["'self'"],
      frameAncestors:["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-site' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  permittedCrossDomainPolicies: false,
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiadas peticiones. Intente más tarde.' },
}));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => {
  res.json({ ok: true, servicio: 'evalbot-backend', fecha: new Date() });
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Demasiados intentos de login. Espere 15 minutos.' },
});
app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1/auth/registro', loginLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/v1', routes);

app.use(noEncontrado);
app.use(manejadorErrores);

async function iniciar() {
  try {
    await testConnection();

    inicializarWebSocket(servidorHttp);

    servidorHttp.listen(PORT, () => {
      if (process.env.NODE_ENV !== 'production') console.log(`Servidor corriendo en http://localhost:${PORT}`);
      if (process.env.NODE_ENV !== 'production') console.log(`  Healthcheck: http://localhost:${PORT}/health`);
      if (process.env.NODE_ENV !== 'production') console.log(`  API base:    http://localhost:${PORT}/api/v1`);
      if (process.env.NODE_ENV !== 'production') console.log(`  WebSocket:   ws://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Error iniciando servidor:', err);
    process.exit(1);
  }
}

iniciar();

app.use((err, req, res, next) => {
  if (!err) return next();
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ ok: false, error: 'El archivo supera el tamaño permitido' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE' || err.code === 'LIMIT_FILE_COUNT') {
    return res.status(422).json({ ok: false, error: 'Archivo no permitido o demasiados archivos' });
  }
  if (err.message && err.message.startsWith('Tipo de archivo no permitido')) {
    return res.status(415).json({ ok: false, error: err.message });
  }
  if (err.name === 'MulterError') {
    return res.status(422).json({ ok: false, error: `Error de subida: ${err.message}` });
  }
  return next(err);
});

export default app;

