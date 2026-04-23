#!/usr/bin/env bash

set -euo pipefail

OUTPUT_DIR="evidence/performance/auth-login"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"

export BASE_URL="${BASE_URL:-http://localhost:8080}"
export AUTH_EMAIL="${AUTH_EMAIL:-admin@shop.local}"
export AUTH_PASSWORD="${AUTH_PASSWORD:-admin}"

mkdir -p "${OUTPUT_DIR}"

SUMMARY_FILE="${OUTPUT_DIR}/auth-login-summary-${TIMESTAMP}.json"
CONSOLE_FILE="${OUTPUT_DIR}/auth-login-console-${TIMESTAMP}.txt"
UNAME_FILE="${OUTPUT_DIR}/uname-${TIMESTAMP}.txt"
SW_VERS_FILE="${OUTPUT_DIR}/sw-vers-${TIMESTAMP}.txt"
K6_VERSION_FILE="${OUTPUT_DIR}/k6-version-${TIMESTAMP}.txt"
TOP_BEFORE_FILE="${OUTPUT_DIR}/top-before-${TIMESTAMP}.txt"
VM_STAT_BEFORE_FILE="${OUTPUT_DIR}/vm-stat-before-${TIMESTAMP}.txt"
IOSTAT_BEFORE_FILE="${OUTPUT_DIR}/iostat-before-${TIMESTAMP}.txt"
TOP_AFTER_FILE="${OUTPUT_DIR}/top-after-${TIMESTAMP}.txt"
VM_STAT_AFTER_FILE="${OUTPUT_DIR}/vm-stat-after-${TIMESTAMP}.txt"
IOSTAT_AFTER_FILE="${OUTPUT_DIR}/iostat-after-${TIMESTAMP}.txt"

uname -a > "${UNAME_FILE}"
sw_vers > "${SW_VERS_FILE}"
k6 version > "${K6_VERSION_FILE}"

top -l 1 > "${TOP_BEFORE_FILE}"
vm_stat > "${VM_STAT_BEFORE_FILE}"
iostat -d -c 2 > "${IOSTAT_BEFORE_FILE}"

K6_SUMMARY_EXPORT="${SUMMARY_FILE}" \
  k6 run performance/k6/auth-login.js | tee "${CONSOLE_FILE}"

top -l 1 > "${TOP_AFTER_FILE}"
vm_stat > "${VM_STAT_AFTER_FILE}"
iostat -d -c 2 > "${IOSTAT_AFTER_FILE}"

printf 'Authentication performance evidence saved to %s\n' "${OUTPUT_DIR}"
