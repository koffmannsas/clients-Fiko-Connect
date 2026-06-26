#!/bin/bash
# KCG INDUSTRIAL BACKUP
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/$DATE"
mkdir -p "$BACKUP_DIR"

echo "--- Backing up Configs & Env ---"
cp .env "$BACKUP_DIR/.env.backup"
cp ecosystem.config.cjs "$BACKUP_DIR/"
cp -r src/server "$BACKUP_DIR/server_src"

echo "--- Firestore Export (Trigger) ---"
# gcloud firestore export gs://kcg-backups/$DATE
echo "Note: Full Firestore backup requires GCloud CLI."

echo "--- Backup Completed: $BACKUP_DIR ---"
