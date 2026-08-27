#!/bin/bash
# [REMOTE EXECUTION REQUIRED]
set -e

echo "=== PREPROD WABA / OTP CHECK ==="
DOMAIN="connect-preprod.koffmann.group"
TEST_PHONE="+2250700000000" # Remplacer par un numéro de test valide

echo "Triggering OTP creation and WhatsApp WABA delivery..."
RES=$(curl -s -X POST https://$DOMAIN/api/auth/send-otp \
     -H "Content-Type: application/json" \
     -d "{\"phoneNumber\":\"$TEST_PHONE\"}")

echo "Response payload: $RES"

if echo "$RES" | grep -q "\"delivered\":true"; then
    echo "WABA System Configuration appears functional. OTP Delivered."
else
    echo "WABA System Configuration missing or failed. OTP Not Delivered."
    echo "Check companies/fiko_system_master and vault/fiko_system_master in Firestore."
    false
fi
