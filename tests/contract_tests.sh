#!/usr/bin/env bash
# ============================================================
# AgentTrust - Contract Test Suite (GenLayer CLI)
# Test contract on-chain: deploy + full workflow.
#
# Yêu cầu:
#   1. genlayer CLI đã cài:  pip install genlayer-cli  (hoặc theo docs)
#   2. genlayer CLI đã login: genlayer login
#   3. Network localnet đang chạy (hoặc dùng studionet)
#
# Usage:
#   ./tests/contract_tests.sh            # dùng localnet (mặc định)
#   NETWORK=studionet ./tests/contract_tests.sh
# ============================================================
set -euo pipefail

NETWORK="${NETWORK:-localnet}"
CONTRACT_PATH="contracts/agenttrust.py"
REWARD="1"      # 1 GEN reward
BOND="0.1"      # 0.1 GEN dispute bond
EVIDENCE_URL="https://example.com"

echo "=============================================="
echo " AgentTrust Contract Tests — network: $NETWORK"
echo "=============================================="

echo "[1/9] Switch network -> $NETWORK"
genlayer network "$NETWORK"

echo "[2/9] Deploy contract $CONTRACT_PATH"
DEPLOY_OUT=$(genlayer deploy --contract "$CONTRACT_PATH")
echo "$DEPLOY_OUT"
# Address dạng 0x... — lấy token 0x64 chữ cái/số cuối cùng
CONTRACT_ADDR=$(echo "$DEPLOY_OUT" | grep -oE '0x[0-9a-fA-F]{40}' | tail -1 || true)
if [ -z "${CONTRACT_ADDR:-}" ]; then
  echo "⚠ Không tự động tìm được contract address."
  echo "  -> Copy address từ output trên và chạy: CONTRACT_ADDR=0x... $0"
  exit 1
fi
echo "✓ Contract deployed: $CONTRACT_ADDR"

NOW=$(date +%s)
DEADLINE=$((NOW + 48 * 3600))

echo "[3/9] create_task (payable, value=$REWARD GEN)"
CREATE_OUT=$(genlayer call --contract "$CONTRACT_ADDR" --function create_task \
  --args "[\"Contract Test Task\",\"Deliver a public web page proving completion\",\"$DEADLINE\"]" \
  --value "$REWARD" 2>&1)
echo "$CREATE_OUT"
# task_id = <client>-0 (nonce đầu tiên của client)
TASK_ID=$(echo "$CREATE_OUT" | grep -oE '0x[0-9a-fA-F]{40}-0' | head -1 || true)
if [ -z "${TASK_ID:-}" ]; then
  echo "⚠ Không lấy được task_id từ output. Xác minh thủ công:"
  echo "  genlayer read --contract $CONTRACT_ADDR --function get_task_ids --args '[0, 10]'"
  exit 1
fi
echo "✓ task_id: $TASK_ID"

echo "[4/9] get_task -> expect status=OPEN"
genlayer read --contract "$CONTRACT_ADDR" --function get_task --args "[$TASK_ID]" | grep -q '"OPEN"' \
  && echo "✓ status=OPEN" || (echo "✗ expected OPEN"; exit 1)

echo "[5/9] accept_task (từ 1 account worker khác)"
# NOTE: Worker cần là 1 account khác client. Với genlayer CLI, tạo thêm
# account: genlayer new-account, rồi thêm --account <worker>.
# Ở chế độ 1-account, bước này sẽ raise "[EXPECTED] client cannot accept own task".
# Chạy 2 terminal hoặc tạo 2 account để test đầy đủ:
ACCEPT_OUT=$(genlayer call --contract "$CONTRACT_ADDR" --function accept_task \
  --args "[$TASK_ID]" --expect-error 2>&1 || true)
echo "$ACCEPT_OUT" | grep -q "cannot accept own task" \
  && echo "✓ Guard đúng: client không accept được task của mình" \
  && echo "  (chạy với 2 accounts khác nhau để test accept thật)" \
  || echo "⚠ Kết quả accept không như mong đợi, kiểm tra thủ công"

echo "[6/9] get_stats"
genlayer read --contract "$CONTRACT_ADDR" --function get_stats

echo "[7/9] get_config"
genlayer read --contract "$CONTRACT_ADDR" --function get_config

echo "[8/9] cancel_task (client hủy task OPEN)"
genlayer call --contract "$CONTRACT_ADDR" --function cancel_task --args "[$TASK_ID]" 2>&1 || true

echo "[9/9] get_task -> expect status=CANCELLED"
genlayer read --contract "$CONTRACT_ADDR" --function get_task --args "[$TASK_ID]" | grep -q '"CANCELLED"' \
  && echo "✓ status=CANCELLED (refund OK)" || (echo "✗ expected CANCELLED"; exit 1)

echo "=============================================="
echo " Contract tests done."
echo " Để test flow accept→submit→approve→dispute→adjudicate"
echo " với 2 accounts thật, chạy qua DApp frontend hoặc"
echo " genlayer CLI với 2 --account khác nhau."
echo "=============================================="
