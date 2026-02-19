#!/usr/bin/env bash
set -euo pipefail

LOG_PREFIX="[ОСТАНОВКА]"
log() {
  echo "${LOG_PREFIX} $*"
}

abort() {
  echo "${LOG_PREFIX} ОШИБКА: $*" >&2
  exit 1
}

TARGET_DIR="$HOME/compot"
PID_FILE="${TARGET_DIR}/.compot.pid"

if [[ ! -d "${TARGET_DIR}" ]]; then
  abort "Папка ${TARGET_DIR} не найдена."
fi

if [[ ! -f "${PID_FILE}" ]]; then
  abort "PID-файл не найден. Похоже, сервер не запущен через run.sh."
fi

PID="$(cat "${PID_FILE}" || true)"
if [[ -z "${PID}" ]]; then
  abort "PID-файл пустой."
fi

if ! ps -p "${PID}" >/dev/null 2>&1; then
  log "Процесс с PID ${PID} не найден. Удаляю PID-файл."
  rm -f "${PID_FILE}"
  exit 0
fi

log "Останавливаю сервер (PID ${PID})..."
kill "${PID}"

for _ in {1..20}; do
  if ! ps -p "${PID}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ps -p "${PID}" >/dev/null 2>&1; then
  log "Не удалось завершить процесс мягко. Принудительно завершаю..."
  kill -9 "${PID}" || true
fi

rm -f "${PID_FILE}"
log "Сервер остановлен."
log "Подсказка: для повторного запуска используйте ${TARGET_DIR}/run.sh"
