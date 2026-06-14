#!/usr/bin/env bash

set -euo pipefail

if [ "${EUID:-$(id -u)}" -ne 0 ]; then
  echo "Bitte als root ausfuehren."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 24 oder neuer wird benoetigt."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm wird benoetigt."
  exit 1
fi

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
RELEASE_ROOT="${PLAINBASE_RELEASE_ROOT:-/opt/plainbase/releases}"
CURRENT_LINK="${PLAINBASE_CURRENT_LINK:-/opt/plainbase/current}"
CONFIG_DIR="${PLAINBASE_CONFIG_DIR:-/etc/plainbase}"
DATA_DIR="${PLAINBASE_DATA_DIR:-/var/lib/plainbase}"
ENV_FILE="${PLAINBASE_ENV_FILE:-$CONFIG_DIR/plainbase.env}"
SERVICE_NAME="${PLAINBASE_SERVICE_NAME:-plainbase}"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
APP_USER="${PLAINBASE_APP_USER:-plainbase}"
APP_GROUP="${PLAINBASE_APP_GROUP:-plainbase}"

VERSION="$(node --input-type=module -e 'import fs from "node:fs"; const pkg = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); console.log(pkg.version);' "${SOURCE_ROOT}/package.json")"
TARGET_DIR="${RELEASE_ROOT}/${VERSION}"

if ! getent group "${APP_GROUP}" >/dev/null 2>&1; then
  groupadd --system "${APP_GROUP}"
fi

if ! id -u "${APP_USER}" >/dev/null 2>&1; then
  useradd --system --home-dir /opt/plainbase --shell /usr/sbin/nologin --gid "${APP_GROUP}" "${APP_USER}"
fi

install -d -o "${APP_USER}" -g "${APP_GROUP}" /opt/plainbase
install -d -o "${APP_USER}" -g "${APP_GROUP}" "${RELEASE_ROOT}"
install -d -o "${APP_USER}" -g "${APP_GROUP}" "${CONFIG_DIR}"
install -d -o "${APP_USER}" -g "${APP_GROUP}" "${DATA_DIR}"
install -d -o "${APP_USER}" -g "${APP_GROUP}" "${DATA_DIR}/content"

rm -rf "${TARGET_DIR}"
mkdir -p "${TARGET_DIR}"
cp -R "${SOURCE_ROOT}/." "${TARGET_DIR}/"

cd "${TARGET_DIR}"
npm ci --omit=dev

if [ ! -f "${ENV_FILE}" ]; then
  install -o "${APP_USER}" -g "${APP_GROUP}" -m 0640 \
    "${TARGET_DIR}/ops/self-hosted/plainbase.env.example" \
    "${ENV_FILE}"
fi

sed \
  -e "s#__PLAINBASE_CURRENT__#${CURRENT_LINK}#g" \
  -e "s#__PLAINBASE_ENV_FILE__#${ENV_FILE}#g" \
  -e "s#__PLAINBASE_DATA_DIR__#${DATA_DIR}#g" \
  "${TARGET_DIR}/ops/self-hosted/plainbase.service" > "${SERVICE_FILE}"

chown -R "${APP_USER}:${APP_GROUP}" "${TARGET_DIR}" "${CONFIG_DIR}" "${DATA_DIR}"
ln -sfn "${TARGET_DIR}" "${CURRENT_LINK}"

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

set -a
. "${ENV_FILE}"
set +a

API_HOST="${HOST:-127.0.0.1}"
API_PORT="${PLAINBASE_API_PORT:-3001}"

echo
echo "Plainbase wurde installiert."
echo "Release: ${TARGET_DIR}"
echo "Service: ${SERVICE_NAME}"
echo "Health: http://${API_HOST}:${API_PORT}/api/health"
echo
echo "Naechster Schritt:"
echo "1. server_name in ${TARGET_DIR}/ops/self-hosted/nginx.plainbase.conf anpassen"
echo "2. nginx-Konfiguration aktivieren und nginx neu laden"
