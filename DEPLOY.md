# Despliegue en AWS EC2 (Docker)

## Requisitos en EC2

1. **Security Group**: abre el puerto **80** (HTTP) desde `0.0.0.0/0` (o tu IP).
2. Instancia con al menos **2 GB RAM** recomendado (`t3.micro` funciona pero justo).

## Primera vez en el servidor

```bash
# Conectar por SSH
ssh -i tu-clave.pem ec2-user@54.221.185.41

# Clonar el repo
git clone https://github.com/TU_USUARIO/stone-grass-game.git
cd stone-grass-game

# Instalar Docker (solo una vez)
chmod +x scripts/ec2-install-docker.sh deploy.sh
sudo ./scripts/ec2-install-docker.sh
# Cierra sesión SSH y vuelve a entrar para aplicar el grupo docker

# Configurar variables
cp .env.production.example .env
nano .env   # cambia POSTGRES_PASSWORD

# Desplegar
./deploy.sh
```

Abre en el navegador: **http://54.221.185.41** (tu IP pública).

## Comandos útiles

```bash
# Ver logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar tras un git pull
git pull
./deploy.sh

# Parar todo
docker compose -f docker-compose.prod.yml down

# Parar y borrar datos de BD (¡cuidado!)
docker compose -f docker-compose.prod.yml down -v
```

## Arquitectura

| Servicio   | Puerto interno | Descripción              |
|-----------|----------------|--------------------------|
| `web`     | 80 (público)   | Nginx + React estático   |
| `api`     | 3001           | Express `/api/*`         |
| `postgres`| 5432           | Base de datos (interna)  |

Nginx hace proxy de `/api` hacia el contenedor `api`.

## Desarrollo local (sin producción)

```bash
docker compose up -d          # postgres + api + vite dev
pnpm dev                      # o pnpm dev:all
```
