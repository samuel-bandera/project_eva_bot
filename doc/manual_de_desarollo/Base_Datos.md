# 🗄️ Modelo de Base de Datos — EvalBot

> **Base de datos:** `sistema_evaluaciones`
> **Motor:** MySQL 8.0
> **Charset:** UTF-8 (utf8mb4)
> **Engine tablas:** InnoDB (soporta FK y transacciones)
> **Autor:** Samuel Bandera
> **Última actualización:** 04/09/2026

---

## 📖 Descripción general

El sistema EvalBot gestiona **evaluaciones** entre profesores y alumnos.
Un profesor crea evaluaciones con preguntas; los alumnos las responden;
una IA corrige las respuestas y genera una nota. Además existe un módulo
de **entrega de código** que los alumnos suben y los profesores revisan.

---

## 🧩 Entidades identificadas

| # | Tabla                  | Propósito                                              |
|---|------------------------|--------------------------------------------------------|
| 1 | `usuarios`             | Alumnos, profesores y admins (rol unificado)           |
| 2 | `evaluaciones`         | Evaluaciones creadas por profesores                    |
| 3 | `preguntas`            | Preguntas que componen cada evaluación                 |
| 4 | `evaluaciones_alumnos` | Registro de qué alumno rindió qué evaluación + nota    |
| 5 | `respuestas`           | Respuestas del alumno + corrección de la IA            |
| 6 | `entregas_codigo`      | Entregas de archivos de código para revisión           |

---

## 🔗 Diagrama Entidad-Relación (texto)

```
                       ┌─────────────────┐
                       │    usuarios     │
                       │─────────────────│
                       │ id (PK)         │
                       │ nombre          │
                       │ apellido        │
                       │ usuario (UNIQUE)│
                       │ contrasena      │
                       │ tipo (rol)      │
                       └────────┬────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │ 1                     │ 1                     │ 1
        │ crea                  │ realiza               │ realiza/entrega
        │ N                     │ N                     │ N
┌───────▼──────────┐  ┌─────────▼──────────────┐  ┌────▼──────────────┐
│  evaluaciones    │  │ evaluaciones_alumnos   │  │ entregas_codigo   │
│──────────────────│  │────────────────────────│  │───────────────────│
│ id (PK)          │◄─┤ evaluacion_id (FK)     │  │ id (PK)           │
│ titulo           │1 │ alumno_id (FK)         │  │ alumno_id (FK)    │
│ descripcion      │  │ fecha                  │  │ profesor_id (FK)  │
│ profesor_id (FK) │  │ nota                   │  │ nombre_archivo    │
│ fecha            │  └────────┬───────────────┘  │ ruta_archivo      │
└────────┬─────────┘           │ 1                │ fecha             │
         │ 1                   │ genera           │ estado            │
         │ tiene               │ N                └───────────────────┘
         │ N              ┌────▼──────────┐
┌────────▼─────────┐      │  respuestas   │
│    preguntas     │◄─────┤───────────────│
│──────────────────│ 1    │ id (PK)       │
│ id (PK)          │      │ eval_alumno_id│
│ evaluacion_id(FK)│      │ pregunta_id   │
│ pregunta         │      │ respuesta     │
│ respuesta_correcta│     │ correccion_ia │
└──────────────────┘      │ nota          │
                          └───────────────┘
```

---

## 📋 Detalle de tablas

### 1️⃣ `usuarios`

Almacena **todos** los actores del sistema (alumnos, profesores y admins)
en una sola tabla con un campo discriminador `tipo`.

| Campo       | Tipo                         | Restricciones                  | Descripción                    |
|-------------|------------------------------|--------------------------------|--------------------------------|
| `id`        | INT                          | PK, AUTO_INCREMENT             | Identificador único            |
| `nombre`    | VARCHAR(50)                  | NOT NULL                       | Nombre del usuario             |
| `apellido`  | VARCHAR(50)                  | NOT NULL                       | Apellido del usuario           |
| `usuario`   | VARCHAR(50)                  | NOT NULL, UNIQUE               | Nombre de login                |
| `contrasena`| VARCHAR(255)                 | NOT NULL                       | Hash de la contraseña          |
| `tipo`      | ENUM('alumno','profesor','admin') | NOT NULL, DEFAULT 'alumno' | Rol del usuario                |

**Índices:**
- PK en `id`
- UNIQUE en `usuario`

**Notas de diseño:**
- Se usa una **sola tabla** con `tipo` en lugar de tablas separadas.
  Esto simplifica las FK en el resto del modelo (todo apunta a `usuarios.id`).
- La contraseña se guarda como **hash** (bcrypt), no en texto plano.
- El ENUM permite escalar a `admin` sin cambiar el esquema.

---

### 2️⃣ `evaluaciones`

Evaluaciones creadas por un profesor.

| Campo         | Tipo         | Restricciones                          | Descripción                    |
|---------------|--------------|----------------------------------------|--------------------------------|
| `id`          | INT          | PK, AUTO_INCREMENT                     | Identificador único            |
| `titulo`      | VARCHAR(100) | NOT NULL                               | Título de la evaluación        |
| `descripcion` | TEXT         | —                                      | Descripción opcional           |
| `profesor_id` | INT          | NOT NULL, FK → `usuarios.id`           | Profesor que la creó           |
| `fecha`       | DATE         | NOT NULL                               | Fecha de la evaluación         |

**FK:**
- `fk_evaluacion_profesor` → `usuarios(id)` ON DELETE CASCADE ON UPDATE CASCADE

**Notas:**
- Si se elimina el profesor, se eliminan sus evaluaciones (CASCADE).
- Validar en backend que `profesor_id` tenga `tipo = 'profesor'`.

---

### 3️⃣ `preguntas`

Preguntas que componen cada evaluación.

| Campo                | Tipo | Restricciones                    | Descripción                    |
|----------------------|------|----------------------------------|--------------------------------|
| `id`                 | INT  | PK, AUTO_INCREMENT               | Identificador único            |
| `evaluacion_id`      | INT  | NOT NULL, FK → `evaluaciones.id` | Evaluación a la que pertenece  |
| `pregunta`           | TEXT | NOT NULL                         | Enunciado de la pregunta       |
| `respuesta_correcta` | TEXT | NOT NULL                         | Respuesta esperada             |

**FK:**
- `fk_pregunta_evaluacion` → `evaluaciones(id)` ON DELETE CASCADE ON UPDATE CASCADE

**Notas:**
- Al eliminar una evaluación se eliminan sus preguntas.
- `respuesta_correcta` se usa como referencia para la corrección de la IA.

---

### 4️⃣ `evaluaciones_alumnos`

Registra **qué alumno rindió qué evaluación** y su nota final.

| Campo           | Tipo         | Restricciones                       | Descripción                    |
|-----------------|--------------|-------------------------------------|--------------------------------|
| `id`            | INT          | PK, AUTO_INCREMENT                  | Identificador único            |
| `evaluacion_id` | INT          | NOT NULL, FK → `evaluaciones.id`    | Evaluación rendida             |
| `alumno_id`     | INT          | NOT NULL, FK → `usuarios.id`        | Alumno que la rindió           |
| `fecha`         | DATETIME     | DEFAULT CURRENT_TIMESTAMP           | Fecha y hora de la rendición   |
| `nota`          | DECIMAL(4,2) | —                                   | Nota final (ej: 8.50)          |

**FKs:**
- `fk_eval_alumno_evaluacion` → `evaluaciones(id)` ON DELETE CASCADE
- `fk_eval_alumno_alumno`     → `usuarios(id)` ON DELETE CASCADE

**UNIQUE:**
- `uk_evaluacion_alumno (evaluacion_id, alumno_id)` → un alumno no puede
  rendir la misma evaluación dos veces.

**Notas:**
- Es la tabla **puente** entre `evaluaciones` y `usuarios` (N:M).
- `nota` es `NULL` hasta que se corrija.

---

### 5️⃣ `respuestas`

Respuestas de cada alumno a cada pregunta, con la corrección de la IA.

| Campo                  | Tipo         | Restricciones                              | Descripción                    |
|------------------------|--------------|--------------------------------------------|--------------------------------|
| `id`                   | INT          | PK, AUTO_INCREMENT                         | Identificador único            |
| `evaluacion_alumno_id` | INT          | NOT NULL, FK → `evaluaciones_alumnos.id`   | Rendición del alumno           |
| `pregunta_id`          | INT          | NOT NULL, FK → `preguntas.id`              | Pregunta respondida            |
| `respuesta`            | TEXT         | —                                          | Texto de la respuesta          |
| `correccion_ia`        | TEXT         | —                                          | Comentario generado por la IA  |
| `nota`                 | DECIMAL(4,2) | —                                          | Nota parcial de esa respuesta  |

**FKs:**
- `fk_respuesta_eval_alumno` → `evaluaciones_alumnos(id)` ON DELETE CASCADE
- `fk_respuesta_pregunta`    → `preguntas(id)` ON DELETE CASCADE

**Notas:**
- `correccion_ia` guarda el feedback de la IA.
- `nota` es la nota parcial; la nota final está en `evaluaciones_alumnos`.

---

### 6️⃣ `entregas_codigo`

Entregas de archivos de código que los alumnos suben para revisión.

| Campo            | Tipo         | Restricciones                                  | Descripción                          |
|------------------|--------------|------------------------------------------------|--------------------------------------|
| `id`             | INT          | PK, AUTO_INCREMENT                             | Identificador único                  |
| `alumno_id`      | INT          | NOT NULL, FK → `usuarios.id`                   | Alumno que entrega                   |
| `profesor_id`    | INT          | NOT NULL, FK → `usuarios.id`                   | Profesor que revisa                  |
| `nombre_archivo` | VARCHAR(150) | NOT NULL                                       | Nombre del archivo                   |
| `ruta_archivo`   | VARCHAR(255) | NOT NULL                                       | Ruta donde se guardó                 |
| `fecha`          | DATETIME     | DEFAULT CURRENT_TIMESTAMP                      | Fecha de entrega                     |
| `estado`         | ENUM(...)    | DEFAULT 'pendiente'                            | pendiente/revisado/aprobado/rechazado|

**FKs:**
- `fk_entrega_alumno`   → `usuarios(id)` ON DELETE CASCADE
- `fk_entrega_profesor` → `usuarios(id)` ON DELETE CASCADE

**Estados posibles:**

| Estado      | Significado                              |
|-------------|------------------------------------------|
| `pendiente` | Subida, aún no revisada                  |
| `revisado`  | El profesor la miró pero no decidió      |
| `aprobado`  | Aceptada                                 |
| `rechazado` | Rechazada                                |

---

## 🔄 Relaciones resumidas

| Relación                                  | Cardinalidad | Descripción                                    |
|-------------------------------------------|--------------|------------------------------------------------|
| `usuarios` → `evaluaciones`               | 1 : N        | Un profesor crea muchas evaluaciones           |
| `usuarios` → `evaluaciones_alumnos`       | 1 : N        | Un alumno rinde muchas evaluaciones            |
| `evaluaciones` → `evaluaciones_alumnos`   | 1 : N        | Una evaluación es rendida por muchos alumnos   |
| `evaluaciones` → `preguntas`              | 1 : N        | Una evaluación tiene muchas preguntas          |
| `evaluaciones_alumnos` → `respuestas`     | 1 : N        | Una rendición tiene muchas respuestas          |
| `preguntas` → `respuestas`                | 1 : N        | Una pregunta puede responderse muchas veces    |
| `usuarios` → `entregas_codigo` (alumno)   | 1 : N        | Un alumno entrega muchos códigos               |
| `usuarios` → `entregas_codigo` (profesor) | 1 : N        | Un profesor revisa muchas entregas             |

---

## 🧠 Decisiones de diseño

| Decisión                                    | Motivo                                                     |
|---------------------------------------------|------------------------------------------------------------|
| Tabla única `usuarios` con campo `tipo`     | Simplifica FK; evita duplicar estructura                   |
| `ON DELETE CASCADE` en todas las FK         | Borrar un usuario/evaluación limpia todo lo dependiente    |
| `UNIQUE (evaluacion_id, alumno_id)`         | Evita que un alumno rinda la misma evaluación dos veces    |
| `DECIMAL(4,2)` para notas                   | Permite valores como `10.00`, `8.50`, `0.00`               |
| `DATETIME DEFAULT CURRENT_TIMESTAMP`        | Autocompleta fecha sin intervención del backend            |
| Uso de `ENUM` para roles y estados          | Validación a nivel BD + ahorro de espacio                  |
| `ENGINE=InnoDB`                             | Requerido para FK, transacciones y bloqueos                |

---

## ⚠️ Puntos a revisar / mejorar

1. **Falta tabla `opciones`** si en algún momento querés preguntas de
   múltiple choice (hoy solo soporta respuesta libre).
2. **Falta campo `intento`** en `evaluaciones_alumnos` si querés permitir
   múltiples intentos.
3. **No hay soft delete** (`deleted_at`) — al hacer CASCADE se pierde todo.
4. **`correccion_ia` es TEXT** — si la IA devuelve JSON estructurado,
   conviene `JSON` en MySQL 8.
5. **`ruta_archivo`** podría incluir un hash para evitar colisiones de
   nombres.
6. **Falta tabla `logs`** para auditar acciones sensibles (login, cambios).

---

## 📎 Referencias

- `docker/mysql/init/01-schema.sql` → implementación SQL
- `docs/arquitectura.md` → decisiones generales del proyecto
- `docs/requerimientos.md` → funcionalidades por rol

---

## 📝 Historial de cambios del modelo

| Fecha       | Cambio                          | Autor           |
|-------------|---------------------------------|-----------------|
| 04/09/2026  | Versión inicial del modelo      | Samuel Bandera  |
