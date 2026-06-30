#!/bin/bash
# KCG CLOUD - PRODUCTION PROMOTION GATE V3 (ABSOLUTE TRUTH ENFORCED)
# "Trust Nothing. Verify Everything."

# 1. 100% Health & API Verification
curl -s http://localhost:4000/health | grep -q "5.0-phoenix"
if [ $? -ne 0 ]; then
  echo "❌ Gate Failed: System Health degraded."
  exit 1
fi

# 2. Executable Certification Suite
./scripts/certification/full-certification.sh
if [ $? -ne 0 ]; then
  echo "❌ Gate Failed: Certification suite failed."
  exit 1
fi

echo "✅ GATE CLEARED. Promoting RC to PRODUCTION..."

# 3. Build & Deploy
npm run build
pm2 restart scripts/industrial/pm2-config.cjs --only fiko-connect-prod

echo "🚀 PROMOTION SUCCESSFUL. Live at app.fiko-connect.kcg-cloud.com"
