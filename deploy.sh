#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker no está instalado. Ejecuta primero: ./scripts/ec2-install-docker.sh"
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.production.example .env
  echo ""
  echo "Se creó .env desde .env.production.example"
  echo "Edita POSTGRES_PASSWORD y vuelve a ejecutar: ./deploy.sh"
  exit 1
fi

# shellcheck disable=SC1091
source .env

if [ "${POSTGRES_PASSWORD:-}" = "cambia_esta_contraseña_segura" ] || [ -z "${POSTGRES_PASSWORD:-}" ]; then
  echo "Define una POSTGRES_PASSWORD segura en .env antes de desplegar."
  exit 1
fi

echo "Construyendo y levantando contenedores..."
docker compose -f docker-compose.prod.yml up -d --build

echo ""
echo "Despliegue listo."
echo "  Web:  http://$(curl -sf ifconfig.me 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo 'TU_IP_PUBLICA')"
echo "  API:  /api/health (vía Nginx)"
echo ""
echo "Logs: docker compose -f docker-compose.prod.yml logs -f"
