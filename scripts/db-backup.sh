#!/bin/bash
# Script sao lưu CSDL PostgreSQL định kỳ (Linux / Docker)
set -e

DB_NAME=${POSTGRES_DB:-"iq_kid_market"}
DB_USER=${POSTGRES_USER:-"iq_kid_admin"}
DB_HOST=${POSTGRES_HOST:-"localhost"}
DB_PORT=${POSTGRES_PORT:-"5432"}

BACKUP_DIR="$(dirname "$0")/../backups"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/iqkids_backup_$TIMESTAMP.sql"

echo "📦 Đang thực hiện sao lưu CSDL '$DB_NAME'..."
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -F p -f "$BACKUP_FILE"

echo "✅ Sao lưu thành công: $BACKUP_FILE"
