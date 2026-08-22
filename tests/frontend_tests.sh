#!/usr/bin/env bash
# ============================================================
# AgentTrust - Frontend API Test Suite
# Contract là source of truth (GenLayer studionet).
# Chạy sau khi `npm run dev` hoặc `npm start` đang hoạt động.
#
# Usage:
#   BASE_URL=http://localhost:3000 ./tests/frontend_tests.sh
#
# NOTE: Workflow on-chain (create → accept → submit → approve /
# dispute → adjudicate) chạy qua ví MetaMask trong browser,
# hoặc test CLI: ./tests/contract_tests.sh
# ============================================================
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
PASS=0
FAIL=0

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }

check() {
  local name="$1"
  local body="$2"
  if echo "$body" | grep -qE '"error"[[:space:]]*:|"success"[[:space:]]*:[[:space:]]*false'; then
    red "✗ $name"
    echo "    $body" | head -3
    FAIL=$((FAIL+1))
  else
    green "✓ $name"
    PASS=$((PASS+1))
  fi
}

check_contains() {
  local name="$1"
  local body="$2"
  local pattern="$3"
  if echo "$body" | grep -qE "$pattern"; then
    green "✓ $name"
    PASS=$((PASS+1))
  else
    red "✗ $name (missing: $pattern)"
    echo "    $body" | head -3
    FAIL=$((FAIL+1))
  fi
}

echo "=============================================="
echo " AgentTrust API Tests — $BASE_URL"
echo "=============================================="

# 1. Health
check "GET /api/health" "$(curl -sf "$BASE_URL/api/health" || echo '{"error":"failed"}')"

# 2. Contract snapshot (read contract on GenLayer)
SYNC_OUT="$(curl -sf -m 30 "$BASE_URL/api/contract/sync" || echo '{"error":"failed"}')"
check "GET /api/contract/sync" "$SYNC_OUT"

# 3. Contract address matches the deployed AgentTrust contract
check_contains "contract address = 0xFf7c...612c" "$SYNC_OUT" "Ff7cCC740271Ee6664398503D8564380578b612c"

# 4. Stats từ contract
check_contains "contract stats (taskCount)" "$SYNC_OUT" "taskCount"
check_contains "contract stats (profileCount)" "$SYNC_OUT" "profileCount"

# 5. Config từ contract
check_contains "contract config (owner)" "$SYNC_OUT" "owner"
check_contains "contract config (reviewPeriod=86400)" "$SYNC_OUT" "86400"

# 6. Sync mirror → Postgres (optional, cần DATABASE_URL)
MIRROR_OUT="$(curl -sf -X POST -m 60 "$BASE_URL/api/contract/sync" || echo '{"error":"failed"}')"
check "POST /api/contract/sync (mirror)" "$MIRROR_OUT"

# 7. Homepage render
check_contains "homepage (AgentTrust)" "$(curl -sf "$BASE_URL/" || echo '{"error":"failed"}')" "AgentTrust"

echo "=============================================="
echo " Results: $PASS passed, $FAIL failed"
echo "=============================================="
echo ""
echo "Workflow on-chain tests: ./tests/contract_tests.sh"
echo "Browser flow: create → accept → submit_work + atomic AI review →"
echo "approve/dispute → adjudicate (GenLayer Court)"
[ "$FAIL" -eq 0 ]
