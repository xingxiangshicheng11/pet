# 并发安全：从零基础到项目实战

## 目录

1. [什么是并发问题？](#1-什么是并发问题)
2. [TOCTOU 竞态条件](#2-toctou-竞态条件)
3. [原子更新：updateMany 条件更新](#3-原子更新updatemany-条件更新)
4. [数据库事务：$transaction](#4-数据库事务transaction)
5. [事务 + 条件更新（最强方案）](#5-事务--条件更新最强方案)
6. [本项目 6 处并发修复详解](#6-本项目-6-处并发修复详解)
7. [对比：updateMany vs 事务 vs 乐观锁](#7-对比updatemany-vs-事务-vs-乐观锁)
8. [面试考点](#8-面试考点)

---

## 1. 什么是并发问题？

### 1.1 生活中的例子

假设只有一个包子（状态 = "大肉包"），你和朋友同时伸手去拿：

| 时间 | 你 | 朋友 |
|------|-----|------|
| T1 | 看到包子还在 | 看到包子还在 |
| T2 | 拿走包子 | — |
| T3 | — | 也伸手拿（但包子已经被你拿走了！） |

问题在于：**你和朋友都在 T1 时刻看到了包子，但只有一个人能真正拿到。**

### 1.2 Web 后端中的并发

当两个 HTTP 请求**同时**到达服务器处理同一份数据时，就会发生类似的情况。

在代码层面，并发问题的典型模式是：

```
读数据 → 判断条件 → 写数据
```

这三步之间不是原子的。如果在"读"和"写"之间有另一个请求插队修改了数据，第二个请求的判断条件就过时了。

### 1.3 本项目中的高风险场景

| 场景 | 文件 | 并发风险 |
|------|------|---------|
| 两个保姆同时接同一单 | serviceController.js | 都看到 OPEN，都更新 → 被接两次 |
| 同一用户同时提现两次 | sitterController.js | 第一次余额够，第二次余额被冻结了却不知道 |
| 两个管理员同时审核同一提现 | adminController.js | 都看到 PENDING，都批准 → 余额退回两次 |
| 用户同时支付同一订单 | paymentController.js | 支付两次，服务变成 COMPLETED 两次 |
| 两个管理员分配同一订单 | adminController.js | 都看到 OPEN，都分配不同保姆 |
| 两个管理员处理同一紧急事件 | adminController.js | 都看到 PENDING，都处理 |

---

## 2. TOCTOU 竞态条件

### 2.1 什么是 TOCTOU？

TOCTOU = **Time Of Check, Time Of Use**（检测时刻 vs 使用时刻）

指的是：程序在"检查条件"和"基于条件执行操作"之间，数据被其他线程/请求修改了。

### 2.2 原代码的问题

```javascript
// serviceController.js - 原 acceptService

// 第 1 步：读取 (TIME OF CHECK)
const service = await prisma.serviceListing.findUnique({ where: { id } });

// 第 2 步：判断 (CHECK)
if (service.status !== "OPEN") return res.status(400).json(...);

// 第 3 步：更新 (TIME OF USE)
const updated = await prisma.serviceListing.update({
  where: { id },
  data: { sitterId, status: "ACCEPTED" },
});
```

### 2.3 并发发生时序

```
保姆 A:  findUnique(id=5) → status=OPEN
保姆 B:  findUnique(id=5) → status=OPEN
保姆 A:  update(id=5, status=ACCEPTED)  ✅ 成功
保姆 B:  update(id=5, status=ACCEPTED)  ✅ 也成功（不该成功！）
```

结果：一个订单被两个保姆同时接了。

### 2.4 TOCTOU 的本质

TOCTOU 的本质是：**检查条件和执行操作之间没有锁保护**。

修复方法有三种：

| 方法 | 原理 | 适用场景 |
|------|------|---------|
| **原子条件更新** | 把判断逻辑放到 WHERE 里，让数据库保证原子性 | 单表状态变更 |
| **数据库事务** | 把多个操作包裹在一个事务中，保证隔离性 | 多表操作 |
| **乐观锁** | 用 version 字段，更新时检查版本号 | 读多写少 |

---

## 3. 原子更新：updateMany 条件更新

### 3.1 原理

`Prisma.updateMany()` 接受一个 `where` 条件和一个 `data`。数据库会**原子地**执行：

```sql
UPDATE "ServiceListing" 
SET status = 'ACCEPTED', "sitterId" = $1
WHERE id = $2 AND status = 'OPEN'
```

关键在于 `WHERE status = 'OPEN'`。如果 status 已经被改为 ACCEPTED，这个 WHERE 条件**不会匹配到任何行**，更新影响行数为 0。

### 3.2 返回值的含义

```javascript
const result = await prisma.serviceListing.updateMany({
  where: { id: 5, status: "OPEN" },
  data: { sitterId: 100, status: "ACCEPTED" },
});
// result = { count: 1 }   ✅ 更新成功
// result = { count: 0 }   ❌ 没有匹配的行（已被别人抢了）
```

### 3.3 并发安全时序

```
保姆 A:  updateMany(id=5, status='OPEN') → count=1 ✅
保姆 B:  updateMany(id=5, status='OPEN') → count=0 ❌ 被拒绝
```

数据库保证 `updateMany` 是原子的，两个 UPDATE 不可能同时匹配同一行。

### 3.4 为什么不用 `findUnique + update`？

`findUnique` 和 `update` 是两个独立的数据库查询。在它们之间：

1. 数据库连接会释放回连接池
2. 其他请求可以插入操作

而 `updateMany` 是一个**单次数据库调用**，整个条件判断在数据库内部完成，没有间隙可被插入。

### 3.5 适用场景

| 场景 | 是否适用 |
|------|---------|
| 接单：OPEN → ACCEPTED | ✅ |
| 管理员分配：OPEN → ACCEPTED | ✅ |
| 处理紧急事件：PENDING → RESOLVED | ✅ |
| 需要给用户退钱 + 更新提现状态 | ❌ 需要事务 |
| 需要创建支付记录 + 更新订单状态 | ❌ 需要事务 |

---

## 4. 数据库事务：$transaction

### 4.1 什么是事务？

事务（Transaction）是一组数据库操作，要么**全部成功**，要么**全部回滚**（就像没执行过）。

ACID 四大特性：

| 特性 | 含义 | 类比 |
|------|------|------|
| **A**tomicity 原子性 | 全部成功或全部失败 | 银行转账：扣钱 + 加钱必须同时成功 |
| **C**onsistency 一致性 | 事务前后数据都符合约束 | 余额不能为负数 |
| **I**solation 隔离性 | 并发事务互不干扰 | 你转账时别人看不到中间状态 |
| **D**urability 持久性 | 提交后数据不会丢失 | 断电也不会丢 |

### 4.2 Prisma 交互式事务

```javascript
const result = await prisma.$transaction(async (tx) => {
  // tx 是一个事务客户端，用 tx 替代 prisma
  const user = await tx.user.findUnique({ where: { id: 1 } });
  // ... 一系列操作
  return something;
});
```

如果异步函数内抛出异常，**所有已执行的操作自动回滚**。

### 4.3 事务的隔离级别

PostgreSQL 支持四种隔离级别：

| 级别 | 脏读 | 不可重复读 | 幻读 |
|------|------|-----------|------|
| READ UNCOMMITTED | 可能 | 可能 | 可能 |
| READ COMMITTED（默认） | 避免 | 可能 | 可能 |
| REPEATABLE READ | 避免 | 避免 | 可能 |
| SERIALIZABLE | 避免 | 避免 | 避免 |

### 4.4 重要限制：事务内的 findUnique + update 仍有 TOCTOU

在 PostgreSQL 默认的 `READ COMMITTED` 下：

```
事务 A:  findUnique(id=5) → status='PENDING'
事务 B:  findUnique(id=5) → status='PENDING' （A 还没提交）
事务 A:  update(id=5, status='APPROVED') → 提交 ✅
事务 B:  update(id=5, status='APPROVED') → 也成功 ✅（不该成功！）
```

原因：在 `READ COMMITTED` 下，每个 `SELECT` 看到的是**已提交的最新快照**。事务 A 提交前，事务 B 的 `SELECT` 看不到 A 的修改。当 B 执行 `UPDATE` 时（没有 WHERE status='PENDING' 条件行锁，只是单纯按 id 更新），它也会成功。

**只在 Prisma update 中加 WHERE 是不够的**。需要真正的条件更新。

---

## 5. 事务 + 条件更新（最强方案）

### 5.1 原理

把 `updateMany` 的条件更新和 `$transaction` 的多表操作结合起来：

1. 用 `updateMany` 的 WHERE 子句做原子条件检查
2. 如果 `count === 0`，说明条件不满足（已被处理），回滚事务
3. 如果 `count === 1`，说明更新成功，继续后续多表操作

```javascript
await prisma.$transaction(async (tx) => {
  // 条件更新：原子地检查并更新状态
  const r = await tx.withdrawal.updateMany({
    where: { id: withdrawalId, status: 'PENDING' },
    data: { status: 'APPROVED', reviewedBy: adminId },
  });
  if (r.count === 0) throw new Error('已被处理');

  // 安全地执行后续多表操作
  await tx.user.update({
    where: { id: userId },
    data: { walletBalance: { increment: amount } },
  });
});
```

### 5.2 为什么这是最强方案？

| 方案 | 防 TOCTOU | 多表原子性 |
|------|----------|-----------|
| 单纯 updateMany | ✅ | ❌ |
| 单纯 $transaction | ❌（findUnique 窗口期） | ✅ |
| **$transaction + updateMany** | ✅ | ✅ |

### 5.3 对应 SQL 级别发生了什么

```sql
-- Prisma 生成的 SQL（简化）
BEGIN;
  UPDATE "Withdrawal" SET status = 'APPROVED'
  WHERE id = 5 AND status = 'PENDING';
  -- 如果 row_count = 0 → ROLLBACK
  UPDATE "User" SET walletBalance = walletBalance + 100
  WHERE id = 10;
COMMIT;
```

PostgreSQL 的行锁保证：两个并发的 `UPDATE` 中，**只有一个**能匹配到 `status = 'PENDING'`。

---

## 6. 本项目 6 处并发修复详解

### 6.1 P0：acceptService 接单

**文件**：`backend/src/controllers/serviceController.js:54`

**风险**：两个保姆同时看到 OPEN，都成功更新。

**修复**：使用 `updateMany` 原子条件更新。

```javascript
// BEFORE: 先读再写（TOCTOU）
const service = await prisma.serviceListing.findUnique({ where: { id } });
if (service.status !== "OPEN") return res.status(400).json({ error: "..." });
await prisma.serviceListing.update({ where: { id }, data: { sitterId, status: "ACCEPTED" } });

// AFTER: 原子条件更新
const result = await prisma.serviceListing.updateMany({
  where: { id, status: "OPEN" },
  data: { sitterId, status: "ACCEPTED" },
});
if (result.count === 0) return res.status(400).json({ error: "Service is not available" });
```

**原理**：`updateMany` 的 `WHERE status = 'OPEN'` 由数据库保证原子性。两个并发的 UPDATE 会在数据库层面串行化，只有一个能匹配到 `status = 'OPEN'`。

**SQL 层面**（PostgreSQL）：

```sql
UPDATE "ServiceListing" SET status = 'ACCEPTED', "sitterId" = 100
WHERE id = 5 AND status = 'OPEN';
```

PostgreSQL 通过**行级锁**（row-level lock）保证了这个 UPDATE 是互斥的。一个连接获得行锁后，另一个连接必须等待。第一个提交后，第二个看到 `status = 'ACCEPTED'`（不再是 'OPEN'），于是 count = 0。

---

### 6.2 P0：adminAssignSitter 管理员分配

**文件**：`backend/src/controllers/adminController.js:193`

**风险**：两个管理员同时给同一订单分配不同保姆，都看到 OPEN。

**修复**：与 acceptService 完全相同的模式：

```javascript
const result = await prisma.serviceListing.updateMany({
  where: { id: +req.params.id, status: 'OPEN' },
  data: { sitterId: +sitterId, status: 'ACCEPTED' },
});
if (result.count === 0) return res.status(400).json({ error: 'Service is not OPEN' });
```

---

### 6.3 P0：adminHandleEmergency 处理紧急事件

**文件**：`backend/src/controllers/adminController.js:365`

**风险**：两个管理员同时处理同一紧急事件。

**修复**：使用 `updateMany` 条件更新：

```javascript
const result = await prisma.emergencyAlert.updateMany({
  where: { id: +req.params.id, status: 'PENDING' },
  data: { handledBy: req.user.id, handledAt: new Date(), status: status || 'RESOLVED' },
});
if (result.count === 0) return res.status(400).json({ error: 'Emergency already handled or not found' });
```

---

### 6.4 P0：requestWithdraw 申请提现

**文件**：`backend/src/controllers/sitterController.js:68`

**风险**：用户同时提交两笔提现请求，余额不够支撑两笔。

```
请求 A: 读余额 = 200 → 余额 ≥ 100 ✅ → 余额 -100 → 新增提现记录
请求 B: 读余额 = 200 → 余额 ≥ 100 ✅ → 余额 -100 → 新增提现记录（超额提现！）
```

**为什么单纯用事务 + findUnique 不够？**

在 `READ COMMITTED` 下：

```
事务 A: findUnique(id=1) → walletBalance = 200
事务 B: findUnique(id=1) → walletBalance = 200 （A 还没更新）
事务 A: update(walletBalance = 200 - 100 = 100) → 提交
事务 B: update(walletBalance = 200 - 100 = 100) → 提交（但实际余额只有 100 了！）
```

WAIT——这里需要纠正一个常见误解。

`{ decrement: amount }` 在 SQL 层面生成的是：

```sql
UPDATE "User" SET "walletBalance" = "walletBalance" - 100 WHERE id = 1
```

不是 `SET "walletBalance" = 200 - 100`，而是 `"walletBalance" - 100`（字段引用）。所以即使事务 B 之前读到的是 200，实际执行 UPDATE 时，PostgreSQL 会在**当前数据库值**上减 100。

所以时序变成了：

```
A: 读余额 = 200
B: 读余额 = 200
A: 写 walletBalance = walletBalance - 100（当前数据库值 200 → 100）提交
B: 写 walletBalance = walletBalance - 100（当前数据库值 100 → 0）提交 ✅ 正确！
```

这看起来没问题？是的，对于 `{ decrement }` 这种 SQL 表达式更新，确实不会出现负数。但问题出在**判断条件**上：

```
A: 读余额 = 200 → 200 >= 150 ✅
B: 读余额 = 200 → 200 >= 150 ✅
A: 余额 = 200 - 150 = 50
B: 余额 = 50 - 150 = -100 ❌ 负数！
```

判断条件读到的余额（200）已经过时了。虽然 SQL 的 `- 150` 是原子的，但**业务条件检查不是**。

**真正安全的修复**：用 `updateMany` 在条件更新中检查余额：

```javascript
const r = await tx.user.updateMany({
  where: { id: req.user.id, walletBalance: { gte: amount } },
  data: { walletBalance: { decrement: amount }, frozenAmount: { increment: amount } },
});
if (r.count === 0) throw new Error('余额不足');
```

这会在 SQL 层面生成：

```sql
UPDATE "User" SET "walletBalance" = "walletBalance" - 100
WHERE id = 1 AND "walletBalance" >= 100;
```

`WHERE walletBalance >= 100` 这个条件被数据库原子地执行——即使两个事务同时到达，PostgreSQL 的行级锁会让它们串行化，只有第一个能满足 `walletBalance >= 100`。

**最终修复代码**：

```javascript
export async function requestWithdraw(req, res) {
  try {
    const { amount, accountType, accountInfo } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ error: '无效金额' });
    const w = await prisma.$transaction(async (tx) => {
      const r = await tx.user.updateMany({
        where: { id: req.user.id, walletBalance: { gte: amount } },
        data: { walletBalance: { decrement: amount }, frozenAmount: { increment: amount } },
      });
      if (r.count === 0) throw new Error('余额不足');
      return tx.withdrawal.create({ data: { userId: req.user.id, amount, accountType, accountInfo } });
    });
    res.json(w);
  } catch (err) {
    if (err.message === '余额不足') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
}
```

---

### 6.5 P0：adminReviewWithdrawal 审核提现

**文件**：`backend/src/controllers/adminController.js:325`

**风险**：两个管理员同时审核同一笔 PENDING 提现。

```
管理员 A: 读 withdrawal.status = 'PENDING'
管理员 B: 读 withdrawal.status = 'PENDING'
管理员 A: 更新为 APPROVED → 用户余额 + 100
管理员 B: 更新为 APPROVED → 用户余额又 + 100（超额退款！）
```

**修复**：事务内用 `updateMany` 条件更新：

```javascript
const result = await prisma.$transaction(async (tx) => {
  const r = await tx.withdrawal.updateMany({
    where: { id: +req.params.id, status: 'PENDING' },
    data: { status: action, reviewedBy: req.user.id, reviewedAt: new Date(), ... },
  });
  if (r.count === 0) {
    const exists = await tx.withdrawal.findUnique({
      where: { id: +req.params.id }, select: { id: true }
    });
    if (!exists) throw new Error('Withdrawal not found');
    throw new Error('Already processed');
  }
  if (action === 'REJECTED') {
    const w = await tx.withdrawal.findUnique({ where: { id: +req.params.id } });
    await tx.user.update({
      where: { id: w.userId },
      data: { walletBalance: { increment: w.amount }, frozenAmount: { decrement: w.amount } },
    });
  }
  return tx.withdrawal.findUnique({ where: { id: +req.params.id } });
});
```

**为什么必须在事务内用 `updateMany`？**

关键时序说明：

```
事务 A:  updateMany(id=5, status='PENDING') → count=1 ✅ 获得行锁
事务 B:  updateMany(id=5, status='PENDING') → 等待行锁...
事务 A:  更新提现记录 → 提交并释放锁
事务 B:  获得锁，重新评估 WHERE → status 现在是 'APPROVED' 不是 'PENDING'
         → count=0 ❌ 安全拒绝
```

这是 PostgreSQL 行锁 + 条件更新的典型案例。

---

### 6.6 P1：createPayment 创建支付

**文件**：`backend/src/controllers/paymentController.js:4`

**风险**：用户同时发送两个支付请求。

```
请求 A: 读 service.status = 'WAITING_PAYMENT' ✅
请求 B: 读 service.status = 'WAITING_PAYMENT' ✅
请求 A: 创建支付记录 → 更新服务为 COMPLETED
请求 B: 创建支付记录 → 更新服务为 COMPLETED（重复支付！）
```

**修复**：事务内用 `updateMany` 条件更新服务状态：

```javascript
const result = await prisma.$transaction(async (tx) => {
  const service = await tx.serviceListing.findUnique({ where: { id: orderId } });
  if (!service) throw new Error('Service not found');
  if (req.user.id !== service.ownerId) throw new Error('Only owner can pay');

  // 原子条件更新：只有 WAITING_PAYMENT 才能变成 COMPLETED
  const r = await tx.serviceListing.updateMany({
    where: { id: orderId, status: 'WAITING_PAYMENT' },
    data: { status: 'COMPLETED' },
  });
  if (r.count === 0) throw new Error('Service is not waiting for payment');

  const payment = await tx.payment.create({
    data: { orderId, amount, method, status: 'COMPLETED', transactionId: 'TXN' + Date.now(), paidAt: new Date() },
  });

  return { payment, ownerId: service.ownerId, sitterId: service.sitterId };
});
```

注意：创建支付记录和更新服务状态在同一个事务内。如果 `payment.create` 失败，`updateMany` 也会回滚。如果 `updateMany` 返回 count=0，整个事务回滚，不会创建重复支付。

---

## 7. 对比：updateMany vs 事务 vs 乐观锁

| 维度 | updateMany 条件更新 | $transaction 事务 | 乐观锁（version） |
|------|-------------------|-------------------|-----------------|
| 实现难度 | 低 | 中 | 中 |
| 适用场景 | 单表状态转换 | 多表原子操作 | 读多写少，冲突少 |
| 数据库依赖 | 无 | 无 | 无 |
| 防 TOCTOU | ✅ 强 | ⚠️ 需配合条件更新 | ✅ 强 |
| 多表一致性 | ❌ | ✅ | ✅ |
| 侵入性 | 低（改一处） | 中（包裹代码块） | 高（加 version 字段） |
| 适用例子 | 接单、紧急事件处理 | 提现、支付、审核 | 编辑长文档 |

### 7.1 何时用什么？

```
┌─────────────────────────────┐
│  只需要改一个表的状态？         │
│  ├── ✅ → updateMany 条件更新 │
│  └── ❌                       │
│       ↓                      │
│  需要改多个表？                │
│  ├── ✅ → $transaction       │
│  │    └── 内部用 updateMany   │
│  │        做条件检查           │
│  └── ❌ → 乐观锁              │
└─────────────────────────────┘
```

### 7.2 乐观锁简介

乐观锁通过在表中加一个 `version` 字段实现：

```sql
-- 第一次读取
SELECT id, status, version FROM service_listing WHERE id = 5;
-- → status = 'OPEN', version = 1

-- 更新时检查 version
UPDATE service_listing SET status = 'ACCEPTED', version = 2
WHERE id = 5 AND version = 1;
-- 如果 version 已被其他请求改为 2，影响行数为 0
```

在 Prisma 中：

```javascript
const service = await prisma.serviceListing.findUnique({ where: { id: 5 } });
// service.version = 1

const updated = await prisma.serviceListing.updateMany({
  where: { id: 5, version: service.version },
  data: { status: 'ACCEPTED', version: { increment: 1 } },
});
// 如果 count === 0，说明 version 不匹配（被其他人改了）
```

本项目中用 `status` 作为条件已经足够，无需引入 version 字段。

---

## 8. 面试考点

### 8.1 高频问题

#### Q: 什么是 TOCTOU？如何修复？
**A**: Time Of Check vs Time Of Use——检查条件和执行操作之间的竞态。三把方案：① updateMany 条件更新 ② 数据库事务 ③ 乐观锁。

#### Q: PostgreSQL 默认隔离级别是什么？在 READ COMMITTED 下，事务内的 findUnique + update 安全吗？
**A**: 默认是 READ COMMITTED。**不安全**。在 READ COMMITTED 下，事务 A 提交前，事务 B 的 SELECT 读不到 A 的修改。如果两个事务都读到 status = 'PENDING'，然后都执行 UPDATE（没有 WHERE status 条件），两者都会成功。需要在 `update` 或 `updateMany` 中用 WHERE 带入条件。

#### Q: Prisma 的 `$transaction` 和 `updateMany` 怎么选？
**A**: 单表状态转换用 `updateMany`；多表原子操作用 `$transaction`；最强方案是两个结合——事务内用 `updateMany` 做条件检查。

#### Q: `{ decrement: amount }` 在 SQL 层面是什么？
**A**: 生成 `SET "walletBalance" = "walletBalance" - amount`，是字段引用而不是固定值。这保证了即使在并发下，减法也是基于当前数据库值执行的。

#### Q: 为什么 `{ decrement }` 还不够安全？
**A**: 因为**业务条件检查**（如 `if (balance >= amount)`）发生在 `decrement` 之前，基于可能已过时的读取值。需要把条件检查也放进 SQL 中：`WHERE walletBalance >= amount`。

### 8.2 常见错误

| 错误 | 解释 |
|------|------|
| "事务就是加锁" | 事务不等于锁。事务提供 ACID，但不自动防止 TOCTOU |
| "用了事务就安全了" | 如上所述，findUnique + update 在事务内仍有窗口 |
| "updateMany 只能批量" | 对单行也有效，且返回 count 可判断是否成功 |
| "PostgreSQL 的 SELECT 会被 UPDATE 阻塞" | 不会。SELECT 不加锁（MVCC），只有 UPDATE 之间需要行锁 |

### 8.3 代码检查清单

- [ ] 状态变更（OPEN→ACCEPTED, PENDING→RESOLVED）是否用了条件更新？
- [ ] 多表操作（提现、支付）是否包裹在事务中？
- [ ] 事务内的读后写是否升级为条件更新？
- [ ] 条件更新的 WHERE 是否覆盖了所有约束？
- [ ] count === 0 时是否抛出了有意义的错误？
- [ ] 错误消息在前端是否被正确处理？

---

## 附录：6 处修复对照表

| 修复 | 文件 | 行号 | 风险等级 | 方法 |
|------|------|------|---------|------|
| acceptService | serviceController.js | 54 | P0 | updateMany + status='OPEN' |
| adminAssignSitter | adminController.js | 193 | P0 | updateMany + status='OPEN' |
| adminHandleEmergency | adminController.js | 365 | P0 | updateMany + status='PENDING' |
| requestWithdraw | sitterController.js | 68 | P0 | $transaction + updateMany + balance>=amount |
| adminReviewWithdrawal | adminController.js | 325 | P0 | $transaction + updateMany + status='PENDING' |
| createPayment | paymentController.js | 4 | P1 | $transaction + updateMany + status='WAITING_PAYMENT' |
