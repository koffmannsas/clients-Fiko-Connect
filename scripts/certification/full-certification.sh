#!/bin/bash
set -e

echo "--------------------------------------------------------"
echo "  FIKO CONNECT INDUSTRIAL CERTIFICATION v6.0"
echo "--------------------------------------------------------"

# 1. Build Verification
echo "🚀 Step 1: Build Verification..."
npm run build

# 2. Type Check
echo "🚀 Step 2: Static Analysis..."
npx tsc --noEmit

# 3. Start Server & Wait
echo "🚀 Step 3: Integration Tests..."
npm run dev:backend > server_test.log 2>&1 &
SERVER_PID=$!

# Wait for server to be up
npx tsx scripts/certification/wait-for-server.ts

# 4. API & Truth Matrix Verification
echo "🚀 Step 4: Executing API Proofs..."
npx tsx scripts/certification/verify_gold_master.ts

# Cleanup
kill $SERVER_PID
echo "--------------------------------------------------------"
echo "  CERTIFICATION SUCCESSFUL - GOLD MASTER VERIFIED"
echo "--------------------------------------------------------"
