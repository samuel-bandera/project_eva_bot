#!/usr/bin/env bash
# start.sh — Levanta todo EvalBot con un solo comando
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log()   { echo -e "${BLUE}▶${NC} $1"; }
ok()    { echo -e "${GREEN}✅${NC} $1"; }
warn()  { echo -e "${YELLOW}⚠️ ${NC} $1"; }
error() { echo -e "${RED}❌${NC} $1"; }

echo ""
echo "🚀 Iniciando EvalBot..."
echo "=================================="

# ============================================
# 1. Verificar dependencias del sistema
# ============================================
log "Verificando dependencias del sistema..."

for cmd in docker node npm; do
  if ! command -v "$cmd" &>/dev/null; then
    error "Falta '$cmd'. Instalalo antes de continuar."
    exit 1
  fi
done
ok "docker, node y npm disponibles"

# Verificar docker compose (v2 o v1)
if docker compose version &>/dev/null; then
  DC="docker compose"
elif command -v docker-compose &>/dev/null; then
  DC="docker-compose"
else
  error "No se encontró 'docker compose' ni 'docker-compose'."
  exit 1
fi

# ============================================
# 2. Verificar que Docker esté corriendo
# ============================================
log "Verificando que Docker esté corriendo..."
if ! docker info > /dev/null 2>&1; then
  error "Docker no está corriendo. Inicialo y volvé a intentar."
  exit 1
fi
ok "Docker corriendo"

# ============================================
# 3. Levantar MySQL
# ============================================
log "Levantando MySQL con Docker..."
(cd docker && $DC up -d)

# ============================================
# 4. Esperar a que MySQL esté realmente listo
# ============================================
log "Esperando a que MySQL esté healthy..."
MAX_TRIES=30
TRIES=0
until [ "$(docker inspect --format='{{.State.Health.Status}}' evalbot_mysql 2>/dev/null)" = "healthy" ]; do
  TRIES=$((TRIES+1))
  if [ "$TRIES" -ge "$MAX_TRIES" ]; then
    echo ""
    error "MySQL no respondió después de ${MAX_TRIES} intentos."
    echo "   Revisá los logs con: cd docker && $DC logs mysql"
    exit 1
  fi
  printf "\r   Intento %d/%d..." "$TRIES" "$MAX_TRIES"
  sleep 2
done
echo ""
ok "MySQL listo en localhost:3307"

# ============================================
# 5. Instalar dependencias si faltan
# ============================================
install_if_needed() {
  local dir="$1"
  local name="$2"
  if [ ! -d "$dir/node_modules" ]; then
    log "Instalando dependencias de $name..."
    (cd "$dir" && npm install)
    ok "$name listo"
  else
    ok "$name ya tiene dependencias"
  fi
}

install_if_needed "backend"  "backend"
install_if_needed "frontend" "frontend"

# ============================================
# 6. Levantar backend y frontend en paralelo
# ============================================
echo ""
log "Levantando backend (puerto 3000)..."
(cd backend && npm run dev) &
BACKEND_PID=$!

log "Levantando frontend (puerto 5173)..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# ============================================
# 7. Cleanup al salir (Ctrl+C)
# ============================================
cleanup() {
  echo ""
  warn "Deteniendo servicios..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
  (cd docker && $DC down)
  ok "Todo detenido. ¡Hasta luego!"
  exit 0
}
trap cleanup INT TERM

echo ""
echo "=================================="
ok "EvalBot corriendo 🎉"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3000"
echo "   MySQL:    localhost:3307"
echo ""
echo "   Presioná Ctrl+C para detener todo."
echo "=================================="
echo ""

wait