#!/bin/bash
# KCG INDUSTRIAL DEPLOYMENT: PREPROD
echo "--- Starting Preprod Deployment ---"
npm install
npm run build
pm2 delete kcg-preprod || true
pm2 start server.ts --name "kcg-preprod" -- --port 4001
echo "--- Preprod Active on 4001 ---"
