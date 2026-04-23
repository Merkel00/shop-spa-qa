#!/usr/bin/env bash

set -euo pipefail

DB_PORT="${DB_PORT:-5432}"
DOWNTIME_SECONDS="${DOWNTIME_SECONDS:-20}"
OUTPUT_DIR="evidence/chaos/db-down"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
LOG_FILE="${OUTPUT_DIR}/db-down-${TIMESTAMP}.log"
HOMEBREW_SERVICE_NAME="postgresql@15"

mkdir -p "${OUTPUT_DIR}"

START_TIME="$(date +"%Y-%m-%d %H:%M:%S %z")"
KILL_TIME="$(date +"%Y-%m-%d %H:%M:%S %z")"
PLANNED_RECOVERY_TIME="$(date -v+"${DOWNTIME_SECONDS}"S +"%Y-%m-%d %H:%M:%S %z")"
DB_PID="$(lsof -ti :"${DB_PORT}" || true)"
STOP_METHOD="pid kill"

homebrew_service_available() {
  command -v brew >/dev/null 2>&1 && brew services list 2>/dev/null | awk '{print $1}' | grep -Fxq "${HOMEBREW_SERVICE_NAME}"
}

if homebrew_service_available; then
  STOP_METHOD="brew services stop ${HOMEBREW_SERVICE_NAME}"
fi

{
  echo "start time: ${START_TIME}"
  echo "db port: ${DB_PORT}"
  echo "downtime seconds: ${DOWNTIME_SECONDS}"
  echo "detected DB PID: ${DB_PID}"
  echo "kill action timestamp: ${KILL_TIME}"
  echo "planned recovery timestamp: ${PLANNED_RECOVERY_TIME}"
  echo "stop method: ${STOP_METHOD}"
} > "${LOG_FILE}"

if homebrew_service_available; then
  brew services stop "${HOMEBREW_SERVICE_NAME}" >> "${LOG_FILE}" 2>&1
else
  if [[ -z "${DB_PID}" ]]; then
    echo "No database process found on port ${DB_PORT}."
    exit 1
  fi

  kill "${DB_PID}"
fi

sleep "${DOWNTIME_SECONDS}"

if [[ "${STOP_METHOD}" == brew* ]]; then
  echo "Homebrew PostgreSQL service ${HOMEBREW_SERVICE_NAME} was stopped."
  echo "Manual DB restart is required: brew services start ${HOMEBREW_SERVICE_NAME}"
else
  echo "Database process ${DB_PID} on port ${DB_PORT} was stopped."
  echo "Manual DB restart is required."
fi

echo "Log written to ${LOG_FILE}."
