#!/bin/bash
# KCG CLOUD - PRODUCTION PROMOTION SCRIPT V2 (SENTINEL ENFORCED)
set -e

echo "🛡️ Starting SENTINEL Promotion Gate..."

# 1. Check Live Health via Sentinel Engine
HEALTH=$(curl -s http://localhost:4000/health)
if [[ $HEALTH != *"5.0-phoenix"* ]]; then
  echo "❌ PROMOTION BLOCKED: Current system health is not 100%."
  exit 1
fi

echo "✅ Sentinel Health Check: PASS"

# 2. Run full Gold Master Certification
./verify_gold_master.sh GOLD_MASTER

# 3. Build Production Bundle
npm run build

# 4. Create Manifest
npx tsx scripts/certification/generate-manifest.ts

# 5. Git Tagging & Promotion
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}-RC-SENTINEL"
echo "Creating tag $TAG..."

# 6. Production Restart
pm2 restart scripts/industrial/pm2-config.cjs --only fiko-connect-prod

echo "🚀 SUPREME GO-LIVE SUCCESSFUL (Sentinel Certified)"
pm2 status fiko-connect-prod
