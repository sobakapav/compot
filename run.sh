#!/usr/bin/env bash
set -euo pipefail

LOG_PREFIX="[ЗАПУСК]"
log() {
  echo "${LOG_PREFIX} $*"
}

abort() {
  echo "${LOG_PREFIX} ОШИБКА: $*" >&2
  exit 1
}

TARGET_DIR="$HOME/compot"
PID_FILE="${TARGET_DIR}/.compot.pid"
LOG_DIR="${TARGET_DIR}/logs"
LOG_FILE="${LOG_DIR}/compot.log"
PORT="3000"

if [[ ! -d "${TARGET_DIR}" ]]; then
  abort "Папка ${TARGET_DIR} не найдена. Сначала выполните установку."
fi

if [[ -f "${PID_FILE}" ]]; then
  EXISTING_PID="$(cat "${PID_FILE}" || true)"
  if [[ -n "${EXISTING_PID}" ]] && ps -p "${EXISTING_PID}" >/dev/null 2>&1; then
    abort "Сервер уже запущен (PID ${EXISTING_PID})."
  fi
  rm -f "${PID_FILE}"
fi

cd "${TARGET_DIR}"

mkdir -p "${LOG_DIR}"

if [[ ! -d ".next" ]]; then
  log "Сборка не найдена. Запускаю сборку (npm run build)..."
  npm run build
fi

log "Запускаю сервер (npm run start) на порту ${PORT}..."
PORT="${PORT}" npm run start >"${LOG_FILE}" 2>&1 &
SERVER_PID=$!
echo "${SERVER_PID}" > "${PID_FILE}"

log "Ожидаю запуск сервера..."
for _ in {1..60}; do
  if nc -z 127.0.0.1 "${PORT}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if nc -z 127.0.0.1 "${PORT}" >/dev/null 2>&1; then
  log "Открываю браузер..."
  open "http://localhost:${PORT}"
  log "Сервер запущен. Логи: ${LOG_FILE}"
else
  log "Не удалось подтвердить запуск сервера. Логи: ${LOG_FILE}"
fi

log "Подсказка: для остановки используйте ${TARGET_DIR}/stop.sh"
