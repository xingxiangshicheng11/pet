#!/bin/bash

echo "========================================"
echo "  宠物服务系统 - Docker 一键部署"
echo "========================================"
echo ""

echo "[1/5] 检查 Docker 是否运行..."
if ! docker info > /dev/null 2>&1; then
    echo "[错误] Docker 未运行，请先启动 Docker"
    exit 1
fi
echo "[OK] Docker 运行正常"

echo "[2/5] 启动数据库 (PostgreSQL)..."
docker compose -f docker-compose.db.yml up -d
if [ $? -ne 0 ]; then
    echo "[错误] 数据库启动失败"
    exit 1
fi
echo "[OK] 数据库已启动"

echo "[3/5] 构建并启动后端服务 (Redis + Backend)..."
docker compose -f docker-compose.backend.yml up -d --build --scale backend=3
if [ $? -ne 0 ]; then
    echo "[错误] 后端服务启动失败"
    exit 1
fi
echo "[OK] 后端服务已启动"

echo "[4/5] 构建并启动前端服务 (Frontend + Nginx)..."
docker compose -f docker-compose.frontend.yml up -d --build
if [ $? -ne 0 ]; then
    echo "[错误] 前端服务启动失败"
    exit 1
fi
echo "[OK] 前端服务已启动"

echo "[5/5] 等待后端初始化数据库..."
echo "等待后端初始化数据库（约 30-60 秒）"
for i in $(seq 1 12); do
  if docker exec pet-backend-1 curl -s -o /dev/null http://localhost:3001/ 2>/dev/null; then
    echo "[OK] 后端就绪"
    break
  fi
  echo "正在等待... ($i/12)"
  sleep 5
done

echo ""
echo "========================================"
echo "  部署完成！"
echo ""
echo "  访问地址: http://localhost:8080"
echo ""
echo "  停止服务:"
echo "    docker compose -f docker-compose.frontend.yml down"
echo "    docker compose -f docker-compose.backend.yml down"
echo "    docker compose -f docker-compose.db.yml down"
echo "  查看日志:"
echo "    docker compose -f docker-compose.frontend.yml logs -f"
echo "    docker compose -f docker-compose.backend.yml logs -f"
echo "    docker compose -f docker-compose.db.yml logs -f"
echo "========================================"
