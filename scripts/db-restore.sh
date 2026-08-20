#!/bin/bash
# Script phục hồi CSDL PostgreSQL từ file backup (Linux / Docker)
set -e

BACKUP_FILE=$1
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Lỗi: Vui lòng truyền đường dẫn tới file backup hợp lệ!"
    echo "   Cách dùng: ./scripts/db-restore.sh backups/iqkids_backup_xxx.sql"
    exit 1
fi

DB_NAME=${POSTGRES_DB:-"iq_kid_market"}
DB_USER=${POSTGRES_USER:-"iq_kid_admin"}
DB_HOST=${POSTGRES_HOST:-"localhost"}
DB_PORT=${POSTGRES_PORT:-"5432"}

echo "🔄 Đang phục hồi CSDL '$DB_NAME' từ file $BACKUP_FILE..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$BACKUP_FILE"

echo "✅ Phục hồi CSDL thành công!"
