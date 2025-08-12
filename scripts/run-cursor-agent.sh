#!/usr/bin/env bash
set -euo pipefail

PROMPT="${1:-}"
MODEL="${2:-}"
APP_NAME_INPUT="${3:-}"
: "${CURSOR_KEY:?CURSOR_KEY is required}"

CURSOR_BASE_URL="${CURSOR_BASE_URL:-https://api.cursor.sh}"
API_URL="${CURSOR_BASE_URL}/v1/agent/run"

mkdir -p logs
echo "Starting Cursor headless agent..." | tee logs/generation.txt

echo "Calling Cursor API: ${API_URL}" | tee -a logs/generation.txt
PAYLOAD=$(jq -n --arg task "${PROMPT}" --arg model "${MODEL}" --arg branch "${APP_NAME_INPUT:-generated}" '{task:$task, model:$model, branch:$branch}')

curl -sS -X POST "${API_URL}" \n  -H "Authorization: Bearer ${CURSOR_KEY}" \n  -H "Content-Type: application/json" \n  -d "${PAYLOAD}" | tee -a logs/generation.txt || true

echo "Agent task submitted." | tee -a logs/generation.txt
