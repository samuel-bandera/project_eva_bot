<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth.store.js';
import * as adminApi from '../../api/admin.api.js';

const auth = useAuthStore();
const router = useRouter();

const cargando = ref(true);
const pendientes = ref([]);
const solicitudes = ref([]);
const eventos = ref([]);
const auditoria = ref([]);
const totalUsuarios = ref(0);

const totalPendientes = computed(() => pendientes.value.length);
const totalSolicitudes = computed(() => solicitudes.value.length);
const totalEventos = computed(() => eventos.value.length);

const saludo = computed(() => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 19) return 'Buenas tardes';
  return 'Buenas noches';
});

const rolLabel = computed(() =>
  auth.user?.tipo === 'admin' ? 'Administrador' : 'Coordinador'
);

function formatearFecha(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('es-UY', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

function gravedadColor(g) {
  return { alta: 'negative', media: 'warning', baja: 'info', info: 'grey-6' }[g] || 'grey-5';
}

async function cargar() {
  cargando.value = true;
  try {
    const [p, s, e, a, users] = await Promise.all([
      adminApi.listarPendientes().catch(() => []),
      adminApi.listarTodasLasSolicitudes().catch(() => []),
      adminApi.listarEventos({ limit: 5 }).catch(() => []),
      adminApi.listarAuditoria({ limit: 5 }).catch(() => []),
      adminApi.listarUsuarios({ limit: 500 }).catch(() => []),
    ]);
    pendientes.value = p || [];
    solicitudes.value = s || [];
    eventos.value = e || [];
    auditoria.value = a || [];
    totalUsuarios.value = Array.isArray(users) ? users.length : 0;
  } catch (err) {
    console.error(err);
  } finally {
    cargando.value = false;
  }
}

onMounted(cargar);
</script>

<template>
  <q-page class="q-pa-md">
    <q-inner-loading :showing="cargando">
      <q-spinner size="40px" color="primary" />
    </q-inner-loading>

    <q-card flat class="q-mb-md" style="background: linear-gradient(135deg, var(--primary) 0%, #5d252d 100%); color: white;">
      <q-card-section class="q-pa-lg">
        <div class="row items-center justify-between">
          <div>
            <q-badge color="white" text-color="primary" class="q-mb-sm text-uppercase" style="letter-spacing: 0.1em; font-weight: 700;">
              {{ saludo }}
            </q-badge>
            <div class="text-h4 text-weight-bold" style="color: white;">
              Hola, {{ auth.user?.nombre ?? 'admin' }}
            </div>
            <div class="text-body1 q-mt-sm" style="opacity: 0.95;">
              Panel de {{ rolLabel.toLowerCase() }} · EvalBot
            </div>
          </div>
          <q-icon name="admin_panel_settings" size="120px" class="gt-sm" style="opacity: 0.15; color: white;" />
        </div>
      </q-card-section>
    </q-card>

    <div class="row q-col-gutter-md q-mb-md">
      <div class="col-6 col-md-3">
        <q-card flat bordered class="cursor-pointer" @click="router.push('/admin/usuarios')">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="pending_actions" size="32px" color="warning" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ totalPendientes }}</div>
                <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Pendientes</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-md-3">
        <q-card flat bordered class="cursor-pointer" @click="router.push('/admin/matriculas')">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="assignment_ind" size="32px" color="primary" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ totalSolicitudes }}</div>
                <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Solicitudes</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-md-3">
        <q-card flat bordered class="cursor-pointer" @click="router.push('/admin/auditoria')">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="security" size="32px" color="negative" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ totalEventos }}</div>
                <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Eventos</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>

      <div class="col-6 col-md-3">
        <q-card flat bordered class="cursor-pointer" @click="router.push('/admin/usuarios')">
          <q-card-section>
            <div class="row items-center">
              <q-icon name="people" size="32px" color="positive" class="q-mr-md" />
              <div>
                <div class="text-h4 text-weight-bold">{{ totalUsuarios }}</div>
                <div class="text-caption text-uppercase text-grey-7 text-weight-bold">Usuarios</div>
              </div>
            </div>
          </q-card-section>
        </q-card>
      </div>
    </div>

    <div class="row q-col-gutter-md">
      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Cuentas por aprobar</div>
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/admin/usuarios" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !pendientes.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="check_circle" size="40px" color="positive" class="q-mb-sm" />
            <div>Sin cuentas pendientes</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="u in pendientes.slice(0, 5)" :key="u.id">
              <q-item-section avatar>
                <q-avatar color="primary" text-color="white" size="36px">
                  {{ (u.nombre?.[0] || '') + (u.apellido?.[0] || '') }}
                </q-avatar>
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ u.nombre }} {{ u.apellido }}</q-item-label>
                <q-item-label caption>{{ u.email }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="warning" :label="u.tipo" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Solicitudes de matrícula</div>
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/admin/matriculas" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !solicitudes.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="assignment_turned_in" size="40px" color="positive" class="q-mb-sm" />
            <div>Sin solicitudes pendientes</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="s in solicitudes.slice(0, 5)" :key="s.id">
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ s.alumno_nombre || 'Alumno' }}</q-item-label>
                <q-item-label caption>{{ s.materia_nombre || 'Materia' }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge color="warning" label="pendiente" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Eventos recientes</div>
            <q-btn flat dense no-caps color="primary" label="Ver todos" to="/admin/auditoria" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !eventos.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="verified_user" size="40px" color="positive" class="q-mb-sm" />
            <div>Sin eventos recientes</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="e in eventos" :key="e.id">
              <q-item-section avatar>
                <q-icon :name="e.gravedad === 'alta' ? 'warning' : 'info'" :color="gravedadColor(e.gravedad)" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ e.tipo }}</q-item-label>
                <q-item-label caption>{{ e.detalle }}</q-item-label>
              </q-item-section>
              <q-item-section side>
                <q-badge :color="gravedadColor(e.gravedad)" :label="e.gravedad" />
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>

      <div class="col-12 col-md-6">
        <q-card flat bordered class="fit">
          <q-card-section class="row items-center justify-between">
            <div class="text-subtitle1 text-weight-medium">Últimas acciones</div>
            <q-btn flat dense no-caps color="primary" label="Ver todas" to="/admin/auditoria" />
          </q-card-section>
          <q-separator />
          <q-card-section v-if="!cargando && !auditoria.length" class="text-center text-grey-7 q-pa-lg">
            <q-icon name="history" size="40px" class="q-mb-sm" />
            <div>Sin acciones registradas</div>
          </q-card-section>
          <q-list v-else separator>
            <q-item v-for="a in auditoria" :key="a.id">
              <q-item-section avatar>
                <q-icon name="history" color="primary" />
              </q-item-section>
              <q-item-section>
                <q-item-label class="text-weight-medium">{{ a.accion }}</q-item-label>
                <q-item-label caption>{{ a.usuario_nombre || 'Sistema' }} · {{ formatearFecha(a.creado_en) }}</q-item-label>
              </q-item-section>
            </q-item>
          </q-list>
        </q-card>
      </div>
    </div>
  </q-page>
</template>
