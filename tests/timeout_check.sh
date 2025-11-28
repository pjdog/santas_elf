#!/bin/bash
# Test the agent response time for a complex query
set -euo pipefail

API_URL=${API_URL:-http://localhost:5000/api/agent/chat}
PROMPT='{"prompt": "Plan a full Christmas dinner for 12 people with a $500 budget, including recipes for turkey, stuffing, and pie, and a guest list."}'

HEADERS=(-H "Content-Type: application/json")

# Use CLI secret (or auth cookie) if provided so the test doesn't 401
if [[ -n "${CLI_SECRET:-}" ]]; then
  HEADERS+=(-H "x-cli-secret: ${CLI_SECRET}")
fi
if [[ -n "${AUTH_COOKIE:-}" ]]; then
  HEADERS+=(-H "Cookie: ${AUTH_COOKIE}")
fi

echo "Sending complex request..."
START=$(date +%s)

# Capture both body and HTTP status; fail fast on transport errors
HTTP_RESPONSE=$(curl -sS -w $'\n%{http_code}' -X POST "${API_URL}" "${HEADERS[@]}" -d "${PROMPT}")
HTTP_STATUS=$(echo "${HTTP_RESPONSE}" | tail -n1)
RESPONSE=$(echo "${HTTP_RESPONSE}" | sed '$d')

END=$(date +%s)
DURATION=$((END - START))

echo "Response received in ${DURATION} seconds (HTTP ${HTTP_STATUS})."

if [[ ${HTTP_STATUS} -ge 400 ]]; then
  echo "FAIL: HTTP error ${HTTP_STATUS}."
  echo "${RESPONSE}"
  exit 1
fi

if [[ ${DURATION} -gt 55 ]]; then
  echo "FAIL: Response took too long (likely timed out or close to it)."
  exit 1
else
  echo "PASS: Response received within acceptable time."
fi

# Check if response contains error
if echo "${RESPONSE}" | grep -qi "error"; then
    echo "FAIL: Response returned an error."
    echo "${RESPONSE}"
    exit 1
fi

echo "Response snippet: $(echo "${RESPONSE}" | head -c 100)..."
