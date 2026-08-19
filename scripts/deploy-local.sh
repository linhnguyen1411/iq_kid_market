#!/usr/bin/env bash

# Tu dong chuyen ve thu muc goc cua project
cd "$(dirname "$0")/.." || exit 1

echo "======================================================================="
echo "          🚀 IQ KID MARKET - SCRIPT DEPLOY LOCAL TỰ ĐỘNG (BASH)"
echo "======================================================================="
echo ""
echo "Chọn thao tác:"
echo "[1] Chế độ Docker Compose Full Stack (Khuyên dùng)"
echo "[2] Chế độ Frontend Dev Server (Node.js + Vite)"
echo "[3] Dừng Docker Containers"
read -p "Nhập lựa chọn (1-3): " mode

if [ "$mode" == "1" ]; then
    if [ ! -f backend/.env ]; then
        if [ -f backend/.env.example ]; then
            cp backend/.env.example backend/.env
        fi
    fi
    docker compose up -d --build
    echo ""
    echo "🎉 Đã deploy thành công trên Docker!"
    echo "Frontend:     http://localhost:3000"
    echo "FastAPI Docs: http://localhost:8000/docs"
    echo "PostgreSQL:   localhost:5432"
elif [ "$mode" == "2" ]; then
    if [ ! -d node_modules ]; then
        npm install
    fi
    echo "🟢 Khởi chạy Frontend tại http://localhost:5173 ..."
    npm run dev
elif [ "$mode" == "3" ]; then
    docker compose down
    echo "✅ Đã dừng Docker services."
fi
