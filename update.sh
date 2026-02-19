#!/usr/bin/env bash
set -euo pipefail

LOG_PREFIX="[ОБНОВЛЕНИЕ]"
LOG_DIR=""
LOG_FILE=""
log() {
  if [[ -n "${LOG_FILE}" ]]; then
    echo "${LOG_PREFIX} $*" | tee -a "${LOG_FILE}"
  else
    echo "${LOG_PREFIX} $*"
  fi
}

abort() {
  echo "${LOG_PREFIX} ОШИБКА: $*" >&2
  exit 1
}

TARGET_DIR="$HOME/compot"
PID_FILE="${TARGET_DIR}/.compot.pid"

if [[ ! -d "${TARGET_DIR}" ]]; then
  abort "Папка ${TARGET_DIR} не найдена. Сначала выполните установку."
fi

cd "${TARGET_DIR}"

LOG_DIR="${TARGET_DIR}/logs"
LOG_FILE="${LOG_DIR}/update.log"
mkdir -p "${LOG_DIR}"
log "Логи обновления сохраняются в ${LOG_FILE}"

if [[ -f "${PID_FILE}" ]] && ps -p "$(cat "${PID_FILE}" 2>/dev/null || true)" >/dev/null 2>&1; then
  log "Сервер запущен. Останавливаю перед обновлением..."
  bash "${TARGET_DIR}/stop.sh"
fi

log "Обновляю репозиторий (git pull --ff-only)..."
git pull --ff-only

log "Обновляю зависимости (npm ci)..."
npm ci

log "Собираю проект (npm run build)..."
npm run build

log "Запускаю сервер после обновления..."
bash "${TARGET_DIR}/run.sh"

log "Обновление завершено."
