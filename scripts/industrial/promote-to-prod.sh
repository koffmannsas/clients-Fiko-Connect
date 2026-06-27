#!/bin/bash
# KCG CLOUD - PRODUCTION PROMOTION SCRIPT
set -e

echo "🚀 Starting PRODUCTION Promotion (RC-1)..."

# 1. Run full Gold Master Certification
./verify_gold_master.sh GOLD_MASTER

# 2. Build Production Bundle
npm run build

# 3. Create Manifest
npx tsx scripts/certification/generate-manifest.ts

# 4. Git Tagging
VERSION=$(node -p "require('./package.json').version")
TAG="v${VERSION}-RC1"
echo "Creating tag $TAG..."
# git tag $TAG
# git push origin $TAG

# 5. Production Restart
pm2 restart scripts/industrial/pm2-config.cjs --only fiko-connect-prod

echo "✅ PRODUCTION Promotion Complete (RC-1)"
pm2 status fiko-connect-prod
