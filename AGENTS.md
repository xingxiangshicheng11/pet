# 宠物上门服务系统

## 技术栈

- 前端: React + Vite + Tailwind CSS
- 后端: Node.js + Express + Socket.io
- 数据库: PostgreSQL + Prisma ORM
- 地图: Leaflet (开源)
- 认证: JWT
- 容器: Docker Compose

## 角色

| 角色 | 功能 |
|---|---|
| 管理者 (ADMIN) | 用户管理、订单监控、数据统计、实时告警 |
| 接单者 (SITTER) | 浏览需求、接单、更新服务状态、聊天 |
| 宠物主 (OWNER) | 管理宠物档案、发布服务需求、评价、聊天 |

## 实时数据流 (Socket.io)

- service:new — 新需求发布 → 推送接单者
- service:accepted — 接单 → 推送宠物主
- service:status — 状态变更 → 推送双方
- message:new — 聊天消息 → 推送对方
- 
otification — 系统通知 → 推送指定用户
- dmin:alert — 关键事件 → 推送管理者

## 数据库 (7 表)

User → Pet → ServiceListing → Review → Message → Notification → Payment

## Docker 服务

| 服务 | 端口 |
|---|---|
| postgres | 5432 |
| backend (Node) | 3001 |
| frontend (Nginx) | 80 |
| nginx (网关) | 8080 |

## 实施步骤

1. 项目初始化 (docker-compose + 后端脚手架 + Prisma 建模)
2. 用户认证 (注册/登录 JWT、角色路由守卫)
3. 角色界面 (三套 Dashboard + 路由隔离)
4. 宠物档案 (宠物主 CRUD)
5. 服务发布与接单 (发布 → 列表浏览 → 接单)
6. 实时通知 (Socket.io 全链路集成)
7. 实时聊天 (订单内私信)
8. 评价系统 (双方互评)
9. LBS 定位 (Leaflet 地图)
10. 在线支付 (模拟流程)
11. 管理后台 (用户管理 + 统计图表)
12. 最终集成测试 (Docker 全栈联调)
