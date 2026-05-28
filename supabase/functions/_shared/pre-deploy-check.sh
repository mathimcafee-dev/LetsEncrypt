#!/bin/bash
# SSLVault Pre-Deploy Safety Check
# Run before deploying ANY edge function.
# Each rule encodes a bug that actually happened in production.

ERRORS=0
FILES="supabase/functions"

echo "=== SSLVault Pre-Deploy Safety Check ==="

# RULE 1: .catch() on Supabase query builders
# Supabase builders are NOT Promises. .catch() throws "is not a function" at runtime.
# Pattern that works on fetch/Promise does NOT work on adminDb().from()...
# Fix: use try { await adminDb()... } catch {}
MATCHES=$(grep -rn "\.from(.*\.catch\|\.insert(.*\.catch\|\.update(.*\.catch\|\.upsert(.*\.catch\|\.select(.*\.catch\|\.delete(.*\.catch\|\.rpc(.*\.catch" $FILES --include="*.ts" 2>/dev/null)
if [ -n "$MATCHES" ]; then
  echo "❌ RULE 1: .catch() on Supabase builder — use try/catch instead:"
  echo "$MATCHES"
  ERRORS=$((ERRORS+1))
else
  echo "✅ Rule 1: no invalid .catch() on Supabase builders"
fi

# RULE 2: Awaited cpanel-install inside gogetssl-issue
# cpanel-install takes 30s. Awaiting it inside poll_pending kills the wall-clock budget.
# Fix: always fire-and-forget with plain fetch() and no await.
MATCHES=$(grep -n "await fetch.*cpanel-install" $FILES/gogetssl-issue/index.ts 2>/dev/null)
if [ -n "$MATCHES" ]; then
  echo "❌ RULE 2: awaited cpanel-install in gogetssl-issue — must be fire-and-forget:"
  echo "$MATCHES"
  ERRORS=$((ERRORS+1))
else
  echo "✅ Rule 2: cpanel-install correctly fire-and-forget"
fi

# RULE 3: Sleep loops (multiple setTimeout in a loop)
# A 5x2s loop = 10s wall-clock inside a single function call.
# Fix: single 2s check, then let cron rescue.
MATCHES=$(grep -rn "for.*await.*setTimeout\|while.*await.*setTimeout" $FILES --include="*.ts" 2>/dev/null | grep -v "node_modules")
if [ -n "$MATCHES" ]; then
  echo "❌ RULE 3: sleep loop — use single check + cron rescue:"
  echo "$MATCHES"
  ERRORS=$((ERRORS+1))
else
  echo "✅ Rule 3: no sleep loops"
fi

# RULE 4: extractDcv Shape 6 must stay in gogetssl-issue
# GGS confirmed format: approver_method.dns.record = "NAME.  IN  TXT  \"value\""
# This was the root cause of all DCV stuck issues. Must never be removed.
SHAPE6=$(grep -c "approver_method" $FILES/gogetssl-issue/index.ts 2>/dev/null || echo 0)
if [ "$SHAPE6" -eq "0" ]; then
  echo "❌ RULE 4: extractDcv Shape 6 (approver_method.dns.record) missing from gogetssl-issue"
  ERRORS=$((ERRORS+1))
else
  echo "✅ Rule 4: extractDcv Shape 6 present"
fi

# RULE 5: Service role auth in cpanel-install must use exact token comparison
# Old prefix match SB_SERVICE.slice(0,20) failed for inter-function calls.
# Fix: bearerToken === SB_SERVICE (exact match)
OLD_AUTH=$(grep -n "slice(0,20)\|SB_SERVICE.slice" $FILES/cpanel-install/index.ts 2>/dev/null)
if [ -n "$OLD_AUTH" ]; then
  echo "❌ RULE 5: cpanel-install uses prefix match for service role — use exact comparison:"
  echo "$OLD_AUTH"
  ERRORS=$((ERRORS+1))
else
  echo "✅ Rule 5: cpanel-install uses exact service role token comparison"
fi

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ ALL CHECKS PASSED — safe to deploy"
  exit 0
else
  echo "❌ $ERRORS CHECK(S) FAILED — DO NOT DEPLOY until fixed"
  exit 1
fi
