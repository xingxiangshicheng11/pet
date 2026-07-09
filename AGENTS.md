# �������ŷ���ϵͳ

## ����ջ

- ǰ��: React + Vite + Tailwind CSS
- ���: Node.js + Express + Socket.io
- ���ݿ�: PostgreSQL + Prisma ORM
- ��ͼ: Leaflet (��Դ)
- ��֤: JWT
- ����: Docker Compose

## ��ɫ

| ��ɫ | ���� |
|---|---|
| ������ (ADMIN) | �û�������������ء�����ͳ�ơ�ʵʱ�澯 |
| �ӵ��� (SITTER) | ������󡢽ӵ������·���״̬������ |
| ������ (OWNER) | �������ﵵ�������������������ۡ����� |

## ʵʱ������ (Socket.io)

- service:new �� �����󷢲� �� ���ͽӵ���
- service:accepted �� �ӵ� �� ���ͳ�����
- service:status �� ״̬��� �� ����˫��
- message:new �� ������Ϣ �� ���ͶԷ�
- 
otification �� ϵͳ֪ͨ �� ����ָ���û�
- dmin:alert �� �ؼ��¼� �� ���͹�����

## ���ݿ� (7 ��)

User �� Pet �� ServiceListing �� Review �� Message �� Notification �� Payment

## Docker ����

| �ļ� | ˵�� |
|---|---|
| docker-compose.db.yml | ���ݿ� PostgreSQL (5432) |
| docker-compose.backend.yml | redis + backend (3001) |
| docker-compose.frontend.yml | frontend (80) + nginx (8080) |

### ʹ��

```bash
# Windows
start.bat

# Linux/Mac
./start.sh

# �ֶ�����
docker compose -f docker-compose.db.yml up -d
docker compose -f docker-compose.backend.yml up -d --build --scale backend=3
docker compose -f docker-compose.frontend.yml up -d --build
```

### ���ʵ�ַ

http://localhost:8080

### ����

```bash
# ֹͣ
docker compose -f docker-compose.frontend.yml down
docker compose -f docker-compose.backend.yml down
docker compose -f docker-compose.db.yml down

# �ճ���־
docker compose -f docker-compose.frontend.yml logs -f
docker compose -f docker-compose.backend.yml logs -f
docker compose -f docker-compose.db.yml logs -f
```

## ʵʩ����

1. ��Ŀ��ʼ�� (docker-compose + ��˽��ּ� + Prisma ��ģ)
2. �û���֤ (ע��/��¼ JWT����ɫ·������)
3. ��ɫ���� (���� Dashboard + ·�ɸ���)
4. ���ﵵ�� (������ CRUD)
5. ���񷢲���ӵ� (���� �� �б���� �� �ӵ�)
6. ʵʱ֪ͨ (Socket.io ȫ��·����)
7. ʵʱ���� (������˽��)
8. ����ϵͳ (˫������)
9. LBS ��λ (Leaflet ��ͼ)
10. ����֧�� (ģ������)
11. ������̨ (�û����� + ͳ��ͼ��)
12. ���ռ��ɲ��� (Docker ȫջ����)
