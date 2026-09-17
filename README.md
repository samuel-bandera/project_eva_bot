# 🎓 EvalBot — Sistema de evaluación con IA

Sistema web para que profesores creen evaluaciones, alumnos las respondan,
y una IA corrija automáticamente generando notas y feedback.

---

## 🧱 Stack

- **Frontend:** Vue 3 + Vite + Pinia + Vue Router + Axios
- **Backend:** Node.js + Express + mysql2 + JWT
- **Base de datos:** MySQL 8 (en Docker)
- **IA:** API externa para corrección automática

---

## 📁 Estructura

```
evalbot/
├── docs/          → Documentación
├── backend/       → API REST
├── frontend/      → SPA Vue
├── docker/        → Infraestructura
├── start.sh       → Arranque todo-en-uno
└── README.md
```

---

## 🚀 Quick start

### Requisitos previos

- Docker + Docker Compose
- Node.js 20+
- npm 10+

### Levantar todo

```bash
chmod +x start.sh
./start.sh
```

Eso hace automáticamente:

1. Verifica dependencias (`docker`, `node`, `npm`)
2. Levanta MySQL en Docker
3. Espera a que MySQL esté `healthy`
4. Instala dependencias si faltan
5. Levanta backend y frontend en paralelo
6. `Ctrl+C` apaga todo limpiamente

### Servicios disponibles

| Servicio  | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:5173        |
| Backend   | http://localhost:3000        |
| MySQL     | localhost:3306               |

---

## 📖 Documentación

| Documento                        | Contenido                              |
|----------------------------------|----------------------------------------|
| `docs/arquitectura.md`           | Stack, capas, decisiones técnicas      |
| `docs/base-de-datos.md`          | Modelo relacional completo             |
| `docs/requerimientos.md`         | Funcionalidades por rol                |
| `docs/bitacora.md`               | Registro cronológico de avances        |

---

## 🔐 Variables de entorno

Copiar `.env.example` a `.env` en backend y frontend, y completar valores.

**Nunca commitear `.env`.**

---

## 🧪 Comandos útiles

```bash
# Levantar solo MySQL
cd docker && docker compose up -d

# Ver logs de MySQL
cd docker && docker compose logs -f mysql

# Apagar y borrar datos
cd docker && docker compose down -v

# Backend en modo dev
cd backend && npm run dev

# Frontend en modo dev
cd frontend && npm run dev
```

---

## 🗺️ Roadmap

- [x] Estructura inicial
- [x] Modelo de base de datos
- [ ] Backend: auth + evaluaciones
- [ ] Frontend: login + dashboards
- [ ] Integración con IA
- [ ] Entregas de código
- [ ] Dockerización completa

---

## 👤 Autor

**Samuel Bandera** — 2026

---

## 📄 Licencia

MIT
