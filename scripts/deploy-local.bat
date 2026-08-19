@echo off
title IQ Kid Market - Local Deployment Script

cd /d "%~dp0\.."

echo =======================================================================
echo          IQ KID MARKET - BO CONG CU DEPLOY LOCAL TU DONG
echo =======================================================================
echo.
echo [1] Che do 1: Chay Docker Compose (Khuyen dung - Full Stack 3 Containers)
echo     - Chay Frontend (3000), FastAPI Backend (8000), Postgres (5432).
echo.
echo [2] Che do 2: Chay Frontend Dev Server (Node.js + Vite)
echo     - Danh cho phat trien giao dien (can backend chay san o port 8000).
echo.
echo [3] Kiem tra cai dat va moi truong local
echo [4] Dung Docker Containers
echo [5] Thoat
echo.
set /p mode="Nhap lua chon cua ban (1-5): "

if "%mode%"=="1" goto DOCKER
if "%mode%"=="2" goto FRONTEND_DEV
if "%mode%"=="3" goto CHECK_ENV
if "%mode%"=="4" goto DOCKER_DOWN
if "%mode%"=="5" exit /b 0

echo Lua chon khong hop le!
pause
exit /b 1

:DOCKER
echo.
echo -----------------------------------------------------------------------
echo Dang khoi dong Che do Docker Compose Full Stack...
echo -----------------------------------------------------------------------

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] May tinh cua ban chua cai dat Docker Desktop hoac chua bat Docker Daemon!
    echo Vui long cai dat va bat Docker Desktop truoc khi tiep tuc.
    pause
    exit /b 1
)

if not exist backend\.env (
    if exist backend\.env.example (
        echo [!] Dang tao backend\.env tu backend\.env.example...
        copy backend\.env.example backend\.env
    )
)

echo Dang build va khoi chay cac containers (Frontend, FastAPI Backend, PostgreSQL)...
docker compose up -d --build

echo.
echo =======================================================================
echo DEPLOY DOCKER THANH CONG!
echo =======================================================================
echo Frontend Web App:  http://localhost:3000
echo FastAPI API Docs:  http://localhost:8000/docs (Swagger UI)
echo PostgreSQL DB:     localhost:5432 (User: iqkids_user / DB: iqkids_db)
echo =======================================================================
echo.
echo De xem log: docker compose logs -f
echo De dung he thong: docker compose down
echo.
pause
goto END

:FRONTEND_DEV
echo.
echo -----------------------------------------------------------------------
echo Dang khoi dong Vite Dev Server...
echo -----------------------------------------------------------------------

if not exist node_modules (
    echo [!] Chua cai dat node_modules, dang chay npm install...
    call npm install
)

echo [OK] Khoi chay Frontend tai http://localhost:5173 (Proxy API sang http://localhost:8000) ...
echo Nhan Ctrl+C de dung server.
call npm run dev
pause
goto END

:CHECK_ENV
echo.
echo -----------------------------------------------------------------------
echo KIEM TRA MOI TRUONG LOCAL
echo -----------------------------------------------------------------------
where node >nul 2>&1 && (echo  [OK] Node.js da duoc cai dat) || (echo  [X] Node.js chua cai dat)
where npm >nul 2>&1 && (echo  [OK] npm da duoc cai dat) || (echo  [X] npm chua cai dat)
where docker >nul 2>&1 && (echo  [OK] Docker da duoc cai dat) || (echo  [X] Docker chua cai dat)
where python >nul 2>&1 && (echo  [OK] Python da duoc cai dat) || (echo  [X] Python chua cai dat)
where psql >nul 2>&1 && (echo  [OK] PostgreSQL psql da duoc cai dat) || (echo  [X] PostgreSQL psql chua cai dat)
echo.
pause
goto END

:DOCKER_DOWN
echo.
echo Dang dung cac Docker Containers...
docker compose down
echo Da dung Docker services.
pause
goto END

:END
