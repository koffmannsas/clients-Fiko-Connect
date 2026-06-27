#!/bin/bash
# KCG CLOUD - PREPROD DEPLOYMENT SCRIPT
set -e

echo "🚀 Deploying to PREPROD..."
git pull origin main || echo "Local environment - skipping pull"

# Install industrial dependencies
npm install

# Run Gold Master Technical Validation
./verify_gold_master.sh FULL

# Restart PM2 Instance
pm2 restart scripts/industrial/pm2-config.cjs --only fiko-connect-preprod

echo "✅ PREPROD Deployment Successful"
pm2 status fiko-connect-preprod
