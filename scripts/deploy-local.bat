@echo off
title IQ Kid Market - Local Deployment Script
chcp 65001 > NUL

:: Tu dong chuyen ve thu muc goc cua project
cd /d "%~dp0\.."

echo =======================================================================
echo          🚀 IQ KID MARKET - BỘ CÔNG CỤ DEPLOY LOCAL TỰ ĐỘNG
echo =======================================================================
echo.
echo [1] Chế độ 1: Chạy Docker Compose (Khuyên dùng - Full Stack 3 Containers)
echo     - Chạy Frontend (3000), FastAPI Backend (8000), Postgres (5432).
echo.
echo [2] Chế độ 2: Chạy Frontend Dev Server (Node.js + Vite)
echo     - Dành cho phát triển giao diện (cần backend chạy sẵn ở port 8000).
echo.
echo [3] Kiểm tra cài đặt và môi trường local
echo [4] Dừng Docker Containers
echo [5] Thoát
echo.
set /p mode="Nhập lựa chọn của bạn (1-5): "

if "%mode%"=="1" goto DOCKER
if "%mode%"=="2" goto FRONTEND_DEV
if "%mode%"=="3" goto CHECK_ENV
if "%mode%"=="4" goto DOCKER_DOWN
if "%mode%"=="5" exit /b 0

echo Lựa chọn không hợp lệ!
pause
exit /b 1

:DOCKER
echo.
echo -----------------------------------------------------------------------
echo 🐳 Đang khởi động Chế độ Docker Compose Full Stack...
echo -----------------------------------------------------------------------

where docker >nul 2>&1
if %errorlevel% neq 0 (
    echo [LỖI] Máy tính của bạn chưa cài đặt Docker Desktop hoặc chưa bật Docker Daemon!
    echo Vui lòng cài đặt và bật Docker Desktop trước khi tiếp tục.
    pause
    exit /b 1
)

if not exist backend\.env (
    if exist backend\.env.example (
        echo [! ] Đang tạo backend\.env từ backend\.env.example...
        copy backend\.env.example backend\.env
    )
)

echo ⚙️ Đang build và khởi chạy các containers (Frontend, FastAPI Backend, PostgreSQL)...
docker compose up -d --build

echo.
echo =======================================================================
echo 🎉 DEPLOY DOCKER THÀNH CÔNG!
echo =======================================================================
echo 🟢 Frontend Web App:  http://localhost:3000
echo 🟢 FastAPI API Docs:  http://localhost:8000/docs (Swagger UI)
echo 🟢 PostgreSQL DB:     localhost:5432 (User: iqkids_user / DB: iqkids_db)
echo =======================================================================
echo.
echo Để xem log: docker compose logs -f
echo Để dừng hệ thống: docker compose down
echo.
pause
goto END

:FRONTEND_DEV
echo.
echo -----------------------------------------------------------------------
echo 🛠️ Đang khởi động Vite Dev Server...
echo -----------------------------------------------------------------------

if not exist node_modules (
    echo [! ] Chưa cài đặt node_modules, đang chạy npm install...
    call npm install
)

echo [OK] Khởi chạy Frontend tại http://localhost:5173 (Proxy API sang http://localhost:8000) ...
echo Nhấn Ctrl+C để dừng server.
call npm run dev
pause
goto END

:CHECK_ENV
echo.
echo -----------------------------------------------------------------------
echo 🔍 KIỂM TRA MÔI TRƯỜNG LOCAL
echo -----------------------------------------------------------------------
where node >nul 2>&1 && (echo  [OK] Node.js đã được cài đặt) || (echo  [X] Node.js chưa cài đặt)
where npm >nul 2>&1 && (echo  [OK] npm đã được cài đặt) || (echo  [X] npm chưa cài đặt)
where docker >nul 2>&1 && (echo  [OK] Docker đã được cài đặt) || (echo  [X] Docker chưa cài đặt)
where python >nul 2>&1 && (echo  [OK] Python đã được cài đặt) || (echo  [X] Python chưa cài đặt)
where psql >nul 2>&1 && (echo  [OK] PostgreSQL psql đã được cài đặt) || (echo  [X] PostgreSQL psql chưa cài đặt)
echo.
pause
goto END

:DOCKER_DOWN
echo.
echo 🛑 Đang dừng các Docker Containers...
docker compose down
echo ✅ Đã dừng Docker services.
pause
goto END

:END
