#!/usr/bin/env bash

set -euo pipefail

BACKEND_PORT="${BACKEND_PORT:-8080}"
DOWNTIME_SECONDS="${DOWNTIME_SECONDS:-30}"
BASE_URL="${BASE_URL:-http://localhost:8080}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:4200}"
AUTH_EMAIL="${AUTH_EMAIL:-admin@shop.local}"
AUTH_PASSWORD="${AUTH_PASSWORD:-admin}"
RUN_UI_PROBES="${RUN_UI_PROBES:-false}"

TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
OUTPUT_DIR="evidence/chaos/backend-down/${TIMESTAMP}"
METADATA_FILE="${OUTPUT_DIR}/experiment-metadata.txt"
README_FILE="${OUTPUT_DIR}/README.txt"
PRODUCTS_PROBES_FILE="${OUTPUT_DIR}/api-products-probes.csv"
LOGIN_PROBES_FILE="${OUTPUT_DIR}/api-login-probes.csv"
CHAOS_RUNNER_LOG="${OUTPUT_DIR}/backend-down-runner.log"

mkdir -p "${OUTPUT_DIR}"

timestamp() {
  date +"%Y-%m-%d %H:%M:%S %z"
}

capture_optional_command() {
  local output_file="$1"
  shift

  if command -v "$1" >/dev/null 2>&1; then
    "$@" > "${output_file}" 2>&1
  else
    printf '%s not available on this system.\n' "$1" > "${output_file}"
  fi
}

capture_setup_info() {
  uname -a > "${OUTPUT_DIR}/uname.txt"
  sw_vers > "${OUTPUT_DIR}/sw-vers.txt"
  capture_optional_command "${OUTPUT_DIR}/node-version.txt" node -v
  capture_optional_command "${OUTPUT_DIR}/npm-version.txt" npm -v
  capture_optional_command "${OUTPUT_DIR}/k6-version.txt" k6 version
}

capture_system_snapshots() {
  local phase="$1"

  top -l 1 > "${OUTPUT_DIR}/top-${phase}.txt"
  vm_stat > "${OUTPUT_DIR}/vm-stat-${phase}.txt"
  lsof -i :"${BACKEND_PORT}" > "${OUTPUT_DIR}/lsof-port-${BACKEND_PORT}-${phase}.txt" 2>&1 || true
}

write_metadata() {
  cat > "${METADATA_FILE}" <<EOF
scenario name: C1 Backend Down
backend port: ${BACKEND_PORT}
downtime seconds: ${DOWNTIME_SECONDS}
base url: ${BASE_URL}
frontend url: ${FRONTEND_URL}
ui probes enabled: ${RUN_UI_PROBES}
EOF
}

write_readme() {
  cat > "${README_FILE}" <<EOF
README

experiment-metadata.txt
Scenario metadata and configured runtime values.

uname.txt, sw-vers.txt, node-version.txt, npm-version.txt, k6-version.txt
Environment and tool version information captured before the experiment.

top-pre.txt, vm-stat-pre.txt, lsof-port-${BACKEND_PORT}-pre.txt
Pre-fault system and port snapshots.

top-post.txt, vm-stat-post.txt, lsof-port-${BACKEND_PORT}-post.txt
Post-fault system and port snapshots.

api-products-probes.csv
Timestamped GET /api/products/all probe results across baseline, downtime, and recovery phases.

api-login-probes.csv
Timestamped POST /api/auth/login probe results across baseline, downtime, and recovery phases.

backend-down-runner.log
Console output from the backend-down helper invoked by this runner.

ui-login.spec.txt, ui-checkout-risk.spec.txt
Optional Playwright probe outputs when RUN_UI_PROBES=true.
EOF
}

init_probe_files() {
  printf 'timestamp,phase,url,http_status,total_time_seconds,succeeded\n' > "${PRODUCTS_PROBES_FILE}"
  printf 'timestamp,phase,url,http_status,total_time_seconds,succeeded\n' > "${LOGIN_PROBES_FILE}"
}

append_probe_result() {
  local file="$1"
  local phase="$2"
  local url="$3"
  local http_status="$4"
  local total_time="$5"
  local succeeded="$6"

  printf '%s,%s,%s,%s,%s,%s\n' \
    "$(timestamp)" "${phase}" "${url}" "${http_status}" "${total_time}" "${succeeded}" >> "${file}"
}

probe_products() {
  local phase="$1"
  local url="${BASE_URL}/api/products/all"
  local result
  local http_status
  local total_time
  local succeeded="false"

  result="$(curl -sS -o /dev/null -w '%{http_code},%{time_total}' "${url}" 2>/dev/null || printf '000,0')"
  IFS=',' read -r http_status total_time <<< "${result}"

  if [[ "${http_status}" == "200" ]]; then
    succeeded="true"
  fi

  append_probe_result "${PRODUCTS_PROBES_FILE}" "${phase}" "${url}" "${http_status}" "${total_time}" "${succeeded}"

  [[ "${succeeded}" == "true" ]]
}

probe_login() {
  local phase="$1"
  local url="${BASE_URL}/api/auth/login"
  local payload
  local result
  local http_status
  local total_time
  local succeeded="false"

  payload="$(printf '{"email":"%s","password":"%s"}' "${AUTH_EMAIL}" "${AUTH_PASSWORD}")"
  result="$(curl -sS -o /dev/null -w '%{http_code},%{time_total}' \
    -H 'Content-Type: application/json' \
    -X POST \
    -d "${payload}" \
    "${url}" 2>/dev/null || printf '000,0')"
  IFS=',' read -r http_status total_time <<< "${result}"

  if [[ "${http_status}" == "200" ]]; then
    succeeded="true"
  fi

  append_probe_result "${LOGIN_PROBES_FILE}" "${phase}" "${url}" "${http_status}" "${total_time}" "${succeeded}"

  [[ "${succeeded}" == "true" ]]
}

run_baseline_probes() {
  probe_products "baseline" || true
  probe_login "baseline" || true
}

run_downtime_probes() {
  local elapsed=0

  while (( elapsed < DOWNTIME_SECONDS )); do
    probe_products "downtime" || true
    probe_login "downtime" || true
    sleep 2
    elapsed=$((elapsed + 2))
  done
}

run_recovery_probes() {
  local elapsed=0

  while (( elapsed <= 60 )); do
    local products_ok="false"
    local login_ok="false"

    if probe_products "recovery"; then
      products_ok="true"
    fi

    if probe_login "recovery"; then
      login_ok="true"
    fi

    if [[ "${products_ok}" == "true" && "${login_ok}" == "true" ]]; then
      printf 'Recovery probes succeeded for both endpoints at %s\n' "$(timestamp)" >> "${OUTPUT_DIR}/recovery-summary.txt"
      return 0
    fi

    sleep 2
    elapsed=$((elapsed + 2))
  done

  printf 'Recovery probes did not fully succeed within 60 seconds after downtime at %s\n' "$(timestamp)" >> "${OUTPUT_DIR}/recovery-summary.txt"
  return 1
}

run_optional_ui_probe() {
  local spec_path="$1"
  local output_file="$2"

  if command -v npx >/dev/null 2>&1; then
    BASE_URL="${BASE_URL}" FRONTEND_URL="${FRONTEND_URL}" npx playwright test "${spec_path}" > "${output_file}" 2>&1 || true
  else
    printf 'npx is not available; UI probe was not run.\n' > "${output_file}"
  fi
}

run_optional_ui_probes() {
  if [[ "${RUN_UI_PROBES}" != "true" ]]; then
    printf 'UI probes disabled.\n' > "${OUTPUT_DIR}/ui-probes.txt"
    return
  fi

  run_optional_ui_probe "tests/ui/login.spec.js" "${OUTPUT_DIR}/ui-login.spec.txt"
  run_optional_ui_probe "tests/ui/checkout-risk.spec.js" "${OUTPUT_DIR}/ui-checkout-risk.spec.txt"
}

start_fault_injection() {
  BACKEND_PORT="${BACKEND_PORT}" DOWNTIME_SECONDS="${DOWNTIME_SECONDS}" \
    ./chaos/backend-down.sh > "${CHAOS_RUNNER_LOG}" 2>&1 &
  CHAOS_PID=$!
}

capture_setup_info
capture_system_snapshots "pre"
write_metadata
write_readme
init_probe_files
run_baseline_probes
start_fault_injection
run_downtime_probes
run_optional_ui_probes
wait "${CHAOS_PID}" || true

echo "Backend downtime window ended."
echo "Manual backend restart may be required if service is not back."

run_recovery_probes || true
capture_system_snapshots "post"
