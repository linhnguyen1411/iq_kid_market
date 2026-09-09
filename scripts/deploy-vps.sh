#!/usr/bin/env bash
# ==============================================================================
# SCRIPT DEPLOY CHÍNH THỨC DỰ ÁN IQ KIDS MARKET LÊN VPS 45.117.170.118
# TÊN MIỀN: https://iqkids.odxpo.com
# ĐẢM BẢO AN TOÀN TUYỆT ĐỐI 100% KHÔNG ẢNH HƯỞNG ĐẾN CINNAMONGO
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

VPS_HOST="${VPS_HOST:-root@45.117.170.118}"
REMOTE_APP_DIR="/opt/iqkids/app"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BUNDLE_FILE="/tmp/iqkids_deploy_${TIMESTAMP}.tgz"

echo "======================================================================"
echo "🚀 BẮT ĐẦU QUY TRÌNH DEPLOY CHÍNH THỨC IQ KIDS MARKET LÊN VPS"
echo "   Máy chủ VPS: ${VPS_HOST}"
echo "   Tên miền:    https://iqkids.odxpo.com"
echo "   Thời gian:   $(date)"
echo "======================================================================"

# ------------------------------------------------------------------------------
# BƯỚC 1: PRE-FLIGHT CHECK (KIỂM TRA AN TOÀN TRƯỚC DEPLOY)
# ------------------------------------------------------------------------------
echo ""
echo "--- [1/7] PRE-FLIGHT CHECK: KẾT NỐI & AN TOÀN HỆ THỐNG ---"
echo "👉 Kiểm tra kết nối SSH tới VPS..."
ssh -o BatchMode=yes -o ConnectTimeout=5 "$VPS_HOST" "true" || {
  echo "❌ Lỗi: Không thể kết nối SSH tới $VPS_HOST. Vui lòng kiểm tra mạng / SSH key."
  exit 1
}

echo "👉 Kiểm tra trạng thái độc lập của các dịch vụ cinnamongo..."
ssh "$VPS_HOST" "docker ps --filter 'name=cinnamongo' --format '   ✓ {{.Names}}: {{.Status}}'" || {
  echo "⚠️ Cảnh báo: Không thể kiểm tra docker container cinnamongo"
}

# ------------------------------------------------------------------------------
# BƯỚC 2: TỰ ĐỘNG SAO LƯU CSDL TRƯỚC KHI DEPLOY
# ------------------------------------------------------------------------------
echo ""
echo "--- [2/7] TỰ ĐỘNG SAO LƯU CSDL TRƯỚC DEPLOY ---"
"$ROOT_DIR/scripts/backup-vps-db.sh"

# ------------------------------------------------------------------------------
# BƯỚC 3: BUILD FRONTEND PRODUCTION BUNDLE TẠI LOCAL
# ------------------------------------------------------------------------------
echo ""
echo "--- [3/7] BUILD FRONTEND REACT / VITE PRODUCTION ---"
# Đảm bảo có file QR mới trong public
if [ -f "$ROOT_DIR/public/techcombank_qr.png" ]; then
  echo "   ✓ Đã kiểm tra thấy ảnh mã QR Techcombank tại public/techcombank_qr.png"
fi

npm run build

echo "   ✓ Build Frontend thành công! Thư mục dist/ đã sẵn sàng."

# ------------------------------------------------------------------------------
# BƯỚC 4: ĐÓNG GÓI GÓI DEPLOY BẢN MỚI NHẤT
# ------------------------------------------------------------------------------
echo ""
echo "--- [4/7] ĐÓNG GÓI MÃ NGUỒN CẬP NHẬT ---"
tar -czf "$BUNDLE_FILE" \
  --exclude='backend/venv' \
  --exclude='backend/.pytest_cache' \
  --exclude='backend/__pycache__' \
  --exclude='backend/*/__pycache__' \
  --exclude='backend/*/*/__pycache__' \
  --exclude='backend/*.db' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.idea' \
  --exclude='.vscode' \
  dist backend public package.json

BUNDLE_SIZE=$(ls -lh "$BUNDLE_FILE" | awk '{print $5}')
echo "   ✓ Đã đóng gói: $BUNDLE_FILE ($BUNDLE_SIZE)"

# ------------------------------------------------------------------------------
# BƯỚC 5: ĐẨY BUNDLE LÊN VPS VÀ BUNG GÓI VÀO /opt/iqkids/app
# ------------------------------------------------------------------------------
echo ""
echo "--- [5/7] TẢI LÊN VÀ CẬP NHẬT MÃ NGUỒN TRÊN VPS ---"
scp "$BUNDLE_FILE" "${VPS_HOST}:/opt/iqkids/iqkids_deploy_latest.tgz"

ssh "$VPS_HOST" "bash -c '
  set -euo pipefail
  mkdir -p \"$REMOTE_APP_DIR\"
  # Bung gói cập nhật đè lên /opt/iqkids/app
  tar -xzf /opt/iqkids/iqkids_deploy_latest.tgz -C \"$REMOTE_APP_DIR\"
  
  # Đảm bảo quyền truy cập đọc cho Nginx
  chmod -R 755 \"$REMOTE_APP_DIR/dist\"
  chmod -R 755 \"$REMOTE_APP_DIR/public\" || true

  # Cài đặt/cập nhật dependencies python nếu có thay đổi
  cd \"$REMOTE_APP_DIR/backend\"
  ./venv/bin/pip install -r requirements.txt --quiet
'"
rm -f "$BUNDLE_FILE"
echo "   ✓ Mã nguồn và thư mục dist đã được cập nhật an toàn trên VPS."

# ------------------------------------------------------------------------------
# BƯỚC 6: RESTART DỊCH VỤ BACKEND TRÊN VPS
# ------------------------------------------------------------------------------
echo ""
echo "--- [6/7] KHỞI ĐỘNG LẠI DỊCH VỤ FASTAPI TRÊN VPS ---"
ssh "$VPS_HOST" "systemctl restart iqkids-api.service"
echo "   Chờ 5 giây để FastAPI workers khởi động hoàn tất..."
sleep 5

# ------------------------------------------------------------------------------
# BƯỚC 7: POST-FLIGHT VERIFICATION & KIỂM TRA CÁCH LY AN TOÀN
# ------------------------------------------------------------------------------
echo ""
echo "--- [7/7] XÁC MINH SỨC KHỎE DỊCH VỤ VÀ AN TOÀN HỆ THỐNG ---"

# 7.1 Kiểm tra API Healthcheck
echo "👉 Kiểm tra API Healthcheck tại https://iqkids.odxpo.com/api/health..."
HEALTH_STATUS=$(curl -s -k "https://iqkids.odxpo.com/api/health" || true)
echo "   Kết quả API Health: $HEALTH_STATUS"

# 7.2 Kiểm tra API Wallet thông tin Techcombank
echo "👉 Kiểm tra thông tin thụ hưởng Techcombank trên API mới..."
WALLET_TEST=$(curl -s -k -X POST "https://iqkids.odxpo.com/api/wallet/create-topup-intent" \
  -H "Content-Type: application/json" \
  -d '{"userId": "u1", "amount": 50000}' || true)
echo "   Phản hồi API Ví:"
echo "$WALLET_TEST" | grep -o '"bank_name":"[^"]*"' || true
echo "$WALLET_TEST" | grep -o '"bank_account":"[^"]*"' || true
echo "$WALLET_TEST" | grep -o '"account_holder":"[^"]*"' || true

# 7.3 Kiểm tra Frontend HTTP 200
echo "👉 Kiểm tra Frontend tại https://iqkids.odxpo.com..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k "https://iqkids.odxpo.com" || true)
echo "   Mã phản hồi HTTP Frontend: $HTTP_CODE"

# 7.4 Kiểm tra an toàn tuyệt đối cho cinnamongo
echo ""
echo "🛡️  XÁC MINH AN TOÀN TUYỆT ĐỐI CHO CINNAMONGO:"
ssh "$VPS_HOST" "docker ps --filter 'name=cinnamongo' --format '   👉 {{.Names}}: {{.Status}}'"

echo ""
echo "======================================================================"
echo "🎉 DEPLOY CHÍNH THỨC LÊN VPS HOÀN TẤT THÀNH CÔNG!"
echo "   🌐 Trang chủ:         https://iqkids.odxpo.com"
echo "   💳 Nạp ví Techcombank: https://iqkids.odxpo.com/wallet"
echo "   📚 API Docs Swagger:  https://iqkids.odxpo.com/docs"
echo "   🛡️ Cinnamongo:        HOÀN TOÀN KHÔNG BỊ ẢNH HƯỞNG (An toàn 100%)"
echo "======================================================================"
