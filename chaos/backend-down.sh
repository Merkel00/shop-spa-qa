#!/usr/bin/env bash

set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8080}"
DOWNTIME_SECONDS="${DOWNTIME_SECONDS:-30}"
OUTPUT_DIR="evidence/chaos/backend-down"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
LOG_FILE="${OUTPUT_DIR}/backend-down-${TIMESTAMP}.log"

mkdir -p "${OUTPUT_DIR}"

BACKEND_PID="$(lsof -ti :"${BACKEND_PORT}" || true)"

if [[ -z "${BACKEND_PID}" ]]; then
  echo "No backend process found on port ${BACKEND_PORT}."
  exit 1
fi

START_TIME="$(date +"%Y-%m-%d %H:%M:%S %z")"
KILL_TIME="$(date +"%Y-%m-%d %H:%M:%S %z")"
PLANNED_RECOVERY_TIME="$(date -v+"${DOWNTIME_SECONDS}"S +"%Y-%m-%d %H:%M:%S %z")"

{
  echo "start time: ${START_TIME}"
  echo "backend port: ${BACKEND_PORT}"
  echo "downtime seconds: ${DOWNTIME_SECONDS}"
  echo "detected backend PID: ${BACKEND_PID}"
  echo "kill action timestamp: ${KILL_TIME}"
  echo "planned recovery timestamp: ${PLANNED_RECOVERY_TIME}"
} > "${LOG_FILE}"

kill "${BACKEND_PID}"
sleep "${DOWNTIME_SECONDS}"

echo "Backend process ${BACKEND_PID} on port ${BACKEND_PORT} was stopped."
echo "Manual backend restart is required."
echo "Log written to ${LOG_FILE}."
