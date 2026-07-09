@echo off
chcp 65001 >nul
title 宠物服务系统 - Docker 一键部署

echo ========================================
echo   宠物服务系统 - Docker 一键部署
echo ========================================
echo.

echo [1/5] 检查 Docker 是否运行...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)
echo [OK] Docker 运行正常

echo [2/5] 启动数据库 (PostgreSQL)...
docker compose -f docker-compose.db.yml up -d
if %errorlevel% neq 0 (
    echo [错误] 数据库启动失败
    pause
    exit /b 1
)
echo [OK] 数据库已启动

echo [3/5] 构建并启动后端服务 (Redis + Backend)...
docker compose -f docker-compose.backend.yml up -d --build --scale backend=3
if %errorlevel% neq 0 (
    echo [错误] 后端服务启动失败
    pause
    exit /b 1
)
echo [OK] 后端服务已启动

echo [4/5] 构建并启动前端服务 (Frontend + Nginx)...
docker compose -f docker-compose.frontend.yml up -d --build
if %errorlevel% neq 0 (
    echo [错误] 前端服务启动失败
    pause
    exit /b 1
)
echo [OK] 前端服务已启动

echo [5/5] 等待服务就绪...
echo 等待后端初始化数据库（约 30-60 秒）
:loop
timeout /t 5 /nobreak >nul
docker exec pet-backend-1 curl -s -o nul -w "%%{http_code}" http://localhost:3001/ >nul 2>&1
if %errorlevel% neq 0 (
    echo 正在等待...
    goto loop
)

echo.
echo ========================================
echo   部署完成！
echo.
echo   访问地址: http://localhost:8080
echo.
echo   停止服务:
echo     docker compose -f docker-compose.frontend.yml down
echo     docker compose -f docker-compose.backend.yml down
echo     docker compose -f docker-compose.db.yml down
echo   查看日志:
echo     docker compose -f docker-compose.frontend.yml logs -f
echo     docker compose -f docker-compose.backend.yml logs -f
echo     docker compose -f docker-compose.db.yml logs -f
echo ========================================
pause
