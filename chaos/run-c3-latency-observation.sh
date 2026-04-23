#!/usr/bin/env bash

set -euo pipefail

FRONTEND_URL="${FRONTEND_URL:-http://localhost:4200}"
BACKEND_URL="${BACKEND_URL:-http://localhost:8080}"
CHAOS_ORDER_DELAY_MS="${CHAOS_ORDER_DELAY_MS:-2500}"
CHAOS_ORDER_DELAY_ENABLED="true"

TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
OUTPUT_DIR="evidence/chaos/latency/${TIMESTAMP}"
METADATA_FILE="${OUTPUT_DIR}/experiment-metadata.txt"
README_FILE="${OUTPUT_DIR}/README.txt"
PRODUCTS_PROBES_FILE="${OUTPUT_DIR}/api-products-probes.csv"
LOGIN_PROBES_FILE="${OUTPUT_DIR}/api-login-probes.csv"

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
}

capture_system_snapshots() {
  local phase="$1"

  top -l 1 > "${OUTPUT_DIR}/top-${phase}.txt"
  vm_stat > "${OUTPUT_DIR}/vm-stat-${phase}.txt"
  lsof -i :8080 > "${OUTPUT_DIR}/lsof-backend-8080-${phase}.txt" 2>&1 || true
  lsof -i :4200 > "${OUTPUT_DIR}/lsof-frontend-4200-${phase}.txt" 2>&1 || true
}

write_metadata() {
  cat > "${METADATA_FILE}" <<EOF
scenario name: C3 Latency / Slowdown
frontend url: ${FRONTEND_URL}
backend url: ${BACKEND_URL}
delay enabled: ${CHAOS_ORDER_DELAY_ENABLED}
delay ms value: ${CHAOS_ORDER_DELAY_MS}
targeted path: order creation / checkout flow
EOF
}

write_readme() {
  cat > "${README_FILE}" <<EOF
README

experiment-metadata.txt
Scenario metadata and configured latency settings.

uname.txt, sw-vers.txt, node-version.txt, npm-version.txt
Environment and local tool version information captured before the run.

top-pre.txt, vm-stat-pre.txt, lsof-backend-8080-pre.txt, lsof-frontend-4200-pre.txt
Pre-run system and port snapshots.

top-post.txt, vm-stat-post.txt, lsof-backend-8080-post.txt, lsof-frontend-4200-post.txt
Post-run system and port snapshots.

api-products-probes.csv
Timestamped GET /api/products/all probe results for baseline and post-run phases.

api-login-probes.csv
Timestamped POST /api/auth/login probe results for baseline and post-run phases.

ui-checkout-risk.spec.txt
Playwright output for the checkout risk scenario under the latency setup.

ui-checkout.spec.txt
Playwright output for the main checkout flow under the latency setup.
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
  local url="${BACKEND_URL}/api/products/all"
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
}

probe_login() {
  local phase="$1"
  local url="${BACKEND_URL}/api/auth/login"
  local payload
  local result
  local http_status
  local total_time
  local succeeded="false"

  payload='{"email":"admin@shop.local","password":"admin"}'
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
}

run_api_probe_set() {
  local phase="$1"

  probe_products "${phase}"
  probe_login "${phase}"
}

run_ui_probe() {
  local spec_path="$1"
  local output_file="$2"

  if command -v npx >/dev/null 2>&1; then
    FRONTEND_URL="${FRONTEND_URL}" \
    BACKEND_URL="${BACKEND_URL}" \
    BASE_URL="${BACKEND_URL}" \
    CHAOS_ORDER_DELAY_ENABLED="${CHAOS_ORDER_DELAY_ENABLED}" \
    CHAOS_ORDER_DELAY_MS="${CHAOS_ORDER_DELAY_MS}" \
      npx playwright test "${spec_path}" > "${output_file}" 2>&1 || true
  else
    printf 'npx is not available; UI probe was not run.\n' > "${output_file}"
  fi
}

run_ui_probes() {
  run_ui_probe "tests/ui/checkout-risk.spec.js" "${OUTPUT_DIR}/ui-checkout-risk.spec.txt"
  run_ui_probe "tests/ui/checkout.spec.js" "${OUTPUT_DIR}/ui-checkout.spec.txt"
}

capture_setup_info
capture_system_snapshots "pre"
write_metadata
write_readme
init_probe_files
run_api_probe_set "baseline"
run_ui_probes
run_api_probe_set "post-run"
capture_system_snapshots "post"
