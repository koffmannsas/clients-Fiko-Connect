#!/bin/bash
set -e

echo "PREPROD DEPLOYMENT v6.0"
npm run build
# firebase deploy -P preprod
echo "PREPROD READY"
