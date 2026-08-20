@echo off
chcp 65001 >nul
title IQ Kid Market - Dev Runner (No Docker)

cd /d "%~dp0\.."
set "ROOT_DIR=%cd%"
set "PYTHONIOENCODING=utf-8"
set "PYTHONUTF8=1"

echo ===================================================
echo   IQ KID MARKET - KHỞI ĐỘNG DEV NHANH (NO DOCKER)
echo ===================================================
echo.

:: 1. Kiem tra va khoi dong PostgreSQL Database (neu co Docker dang chay)
echo [1/3] Kiểm tra Cơ sở dữ liệu...
docker info >nul 2>nul
if %errorlevel% equ 0 (
    echo [Docker] Đang khởi động PostgreSQL database container...
    docker compose up -d db >nul 2>nul
) else (
    echo [Local] Đang sử dụng CSDL máy cục bộ (Tự động chuyển PostgreSQL hoặc SQLite fallback).
)

:: 2. Kiem tra moi truong Backend Python
echo [2/3] Đang chuẩn bị Backend FastAPI (Port 8000)...
if not exist "%ROOT_DIR%\backend\venv\Scripts\python.exe" (
    echo Đang tạo môi trường Python venv...
    python -m venv "%ROOT_DIR%\backend\venv"
    "%ROOT_DIR%\backend\venv\Scripts\pip.exe" install -r "%ROOT_DIR%\backend\requirements.txt"
)

:: Khoi dong Backend FastAPI
start "IQ Kids - Backend API (Port 8000)" cmd /k "chcp 65001 >nul && set PYTHONIOENCODING=utf-8 && set PYTHONUTF8=1 && cd /d %ROOT_DIR%\backend && %ROOT_DIR%\backend\venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000"

:: 3. Khoi dong Frontend (Vite)
echo [3/3] Đang khởi động Frontend Vite (Port 5173)...
if not exist "%ROOT_DIR%\node_modules" (
    echo Đang cài đặt thư viện Frontend npm...
    call npm install
)
start "IQ Kids - Frontend Vite (Port 5173)" cmd /k "cd /d %ROOT_DIR% && npm run dev"

echo.
echo ===================================================
echo   HỆ THỐNG ĐÃ KHỞI ĐỘNG THÀNH CÔNG!
echo ---------------------------------------------------
echo   Frontend UI:   http://localhost:5173
echo   Backend API:   http://localhost:8000/docs
echo   Chế độ:        Hot-Reload (Sửa code tự update)
echo ===================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
