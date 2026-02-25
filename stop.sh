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

CONFIG_PATH="${TARGET_DIR}/config.json"
DATA_REPO_DIR="${HOME}/compot-data"
if [[ -f "${CONFIG_PATH}" ]]; then
  DATA_REPO_DIR="$(node -e "const fs=require('fs');const path='${CONFIG_PATH}';try{const data=JSON.parse(fs.readFileSync(path,'utf8'));if(data?.dataRepo?.path){console.log(data.dataRepo.path);}}catch{}")"
  if [[ -z "${DATA_REPO_DIR}" ]]; then
    DATA_REPO_DIR="${HOME}/compot-data"
  fi
fi

if [[ -d "${DATA_REPO_DIR}/.git" ]]; then
  log "Фиксирую данные в репозитории (${DATA_REPO_DIR})..."
  if [[ -n "$(git -C "${DATA_REPO_DIR}" status --porcelain)" ]]; then
    git -C "${DATA_REPO_DIR}" add -A
    git -C "${DATA_REPO_DIR}" commit -m "manual: $(date -u +%Y-%m-%dT%H:%M:%SZ)" || true
    git -C "${DATA_REPO_DIR}" push || true
  else
    log "Нет изменений для фиксации."
  fi
else
  log "Data-репозиторий не найден, пропускаю фиксацию."
fi

log "Подсказка: для повторного запуска используйте ${TARGET_DIR}/run.sh"
