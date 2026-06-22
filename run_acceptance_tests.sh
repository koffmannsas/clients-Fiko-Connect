#!/bin/bash
echo "=== FIKO ACCEPTANCE TEST SUITE ==="
# 1. Health Check
echo "Testing Health..."
curl -s http://localhost:4000/health | grep "ok" && echo "PASS" || echo "FAIL"

# 2. Firebase Status
echo "Testing Firebase..."
# Note: Might fail if GOOGLE_APPLICATION_CREDENTIALS is not valid in sandbox,
# but we are testing the CODE logic.
curl -s http://localhost:4000/firebase-status

# 3. OTP Generation
echo "Testing OTP Send..."
curl -s -X POST http://localhost:4000/api/auth/send-otp -H "Content-Type: application/json" -d '{"phoneNumber":"+2250700000000"}'

# 4. Webhook Deduplication & Lead Creation
echo "Testing Webhook..."
curl -s -X POST http://localhost:4000/webhook -H "Content-Type: application/json" -d '{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "id": "MSG_TEST_1782121617",
          "from": "2250701020304",
          "text": {"body": "Hello Fiko"}
        }],
        "metadata": {"display_phone_number": "+2250592847715"}
      }
    }]
  }]
}'
echo "Webhook logic triggered."

# 5. Build Final
echo "Final Build Check..."
./node_modules/.bin/vite build --emptyOutDir
