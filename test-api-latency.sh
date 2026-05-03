#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

print_help() {
  cat <<'EOF'
CS Ranger API latency test runner

Usage:
  ./test-api-latency.sh [target] [options passed to latency suite]

Targets:
  local | localhost        http://localhost:3000
  prod | production        https://cs-ranger.in
  cs-ranger | cs-ranger.in https://cs-ranger.in
  example.com              Any bare domain, converted to https://example.com
  https://example.com      Any full URL

Examples:
  ./test-api-latency.sh local
  ./test-api-latency.sh cs-ranger.in --repeat 10 --concurrency 3
  ./test-api-latency.sh http://localhost:3000 --only /api/courses
  API_TEST_COURSE_ID=uuid API_TEST_NODE_ID=uuid ./test-api-latency.sh local --only /api/courses
  COOKIE="sb-access-token=..." ./test-api-latency.sh production --only /api/profile

Environment:
  API_BASE_URL             Default target when no target argument is passed
  REPEAT                   Requests per endpoint. Default: 5
  CONCURRENCY              Parallel requests per endpoint. Default: 2
  TIMEOUT_MS               Per-request timeout. Default: 15000
  OUTPUT                   JSON report path. Default: backend/testing/reports/latest-api-latency-suite.json
  COOKIE                   Cookie header for authenticated APIs
  FAIL_P95_MS              Fail when any endpoint p95 exceeds this value
  INCLUDE_MUTATING=1       Also test POST/PUT/PATCH/DELETE routes
  API_TEST_*_ID            Dynamic route IDs, e.g. API_TEST_COURSE_ID

Notes:
  By default this tests safe API methods only: GET, HEAD, OPTIONS.
  Mutating APIs are skipped unless INCLUDE_MUTATING=1 or --include-mutating is passed.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  print_help
  exit 0
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm was not found. Install Node/npm first, then rerun this script." >&2
  exit 1
fi

if [[ ! -f "backend/testing/run-api-latency-suite.mjs" ]]; then
  echo "Missing backend/testing/run-api-latency-suite.mjs. Run this from the CS Ranger repo root." >&2
  exit 1
fi

BASE_URL="${API_BASE_URL:-${API_TEST_BASE_URL:-${API_LATENCY_BASE_URL:-http://localhost:3000}}}"

if [[ $# -gt 0 ]]; then
  case "$1" in
    local|localhost)
      BASE_URL="http://localhost:3000"
      shift
      ;;
    prod|production|cs-ranger|cs-ranger.in)
      BASE_URL="https://cs-ranger.in"
      shift
      ;;
    http://*|https://*)
      BASE_URL="${1%/}"
      shift
      ;;
    *.*)
      BASE_URL="https://${1%/}"
      shift
      ;;
  esac
fi

REPEAT="${REPEAT:-${API_LATENCY_REPEAT:-5}}"
CONCURRENCY="${CONCURRENCY:-${API_LATENCY_CONCURRENCY:-2}}"
TIMEOUT_MS="${TIMEOUT_MS:-${API_LATENCY_TIMEOUT_MS:-15000}}"
OUTPUT="${OUTPUT:-${API_LATENCY_SUITE_OUTPUT:-backend/testing/reports/latest-api-latency-suite.json}}"

COMMAND=(
  npm run test:api:latency:all --
  --base "$BASE_URL"
  --repeat "$REPEAT"
  --concurrency "$CONCURRENCY"
  --timeout-ms "$TIMEOUT_MS"
  --output "$OUTPUT"
)

if [[ -n "${COOKIE:-}" ]]; then
  COMMAND+=(--cookie "$COOKIE")
fi

if [[ -n "${FAIL_P95_MS:-}" ]]; then
  COMMAND+=(--fail-p95-ms "$FAIL_P95_MS")
fi

if [[ "${INCLUDE_MUTATING:-0}" == "1" ]]; then
  COMMAND+=(--include-mutating)
fi

add_param_if_present() {
  local param_name="$1"
  local env_name="$2"
  local env_value="${!env_name:-}"

  if [[ -n "$env_value" ]]; then
    COMMAND+=(--param "$param_name=$env_value")
  fi
}

add_param_if_present courseId API_TEST_COURSE_ID
add_param_if_present courseId COURSE_ID
add_param_if_present nodeId API_TEST_NODE_ID
add_param_if_present nodeId NODE_ID
add_param_if_present creatorId API_TEST_CREATOR_ID
add_param_if_present creatorId CREATOR_ID
add_param_if_present moduleId API_TEST_MODULE_ID
add_param_if_present moduleId MODULE_ID
add_param_if_present reviewId API_TEST_REVIEW_ID
add_param_if_present reviewId REVIEW_ID
add_param_if_present inviteId API_TEST_INVITE_ID
add_param_if_present inviteId INVITE_ID
add_param_if_present collaboratorUserId API_TEST_COLLABORATOR_USER_ID
add_param_if_present collaboratorUserId COLLABORATOR_USER_ID
add_param_if_present planId API_TEST_PLAN_ID
add_param_if_present planId PLAN_ID
add_param_if_present commentId API_TEST_COMMENT_ID
add_param_if_present commentId COMMENT_ID
add_param_if_present previewKey API_TEST_PREVIEW_KEY
add_param_if_present previewKey PREVIEW_KEY
add_param_if_present purchaseId API_TEST_PURCHASE_ID
add_param_if_present purchaseId PURCHASE_ID
add_param_if_present withdrawalRequestId API_TEST_WITHDRAWAL_REQUEST_ID
add_param_if_present withdrawalRequestId WITHDRAWAL_REQUEST_ID
add_param_if_present threadId API_TEST_THREAD_ID
add_param_if_present threadId THREAD_ID
add_param_if_present messageId API_TEST_MESSAGE_ID
add_param_if_present messageId MESSAGE_ID

COMMAND+=("$@")

echo "Running API latency tests against: $BASE_URL"
echo "Report: $OUTPUT"
echo

"${COMMAND[@]}"
