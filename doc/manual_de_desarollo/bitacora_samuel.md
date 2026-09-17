# 📓 Bitácora de Desarrollo — EvalBot

> **Proyecto:** EvalBot — Sistema de evaluación con IA
> **Repositorio:** `evalbot`
> **Autor principal:** Samuel Bandera
> **Inicio del proyecto:** 09/09/2026
> **Última actualización:** 09/17/2026 14:00

---

## 📖 ¿Qué es esta bitácora?

Este documento registra **de forma cronológica** todas las decisiones
técnicas, avances, problemas y soluciones del proyecto EvalBot.

**Objetivos:**

1. Dejar trazabilidad de **qué se hizo, cuándo y por qué**.
2. Servir como **material de defensa** del proyecto (materia, presentación).
3. Evitar perder contexto entre sesiones de desarrollo.
4. Documentar **errores y soluciones** para no repetirlos.

---

## 🧭 Convenciones usadas

### Estados de una entrada

| Ícono | Estado        | Significado                                  |
|-------|---------------|----------------------------------------------|
| 🟡    | En progreso   | Se está trabajando actualmente               |
| ✅    | Completado    | Terminado y verificado                       |
| ❌    | Bloqueado     | Detenido por algún problema pendiente        |
| 🔄    | En revisión   | Hecho, pero falta validar                    |
| ⏸️    | Pausado       | Detenido temporalmente                       |

### Tipo de entrada

- `[SETUP]`     → configuración inicial, estructura, entorno
- `[FEAT]`      → nueva funcionalidad
- `[FIX]`       → corrección de bug
- `[DOC]`       → documentación
- `[REFACTOR]`  → reestructuración de código
- `[DB]`        → cambios en base de datos
- `[TEST]`      → pruebas
- `[DEPLOY]`    → despliegue / infraestructura

### Formato de hora

Todas las horas se registran en formato 24h local: `HH:MM`.

---

## 📚 Índice de entradas

| #  | Fecha       | Hora  | Tipo      | Título                                        | Estado |
|----|-------------|-------|-----------|-----------------------------------------------|--------|
| 01 | 09/09/2026  | 14:30 | `[SETUP]` | Creación de estructura de carpetas            | ✅     |
| 02 | 09/10/2026  | 16:15 | `[DB]`    | Diseño del modelo de base de datos            | ✅     |
| 03 | 09/12/2026  | 18:00 | `[DB]`    | Implementación del schema SQL + Docker        | ✅     |
| 04 | 09/14/2026  | 02:30 | `[FEAT]`  | Implementación del backend (API REST)         | ✅     |
| 05 | 09/17/2026  | 22:15 | `[FEAT]`  | Configuración del frontend (Vue 3 + Vite)     | 🔄     |
| 06 | 09/17/2026  | 02:00 | `[TEST]`  | Integración end-to-end (login funcionando)    | ✅     |
| 07 | _pendiente_ | —     | `[FEAT]`  | CRUD de evaluaciones en frontend              | ⏸️     |
| 08 | _pendiente_ | —     | `[FEAT]`  | Integración con IA para corrección            | ⏸️     |

## [Entrada 01] — Creación de estructura de carpetas

**Fecha:** 09/09/2026
**Hora:** 14:30
**Tipo:** `[SETUP]`
**Estado:** ✅ Completado
**Autor:** Samuel Bandera

### 🎯 Objetivo

Definir y crear la estructura base del proyecto **EvalBot** separando
claramente frontend, backend y base de datos, para trabajar de forma
ordenada y escalable.

### 🛠️ Comando usado

Se ejecutó un script Bash (`setup`) que genera toda la
estructura de carpetas y archivos base de una sola vez.

```bash
chmod +x setup-evalbot.sh
./setup-evalbot.sh
```

### 📁 Estructura creada

```
evalbot/
│
├── docs/                      <-- Documentación en texto plano
│   ├── arquitectura.md        <-- Estructura y decisiones técnicas
│   ├── base-de-datos.md       <-- Diseño del modelo relacional
│   ├── requerimientos.md      <-- Funcionalidades del sistema
│   └── bitacora.md            <-- Este archivo (registro de avance)
│
├── backend/                   <-- API REST (Node.js + Express)
│   ├── src/
│   │   ├── app.js             <-- Punto de entrada del servidor
│   │   ├── config/
│   │   │   └── db.js          <-- Conexión única a MySQL
│   │   ├── controllers/
│   │   │   ├── auth.controller.js      <-- Login, registro, sesiones
│   │   │   └── evaluar.controller.js   <-- Exámenes, respuestas, notas
│   │   ├── middlewares/
│   │   │   └── auth.middleware.js      <-- Validación de sesión y roles
│   │   ├── models/
│   │   │   └── db.model.js             <-- Consultas centralizadas a MySQL
│   │   ├── routes/
│   │   │   └── api/v1/
│   │   │       ├── auth.routes.js      <-- Endpoints de autenticación
│   │   │       └── evaluar.routes.js   <-- Endpoints de evaluación
│   │   └── services/
│   │       └── ia.service.js           <-- Conexión con la API de IA
│   ├── .env                   <-- Variables de entorno (credenciales)
│   └── package.json           <-- Dependencias del backend
│
├── frontend/                  <-- SPA con Vue 3 + Vite
│   ├── src/
│   │   ├── api/               <-- Cliente HTTP centralizado (axios)
│   │   ├── components/        <-- Componentes reutilizables
│   │   ├── views/             <-- Vistas por ruta/pantalla
│   │   ├── router/            <-- Configuración de vue-router
│   │   ├── stores/            <-- Estado global (Pinia)
│   │   ├── App.vue            <-- Componente raíz
│   │   └── main.js            <-- Punto de entrada de Vue
│   ├── index.html             <-- HTML base de la SPA
│   ├── vite.config.js         <-- Configuración de Vite
│   └── package.json           <-- Dependencias del frontend
│
├── docker/                    <-- Infraestructura con Docker
│   ├── docker-compose.yml     <-- Orquestación de contenedores
│   └── mysql/
│       └── init/
│           └── 01-schema.sql  <-- Script SQL inicial (se ejecuta 1ra vez)
│
├── start.sh                   <-- Script para levantar todo el entorno
└── README.md                  <-- Presentación general del repositorio
```

### 🧠 Justificación de la estructura

#### 1. Separación frontend / backend

- El frontend (Vue) y el backend (Express) son proyectos **independientes**.
- Se comunican únicamente por **API REST (JSON)**.
- Permite desplegarlos por separado y escalarlos de forma autónoma.

#### 2. Carpeta `docs/`

- Centraliza toda la documentación del proyecto en texto plano.
- Permite registrar decisiones técnicas y avances sin depender de
  herramientas externas.

#### 3. Carpeta `backend/src/`

Sigue el patrón **MVC adaptado a API REST**:

| Carpeta       | Responsabilidad                              |
|---------------|----------------------------------------------|
| `controllers` | Lógica de cada endpoint                      |
| `models`      | Acceso a datos (consultas SQL)               |
| `routes`      | Definición de endpoints (`/api/v1/...`)      |
| `middlewares` | Validaciones previas (auth, roles, errores)  |
| `services`    | Lógica externa (ej: API de IA)               |

> Todo lo relacionado a la base de datos vive **solo** en el backend.

#### 4. Carpeta `frontend/src/`

Estructura estándar de una **SPA con Vue 3**:

| Carpeta       | Responsabilidad                              |
|---------------|----------------------------------------------|
| `views`       | Pantallas completas (login, dashboard, etc.) |
| `components`  | Piezas reutilizables (botones, tablas, forms)|
| `router`      | Navegación entre vistas                      |
| `stores`      | Estado global con Pinia                      |
| `api`         | Cliente HTTP centralizado                    |

> El frontend **nunca** accede directo a MySQL.

#### 5. Carpeta `docker/`

- Aísla la base de datos **MySQL en un contenedor**.
- El script `01-schema.sql` se ejecuta automáticamente la primera vez
  que se levanta el contenedor (cuando el volumen está vacío).
- Los datos persisten en un **volumen nombrado** (`mysql_data`).

#### 6. Archivo `start.sh`

Automatiza el arranque completo del entorno de desarrollo:

1. Verifica dependencias (`docker`, `node`, `npm`)
2. Levanta MySQL
3. Espera a que esté `healthy`
4. Instala dependencias si faltan
5. Levanta backend y frontend en paralelo
6. Con `Ctrl+C` apaga todo limpiamente

#### 7. Archivo `.env` en backend

- Mantiene fuera del repositorio credenciales sensibles
  (password de MySQL, JWT secret, API key de la IA).

#### 8. Comunicación general del sistema

```
[Navegador]
     |
     | HTTP (JSON)
     v
[Frontend Vue — puerto 5173]
     |
     | HTTP (JSON) → API REST /api/v1/...
     v
[Backend Express — puerto 3000]
     |
     | mysql2 (pool de conexiones)
     v
[MySQL en Docker — puerto 3306]
```

### 🧩 Decisiones técnicas tomadas

| Decisión                          | Alternativa descartada        | Motivo                                        |
|-----------------------------------|-------------------------------|-----------------------------------------------|
| Vue 3 + Vite como SPA             | Handlebars SSR                | Mejor separación frontend/backend             |
| MySQL en Docker                   | MySQL local instalado         | Portabilidad y consistencia entre entornos    |
| API REST versionada (`/api/v1/`)  | Rutas sin versión             | Facilita evolución futura                     |
| Pinia para estado global          | Vuex                          | API más simple y moderna (recomendada por Vue)|
| Axios como cliente HTTP           | Fetch nativo                  | Interceptores y mejor manejo de errores       |

### 🐛 Problemas encontrados

Ninguno en esta etapa.

### ✅ Estado

- Estructura creada y verificada.
- Pendiente de renombrar `docs/*.txt` a `docs/*.md` (decisión de formato).

### 🔜 Próximo paso

- ✅ Completado → ver [Entrada 02].
- Pendiente: implementar el modelo en `docker/mysql/init/01-schema.sql`..

### 📎 Referencias

- `docker/docker-compose.yml` → configuración de MySQL
- `start.sh` → script de arranque

---

---

## [Entrada 02] — Diseño del modelo de base de datos

**Fecha:** 09/09/2026
**Hora:** 16:15
**Tipo:** `[DB]`
**Estado:** ✅ Completado
**Autor:** Samuel Bandera

### 🎯 Objetivo

Diseñar el modelo relacional de la base de datos `sistema_evaluaciones`
que soporte todos los requerimientos funcionales del sistema:

- Autenticación con roles (alumno, profesor, admin).
- Creación de evaluaciones por parte del profesor.
- Preguntas asociadas a cada evaluación.
- Rendición de evaluaciones por parte de los alumnos.
- Respuestas con corrección automática vía IA.
- Entregas de código para revisión del profesor.

### 🛠️ Qué se hizo

1. Se identificaron las **6 entidades principales** del sistema.
2. Se definieron atributos, tipos de datos y restricciones.
3. Se establecieron las **relaciones** y cardinalidades (1:N, N:M).
4. Se agregaron **FKs con ON DELETE CASCADE** para mantener integridad.
5. Se documentó todo en `docs/base-de-datos.md`.
6. Se implementó el SQL en `docker/mysql/init/01-schema.sql`.

### 🧩 Entidades del modelo

| # | Tabla                  | Propósito                                          |
|---|------------------------|----------------------------------------------------|
| 1 | `usuarios`             | Alumnos, profesores y admins (rol unificado)       |
| 2 | `evaluaciones`         | Evaluaciones creadas por profesores                |
| 3 | `preguntas`            | Preguntas de cada evaluación                       |
| 4 | `evaluaciones_alumnos` | Rendiciones: qué alumno rindió qué evaluación      |
| 5 | `respuestas`           | Respuestas + corrección de la IA                   |
| 6 | `entregas_codigo`      | Entregas de archivos de código                     |

### 🔗 Relaciones principales

| Relación                                     | Cardinalidad |
|----------------------------------------------|--------------|
| `usuarios` → `evaluaciones`                  | 1 : N        |
| `evaluaciones` → `preguntas`                 | 1 : N        |
| `evaluaciones` → `evaluaciones_alumnos`      | 1 : N        |
| `usuarios` (alumno) → `evaluaciones_alumnos` | 1 : N        |
| `evaluaciones_alumnos` → `respuestas`        | 1 : N        |
| `preguntas` → `respuestas`                   | 1 : N        |
| `usuarios` (alumno) → `entregas_codigo`      | 1 : N        |
| `usuarios` (profesor) → `entregas_codigo`    | 1 : N        |

### 🧠 Decisiones de diseño tomadas

| Decisión                                   | Alternativa descartada        | Motivo                                        |
|--------------------------------------------|-------------------------------|-----------------------------------------------|
| Tabla única `usuarios` con campo `tipo`    | Tablas separadas por rol      | Simplifica FK; evita duplicar estructura      |
| `ON DELETE CASCADE` en todas las FK        | `RESTRICT` / `SET NULL`       | Borrar un usuario limpia todo lo dependiente  |
| `UNIQUE (evaluacion_id, alumno_id)`        | Sin restricción               | Evita que un alumno rinda dos veces lo mismo  |
| `DECIMAL(4,2)` para notas                  | `FLOAT`                       | Precisión exacta para calificaciones          |
| `DATETIME DEFAULT CURRENT_TIMESTAMP`       | Fecha enviada desde backend   | Autocompleta sin intervención del backend     |
| `ENUM` para roles y estados                | Tablas auxiliares             | Validación a nivel BD + ahorro de espacio     |
| `ENGINE=InnoDB` en todas las tablas        | MyISAM                        | Requerido para FK, transacciones y bloqueos   |

### 📁 Archivos generados / actualizados

- `docs/base-de-datos.md` → documentación completa del modelo.
- `docker/mysql/init/01-schema.sql` → script SQL de creación de tablas.

### 🐛 Problemas encontrados

## 🐛 Problemas encontrados

> ⚠️ **Estado:** pendientes de resolver. Se dejan documentados
> para abordarlos en una etapa posterior.

| # | Problema | Severidad | Estado |
|---|----------|-----------|--------|
| 1 | `ON DELETE CASCADE` en todas las FK | 🔴 Crítico | ⏳ Pendiente |
| 2 | Sin soft delete (`deleted_at`) | 🔴 Crítico | ⏳ Pendiente |
| 3 | Sin validación de rol en FK | 🔴 Crítico | ⏳ Pendiente |
| 4 | `respuestas` sin UNIQUE compuesto | 🟡 Importante | ⏳ Pendiente |
| 5 | `preguntas` sin `orden` ni `puntaje` | 🟡 Importante | ⏳ Pendiente |
| 6 | Notas sin CHECK de rango | 🟡 Importante | ⏳ Pendiente |
| 7 | `correccion_ia` como TEXT en vez de JSON | 🟡 Importante | ⏳ Pendiente |
| 8 | Sin `intento` en `evaluaciones_alumnos` | 🟡 Importante | ⏳ Pendiente |
| 9 | Sin `actualizado_en` en tablas | 🟡 Importante | ⏳ Pendiente |
| 10 | Entregas sin metadata (hash, tamaño, mime) | 🟡 Importante | ⏳ Pendiente |
| 11 | `ruta_archivo` sin UUID (colisiones) | 🟡 Importante | ⏳ Pendiente |
| 12 | Sin tabla `logs` de auditoría | 🟢 Menor | ⏳ Pendiente |
| 13 | Sin `email` en `usuarios` | 🟢 Menor | ⏳ Pendiente |
| 14 | Nombre y apellido en un solo campo | 🟢 Menor | ⏳ Pendiente |
| 15 | Escala de notas no documentada | 🟢 Menor | ⏳ Pendiente |

### ⚠️ Puntos a revisar a futuro

1. Falta tabla `opciones` si se quieren preguntas de múltiple choice.
2. Falta campo `intento` en `evaluaciones_alumnos` si se permiten
   múltiples intentos por evaluación.
3. No hay **soft delete** (`deleted_at`) — el CASCADE borra todo
   definitivamente.
4. `correccion_ia` es `TEXT` — si la IA devuelve JSON, conviene
   migrar a tipo `JSON` de MySQL 8.
5. Falta tabla `logs` para auditar acciones sensibles.
6. `ruta_archivo` podría incluir un hash para evitar colisiones.

### ✅ Estado

- Modelo diseñado y documentado.
- SQL implementado y listo para ejecutarse la primera vez que
  se levante el contenedor MySQL con el volumen vacío.

### 🔜 Próximo paso

- Configurar `docker-compose.yml` para que monte la carpeta
  `mysql/init/` y ejecute el schema automáticamente.
- Implementar el backend:
  - `package.json` con dependencias (express, mysql2, cors, dotenv, bcrypt, jsonwebtoken).
  - `app.js` con la configuración base de Express.
  - `config/db.js` con el pool de conexiones a MySQL.
  - Primer endpoint: `POST /api/v1/auth/register` y `login`.

- ✅ Completado → ver [Entrada 03], [Entrada 04] y [Entrada 05].

### 📎 Referencias

- `docs/base-de-datos.md` → modelo completo con detalle de cada tabla
- `docker/mysql/init/01-schema.sql` → implementación SQL
- `docs/arquitectura.md` → stack y decisiones técnicas generales
- `docs/requerimientos.md` → funcionalidades que el modelo debe soportar

---
## [Entrada 03] — Implementación del schema SQL + Docker

**Fecha:** 09/12/2026
**Hora:** 18:00
**Tipo:** `[DB]`
**Estado:** ✅ Completado
**Autor:** Samuel Bandera

### 🎯 Objetivo

Levantar MySQL en Docker con el schema de EvalBot aplicado
automáticamente al primer arranque, y dejar un script `start.sh`
que levante todo el entorno con un solo comando.

### 🛠️ Qué se hizo

1. Se configuró `docker/docker-compose.yml` con:
   - Imagen `mysql:8.0`
   - Charset `utf8mb4` forzado por `command`
   - Volumen nombrado `mysql_data` para persistencia
   - `healthcheck` con `mysqladmin ping`
   - Red `evalbot_network`
2. Se creó `docker/.env` con credenciales separadas del compose.
3. Se implementó `docker/mysql/init/01-schema.sql` con las 6 tablas.
4. Se escribió `start.sh` que automatiza todo el arranque.

### 📁 Archivos creados / modificados

| Archivo | Propósito |
|---------|-----------|
| `docker/docker-compose.yml` | Orquestación de MySQL |
| `docker/.env` | Credenciales (fuera del repo) |
| `docker/mysql/init/01-schema.sql` | Schema inicial |
| `start.sh` | Arranque todo-en-uno |

### 🧠 Decisiones tomadas

| Decisión | Alternativa | Motivo |
|----------|-------------|--------|
| MySQL 8.0 en Docker | MySQL instalado local | Portabilidad y aislamiento |
| Puerto host `3307` | `3306` | Evitar choque con MySQL local |
| Volumen nombrado `mysql_data` | Bind mount | Mejor performance y limpieza |
| Healthcheck con `CMD-SHELL` | `CMD` | Permite expandir variables del contenedor |

### 🐛 Problemas encontrados y soluciones

| # | Problema | Causa | Solución |
|---|----------|-------|----------|
| 1 | `start.sh` daba error de sintaxis | `until` duplicado y llave faltante | Limpiar el archivo y validar con `bash -n start.sh` |
| 2 | MySQL quedaba `unhealthy` | `${MYSQL_USER}` no se expandía en `CMD` | Cambiar a `CMD-SHELL` con `$$MYSQL_USER` |
| 3 | Puerto `3306` chocaba con MySQL local | — | Se usó `3307:3306` en compose y `DB_PORT=3307` en backend |

### ✅ Estado

- MySQL levanta correctamente en `localhost:3307`.
- El schema se aplica la primera vez (volumen vacío).
- El healthcheck devuelve `healthy` en ~15 segundos.
- `start.sh` funciona end-to-end.

### 🔜 Próximo paso

- Implementar el backend (Express + mysql2).

### 📎 Referencias

- `docker/docker-compose.yml`
- `docker/mysql/init/01-schema.sql`
- `start.sh`

---

## [Entrada 04] — Implementación del backend (API REST)

**Fecha:** 09/14/2026
**Hora:** 02:30
**Tipo:** `[FEAT]`
**Estado:** ✅ Completado
**Autor:** Samuel Bandera

### 🎯 Objetivo

Implementar la API REST de EvalBot con autenticación JWT,
control de roles, y endpoints para evaluaciones.

### 🛠️ Qué se hizo

1. `backend/package.json` con dependencias:
   - `express`, `cors`, `dotenv`, `mysql2`
   - `bcrypt`, `jsonwebtoken`
   - `nodemon` (dev)
2. `backend/.env` con credenciales y `JWT_SECRET`.
3. `backend/src/config/db.js` → pool de conexiones MySQL con `testConnection`.
4. `backend/src/app.js` → servidor Express con:
   - CORS configurado para `http://localhost:5173`
   - Middleware de JSON
   - Health check en `/health`
   - Montaje de rutas en `/api/v1`
   - Manejo de 404 y errores inline
5. `backend/src/middlewares/auth.middleware.js` → JWT + `requireRole`.
6. `backend/src/models/db.model.js` → consultas SQL de usuarios, evaluaciones y rendiciones.
7. `backend/src/controllers/auth.controller.js` → `register`, `login`, `me`.
8. `backend/src/controllers/evaluar.controller.js` → `listar`, `crear`, `detalle`, `responder`, `rendiciones`.
9. `backend/src/routes/api/v1/auth.routes.js` y `evaluar.routes.js`.
10. `backend/src/services/ia.service.js` → stub de IA (a integrar después).

### 📌 Endpoints implementados

| Método | Ruta | Auth | Rol |
|--------|------|------|-----|
| GET | `/health` | No | — |
| POST | `/api/v1/auth/register` | No | — |
| POST | `/api/v1/auth/login` | No | — |
| GET | `/api/v1/auth/me` | Sí | cualquiera |
| GET | `/api/v1/evaluaciones` | Sí | profesor/alumno |
| POST | `/api/v1/evaluaciones` | Sí | profesor |
| GET | `/api/v1/evaluaciones/:id` | Sí | cualquiera |
| POST | `/api/v1/evaluaciones/:id/responder` | Sí | alumno |
| GET | `/api/v1/evaluaciones/:id/rendiciones` | Sí | profesor |

### 🧠 Decisiones tomadas

| Decisión | Alternativa | Motivo |
|----------|-------------|--------|
| JWT stateless | Sesiones con cookie | Ideal para API REST |
| bcrypt (10 rounds) | SHA-256 plano | Estándar para hash de contraseñas |
| Manejo de errores inline en `app.js` | Archivo aparte `error.middleware.js` | Mantener estructura original |
| Rutas montadas directo en `app.js` | `routes/index.js` | Mantener estructura original |
| `mysql2/promise` con pool | Conexión individual | Mejor performance bajo concurrencia |

### 🐛 Problemas encontrados y soluciones

| # | Problema | Causa | Solución |
|---|----------|-------|----------|
| 1 | `frontend/package.json` vacío | `setup.sh` lo creó con `touch` | Pegar contenido real |
| 2 | `npm error EJSONPARSE` | JSON vacío / mal formado | Validar con `node -e "JSON.parse(...)"` |
| 3 | Firefox mostraba JSON Viewer | Normal: endpoint devuelve JSON | No es error, comportamiento esperado |

### ✅ Estado

- Backend corriendo en `http://localhost:3000`.
- Health check responde `{"status":"ok"}`.
- Registro de usuario devuelve JWT.
- Control de roles por `tipo` (alumno / profesor) funcionando.

### 🔜 Próximo paso

- Configurar frontend con Vue 3 + Vite.

### 📎 Referencias

- `backend/src/app.js`
- `backend/src/models/db.model.js`
- `backend/src/controllers/auth.controller.js`
- `backend/src/controllers/evaluar.controller.js`

---

## [Entrada 05] — Configuración del frontend (Vue 3 + Vite)

**Fecha:** 09/17/2026
**Hora:** 22:15
**Tipo:** `[FEAT]`
**Estado:** ✅ Completado
**Autor:** Samuel Bandera

### 🎯 Objetivo

Configurar la SPA con Vue 3 + Vite, con router, Pinia,
cliente axios con interceptores, y vista de login.

### 🛠️ Qué se hizo

1. `frontend/package.json` con:
   - `vue@3`, `vue-router@4`, `pinia`, `axios`
   - `vite`, `@vitejs/plugin-vue` (dev)
2. `frontend/vite.config.js` con plugin Vue + proxy `/api` → `localhost:3000`.
3. `frontend/.env` con `VITE_API_URL=http://localhost:3000/api/v1`.
4. `frontend/index.html` → HTML base con `<div id="app">`.
5. `frontend/src/main.js` → bootstrap Vue + Pinia + Router.
6. `frontend/src/App.vue` → componente raíz con `<router-view />`.
7. `frontend/src/api/http.js` → axios con interceptores:
   - Request: agrega `Authorization: Bearer <token>`
   - Response: maneja 401 → logout
8. `frontend/src/stores/auth.store.js` → Pinia store con:
   - `token`, `user` (persistidos en `localStorage`)
   - acciones `login`, `register`, `logout`
9. `frontend/src/router/index.js` → rutas + guardas por rol.
10. Vistas:
    - `views/auth/LoginView.vue`
    - `views/profesor/DashboardView.vue`
    - `views/alumno/DashboardView.vue`

### 📁 Estructura del frontend

frontend/
├── src/
│ ├── api/http.js
│ ├── stores/auth.store.js
│ ├── router/index.js
│ ├── views/
│ │ ├── auth/LoginView.vue
│ │ ├── profesor/DashboardView.vue
│ │ └── alumno/DashboardView.vue
│ ├── App.vue
│ └── main.js
├── index.html
├── vite.config.js
├── .env
└── package.json


### 🧠 Decisiones tomadas

| Decisión | Alternativa | Motivo |
|----------|-------------|--------|
| Pinia en lugar de Vuex | Vuex | API más simple, recomendación oficial Vue 3 |
| Axios con interceptores | Fetch nativo | Adjuntar token + manejo global de 401 |
| `localStorage` para token | Solo memoria | Persistencia entre recargas |
| Guardas de router por rol | Validar en cada componente | Centralizado y reutilizable |
| Lazy loading en vistas | Import directo | Mejor performance inicial |

### 🐛 Problemas encontrados y soluciones

| # | Problema | Causa | Solución |
|---|----------|-------|----------|
| 1 | `npm install` fallaba con `EJSONPARSE` | `package.json` vacío | Pegar contenido real y validar |
| 2 | Vista no renderizaba | `main.js` vacío | Pegar contenido real |

### ✅ Estado

- Frontend corriendo en `http://localhost:5173`.
- Pantalla de login renderiza correctamente.
- Cliente axios configurado con interceptores.

### 🔜 Próximo paso

- Probar integración end-to-end.

### 📎 Referencias

- `frontend/src/main.js`
- `frontend/src/stores/auth.store.js`
- `frontend/src/router/index.js`
- `frontend/src/views/auth/LoginView.vue`

---

## [Entrada 06] — Integración end-to-end (login funcionando)

**Fecha:** 09/17/2026
**Hora:** 02:00
**Tipo:** `[TEST]`
**Estado:** ✅ Completado
**Autor:** Samuel Bandera

### 🎯 Objetivo

Verificar que el flujo completo funciona:
**Frontend → Backend → MySQL → respuesta → Frontend**.

### 🧪 Pruebas realizadas

#### 1. Health check del backend

```bash
curl http://localhost:3000/health

```bash
curl http://localhost:3000/health
```

Resultado: `{"status":"ok","timestamp":"..."}` ✅

#### 2. Registro de profesor vía API

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre":"Juan","apellido":"Perez","usuario":"jperez","contrasena":"123456","tipo":"profesor"}'
```

Resultado:

```json
{
  "message": "Usuario registrado",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": 1, "usuario": "jperez", "tipo": "profesor" }
}
```

✅ Registro OK, bcrypt OK, JWT generado.

#### 3. Login desde el frontend

- URL: `http://localhost:5173`
- Credenciales: `jperez` / `123456`
- Resultado: ✅ redirige a `/profesor`
- Vista: "Panel del Profesor — Bienvenido, Juan Perez"

### 🐛 Problemas encontrados y soluciones

| # | Problema | Causa | Solución |
|---|----------|-------|----------|
| 1 | Firefox mostraba JSON Viewer en `/health` | Normal: endpoint devuelve JSON | No es error, es comportamiento esperado del navegador |
| 2 | Puerto MySQL 3306 ocupado | MySQL local corriendo | Se cambió a `3307` |

### 📊 Checklist de integración

| Test | Endpoint | Estado |
|------|----------|--------|
| Health check | `GET /health` | ✅ |
| Registro profesor | `POST /api/v1/auth/register` | ✅ |
| Login | `POST /api/v1/auth/login` | ✅ |
| Ver perfil | `GET /api/v1/auth/me` | ✅ |
| Login desde frontend | `/login` | ✅ |
| Redirección por rol | router guard | ✅ |
| Persistencia de token | `localStorage` | ✅ |

### ✅ Estado

- ✅ Stack completo funcionando:
  - MySQL en `localhost:3307`
  - Backend en `localhost:3000`
  - Frontend en `localhost:5173`
- ✅ Autenticación JWT funcionando.
- ✅ Registro y login OK.
- ✅ Redirección por rol OK.
- ✅ Integración end-to-end confirmada.

### 🔜 Próximo paso

- Implementar CRUD de evaluaciones en el frontend:
  - Vista de profesor con lista de evaluaciones
  - Formulario de creación de evaluación
  - Vista de alumno con evaluaciones disponibles
  - Vista para responder evaluación
- Integrar el servicio de IA para corrección automática.

### 📎 Referencias

- `backend/src/controllers/auth.controller.js`
- `frontend/src/views/auth/LoginView.vue`
- `frontend/src/stores/auth.store.js`

---