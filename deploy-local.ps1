# IQ Kid Market - Interactive Local Deploy Script (PowerShell)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host "          IQ KID MARKET - SCRIPT DEPLOY LOCAL TU DONG (PS)" -ForegroundColor Yellow
Write-Host "=======================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Vui long chon che do deploy local:" -ForegroundColor White
Write-Host " [1] Che do 1: Docker Compose Full Stack (Khuyen dung)" -ForegroundColor Green
Write-Host "     - Chay Frontend (3000), FastAPI Backend (8000), PostgreSQL (5432)" -ForegroundColor Gray
Write-Host " [2] Che do 2: Frontend Dev Server (Node.js + Vite)" -ForegroundColor Green
Write-Host "     - Chay nhanh UI tai http://localhost:5173 (can backend port 8000)" -ForegroundColor Gray
Write-Host " [3] Kiem tra moi truong Local (Health Check)" -ForegroundColor Yellow
Write-Host " [4] Dung toan bo Docker Containers cua du an" -ForegroundColor Red
Write-Host " [5] Thoat" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Nhap so lua chon cua ban (1-5)"

switch ($choice) {
    "1" {
        Write-Host "`n>>> Dang khoi dong Docker Compose Stack..." -ForegroundColor Cyan
        if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
            Write-Host "[LOI] Chua cai dat Docker Desktop hoac chua bat Docker Daemon!" -ForegroundColor Red
            return
        }
        if (-not (Test-Path "backend\.env")) {
            if (Test-Path "backend\.env.example") {
                Write-Host "[!] Dang tao backend\.env tu backend\.env.example..." -ForegroundColor Yellow
                Copy-Item "backend\.env.example" "backend\.env"
            }
        }
        docker compose up -d --build
        Write-Host "`n=======================================================================" -ForegroundColor Green
        Write-Host "DU AN DA DEPLOY THANH CONG TREN DOCKER LOCAL!" -ForegroundColor Green
        Write-Host "=======================================================================" -ForegroundColor Green
        Write-Host " Frontend App:        http://localhost:3000" -ForegroundColor Cyan
        Write-Host " FastAPI Docs API:    http://localhost:8000/docs" -ForegroundColor Cyan
        Write-Host " PostgreSQL DB:       localhost:5432 (iqkids_user / iqkids_db)" -ForegroundColor Cyan
        Write-Host "=======================================================================" -ForegroundColor Green
        Start-Process "http://localhost:3000"
    }
    "2" {
        Write-Host "`n>>> Dang khoi dong Frontend Dev Server..." -ForegroundColor Cyan
        if (-not (Test-Path "node_modules")) {
            Write-Host "[!] Dang cai dat node_modules..." -ForegroundColor Yellow
            npm install
        }
        Write-Host " Dang mo trinh duyet toi http://localhost:5173 ..." -ForegroundColor Green
        Start-Process "http://localhost:5173"
        npm run dev
    }
    "3" {
        Write-Host "`n>>> KIEM TRA MOI TRUONG LOCAL:" -ForegroundColor Yellow
        $node = Get-Command node -ErrorAction SilentlyContinue
        $docker = Get-Command docker -ErrorAction SilentlyContinue
        $python = Get-Command python -ErrorAction SilentlyContinue
        $psql = Get-Command psql -ErrorAction SilentlyContinue

        if ($node) { Write-Host "  [OK] Node.js:     $($node.Source)" -ForegroundColor Green } else { Write-Host "  [X]  Node.js:     Chua co" -ForegroundColor Red }
        if ($docker) { Write-Host "  [OK] Docker:      $($docker.Source)" -ForegroundColor Green } else { Write-Host "  [X]  Docker:      Chua co" -ForegroundColor Red }
        if ($python) { Write-Host "  [OK] Python:      $($python.Source)" -ForegroundColor Green } else { Write-Host "  [X]  Python:      Chua co" -ForegroundColor Red }
        if ($psql) { Write-Host "  [OK] PostgreSQL:  $($psql.Source)" -ForegroundColor Green } else { Write-Host "  [X]  PostgreSQL:  Chua co" -ForegroundColor Red }
    }
    "4" {
        Write-Host "`n>>> Dang dung cac Docker Containers..." -ForegroundColor Red
        docker compose down
        Write-Host "[OK] Da dung hoan toan cac dich vu Docker." -ForegroundColor Green
    }
    Default {
        Write-Host "Tam biet!" -ForegroundColor Yellow
    }
}