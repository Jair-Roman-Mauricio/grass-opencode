#!/usr/bin/env bash
# Instalación inicial de Docker en Amazon Linux 2023 / Ubuntu (EC2)
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Ejecuta con sudo: sudo ./scripts/ec2-install-docker.sh"
  exit 1
fi

if command -v apt-get >/dev/null 2>&1; then
  apt-get update -y
  apt-get install -y ca-certificates curl git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
elif command -v dnf >/dev/null 2>&1; then
  dnf update -y
  dnf install -y docker git
  systemctl enable docker
  systemctl start docker
  mkdir -p /usr/local/lib/docker/cli-plugins
  curl -SL "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m)" \
    -o /usr/local/lib/docker/cli-plugins/docker-compose
  chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
else
  echo "SO no soportado automáticamente. Instala Docker manualmente."
  exit 1
fi

systemctl enable docker
systemctl start docker

if id ec2-user &>/dev/null; then
  usermod -aG docker ec2-user
  echo "Usuario ec2-user añadido al grupo docker (cierra sesión SSH y vuelve a entrar)."
elif id ubuntu &>/dev/null; then
  usermod -aG docker ubuntu
  echo "Usuario ubuntu añadido al grupo docker (cierra sesión SSH y vuelve a entrar)."
fi

docker --version
docker compose version
echo "Docker listo."
