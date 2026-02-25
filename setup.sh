#!/usr/bin/env bash
set -euo pipefail

LOG_PREFIX="[УСТАНОВКА]"
TEMP_LOG="/tmp/compot-setup.log"
FINAL_LOG=""
log() {
  if [[ -n "${FINAL_LOG}" ]]; then
    echo "${LOG_PREFIX} $*" | tee -a "${FINAL_LOG}"
  else
    echo "${LOG_PREFIX} $*" | tee -a "${TEMP_LOG}"
  fi
}

abort() {
  echo "${LOG_PREFIX} ОШИБКА: $*" >&2
  exit 1
}

REPO_URL="https://github.com/sobakapav/compot"
TARGET_DIR="$HOME/compot"
DATA_REPO_URL_DEFAULT="git@github.com:sobakapav/compot-data.git"
DATA_REPO_DIR_DEFAULT="$HOME/compot-data"
NODE_VERSION="25.6.1"
PORT="3000"

log "Старт полного развёртывания Compot."
log "Папка установки: ${TARGET_DIR}"
log "Репозиторий: ${REPO_URL}"
log "Желаемая версия Node.js: v${NODE_VERSION}"

if [[ -d "${TARGET_DIR}" ]]; then
  abort "Папка ${TARGET_DIR} уже существует. Удалите её или переместите, затем запустите скрипт снова."
fi

if ! command -v xcode-select >/dev/null 2>&1; then
  abort "Не найден xcode-select. Установите Xcode Command Line Tools и запустите снова."
fi

if ! xcode-select -p >/dev/null 2>&1; then
  log "Xcode Command Line Tools не установлены. Запускаю установку..."
  xcode-select --install || true
  log "После завершения установки Xcode Command Line Tools запустите скрипт ещё раз."
  exit 1
fi

if ! command -v brew >/dev/null 2>&1; then
  log "Homebrew не найден. Запускаю официальный установщик Homebrew..."
  log "Установщик может запросить пароль и подтверждения."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
  log "Homebrew уже установлен."
fi

if [[ -x /opt/homebrew/bin/brew ]]; then
  eval "$(/opt/homebrew/bin/brew shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
  eval "$(/usr/local/bin/brew shellenv)"
else
  abort "Не удалось найти brew после установки."
fi

log "Обновляю brew..."
brew update

log "Устанавливаю базовые зависимости через Homebrew..."
brew install git
brew install wget
brew install curl

log "Устанавливаю шрифт PT Sans Narrow..."
FONT_DIR="${HOME}/Library/Fonts"
mkdir -p "${FONT_DIR}"
curl -L -o "${FONT_DIR}/PTSans-Narrow.ttf" "https://github.com/google/fonts/raw/main/ofl/ptsans/PTSans-Narrow.ttf"
curl -L -o "${FONT_DIR}/PTSans-NarrowBold.ttf" "https://github.com/google/fonts/raw/main/ofl/ptsans/PTSans-NarrowBold.ttf"
log "Шрифты установлены в ${FONT_DIR}"

CURRENT_NODE_VERSION=""
if command -v node >/dev/null 2>&1; then
  CURRENT_NODE_VERSION="$(node -v | sed 's/^v//')"
fi

if [[ "${CURRENT_NODE_VERSION}" != "${NODE_VERSION}" ]]; then
  log "Текущая версия Node.js: ${CURRENT_NODE_VERSION:-не установлена}. Устанавливаю v${NODE_VERSION}..."
  NODE_PKG="/tmp/node-v${NODE_VERSION}.pkg"
  curl -L -o "${NODE_PKG}" "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}.pkg"
  sudo installer -pkg "${NODE_PKG}" -target /
  rm -f "${NODE_PKG}"
else
  log "Node.js уже нужной версии v${NODE_VERSION}."
fi

log "Проверка версий инструментов..."
log "Node.js: $(node -v)"
log "npm: $(npm -v)"
if command -v npx >/dev/null 2>&1; then
  log "npx: $(npx -v)"
fi

log "Клонирую репозиторий..."
git clone "${REPO_URL}" "${TARGET_DIR}"

log "Перехожу в папку проекта..."
cd "${TARGET_DIR}"

LOG_DIR="${TARGET_DIR}/logs"
FINAL_LOG="${LOG_DIR}/setup.log"
mkdir -p "${LOG_DIR}"
if [[ -f "${TEMP_LOG}" ]]; then
  cat "${TEMP_LOG}" >> "${FINAL_LOG}"
  rm -f "${TEMP_LOG}"
fi
log "Логи установки сохраняются в ${FINAL_LOG}"

log "Настраиваю репозиторий данных..."
read -r -p "URL data-репозитория (по умолчанию ${DATA_REPO_URL_DEFAULT}): " DATA_REPO_URL_INPUT
DATA_REPO_URL="${DATA_REPO_URL_INPUT:-${DATA_REPO_URL_DEFAULT}}"

read -r -p "Папка data-репозитория (по умолчанию ${DATA_REPO_DIR_DEFAULT}): " DATA_REPO_DIR_INPUT
DATA_REPO_DIR="${DATA_REPO_DIR_INPUT:-${DATA_REPO_DIR_DEFAULT}}"

read -r -p "Ветка data-репозитория (необязательно): " DATA_REPO_BRANCH_INPUT
DATA_REPO_BRANCH="${DATA_REPO_BRANCH_INPUT:-}"

GIT_USER_NAME="$(git config --get user.name || true)"
if [[ -z "${DATA_REPO_BRANCH}" ]]; then
  if [[ -z "${GIT_USER_NAME}" ]]; then
    read -r -p "GitHub логин (для ветки users/<login>): " GIT_USER_NAME
  fi
  DATA_REPO_SLUG="$(echo "${GIT_USER_NAME}" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd 'a-z0-9._-')"
  if [[ -z "${DATA_REPO_SLUG}" ]]; then
    DATA_REPO_SLUG="user-$(date +%s)"
  fi
  DATA_REPO_BRANCH="users/${DATA_REPO_SLUG}"
fi

if [[ -d "${DATA_REPO_DIR}/.git" ]]; then
  log "Data-репозиторий уже существует: ${DATA_REPO_DIR}"
  cd "${DATA_REPO_DIR}"
  if ! git remote get-url origin >/dev/null 2>&1; then
    git remote add origin "${DATA_REPO_URL}"
  fi
  git fetch --all --prune
else
  log "Клонирую data-репозиторий в ${DATA_REPO_DIR}..."
  git clone "${DATA_REPO_URL}" "${DATA_REPO_DIR}"
  cd "${DATA_REPO_DIR}"
fi

if git show-ref --verify --quiet "refs/remotes/origin/${DATA_REPO_BRANCH}"; then
  git checkout -B "${DATA_REPO_BRANCH}" "origin/${DATA_REPO_BRANCH}"
else
  git checkout -B "${DATA_REPO_BRANCH}"
  git push -u origin "${DATA_REPO_BRANCH}"
fi

cd "${TARGET_DIR}"

SOURCE_PROPOSALS_DIR="${TARGET_DIR}/data/proposals"
TARGET_PROPOSALS_DIR="${DATA_REPO_DIR}/proposals"
if [[ -d "${SOURCE_PROPOSALS_DIR}" ]]; then
  mkdir -p "${TARGET_PROPOSALS_DIR}"
  if [[ -z "$(ls -A "${TARGET_PROPOSALS_DIR}" 2>/dev/null)" ]]; then
    log "Переношу предложения из ${SOURCE_PROPOSALS_DIR} в ${TARGET_PROPOSALS_DIR}..."
    rsync -a "${SOURCE_PROPOSALS_DIR}/" "${TARGET_PROPOSALS_DIR}/"
    log "Перенос завершён. Исходные данные оставлены без изменений."
  else
    log "Перенос пропущен: ${TARGET_PROPOSALS_DIR} не пуст."
  fi
fi

cat > "${TARGET_DIR}/config.json" <<EOF
{
  "dataRepo": {
    "path": "${DATA_REPO_DIR}",
    "remote": "${DATA_REPO_URL}",
    "branch": "${DATA_REPO_BRANCH}",
    "autoPushMinutes": 60
  }
}
EOF
log "Config записан в ${TARGET_DIR}/config.json"

log "Выставляю права на запуск скриптов..."
chmod +x "${TARGET_DIR}/run.sh" "${TARGET_DIR}/stop.sh" "${TARGET_DIR}/update.sh"

log "Устанавливаю npm-зависимости (npm ci)..."
npm ci

log "Устанавливаю браузеры для Playwright..."
npx playwright install

log "Собираю проект (npm run build)..."
npm run build

log "Запускаю сервер через run.sh..."
bash "${TARGET_DIR}/run.sh"

log "Подсказка: для повторного запуска используйте ${TARGET_DIR}/run.sh"
log "Подсказка: для остановки используйте ${TARGET_DIR}/stop.sh"
log "Подсказка: для обновления используйте ${TARGET_DIR}/update.sh"
