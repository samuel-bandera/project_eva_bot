#!/usr/bin/env bash
set -e

DIRECTORIO_RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIRECTORIO_RAIZ"

VERDE='\033[0;32m'
AMARILLO='\033[1;33m'
ROJO='\033[0;31m'
AZUL='\033[0;34m'
CIAN='\033[0;36m'
NEGRITA='\033[1m'
SIN_COLOR='\033[0m'

info()        { echo -e "${AZUL}▶${SIN_COLOR}  $1"; }
exito()       { echo -e "${VERDE}✅${SIN_COLOR}  $1"; }
advertencia() { echo -e "${AMARILLO}⚠️ ${SIN_COLOR}  $1"; }
error()       { echo -e "${ROJO}❌${SIN_COLOR}  $1"; }

info "Verificando dependencias..."

for comando in docker node npm; do
  if ! command -v "$comando" &>/dev/null; then
    error "Falta '$comando'. Instalalo antes de continuar."
    exit 1
  fi
done
exito "docker, node y npm disponibles"

if docker compose version &>/dev/null; then
  COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
  COMPOSE="docker-compose"
else
  error "No se encontró 'docker compose' ni 'docker-compose'."
  exit 1
fi

info "Verificando Docker..."
if ! docker info > /dev/null 2>&1; then
  error "Docker no está corriendo. Inicialo y volvé a intentar."
  exit 1
fi
exito "Docker corriendo"

info "Configurando archivos .env..."

configurar_env() {
  local directorio="$1"
  local nombre="$2"
  if [ -f "$directorio/.env.example" ] && [ ! -f "$directorio/.env" ]; then
    cp "$directorio/.env.example" "$directorio/.env"
    exito "$nombre: .env creado"
  elif [ -f "$directorio/.env" ]; then
    exito "$nombre: .env ya existe"
  else
    advertencia "$nombre: no hay .env.example"
  fi
}

configurar_env "backend"  "Backend"
configurar_env "frontend" "Frontend"
configurar_env "docker"   "Docker"

echo ""
info "Levantando MySQL en Docker..."
(cd docker && $COMPOSE up -d > /dev/null 2>&1)

info "Esperando a MySQL..."
MAX_INTENTOS=30
INTENTO=0
until [ "$(docker inspect --format='{{.State.Health.Status}}' evalbot_mysql 2>/dev/null)" = "healthy" ]; do
  INTENTO=$((INTENTO+1))
  if [ "$INTENTO" -ge "$MAX_INTENTOS" ]; then
    echo ""
    error "MySQL no respondió después de ${MAX_INTENTOS} intentos."
    exit 1
  fi
  printf "\r   Intento %d/%d..." "$INTENTO" "$MAX_INTENTOS"
  sleep 2
done
echo ""
exito "MySQL listo en localhost:3307"

instalar_si_es_necesario() {
  local directorio="$1"
  local nombre="$2"
  if [ ! -d "$directorio/node_modules" ]; then
    info "Instalando dependencias de $nombre..."
    (cd "$directorio" && npm install --silent)
    exito "$nombre listo"
  else
    exito "$nombre ya tiene dependencias"
  fi
}

instalar_si_es_necesario "backend"  "Backend"
instalar_si_es_necesario "frontend" "Frontend"

echo ""
info "Levantando backend (puerto 3000)..."
(cd backend && npm run dev) &
PID_BACKEND=$!

info "Levantando frontend (puerto 5173)..."
(cd frontend && npm run dev) &
PID_FRONTEND=$!

info "Esperando al backend..."
for i in {1..20}; do
  if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    break
  fi
  sleep 1
done

detener_servicios() {
  echo ""
  advertencia "Deteniendo servicios..."
  pkill -P "$PID_BACKEND"  2>/dev/null || true
  pkill -P "$PID_FRONTEND" 2>/dev/null || true
  kill "$PID_BACKEND" "$PID_FRONTEND" 2>/dev/null || true
  (cd docker && $COMPOSE down > /dev/null 2>&1)
  echo ""
  exito "Todo detenido. ¡Hasta luego!"
  exit 0
}
trap detener_servicios INT TERM

clear
echo ""
echo -e "        ${CIAN}  Frontend${SIN_COLOR}   →   ${NEGRITA}http://localhost:5173${SIN_COLOR}"
echo -e "        ${CIAN}  Backend${SIN_COLOR}    →   ${NEGRITA}http://localhost:3000${SIN_COLOR}"
echo -e "        ${CIAN}  MySQL${SIN_COLOR}      →   ${NEGRITA}localhost:3307${SIN_COLOR}"
echo ""
echo -e "        ${AMARILLO}Presioná Ctrl+C para detener todo.${SIN_COLOR}"
echo ""
echo ""

wait
