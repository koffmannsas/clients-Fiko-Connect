#!/bin/bash
# KCG CLOUD - INDUSTRIAL VALIDATOR ORCHESTRATOR
# Modes: QUICK | STANDARD | FULL | GOLD_MASTER

MODE=${1:-"QUICK"}
echo "--- KCG CLOUD VERIFIED CERTIFICATION: $MODE ---"

mkdir -p runtime_proofs

run_cert() {
  echo "Running $1..."
  bash "certification/$1"
  if [ $? -eq 0 ]; then
    echo "✅ $1: PASS"
    return 0
  else
    echo "❌ $1: FAIL"
    return 1
  fi
}

ERRORS=0

# Level 1: QUICK
run_cert "health.sh" || ERRORS=$((ERRORS+1))

if [[ "$MODE" == "STANDARD" || "$MODE" == "FULL" || "$MODE" == "GOLD_MASTER" ]]; then
  run_cert "api.sh" || ERRORS=$((ERRORS+1))
fi

if [[ "$MODE" == "FULL" || "$MODE" == "GOLD_MASTER" ]]; then
  run_cert "webhook.sh" || ERRORS=$((ERRORS+1))
  run_cert "ai.sh" || ERRORS=$((ERRORS+1))
fi

# Final Decision
if [ $ERRORS -eq 0 ]; then
  RESULT="VALIDATED"
  echo "--- CERTIFICATION SUCCESSFUL ---"
else
  RESULT="FAILED"
  echo "--- CERTIFICATION FAILED ($ERRORS errors) ---"
fi

echo "{\"status\": \"$RESULT\", \"mode\": \"$MODE\", \"errors\": $ERRORS, \"timestamp\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"}" > verification.json

if [ $ERRORS -eq 0 ]; then exit 0; else exit 1; fi
