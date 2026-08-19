@echo off
chcp 65001 >nul
title IQ Kid Market - Dev Runner (No Docker Frontend/Backend)

cd /d "%~dp0\.."
set ROOT_DIR=%cd%

echo ===================================================
echo 🚀 IQ KID MARKET - KHỞI ĐỘNG DEV NHANH (KHÔNG DOCKER)
echo ===================================================
echo.

:: 1. Kiểm tra / Khởi động PostgreSQL Database
echo [1/3] Kiểm tra Cơ sở dữ liệu PostgreSQL...
where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo Đang đảm bảo container PostgreSQL đang chạy...
    docker compose up -d db >nul 2>nul
)

:: 2. Khởi động Backend (FastAPI)
echo [2/3] Đang khởi động Backend FastAPI (Port 8000)...
if not exist "backend\venv" (
    echo Chưa tìm thấy venv, đang tạo môi trường Python mới...
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
)

start "IQ Kids - Backend API (Port 8000)" cmd /k "cd /d %ROOT_DIR%\backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

:: 3. Khởi động Frontend (Vite)
echo [3/3] Đang khởi động Frontend Vite (Port 5173)...
start "IQ Kids - Frontend Vite (Port 5173)" cmd /k "cd /d %ROOT_DIR% && npm run dev"

echo.
echo ===================================================
echo 🎉 HỆ THỐNG ĐÃ KHỞI ĐỘNG THÀNH CÔNG!
echo ---------------------------------------------------
echo 🌐 Frontend UI:   http://localhost:5173
echo 📡 Backend API:   http://localhost:8000/docs
echo ⚡ Chế độ:        Hot-Reload (Sửa code tự update tức thì)
echo ===================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
