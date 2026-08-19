# IQ Kid Market - Interactive Local Deploy Script (PowerShell)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "          🚀 IQ KID MARKET - SCRIPT DEPLOY LOCAL TỰ ĐỘNG (PS)" -ForegroundColor Yellow
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vui lòng chọn chế độ deploy local:" -ForegroundColor White
Write-Host " [1] Chế độ 1: Docker Compose Full Stack (Khuyên dùng)" -ForegroundColor Green
Write-Host "     - Chạy Frontend (3000), FastAPI Backend (8000), PostgreSQL (5432)" -ForegroundColor Gray
Write-Host " [2] Chế độ 2: Frontend Dev Server (Node.js + Vite)" -ForegroundColor Green
Write-Host "     - Chạy nhanh UI tại http://localhost:5173 (cần backend port 8000)" -ForegroundColor Gray
Write-Host " [3] Kiểm tra sức khỏe môi trường Local (Health Check)" -ForegroundColor Yellow
Write-Host " [4] Dừng toàn bộ các Docker Containers của dự án" -ForegroundColor Red
Write-Host " [5] Thoát" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Nhập số lựa chọn của bạn (1-5)"

switch ($choice) {
    "1" {
        Write-Host "`n🐳 Đang khởi động Docker Compose Stack..." -ForegroundColor Cyan
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Host "[LỖI] Chưa cài đặt Docker Desktop hoặc chưa bật Docker Daemon!" -ForegroundColor Red
            return
        }
        if (-not (Test-Path "backend\.env")) {
            if (Test-Path "backend\.env.example") {
                Write-Host "[!] Đang tạo backend\.env từ backend\.env.example..." -ForegroundColor Yellow
                Copy-Item "backend\.env.example" "backend\.env"
            }
        }
        docker compose up -d --build
        Write-Host "`n=======================================================================" -ForegroundColor Green
        Write-Host "🎉 DỰ ÁN ĐÃ DEPLOY THÀNH CÔNG TRÊN DOCKER LOCAL!" -ForegroundColor Green
        Write-Host "=======================================================================" -ForegroundColor Green
        Write-Host "🔹 Frontend App:        http://localhost:3000" -ForegroundColor Cyan
        Write-Host "🔹 FastAPI Docs API:    http://localhost:8000/docs" -ForegroundColor Cyan
        Write-Host "🔹 PostgreSQL DB:       localhost:5432 (iqkids_user / iqkids_db)" -ForegroundColor Cyan
        Write-Host "=======================================================================" -ForegroundColor Green
        Start-Process "http://localhost:3000"
    }
    "2" {
        Write-Host "`n🛠️ Đang khởi động Frontend Dev Server..." -ForegroundColor Cyan
        if (-not (Test-Path "node_modules")) {
            Write-Host "[!] Đang cài đặt node_modules..." -ForegroundColor Yellow
            npm install
        }
        Write-Host "🟢 Đang mở trình duyệt tới http://localhost:5173 ..." -ForegroundColor Green
        Start-Process "http://localhost:5173"
        npm run dev
    }
    "3" {
        Write-Host "`n🔍 KIỂM TRA MÔI TRƯỜNG LOCAL:" -ForegroundColor Yellow
        $node = Get-Command node -ErrorAction SilentlyContinue
        $docker = Get-Command docker -ErrorAction SilentlyContinue
        $python = Get-Command python -ErrorAction SilentlyContinue
        $psql = Get-Command psql -ErrorAction SilentlyContinue

        if ($node) { Write-Host "  ✅ Node.js:     $($node.Source)" -ForegroundColor Green } else { Write-Host "  ❌ Node.js:     Chưa có" -ForegroundColor Red }
        if ($docker) { Write-Host "  ✅ Docker:      $($docker.Source)" -ForegroundColor Green } else { Write-Host "  ❌ Docker:      Chưa có" -ForegroundColor Red }
        if ($python) { Write-Host "  ✅ Python:      $($python.Source)" -ForegroundColor Green } else { Write-Host "  ❌ Python:      Chưa có" -ForegroundColor Red }
        if ($psql) { Write-Host "  ✅ PostgreSQL:  $($psql.Source)" -ForegroundColor Green } else { Write-Host "  ❌ PostgreSQL:  Chưa có" -ForegroundColor Red }
    }
    "4" {
        Write-Host "`n🛑 Đang dừng các Docker Containers..." -ForegroundColor Red
        docker compose down
        Write-Host "✅ Đã dừng hoàn toàn các dịch vụ Docker." -ForegroundColor Green
    }
    Default {
        Write-Host "Tạm biệt!" -ForegroundColor Yellow
    }
}
