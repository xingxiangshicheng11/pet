---
name: pet-docker
description: 管理宠物项目的 Docker 容器。启动、停止、查看状态、查看日志。用户提到 docker、容器、服务时使用。
---

# 宠物项目 Docker 管理

用于管理宠物项目的 Docker 基础设施。

## 可用命令

- **启动全部**: `docker-compose up -d`
- **停止全部**: `docker-compose down`
- **查看状态**: `docker-compose ps`
- **查看日志**: `docker-compose logs -f`
- **重新构建**: `docker-compose up -d --build`

## 服务列表

| 服务名 | 端口 | 用途 |
|---|---|---|
| postgres | 5432 | 数据库 |
| backend | 3001 | API 后端 |
| frontend | 80 | 前端页面 |
| nginx | 8080 | 反向代理 |

## 常见操作

1. 首次部署: 执行 `docker-compose up -d`
2. 检查所有服务正常运行: 执行 `docker-compose ps`
3. 如果某服务挂了: 用 `docker-compose logs <服务名>` 看日志
