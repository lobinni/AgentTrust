#!/usr/bin/env bash
# ============================================================
# AgentTrust — Push to GitHub
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh                          # push to main
#   ./deploy.sh "your commit message"    # custom commit message
# ============================================================
set -euo pipefail

REPO="https://github.com/lobinni/AgentTrust.git"
BRANCH="main"
MSG="${1:-"fix: GenLayer web Response status and GenVM error reporting"}"

echo "================================================"
echo "  AgentTrust — Deploy to GitHub"
echo "================================================"
echo ""
echo "  Repo:    $REPO"
echo "  Branch:  $BRANCH"
echo "  Message: $MSG"
echo ""

# ── Step 1: Verify build passes ──
echo "[1/5] Verifying build..."
npm run build > /dev/null 2>&1
echo "  ✓ Build passed"

# ── Step 2: Initialize git if needed ──
if [ ! -d .git ]; then
  echo "[2/5] Initializing git..."
  git init
  echo "  ✓ Git initialized"
else
  echo "[2/5] Git already initialized"
fi

# ── Step 3: Set remote ──
echo "[3/5] Setting remote..."
if git remote get-url origin > /dev/null 2>&1; then
  git remote set-url origin "$REPO"
  echo "  ✓ Remote updated"
else
  git remote add origin "$REPO"
  echo "  ✓ Remote added"
fi

# ── Step 4: Stage and commit ──
echo "[4/5] Staging and committing..."
git add .
git commit -m "$MSG" --allow-empty
echo "  ✓ Committed"

# ── Step 5: Push ──
echo "[5/5] Pushing to $BRANCH..."
git branch -M "$BRANCH"
# Refresh remote state so --force-with-lease can protect newer remote commits.
git fetch origin "$BRANCH" || true
git push -u origin "$BRANCH" --force-with-lease
echo "  ✓ Pushed to $REPO"

echo ""
echo "================================================"
echo "  ✅ Done! Repository updated."
echo ""
echo "  GitHub:  https://github.com/lobinni/AgentTrust"
echo ""
echo "  Next steps:"
echo "  1. Deploy the hotfixed contracts/agenttrust.py to Studionet"
echo "  2. Go to https://vercel.com and import lobinni/AgentTrust"
echo "  3. Set environment variables:"
echo "     NEXT_PUBLIC_GENLAYER_NETWORK = studionet"
echo "     NEXT_PUBLIC_CONTRACT_ADDRESS = 0xFf7cCC740271Ee6664398503D8564380578b612c"
echo "  4. Deploy"
echo "================================================"
