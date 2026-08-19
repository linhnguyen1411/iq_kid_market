# Script khởi động siêu nhanh không cần build Docker container
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "🚀 IQ KID MARKET - KHỞI ĐỘNG DEV NHANH (NO DOCKER)" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan

# 1. Đảm bảo Database PostgreSQL chạy
Write-Host "`n[1/3] Đang kiểm tra PostgreSQL Database..." -ForegroundColor Green
try {
    docker compose up -d db | Out-Null
    Write-Host "Database PostgreSQL đã sẵn sàng trên cổng 5432." -ForegroundColor Gray
} catch {
    Write-Host "Lưu ý: Đang dùng PostgreSQL cục bộ của máy." -ForegroundColor Yellow
}

# 2. Chuẩn bị môi trường Backend Python
Write-Host "`n[2/3] Đang chuẩn bị Backend FastAPI..." -ForegroundColor Green
$venvPython = Join-Path $ProjectRoot "backend\venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
    Write-Host "Đang tạo môi trường ảo Python venv..." -ForegroundColor Yellow
    python -m venv "$ProjectRoot\backend\venv"
    & "$ProjectRoot\backend\venv\Scripts\pip.exe" install -r "$ProjectRoot\backend\requirements.txt"
}

# Khởi động Backend trong cửa sổ PowerShell mới
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot\backend'; & '$venvPython' -m uvicorn app.main:app --reload --port 8000"

# 3. Khởi động Frontend trong cửa sổ mới
Write-Host "`n[3/3] Đang khởi động Frontend Vite..." -ForegroundColor Green
if (-not (Test-Path "$ProjectRoot\node_modules")) {
    npm install
}
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot'; npm run dev"

Write-Host "`n===================================================" -ForegroundColor Cyan
Write-Host "🎉 HỆ THỐNG ĐÃ KHỞI ĐỘNG THÀNH CÔNG!" -ForegroundColor Green
Write-Host "🌐 Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "📡 Backend:  http://localhost:8000/docs" -ForegroundColor White
Write-Host "⚡ Chế độ:   Hot-Reload (Sửa code tự cập nhật tức thì)" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Cyan

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
