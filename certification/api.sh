#!/bin/bash
# KCG CLOUD - API CERTIFICATION SCRIPT
TEST_NAME="api"
TARGET_DIR="runtime_proofs/$TEST_NAME"
mkdir -p "$TARGET_DIR"

echo "Executing $TEST_NAME..."
START=$(date +%s%N)
URL="http://localhost:4000/api/dna/score/test_company"

# Record Request
echo "{\"method\": \"GET\", \"url\": \"$URL\", \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > "$TARGET_DIR/request.json"

# Execute & Record Response
RESPONSE=$(curl -s -w "\n%{http_code}" "$URL")
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
