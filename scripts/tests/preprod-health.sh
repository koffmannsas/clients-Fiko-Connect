#!/bin/bash
# [REMOTE EXECUTION REQUIRED]
set -e

echo "=== PREPROD HEALTH CHECK ==="
RES=$(curl -s http://127.0.0.1:4000/health)
if echo "$RES" | grep -q "5.0-phoenix"; then
    echo "Health check passed: $RES"
else
    echo "Health check failed or wrong version: $RES"
    false
fi
