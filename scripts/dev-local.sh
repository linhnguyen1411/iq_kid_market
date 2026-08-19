#!/usr/bin/env bash
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "==================================================="
echo "🚀 IQ KID MARKET - KHỞI ĐỘNG DEV NHANH (NO DOCKER)"
echo "==================================================="

# 1. Database
if command -v docker &> /dev/null; then
    docker compose up -d db > /dev/null 2>&1 || true
fi

# 2. Backend venv
if [ ! -d "backend/venv" ]; then
    echo "Đang tạo môi trường ảo Python venv..."
    python3 -m venv backend/venv
    backend/venv/bin/pip install -r backend/requirements.txt
fi

# 3. Chạy Backend nền
(cd backend && ./venv/bin/uvicorn app.main:app --reload --port 8000) &
BACKEND_PID=$!

# 4. Chạy Frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
