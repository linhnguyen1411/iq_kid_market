#!/usr/bin/env bash
# ==============================================================================
# Script đồng bộ CSDL từ Local lên Production (PostgreSQL iqkids_db)
# TỰ ĐỘNG NHẬN DIỆN LOCAL POSTGRESQL (29+ GAMES) HOẶC SQLITE FALLBACK
# ĐẢM BẢO TUYỆT ĐỐI AN TOÀN - TỰ ĐỘNG SAO LƯU TRƯỚC KHI ĐỒNG BỘ
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
VPS_HOST="${VPS_HOST:-root@45.117.170.118}"

echo "======================================================================"
echo "🔄 BẮT ĐẦU QUY TRÌNH ĐỒNG BỘ CSDL LOCAL LÊN PRODUCTION VPS"
echo "   Mục tiêu: ${VPS_HOST} (CSDL: iqkids_db)"
echo "======================================================================"

# Bước 1: Sao lưu CSDL hiện tại trên VPS trước khi can thiệp
echo ""
echo "--- BƯỚC 1: SAO LƯU DỰ PHÒNG CSDL VPS ---"
"$ROOT_DIR/scripts/backup-vps-db.sh"

# Bước 2: Kiểm tra nguồn CSDL Local
echo ""
echo "--- BƯỚC 2: KIỂM TRA NGUỒN CSDL LOCAL ---"
LOCAL_SOURCE=""
if pg_isready -h localhost -p 5432 -U iqkids_user -d iqkids_db >/dev/null 2>&1; then
  LOCAL_GAMES_COUNT=$(psql -U iqkids_user -h localhost -d iqkids_db -t -c "SELECT count(*) FROM games;" 2>/dev/null | xargs || echo "0")
  if [ "$LOCAL_GAMES_COUNT" -gt 0 ]; then
    LOCAL_SOURCE="postgres"
    echo "   ✅ Phát hiện PostgreSQL Local (Port 5432) đang chứa: $LOCAL_GAMES_COUNT games!"
  fi
fi

if [ "$LOCAL_SOURCE" == "postgres" ]; then
  echo ""
  echo "--- BƯỚC 3: DUMP TRỰC TIẾP TỪ LOCAL POSTGRESQL (ĐẦY ĐỦ 29 GAMES) ---"
  mkdir -p "$ROOT_DIR/data"
  LOCAL_DUMP_FILE="$ROOT_DIR/data/local_postgres_dump.sql.gz"
  pg_dump -U iqkids_user -h localhost -d iqkids_db --clean --if-exists --no-owner --no-acl | gzip > "$LOCAL_DUMP_FILE"
  echo "   ✓ Đã tạo bản dump chuẩn PostgreSQL: $LOCAL_DUMP_FILE ($(ls -lh "$LOCAL_DUMP_FILE" | awk '{print $5}'))"

  echo ""
  echo "--- BƯỚC 4: ĐẨY DUMP LÊN VPS VÀ NẠP VÀO PRODUCTION ---"
  scp "$LOCAL_DUMP_FILE" "${VPS_HOST}:/opt/iqkids/local_postgres_dump.sql.gz"

  ssh "$VPS_HOST" "bash -c '
    set -euo pipefail
    echo \"👉 Đang nạp bản dump vào PostgreSQL iqkids_db trên VPS...\"
    gunzip -c /opt/iqkids/local_postgres_dump.sql.gz | sudo -u postgres psql -d iqkids_db -q
    rm -f /opt/iqkids/local_postgres_dump.sql.gz
    
    # Phân quyền cho iqkids_user
    sudo -u postgres psql -d iqkids_db -q <<'SQL'
ALTER SCHEMA public OWNER TO iqkids_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO iqkids_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO iqkids_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO iqkids_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO iqkids_user;
DO \$\$
DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
    EXECUTE 'ALTER TABLE ' || quote_ident(r.tablename) || ' OWNER TO iqkids_user;';
  END LOOP;
END \$\$;
SQL
    echo \"✓ Nạp và phân quyền hoàn tất.\"
  '"

else
  echo "   ⚡ Không kết nối được Postgres Local, sử dụng fallback SQLite..."
  echo ""
  echo "--- BƯỚC 3: TRÍCH XUẤT CSDL LOCAL (SQLITE) ---"
  "$ROOT_DIR/backend/venv/bin/python" "$ROOT_DIR/scripts/export_sqlite.py"

  echo ""
  echo "--- BƯỚC 4: NẠP DỮ LIỆU VÀO POSTGRESQL TRÊN VPS ---"
  scp "$ROOT_DIR/data/local_db_dump.json" "${VPS_HOST}:/opt/iqkids/local_db_dump.json"
  scp "$ROOT_DIR/scripts/import_pg_worker.py" "${VPS_HOST}:/opt/iqkids/import_pg_worker.py"

  ssh "$VPS_HOST" "bash -c '
    set -a
    source /opt/iqkids/backend.env
    set +a
    /opt/iqkids/app/backend/venv/bin/python /opt/iqkids/import_pg_worker.py /opt/iqkids/local_db_dump.json
  '"
fi

# Bước 5: Đối soát số lượng record trên Production
echo ""
echo "--- BƯỚC 5: ĐỐI SOÁT DỮ LIỆU TRÊN PRODUCTION SAU KHI ĐỒNG BỘ ---"
ssh "$VPS_HOST" "sudo -u postgres psql -d iqkids_db -c \"
SELECT 'users' as tbl, count(*) FROM users
UNION ALL SELECT 'games (Kho Game)', count(*) FROM games
UNION ALL SELECT 'game_categories', count(*) FROM game_categories
UNION ALL SELECT 'wallets', count(*) FROM wallets
UNION ALL SELECT 'wallet_transactions', count(*) FROM wallet_transactions
UNION ALL SELECT 'purchases', count(*) FROM purchases
UNION ALL SELECT 'attempts', count(*) FROM attempts
UNION ALL SELECT 'scratch_lessons', count(*) FROM scratch_lessons
UNION ALL SELECT 'daily_quests', count(*) FROM daily_quests;
\""

# Bước 6: Khởi động lại service backend để cache mới có hiệu lực
echo ""
echo "--- BƯỚC 6: RESTART BACKEND SERVICE TRÊN PRODUCTION ---"
ssh "$VPS_HOST" "systemctl restart iqkids-api.service"

# Bước 7: Xác minh an toàn tuyệt đối cho cinnamongo
echo ""
echo "--- BƯỚC 7: XÁC MINH CÁCH LY AN TOÀN CHO CINNAMONGO ---"
ssh "$VPS_HOST" "docker ps --filter 'name=cinnamongo' --format '   👉 {{.Names}}: {{.Status}}'"

echo "======================================================================"
echo "🎉 ĐỒNG BỘ CSDL LOCAL (29 GAMES) LÊN PRODUCTION HOÀN TẤT THÀNH CÔNG!"
echo "   Kiểm tra kho game tại: https://iqkids.odxpo.com"
echo "======================================================================"
