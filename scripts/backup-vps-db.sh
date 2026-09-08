#!/usr/bin/env bash
# ==============================================================================
# Script sao lưu CSDL iqkids_db trên VPS 45.117.170.118
# ĐẢM BẢO TUYỆT ĐỐI KHÔNG ẢNH HƯỞNG ĐẾN CINNAMONGO
# ==============================================================================
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@45.117.170.118}"
REMOTE_BACKUP_DIR="/opt/iqkids/backups"
LOCAL_BACKUP_DIR="$(cd "$(dirname "$0")/.." && pwd)/data/backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILENAME="iqkids_db_backup_${TIMESTAMP}.sql.gz"

echo "======================================================================"
echo "🛡️  BẮT ĐẦU SAO LƯU CSDL IQKIDS_DB TRÊN VPS (${VPS_HOST})"
echo "======================================================================"

# 1. Kiểm tra an toàn cho cinnamongo
echo "[1/4] Kiểm tra trạng thái các container cinnamongo..."
ssh "$VPS_HOST" "docker ps --filter 'name=cinnamongo' --format '   👉 {{.Names}}: {{.Status}}'" || {
  echo "⚠️  Cảnh báo: Không thể kiểm tra docker container trên VPS"
}

# 2. Tạo thư mục sao lưu
echo "[2/4] Khởi tạo thư mục sao lưu trên VPS và Local..."
ssh "$VPS_HOST" "mkdir -p '${REMOTE_BACKUP_DIR}' && chmod 700 '${REMOTE_BACKUP_DIR}'"
mkdir -p "$LOCAL_BACKUP_DIR"

# 3. Dump CSDL iqkids_db (CHỈ thao tác trên iqkids_db của postgres native)
echo "[3/4] Đang dump CSDL iqkids_db trên VPS..."
ssh "$VPS_HOST" "sudo -u postgres pg_dump -d iqkids_db --clean --if-exists | gzip > '${REMOTE_BACKUP_DIR}/${BACKUP_FILENAME}'"
ssh "$VPS_HOST" "ls -lh '${REMOTE_BACKUP_DIR}/${BACKUP_FILENAME}'"

# 4. Kéo bản sao lưu về máy local để lưu trữ ngoại vi
echo "[4/4] Tải bản sao lưu về máy Local..."
scp "${VPS_HOST}:${REMOTE_BACKUP_DIR}/${BACKUP_FILENAME}" "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}"

LOCAL_SIZE=$(ls -lh "${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME}" | awk '{print $5}')
echo "======================================================================"
echo "✅ SAO LƯU HOÀN TẤT THÀNH CÔNG!"
echo "   - File trên VPS:   ${REMOTE_BACKUP_DIR}/${BACKUP_FILENAME}"
echo "   - File tại Local: ${LOCAL_BACKUP_DIR}/${BACKUP_FILENAME} (${LOCAL_SIZE})"
echo "   - CSDL cinnamongo: HOÀN TOÀN KHÔNG BỊ ẢNH HƯỞNG (Được cách ly 100%)"
echo "======================================================================"
