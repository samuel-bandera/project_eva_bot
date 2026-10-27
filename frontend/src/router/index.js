import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth.store.js';

function rutaPorRol(rutaBase) {
  const auth = useAuthStore();
  const tipo = auth.user?.tipo;
  if (tipo === 'docente') return `/docente/${rutaBase}`;
  if (tipo === 'alumno') return `/alumno/${rutaBase}`;
  if (tipo === 'admin') return `/admin/${rutaBase}`;
  if (tipo === 'coordinador') return `/coordinador/${rutaBase}`;
  return '/login';
}

const ComunicadosView = () => import('../views/comunicados/ComunicadosView.vue');
const CalendarioView = () => import('../views/calendario/CalendarioView.vue');
const CarteleraView = () => import('../views/cartelera/CarteleraView.vue');
const ForosView = () => import('../views/foros/ForosView.vue');
const ForoHiloView = () => import('../views/foros/ForoHiloView.vue');

const rutasCompartidas = (prefijo) => [
  { path: 'comunicados', name: `${prefijo}-comunicados`, component: ComunicadosView },
  { path: 'calendario', name: `${prefijo}-calendario`, component: CalendarioView },
  { path: 'cartelera', name: `${prefijo}-cartelera`, component: CarteleraView },
  { path: 'foros', name: `${prefijo}-foros`, component: ForosView },
  { path: 'foros/:id', name: `${prefijo}-foro-hilo`, component: ForoHiloView },
];

const routes = [
  {
    path: '/coordinador',
    component: () => import('../views/coordinador/LayoutCoordinador.vue'),
    meta: { requiresAuth: true, role: ['coordinador'] },
    children: [
      { path: '', redirect: '/coordinador/dashboard' },
      { path: 'dashboard',   name: 'coordinador-dashboard',   component: () => import('../views/coordinador/DashboardView.vue') },
      { path: 'carreras',    name: 'coordinador-carreras',    component: () => import('../views/coordinador/MisCarrerasView.vue') },
      { path: 'comunicados', name: 'coordinador-comunicados', component: () => import('../views/coordinador/ComunicadosCoordinacionView.vue') },
      { path: 'comunicados/nuevo', name: 'coordinador-comunicado-nuevo', component: () => import('../views/coordinador/NuevoComunicadoView.vue') },
      { path: 'docentes',    name: 'coordinador-docentes',    component: () => import('../views/coordinador/DocentesView.vue') },
      { path: 'materias',    name: 'coordinador-materias',    component: () => import('../views/coordinador/MateriasView.vue') },
      { path: 'solicitudes', name: 'coordinador-solicitudes', component: () => import('../views/coordinador/SolicitudesView.vue') },
      { path: 'codigos',     name: 'coordinador-codigos',     component: () => import('../views/coordinador/CodigosView.vue') },
      { path: 'reportes',    name: 'coordinador-reportes',    component: () => import('../views/coordinador/ReportesView.vue') },
      { path: 'reclamos',    name: 'coordinador-reclamos',    component: () => import('../views/coordinador/ReclamosView.vue') },
      { path: 'perfil',      name: 'coordinador-perfil',      component: () => import('../views/comun/AjustesView.vue') },
      { path: 'ajustes',     name: 'coordinador-ajustes',     component: () => import('../views/comun/AjustesView.vue') },
    ]
  },

  { path: '/', redirect: '/login' },

  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { publico: true },
  },
  {
    path: '/registro',
    name: 'registro',
    component: () => import('../views/auth/RegisterView.vue'),
    meta: { publico: true },
  },
  {
    path: '/recuperar-password',
    name: 'recuperar-password',
    component: () => import('../views/auth/RecuperarPasswordView.vue'),
    meta: { publico: true },
  },

  { path: '/comunicados', redirect: () => rutaPorRol('comunicados') },
  { path: '/calendario', redirect: () => rutaPorRol('calendario') },
  { path: '/cartelera', redirect: () => rutaPorRol('cartelera') },
  { path: '/foros', redirect: () => rutaPorRol('foros') },
  { path: '/foros/:id', redirect: (to) => {
    const auth = useAuthStore();
    const tipo = auth.user?.tipo;
    const base = tipo === 'docente' ? '/docente/foros'
               : tipo === 'alumno' ? '/alumno/foros'
               : '/admin/foros';
    return `${base}/${to.params.id}`;
  }},


  {
    path: '/alumno',
    component: () => import('../views/alumno/LayoutAlumno.vue'),
    meta: { requiresAuth: true, role: 'alumno' },
    children: [
      { path: '', name: 'alumno-dashboard', component: () => import('../views/alumno/DashboardView.vue') },
      { path: 'materias', name: 'alumno-materias', component: () => import('../views/alumno/MateriasView.vue') },
      { path: 'tareas', name: 'alumno-tareas', component: () => import('../views/alumno/TareasView.vue') },
      { path: 'evaluaciones', name: 'alumno-evaluaciones', component: () => import('../views/alumno/EvaluacionesView.vue') },
      { path: 'evaluaciones/:id/rendir', name: 'alumno-rendir', component: () => import('../views/alumno/RendirExamenView.vue'), meta: { examMode: true } },
      { path: 'rendimiento', name: 'alumno-rendimiento', component: () => import('../views/alumno/MiRendimientoView.vue') },
      { path: 'notas', redirect: '/alumno/rendimiento' },
      { path: 'asistencia', redirect: '/alumno/rendimiento' },
      { path: 'perfil', name: 'alumno-perfil', component: () => import('../views/alumno/PerfilView.vue') },
      { path: 'tickets', name: 'alumno-tickets', component: () => import('../views/tickets/MisTicketsView.vue') },
      { path: 'ajustes', name: 'alumno-ajustes', component: () => import('../views/comun/AjustesView.vue') },
      ...rutasCompartidas('alumno'),
    ],
  },

  {
    path: '/docente',
    component: () => import('../views/profesor/LayoutProfesor.vue'),
    meta: { requiresAuth: true, role: 'docente' },
    children: [
      { path: '', name: 'profesor-dashboard', component: () => import('../views/profesor/DashboardView.vue') },
      { path: 'materias', name: 'profesor-materias', component: () => import('../views/profesor/MateriasView.vue') },
      { path: 'materias/:id', name: 'profesor-materia-detalle', component: () => import('../views/profesor/MateriaDetalleView.vue') },
      { path: 'asistencia', name: 'profesor-asistencia', component: () => import('../views/profesor/AsistenciaView.vue') },
      { path: 'evaluaciones', name: 'profesor-evaluaciones', component: () => import('../views/profesor/EvaluacionesView.vue') },
      { path: 'evaluaciones/crear', redirect: '/docente/evaluaciones/crear_evaluacion' },
      { path: 'evaluaciones/crear_evaluacion', name: 'profesor-crear-evaluacion-pro', component: () => import('../views/profesor/crear_evaluaciones.vue') },
      { path: 'evaluaciones/:id/control', redirect: to => `/docente/evaluaciones/${to.params.id}/monitoreo` },
      { path: 'evaluaciones/:id/monitoreo', name: 'profesor-monitoreo-examen', component: () => import('../views/profesor/MonitoreoView.vue') },
      { path: 'evaluaciones/:id/corregir', name: 'profesor-corregir-evaluacion', component: () => import('../views/profesor/CorregirEvaluacionView.vue') },
      { path: 'perfil', name: 'profesor-perfil', component: () => import('../views/profesor/PerfilView.vue') },
      { path: 'tickets', name: 'profesor-tickets', component: () => import('../views/tickets/TicketsView.vue') },
      { path: 'ajustes', name: 'profesor-ajustes', component: () => import('../views/comun/AjustesView.vue') },
      { path: 'ia/generar', name: 'profesor-ia-preguntas', component: () => import('../views/profesor/GenerarPreguntasIAView.vue') },
      ...rutasCompartidas('docente'),
    ],
  },

  {
    path: '/admin',
    component: () => import('../views/admin/LayoutAdmin.vue'),
    meta: { requiresAuth: true, role: ['admin', 'coordinador'] },
    children: [
      { path: '', name: 'admin-dashboard', component: () => import('../views/admin/DashboardView.vue') },
      { path: 'usuarios', name: 'admin-usuarios', component: () => import('../views/admin/UsuariosView.vue') },
      { path: 'matriculas', name: 'admin-matriculas', component: () => import('../views/admin/MatriculasView.vue') },
      { path: 'ciclos', name: 'admin-ciclos', component: () => import('../views/admin/CiclosView.vue') },
      { path: 'grupos/crear', name: 'admin-crear-grupo', component: () => import('../views/admin/CrearGrupoView.vue') },
      { path: 'asignaciones', name: 'admin-asignaciones', component: () => import('../views/admin/AsignacionDocentesView.vue') },
      { path: 'horarios', name: 'admin-horarios', component: () => import('../views/admin/HorariosView.vue') },
      { path: 'solicitudes', name: 'admin-solicitudes', component: () => import('../views/coordinador/SolicitudesView.vue') },
      { path: 'auditoria', name: 'admin-auditoria', component: () => import('../views/admin/AuditoriaView.vue') },
      { path: 'invitaciones', name: 'admin-invitaciones', component: () => import('../views/admin/InvitacionesView.vue') },
      { path: 'tickets', name: 'admin-tickets', component: () => import('../views/tickets/TicketsView.vue') },
      { path: 'perfil',  name: 'admin-perfil',  component: () => import('../views/comun/AjustesView.vue') },
      { path: 'ajustes', name: 'admin-ajustes', component: () => import('../views/comun/AjustesView.vue') },
      ...rutasCompartidas('admin'),
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore();

  if (to.meta.requiresAuth && !auth.token) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }

  const roleRequerido = to.matched.find((r) => r.meta?.role)?.meta.role;
  if (roleRequerido) {
    const rolesPermitidos = Array.isArray(roleRequerido) ? roleRequerido : [roleRequerido];
    const tieneAcceso = rolesPermitidos.includes(auth.user?.tipo);
    if (!tieneAcceso) {
      const tipo = auth.user?.tipo;
      if (tipo === 'docente') return { name: 'profesor-dashboard' };
      if (tipo === 'alumno')   return { name: 'alumno-dashboard' };
      if (tipo === 'admin') return { name: 'admin-dashboard' };
    if (tipo === 'coordinador') return { name: 'coordinador-dashboard' };
      return { name: 'login' };
    }
  }

  if (to.meta.publico && auth.token) {
    if (auth.user?.tipo === 'docente') return { name: 'profesor-dashboard' };
    if (auth.user?.tipo === 'alumno')   return { name: 'alumno-dashboard' };
    if (auth.user?.tipo === 'admin') return { name: 'admin-dashboard' };
    if (auth.user?.tipo === 'coordinador') return { name: 'coordinador-dashboard' };
  }
});

export default router;
