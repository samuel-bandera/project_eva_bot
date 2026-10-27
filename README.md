# EvalBot

Sistema de evaluaciones académicas para EVA/Moodle.

Proyecto final. Permite a profesores crear y controlar evaluaciones en
vivo, a alumnos rendirlas con seguimiento en tiempo real, y a
coordinadores administrar usuarios, materias y matrículas.

## Stack

- **Backend:** Node + Express + MySQL 8 + Zod + JWT + Socket.io
- **Frontend:** Vue 3 + Vite + Quasar + Pinia
- **DB:** MySQL 8 en Docker (:3307)
- **Email:** Nodemailer + Gmail SMTP

## Levantar el proyecto

Requisitos: Node 20+, Docker.

    ./start.sh

Si no funciona, ver [doc/instalacion.md](doc/instalacion.md).

- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- Health: http://localhost:3000/health

## Usuarios de prueba

| Usuario    | Contraseña  | Rol         |
|------------|-------------|-------------|
| carlos.mendez   | password123 | Profesor    |
| matias.gonzalez | password123 | Alumno      |
| veronica.salgado  | password123 | Admin       |
| hernan.quiroga  | password123 | Coordinador |

## Estructura

    eva_bot/
    ├── backend/     Node + Express + MySQL
    ├── frontend/    Vue 3 + Vite + Quasar
    ├── docker/      docker-compose + schema + seed
    ├── doc/         documentación
    └── start.sh

## Documentación

- [Instalación](doc/instalacion.md)
- [API](doc/api.md)
- [Nomenclatura](doc/nomenclatura.md)
- [Bitácora](doc/manual_de_desarrollo/bitacora_samuel.md)
- [Base de datos](doc/manual_de_desarrollo/Base_Datos.md)
