#!/bin/bash
# [REMOTE EXECUTION REQUIRED]
set -e

echo "=== PREPROD NGINX API CHECK ==="
DOMAIN="connect-preprod.koffmann.group"

echo "Checking HTTPS connectivity..."
STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" https://$DOMAIN/)
if [ "$STATUS" -eq 200 ]; then
    echo "Frontend responds with 200 OK."
else
    echo "Frontend failed with status $STATUS"
    false
fi

echo "Checking Backend API routing via NGINX..."
API_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" https://$DOMAIN/health)
if [ "$API_STATUS" -eq 200 ]; then
    echo "API Routing is working."
else
    echo "API Routing failed with status $API_STATUS. Check Nginx proxy_pass."
    false
fi
