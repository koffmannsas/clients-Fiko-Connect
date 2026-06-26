#!/bin/bash
# KCG INDUSTRIAL DEPLOYMENT: PRODUCTION
# MANDATORY: Only run on sacred VM
echo "--- Starting Production Deployment ---"
npm ci
npm run build
pm2 reload kcg-platform --update-env
echo "--- Production Reloaded on 4000 ---"
