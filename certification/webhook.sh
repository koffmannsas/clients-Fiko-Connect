#!/bin/bash
# KCG CLOUD - WEBHOOK CERTIFICATION SCRIPT
TEST_NAME="whatsapp"
TARGET_DIR="runtime_proofs/$TEST_NAME"
mkdir -p "$TARGET_DIR"

APP_SECRET="test_secret"
URL="http://localhost:4000/api/webhooks/meta"
PAYLOAD='{"object":"whatsapp_business_account","entry":[{"id":"123","changes":[{"value":{"messaging_product":"whatsapp","messages":[{"from":"22500","id":"test_id_'"$(date +%s)"'","text":{"body":"ping"}}]}}]}]}'
SIG="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$APP_SECRET" | sed 's/^.* //')"

echo "{\"method\": \"POST\", \"url\": \"$URL\", \"payload\": $PAYLOAD}" > "$TARGET_DIR/request.json"

START=$(date +%s%N)
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$URL" -H "X-Hub-Signature-256: $SIG" -H "Content-Type: application/json" -d "$PAYLOAD")
CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
END=$(date +%s%N)
DURATION=$((($END - $START)/1000000))

echo "$BODY" > "$TARGET_DIR/response.json"
echo "{\"duration_ms\": $DURATION}" > "$TARGET_DIR/duration.json"
echo "HTTP_CODE: $CODE | DURATION: ${DURATION}ms" > "$TARGET_DIR/logs.txt"

if [ "$CODE" == "200" ]; then
  echo "{\"status\": \"PASS\", \"code\": $CODE}" > "$TARGET_DIR/result.json"
  exit 0
else
  echo "{\"status\": \"FAIL\", \"code\": $CODE, \"body\": \"$BODY\"}" > "$TARGET_DIR/result.json"
  exit 1
fi
