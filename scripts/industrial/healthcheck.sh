#!/bin/bash
echo "--- System Health Check ---"
curl -s http://localhost:4000/health | grep "ok" && echo "PROD: OK" || echo "PROD: FAILED"
curl -s http://localhost:4001/health | grep "ok" && echo "STAGING: OK" || echo "STAGING: FAILED"
