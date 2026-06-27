#!/bin/bash
# KCG CLOUD - AI CERTIFICATION SCRIPT
TEST_NAME="ai"
TARGET_DIR="runtime_proofs/$TEST_NAME"
mkdir -p "$TARGET_DIR"

echo "{\"test\": \"Failover Chain Validation\"}" > "$TARGET_DIR/request.json"

START=$(date +%s%N)
npx tsx test_ai_failover.ts > "$TARGET_DIR/logs.txt" 2>&1
EXIT_CODE=$?
END=$(date +%s%N)
DURATION=$((($END - $START)/1000000))

echo "{\"duration_ms\": $DURATION}" > "$TARGET_DIR/duration.json"

if [ $EXIT_CODE -eq 0 ]; then
  echo "{\"status\": \"PASS\"}" > "$TARGET_DIR/result.json"
  exit 0
else
  echo "{\"status\": \"FAIL\", \"exit_code\": $EXIT_CODE}" > "$TARGET_DIR/result.json"
  exit 1
fi
