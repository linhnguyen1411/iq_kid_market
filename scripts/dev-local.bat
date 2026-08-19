@echo off
title IQ Kid Market - Dev Runner (No Docker)

cd /d "%~dp0\.."
set "ROOT_DIR=%cd%"

echo ===================================================
echo   IQ KID MARKET - KHOI DONG DEV NHANH (NO DOCKER)
echo ===================================================
echo.

:: 1. Kiem tra va khoi dong PostgreSQL Database
echo [1/3] Kiem tra Co so du lieu PostgreSQL...
where docker >nul 2>nul
if %errorlevel% equ 0 (
    echo Dang khoi dong PostgreSQL database...
    docker compose up -d db >nul 2>nul
)

:: 2. Khoi dong Backend (FastAPI)
echo [2/3] Dang khoi dong Backend FastAPI (Port 8000)...
if not exist "backend\venv" (
    echo Chua tim thay venv, dang tao moi truong Python moi...
    python -m venv backend\venv
    call backend\venv\Scripts\activate.bat
    pip install -r backend\requirements.txt
)

start "IQ Kids - Backend API (Port 8000)" cmd /k "cd /d %ROOT_DIR%\backend && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

:: 3. Khoi dong Frontend (Vite)
echo [3/3] Dang khoi dong Frontend Vite (Port 5173)...
start "IQ Kids - Frontend Vite (Port 5173)" cmd /k "cd /d %ROOT_DIR% && npm run dev"

echo.
echo ===================================================
echo   HE THONG DA KHOI DONG THANH CONG!
echo ---------------------------------------------------
echo   Frontend UI:   http://localhost:5173
echo   Backend API:   http://localhost:8000/docs
echo   Che do:        Hot-Reload (Sua code tu update)
echo ===================================================
echo.
timeout /t 3 >nul
start http://localhost:5173
