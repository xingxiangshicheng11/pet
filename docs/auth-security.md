# 账户登录安全 — 五步详解

适合完全零基础阅读。每章从"为什么"讲起，逐步深入到算法原理和代码实现。

---

## 目录

1. [密码存储 — bcrypt](#1-密码存储--bcrypt)
2. [JWT 有效期 — Access / Refresh Token](#2-jwt-有效期)
3. [登录限流](#3-登录限流)
4. [敏感操作二次验证](#4-敏感操作二次验证)
5. [密码强度校验](#5-密码强度校验)

---

## 1. 密码存储 — bcrypt

### 1.1 基础问题：密码在数据库里应该存什么？

假设你是系统管理员，用户注册时输入密码 `abc123`。你需要在数据库里存一个东西，以后用户登录时用来验证。

**❌ 错误做法 1：存明文**

```sql
INSERT INTO users (email, password) VALUES ('a@b.com', 'abc123');
```

数据库一旦被黑客拖走，所有密码直接暴露。

**❌ 错误做法 2：用 SHA256 哈希**

```js
const hash = crypto.createHash('sha256').update('abc123').digest('hex');
// hash = "6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090"
```

看起来安全了？不。SHA256 是**快速哈希**。快速的意思是——现代 GPU（显卡）每秒可以计算**数十亿次** SHA256。黑客可以：

```
尝试 "000000" → hash → 对比
尝试 "000001" → hash → 对比
尝试 "000002" → hash → 对比
...
尝试 "zzzzzz" → hash → 对比
```

8 位以内的大小写字母+数字组合（62^8 ≈ 2.18×10^14 种），用 GPU 暴力破解只需 **几小时到几天**。

更糟的是**彩虹表**：黑客可以提前把所有常见密码的 SHA256 算好，建成一张表：

```
"123456"   → "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92"
"password" → "b109f3bbbc244eb82441917ed06d618b9008dd09b3befd1b5e07394c706a8bb7"
"abc123"   → "6ca13d52ca70c883e0f0bb101e425a89e8624de51db2d2392593af6a84118090"
...
```

直接从 hash 反查密码，O(1) 时间。

### 1.2 解决方案：慢哈希 + 盐

我们需要两个东西：

**① 盐（Salt）** — 每个用户一个随机值，防止彩虹表

```
用户 A: salt_A = "x9k2m..."
用户 B: salt_B = "7p3nq..."
hash_A = SHA256("abc123" + salt_A)  ≠  hash_B = SHA256("abc123" + salt_B)
```

同样密码，不同盐 → 不同 hash。黑客必须为每个盐单独建彩虹表，成本 × 用户数。

**② 慢哈希** — 让每次计算故意变慢

```
SHA256:          1 亿次/秒  ← 太快了，不安全
bcrypt(cost=10): 1 万次/秒  ← 慢 1 万倍，暴力破解成本 ×1万
```

### 1.3 先搞懂 bcrypt 到底在干什么（三句话版）

**第一句**：你想存密码，但不能存明文。你需要一个**单向函数**——把密码变成一串乱码，且无法从乱码反推回密码。

**第二句**：SHA256 是单向函数，但它太快了（1 秒算 1 亿次），攻击者可以暴力猜密码。bcrypt 的设计目标就是**故意慢**。

**第三句**：慢的秘诀就是**重复做同一件事很多很多次**。cost=12 就是重复 4096 次。

就这么简单。下面开拆。

### 1.4 bcrypt 的三步流水线

```js
const bcrypt = require('bcryptjs');
const hash = await bcrypt.hash('myPassword123', 12);
// 输出: "$2b$12$LJ3m4ys3Lk0TSwHnbfOMeO2TqXK7nDrplYGfLqGjS3I3pN0d8uVoG"
```

bcrypt.hash() 内部只有三步：

```
┌──────────────┐    ┌──────────────┐    ┌─────────────────────────────┐
│   Step 1     │    │   Step 2     │    │        Step 3              │
│  生成随机盐   │ →  │  mix(密码,盐) │ →  │  重复 4096 次              │
│  (16字节)    │    │  第1次混合   │    │  每次以上一次的结果为输入    │
└──────────────┘    └──────────────┘    └─────────────────────────────┘
                                              │
                                              ↓
                                        "$2b$12$..."
```

#### Step 1：生成随机盐（16 字节）

```
crypto.randomBytes(16)
→ a1 b2 c3 d4 e5 f6 a7 b8 c9 d0 e1 f2 a3 b4 c5 d6
```

盐的作用：即使两个用户用相同密码，加盐后 hash 也不同。

#### Step 2：第一次混合（密码 + 盐）

把密码和盐**混合在一起**，产生一个初始的"混合值"。

混的方式用的是 Blowfish 加密算法——但**你不需要理解 Blowfish**，只需要知道它是一种加密方法，就像 AES 一样。这里不是用来加密数据，而是用来**搅乱密码和盐**。

#### Step 3：重复 4096 次（这才是核心）

```
第 1 轮: mix(密码, 盐)          → 结果 A
第 2 轮: mix(密码, 结果 A)      → 结果 B
第 3 轮: mix(密码, 结果 B)      → 结果 C
...
第 4096 轮: mix(密码, 结果 4095) → 最终 hash
```

**每一轮的结果都作为下一轮的输入**。这就是"链式"的意思。

类比包饺子：

```
第 1 次揉面: 面粉 + 水 → 面团 A
第 2 次揉面: 面粉 + 面团 A → 面团 B
第 3 次揉面: 面粉 + 面团 B → 面团 C
...
第 4096 次揉面: 最终得到非常均匀的面团
```

面揉得越多，面粉和水混合得越均匀。bcrypt 也一样——轮数越多，密码和盐混合得越彻底，从 hash 反推密码就越困难。

### 1.5 cost 的含义

`cost=12` 中的 12 是什么意思？

```
轮数 = 2^cost

cost=8  → 2^8  = 256 轮  → 25ms  → ⚠️ 弱
cost=10 → 2^10 = 1024 轮 → 100ms → ✅ 可以
cost=12 → 2^12 = 4096 轮 → 400ms → ✅✅ 推荐
cost=14 → 2^14 = 16384 轮→ 1.6s  → ✅✅ 高安全
```

每多 1，轮数翻倍，时间翻倍。

### 1.6 为什么要重复 4096 次？

| 算法 | 一次耗时 | 每秒可尝试密码数 |
|------|---------|----------------|
| SHA256 | 0.00000001 秒 | 1 亿个 |
| bcrypt(cost=12) | 0.4 秒 | 2.5 个 |

假设攻击者想暴力破解你的密码：

- **如果用的是 SHA256**：他每秒试 1 亿个密码，8 字符密码几小时就破了
- **如果用的是 bcrypt**：他每秒只能试 2.5 个，8 字符密码需要几百万年

### 1.7 最终输出的 hash 长什么样

```
$2b$12$LJ3m4ys3Lk0TSwHnbfOMeO2TqXK7nDrplYGfLqGjS3I3pN0d8uVoG
│││  ││        盐 (22字符)        │          hash (31字符)       │
│││  │└────────────────────────────┴──────────────────────────────┘
│││  └─ cost = 12
││└─ 算法版本(b=修正版)
│└─ 版本号
└─ 标识: bcrypt 都以 $2 开头
```

盐就嵌在 hash 字符串里，所以验证时不需要额外存盐。

### 1.8 验证密码（compare）

```js
const valid = await bcrypt.compare('myPassword123', hash);
// valid = true 或 false
```

compare 内部：

```
1. 从 hash 中提取 cost=12 和盐 "LJ3m4ys3..."
2. 重新执行 4096 轮混合：
   round 1: mix(输入的密码, 盐)
   round 2: mix(输入的密码, round1的结果)
   ...
   round 4096: → 新 hash
3. 比对: 新 hash === 原来的 hash？
   → 相等 → 密码正确
   → 不等 → 密码错误
```

### 1.9 为什么项目从 cost=10 改成了 cost=12？

```js
// 修改前
const hashed = await bcrypt.hash(password, 10);  // 1024 轮

// 修改后 (当前项目)
const hashed = await bcrypt.hash(password, 12);  // 4096 轮
```

| cost | 每轮耗时 | 暴力破解 8 位密码需时 |
|------|---------|---------------------|
| 8    | 25ms    | ≈ 3 年 |
| 10   | 100ms   | ≈ 14 年 |
| **12** | **400ms** | **≈ 55 年** |

> 注意：这些数字基于 2024 年普通 GPU 估算。黑客会用专用硬件（ASIC）集群，实际时间会更短。但 cost=12 已经让暴力破解的成本远远超过收益。

### 1.10 到底快多少？给你一个能感受到的例子

写两段代码跑一下，感受「快 10 万倍」是什么意思：

```js
// SHA256: 10 万个密码，0.3 秒就算完了
console.time('sha256');
for (let i = 0; i < 100000; i++) {
  crypto.createHash('sha256').update('password' + i).digest('hex');
}
console.timeEnd('sha256');  // ≈ 0.3 秒

// bcrypt: 10 个密码就要 4 秒
console.time('bcrypt');
for (let i = 0; i < 10; i++) {
  await bcrypt.hash('password' + i, 12);
}
console.timeEnd('bcrypt');  // ≈ 4 秒
```

**翻译成人话**：

|  | 你是普通用户 | 你是攻击者 |
|--|-----------|----------|
| **注册/登录** | 等 400ms 出结果，感受不到慢 | — |
| **暴力破解** | — | bcrypt 每秒只能试 2.5 个密码 |
| **如果你用的是 SHA256** | 注册/登录瞬间完成（你快了） | 攻击者也快了：**每秒能试 25 万个密码** |

**快 10 万倍是双向的**——你方便的同时，攻击者更方便。bcrypt 故意让双方都慢，但攻击者要试的密码数量是你的**几亿倍**，所以慢对他才是致命的。

### 1.11 图解 bcrypt 流程

```
注册:
  用户输入密码 "abcABC123!"
         │
         ▼
  生成随机盐 (16 bytes)
         │
         ▼
  cost=12 → 2^12 = 4096 轮
         │
         ▼
  Blowfish 密钥扩展 (重复 4096 次)
         │
         ▼
  输出 hash 字符串: $2b$12$saltsaltsaltsalthashhashhashhashhashhashhash
         │
         ▼
  存入数据库 users.password 字段

登录:
  用户输入密码 "abcABC123!"
         │
         ▼
  从数据库取出 hash: $2b$12$saltsaltsaltsalthashhash...
         │
         ▼
  提取 salt 和 cost
         │
         ▼
  bcrypt.compare("abcABC123!", hash)
         │
         ├── 用同样的 salt 和 cost 重新计算 hash
         ├── 比对两个 hash 是否相等
         │
         ▼
  true  → 登录成功
  false → 密码错误
```

---

## 2. JWT 有效期

### 先把要解决的问题说清楚

HTTP 协议有个特点：**它不记得你**。

你第一次请求：`给我首页` → 服务器给你首页
你第二次请求：`给我我的个人资料` → 服务器不认识你了

服务器每次收到请求都像第一次见面。那怎么让它"记得"你是谁？

**方案一（老式）：Session**

```
你:  账号密码给你
服务器: 好的，我在内存里记下 "用户 #1 已登录"
         给你一个 cookie，上面写着 "你的 session id = xyz"
你: 每次请求带上 cookie
服务器: 查 session 表，哦你是用户 #1
```

问题：服务器要存 session 表。用户多的时候，内存不够，还要搞 Redis 集群，很麻烦。

**方案二（项目用的）：JWT**

```
你:  账号密码给你
服务器: 好的，我给你一张纸条，上面写着 "用户 #1，有效期到明天"
         纸条上有我的防伪印章（签名），别人伪造不了
你: 每次请求带上纸条
服务器: 检查印章是真的 → 有效 → 哦你是用户 #1
        不用查任何表，纸条本身就够了
```

JWT 的核心思想：**把用户信息直接塞给客户端，服务器不存任何登录状态**。这就是它叫"自包含"的原因。

### 2.1 长什么样？

```
eyJhbGciOiJIUzI1NiJ9.eyJpZCI6MSwiZXhwIjoxNjgwNjA0ODAwfQ.SflKxwRJSMeK
└──────┬─────┘ └──────────┬─────────┘ └──────────┬──────────┘
   头部(header)         数据体(payload)        签名(signature)
```

三段乱码用 `.` 连起来，看起来像随机字符，但其实每个人都能解码看到里面的内容（只是改了也没用，因为没有签名密钥）。

解码后：

```
// 头部：就说了一句"我用的是 HS256 算法"
{ "alg": "HS256" }

// 数据体：真正的信息
{
  "id": 1,              ← 用户 ID
  "email": "a@b.com",   ← 邮箱
  "roles": "OWNER",     ← 角色
  "iat": 1680000000,    ← 签发时间
  "exp": 1680604800     ← 过期时间
}
```

### 2.2 为什么不能篡改？——橡皮图章类比

```
原始纸条:
  "用户 #1，角色: 普通用户"
  印章: 【XX 公司已认证】（用密钥盖的）

攻击者想改成:
  "用户 #1，角色: 管理员"
  但他没有密钥，盖不了假章 → 他自己盖的章跟服务器的不一样
  → 服务器一看，章不对 → 拒绝
```

代码层面：

```
攻击者改了数据 → 重新 base64 编码 → 拼到 JWT 里
→ 签名还是旧的
→ 服务器验证：用自己的密钥重新算一遍签名
   → 新签名 ≠ 旧签名 → 说明数据被改过 → 拒绝
```

攻击者不知道密钥，所以永远无法伪造合法的签名。

### 2.3 原来的问题：一个 token 管 7 天

```js
// 修改前的项目代码
jwt.sign(payload, secret, { expiresIn: '7d' });
```

意思就是：登录一次，接下来 7 天内不用再登录。

有什么问题？

```
周一，你在网吧登录了宠物平台
你忘了退出就走了
下一个人坐到这台电脑前
→ 他打开浏览器，直接进了你的账号
→ 可以看你的个人信息、下单、付款...
→ 整整 7 天，他都能用
```

token 泄露的途径不止网吧：手机被偷、浏览器插件恶意脚本（XSS）、中间人攻击（公共 WiFi）……只要有一个人拿到你的 token，7 天内他就能顶替你的身份。

### 2.4 解决方案：两个 token，分工不同

```
项目的做法：登录时给你两个东西

Access Token（访问令牌）:
  - 有效期：15 分钟
  - 用途：每次请求 API 都带上它
  - 类比：公司的临时门禁卡
  - 丢了怎么办？15 分钟后就失效了，损失很小

Refresh Token（刷新令牌）:
  - 有效期：7 天
  - 用途：只用来换新的 access token（不能直接访问 API）
  - 类比：你的身份证（锁在家里保险柜，不是随身带）
  - 丢了怎么办？下面会说怎么保护它
```

各自干各自的事：

```
正常请求:
  你 → 带上 access token → 服务器验证 access token → 返回数据
                           （15 分钟有效，每次请求都带）

Access token 过期后:
  你 → 服务器返回 "token 过期了"
  你 → 拿出 refresh token → 去换新的 access token
  服务器 → 给你新的一组 { accessToken, refreshToken }
  你 → 用新的 access token 继续请求
```

看到关键了吗？**access token 只在内存里待 15 分钟**，就算被偷了，能用的时间也很短。而 refresh token 虽然有效期长，但它**不直接用来请求 API**，只在换 token 的那一瞬间用一下。

### 2.5 两个不同的密钥

```js
// 项目代码
config.jwtSecret          → 签 access token 用
config.jwtRefreshSecret   → 签 refresh token 用
```

为什么搞两个密钥？一个不够吗？

- 如果只有一个密钥，access token 的密钥泄露了 → refresh token 也能被伪造 → 全完
- 两个密钥：access 密钥泄露了，只能伪造 15 分钟的 token；refresh 的密钥没丢，不受影响

这就是**隔离风险**。

### 2.6 轮换机制：换一次就作废旧的

这可能是这套机制里最重要也是最难理解的部分。我慢慢说。

**没有轮换会怎样？**

```
假设你的 refresh token 被偷了。

攻击者拿着它去换 access token：
  攻击者: POST /refresh { refreshToken: "偷来的" }
  服务器: 好的，给你新的 access token
  攻击者: （一直用同一个 refresh token，一直能换新的 access token）

你: 完全不知道，该干嘛干嘛
攻击者: 一直到 7 天后 refresh token 过期，都能冒充你
```

**有了轮换：**

每次用 refresh token 换新 token 时，服务器会：
1. 从数据库**删除**旧的 refresh token
2. 给你**新的一张** refresh token

```
攻击者: POST /refresh { refreshToken: "偷来的" }
服务器: 验证通过 → 删除旧 token → 给你新的 access + refresh

你（真正的用户）: POST /refresh { refreshToken: "偷来的" }
服务器: 查数据库 → 这个 token 不存在！
       （因为已经被攻击者用掉了）
       检测到异常！→ 删除你名下所有 refresh token
       → 你必须重新登录
```

结果：
- **你被强制下线了** → 你发现异常 → 改密码
- **攻击者**拿到的那个 access token，只有 15 分钟有效
- 15 分钟后，攻击者想再换 → 你的所有 token 已被作废 → 他也没了

**核心逻辑**：一个 refresh token 只能用一次。用第二次就说明出事了。

### 2.7 为什么存 hash 不存原文？

数据库里存 refresh token 的时候：

```js
// 不存原文
const hash = sha256(refreshToken);
db.save({ tokenHash: hash, userId: 1 });

// 不这样做
db.save({ token: refreshToken, userId: 1 });
```

为什么？

如果攻击者黑进了数据库，看到了 refresh token 表：

```
// 存原文 → 攻击者直接拿到所有有效的 token
// 等于拿到了所有用户的身份证，想冒充谁就冒充谁

// 存 hash → 攻击者看到一堆乱码
// sha256 是不可逆的，他没法从 hash 反推出原文
// 这些 hash 对他没用
```

这就是"不要存用户的密码原文"同样的道理——**存了不该存的东西，一旦数据库泄露就全完了**。

### 2.8 整件事串起来

```
你打开 App，输入账号密码登录:

┌─────────────────────────────────────────────────────────┐
│  1. 服务器验证密码正确                                  │
│  2. 服务器生成:                                        │
│     - accessToken  (15 分钟有效，日常请求用)            │
│     - refreshToken (7 天有效，用来换 access token)      │
│  3. refreshToken 的 hash 存入数据库                     │
│  4. 两个 token 都返回给你                               │
└─────────────────────────────────────────────────────────┘

你浏览 App，每次请求都带上 access token:

┌─────────────────────────────────────────────────────────┐
│  请求: /api/services                                    │
│  头部: Authorization: Bearer accessToken...              │
│  服务器: 验证签名 + 未过期 → 返回数据                    │
└─────────────────────────────────────────────────────────┘

15 分钟后，access token 过期了:

┌─────────────────────────────────────────────────────────┐
│  请求: /api/services                                    │
│  服务器: token 过期了 → 返回 401                         │
│  你: 拿出 refresh token → POST /api/auth/refresh        │
│  服务器:                                                │
│    1. 验证 refresh token 签名                           │
│    2. 查数据库，看这个 token 还在不在                    │
│    3. 在 → 说明是第一次用 → 删除它                      │
│    4. 签发新的 { accessToken, refreshToken }            │
│    5. 新 refreshToken 的 hash 存数据库                  │
│  你用新的 access token 重试原请求                       │
└─────────────────────────────────────────────────────────┘

如果 refresh token 被偷，攻击者先用了:

┌─────────────────────────────────────────────────────────┐
│  攻击者: POST /api/auth/refresh { stolenToken }         │
│  服务器: 验证通过 → 删除旧 token → 签新 token           │
│                                                         │
│  你（真用户）: POST /api/auth/refresh { stolenToken }    │
│  服务器: 查数据库 → 这个 token 不存在！                  │
│          → 删除你名下所有 refresh token                 │
│          → 返回 "请重新登录"                             │
│                                                         │
│  你: 发现被强制下线了 → 改密码                           │
│  攻击者: 15 分钟后 access token 过期 → 没法续 → 失效   │
└─────────────────────────────────────────────────────────┘
```
  │                                │                             │
  │                                │── 生成 accessToken (15m) ──│
  │                                │── 生成 refreshToken (7d) ──│
  │                                │── 存 refreshToken hash ───→│
  │                                │                             │
  │←── { accessToken, refreshToken }                             │
  │                                │                             │
  │  (15 分钟后)                    │                             │
  │                                │                             │
  │──── GET /api/data (Bearer AT) ─│                             │
  │←── 401 Token expired ─────────│                             │
  │                                │                             │
  │──── POST /api/auth/refresh ────│                             │
  │    { refreshToken }            │                             │
  │                                │──── 查 refreshToken ──────→│
  │                                │──── 找到，删除 ───────────→│
  │                                │──── 生成新 AT + RT ────────│
  │                                │──── 存新 RT hash ─────────→│
  │←── { accessToken, refreshToken }                             │
  │                                │                             │
  │──── GET /api/data (Bearer 新AT)│                             │
  │←── 200 OK ────────────────────│                             │
```

---

## 3. 登录限流

### 先把要解决的问题说清楚

bcrypt 让破解一个密码的**计算成本**变得极高——试一次 400ms，每秒只能试 2.5 个密码。

但攻击者可以换思路：**我不死磕你一个人的密码，我用所有账号去撞库**。

```
攻击者的算盘：

我有 100 万个邮箱 + 一份常见密码表。
用脚本批量试最常见的 5 个密码：

POST /login  email=a@test.com   password=123456    → ❌
POST /login  email=b@test.com   password=123456    → ❌
POST /login  email=c@test.com   password=123456    → ✅ 进了！

100 万 × 5 = 500 万次请求
就算只有 0.1% 的人用弱密码，也能拿到 1000 个账号
```

你还觉得不限流没关系吗？

### 3.1 不限流会怎样？——没有保安的银行大门

```
时间            请求
00:00:00    POST /login  email=a@test.com  password=000000   → ❌
00:00:01    POST /login  email=a@test.com  password=000001   → ❌
00:00:02    POST /login  email=a@test.com  password=000002   → ❌
...（脚本每秒发几百次）...
00:05:00    POST /login  email=a@test.com  password=abc123   → ✅ 攻破
```

8 位纯数字密码（1 亿种组合），不限流 → 几小时就破。
有限流 → 试 5 次就被锁半小时 → 8 位密码要试 1000 万年。

限流本质就一句话：**同一用户 / 同一 IP，短时间内最多试 N 次**。

### 3.2 四种限流算法——四种不同的"记性"

类比：限流像小区门卫，要记住"谁最近进进出出太多了"。四种算法只是门卫的记法不同。

#### ① 固定窗口——闹钟式

门卫定个 15 分钟的闹钟。闹钟响之前最多放 5 个人，闹钟一响，计数器归零。

```
    窗口 1                    窗口 2
┌────────────────────┐  ┌────────────────────┐
│ 00:00 ~ 00:15      │  │ 00:15 ~ 00:30      │
│ 放了 5 个，满了    │  │ 放了 0 个，重置了  │
└────────────────────┘  └────────────────────┘

bug（临界点问题）：
  00:14:59  放第 5 个 → 窗口结束
  00:15:00  放第 5 个 → 新窗口开始
  1 秒内放进 10 个人！攻击者最喜欢这个瞬间
```

#### ② 滑动窗口——记本子式 ✅ 本项目的方案

门卫不靠闹钟，他拿本子记下每个人进门的时间。有人进来时，他翻看最近 15 分钟内记了多少个。

```
本子上：
  08:01  08:05  08:08  08:12  08:14

08:15 有人要进门 → 翻本子：
  "最近 15 分钟（08:00~08:15）有 5 次记录，满了"

08:16 又有人进门 → 翻本子：
  "08:01 已经超过 15 分钟了，划掉"
  "剩下 4 次 → 没满 → 进吧"
```

没有临界点问题——**窗口是跟着"现在时刻"平滑移动的**。

```js
const rateLimitStore = new Map();
// key → { attempts: [时间戳数组], locked: 锁定时间|null }

function checkRateLimit(userId, ip) {
  const now = Date.now();

  // 同时对两个维度限流：用户 + IP
  const keys = [`login:user:${userId}`, `login:ip:${ip}`];

  for (const key of keys) {
    let data = rateLimitStore.get(key);
    if (!data) {
      data = { attempts: [], locked: null };
      rateLimitStore.set(key, data);
    }

    // Step 1: 检查是否被锁定
    if (data.locked) {
      const elapsed = now - data.locked;
      if (elapsed < 30 * 60 * 1000) {  // 锁定 30 分钟
        return { allowed: false, retryAfter: (30*60*1000 - elapsed)/1000 };
      } else {
        data.locked = null;    // 锁定时间到，解锁
        data.attempts = [];
      }
    }

    // Step 2: 划掉超过 15 分钟的老记录
    data.attempts = data.attempts.filter(t => t > now - 15 * 60 * 1000);

    // Step 3: 判断是否超过阈值（5 次）
    if (data.attempts.length >= 5) {
      data.locked = now;        // 触发锁定
      return { allowed: false, retryAfter: 1800, locked: true };
    }
  }

  return { allowed: true };
}
```

逻辑三步走：**① 检查是否锁着 → ② 清理过期记录 → ③ 判断是否超限**。

#### ③ 令牌桶——水池式

```
              ┌─────────────┐
 请求进来 ──→ │  桶里 5 个令牌 │ ──→ 有令牌 → 拿走 1 个 → 放行
              │  🪙🪙🪙🪙🪙   │      没令牌 → 拒绝
              └─────────────┘
                     ↑
              每 3 秒补充 1 个令牌

特点：允许短时突发（桶里攒了好几个令牌时可以连续通过），
      但长期速率受限于补充速度。像水池——你可以一下子舀好几桶，
      但水流补充速度是恒定的。
```

```js
class TokenBucket {
  constructor(capacity, refillPerSecond) {
    this.capacity = capacity;       // 桶的容量
    this.tokens = capacity;         // 当前剩余令牌
    this.refillRate = refillPerSecond;
    this.lastRefill = Date.now();
  }

  tryConsume() {
    // 先按时间补充令牌
    const now = Date.now();
    const add = (now - this.lastRefill) / 1000 * this.refillRate;
    this.tokens = Math.min(this.capacity, this.tokens + add);
    this.lastRefill = now;

    // 再消费令牌
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;   // 放行
    }
    return false;    // 拒绝
  }
}
```

#### ④ 漏桶——漏斗式

```
          ┌────────────────────┐
请求→───│ 队列 [req][req]    │──→ 恒定速率处理 (1次/秒)
          │ [req][req][req]   │     队列满了就丢
          └────────────────────┘

特点：严格限制处理速率，不允许任何突发。
像漏斗——上面倒多快都没用，下面永远一滴一滴地漏。
```

### 3.3 为什么用 Map 不用 Redis？

| | Map（本项目） | Redis（生产环境） |
|---|---|---|
| 多实例共享 | ❌ 各进程独立，各计各的 | ✅ 所有实例共享一个 |
| 持久化 | ❌ 重启全丢 | ✅ 可持久化 |
| 数据结构 | 手写数组维护 | 原生 Sorted Set + TTL |
| 依赖 | 零依赖 | 需要装 Redis |

**本项目用 Map**：单实例开发阶段，不引入额外依赖。

**生产环境用 Redis**：

```js
import { createClient } from 'redis';
const redis = createClient();

async function checkRateLimitRedis(userId, ip) {
  const key = `ratelimit:${userId}`;
  const now = Date.now();
  const window = 15 * 60 * 1000;

  await redis.zRemRangeByScore(key, 0, now - window);  // 清过期
  const count = await redis.zCard(key);                  // 数当前

  if (count >= 5) return { allowed: false };

  await redis.zAdd(key, { score: now, value: `${now}:${random()}` });
  await redis.expire(key, 900); // 15 分钟自动过期

  return { allowed: true };
}
```

### 3.4 整件事串起来

```
请求登录 ──→ 检查限流 ──→ 被锁了？ ──YES──→ 返回 429 "30 分钟后再试"
                │
               NO
                │
                ▼
           验证 bcrypt 密码
                │
         ┌──────┴──────┐
        ❌ 错误        ✅ 正确
         │              │
         ▼              ▼
    记录失败次数     清空失败记录
         │              │
         ▼              ▼
   失败 ≥ 5 次？     登录成功
    ├─ YES → 锁定 30 分钟
    └─ NO  → "密码错误（还剩 N 次机会）"
```

---

## 4. 敏感操作二次验证

### 先把要解决的问题说清楚

想象一个场景：你已经成功登录了淘宝，正在浏览商品。

这时候有人趁你离开座位，用你的电脑打开"修改密码"页面——**他已经是"已登录"状态了**，没有额外的保护，他可以直接把密码改成自己的。

```
你: 已登录 ✓
攻击者（趁你不在）:
  打开 "设置" → "修改密码"
  输入新密码: "hacker123"
  确认新密码: "hacker123"
  → 密码修改成功

你回来: 发现登不上去了
攻击者: 用你的账号购物、下单、付款...
```

你已经登录了，但**登录身份不等于你可以为所欲为**。有些操作风险特别高，就算你登录了，也要重新确认你就是你。

这就是 **Step-up Authentication（升级认证）** ——做敏感操作前，再验一次身份。

### 4.1 什么操作算"敏感"？

| 操作 | 风险等级 | 被盗后后果 |
|------|---------|-----------|
| 修改密码 | 高 | 攻击者直接"偷"走你的账号 |
| 修改邮箱 | 高 | 找回密码功能被劫持 |
| 提现/转账 | 高 | 真金白银的损失 |
| 删除账号 | 高 | 所有数据永久丢失 |
| 查看敏感信息 | 中 | 个人隐私泄露 |

### 4.2 怎么二次验证？——类比：进机房要再刷一次卡

```
你已经进了公司大门（= 登录成功，拿到了 access token）。
         ↓
你要去机房（= 修改密码）。
         ↓
机房门口还有一道门禁。
你拿出工卡再刷一次（= 输入当前密码）。
         ↓
门开了（= 二次验证通过）。
```

**已经登录了为什么还要输入密码？**

因为可能只是你**忘了退出**，而不是你本人在操作。重新输入密码能确认：**正在操作的人，确实知道密码**。

### 4.3 本项目的实现：修改密码

```js
// POST /api/auth/change-password  (需要 access token + 当前密码)
export async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  // Step 1: 从数据库拿用户信息
  const user = await prisma.user.findUnique({ where: { id: userId } });

  // Step 2: 验证当前密码 ← 这就是"二次验证"
  //         你已经登录了（access token 已验证），
  //         但改密码这种高危操作，要你再输一次密码
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) {
    return res.status(403).json({ error: '当前密码错误' });
  }

  // Step 3: 校验新密码强度
  // ...

  // Step 4: 更新密码
  const hashed = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  // Step 5: 作废所有 refresh token → 强制所有设备重新登录
  await prisma.refreshToken.deleteMany({ where: { userId } });

  res.json({ message: '密码修改成功，请重新登录' });
}
```

### 4.4 为什么要作废所有 refresh token？

回到上面的场景：攻击者可能已经悄悄拿到了你的 refresh token（比如之前偷了你的手机，复制了 token）。

```
改密码之前：
  你: 用自己的密码登录 → 有合法 token
  攻击者: 可能有偷来的 token → 也能冒充你

改密码之后：
  你: 用新密码生成新 token → OK
  攻击者: 旧的 token 全部被作废 → 无法再用

  → 所有设备都必须用新密码重新登录
  → 被盗的旧 token 全部失效
```

一步操作，同时做两件事：**① 更新密码 ② 清理所有旧登录**。

### 4.5 其他二次验证方案

**方案 1：邮箱验证码**

适合修改邮箱、提现等操作。不只是验证"你知道什么"，还要验证"你能访问什么"。

```js
async function changeEmail(req, res) {
  const { newEmail, code } = req.body;

  // 1. 先发验证码到旧邮箱
  // 2. 用户输入收到的验证码
  // 3. 服务器验证通过后才修改
}
```

**方案 2：短期授权 token（step-up token）**

适合需要连续做多个敏感操作的场景——验一次密码，5 分钟内有效。

```js
// Step 1: 用户先输密码，拿到 step-up token（5 分钟有效）
app.post('/api/auth/step-up', authenticate, async (req, res) => {
  const { password } = req.body;
  const user = await findUser(req.user.id);
  if (!bcrypt.compare(password, user.password)) {
    return res.status(403).json({ error: '密码错误' });
  }
  const stepToken = jwt.sign(
    { id: user.id, purpose: 'step-up' },
    config.jwtSecret,
    { expiresIn: '5m' }
  );
  res.json({ stepToken });
});

// Step 2: 用 step-up token 执行敏感操作
app.post('/api/payments/withdraw', authenticate, async (req, res) => {
  const { stepToken, amount } = req.body;
  try {
    jwt.verify(stepToken, config.jwtSecret);
    // 验证通过，处理提现
  } catch {
    return res.status(403).json({ error: '请先完成安全验证' });
  }
});
```

**类比速查：**

| 方案 | 类比 | 什么时候用 |
|------|------|-----------|
| 再次输入密码 | 进机房刷工卡 | 改密码 |
| 邮箱验证码 | 银行给你发短信验证码 | 改邮箱、提现 |
| Step-up token | 高铁站刷脸一次管 5 分钟 | 批量敏感操作 |

---

## 5. 密码强度校验

### 先把要解决的问题说清楚

前面我们做了三件事：bcrypt 让破解变慢、双 token 防止 token 泄露、限流防止暴力试密码。

但还有一个更根本的问题没解决：**密码本身太弱**。

```
你设了个密码: "123456"

bcrypt:  好的，我会花 400ms 帮你加密
限流:    好的，你试错 5 次就锁你 30 分钟

攻击者:
  哈哈，但 "123456" 根本不需要暴力破解。
  我手头有 top 10000 常见密码列表。
  第一个就是 "123456"。
  一次就猜中了。
```

**再强的加密算法，也救不了弱密码。** 密码强度校验就是——在用户设置密码那一刻，直接把弱密码挡在门外。

### 5.1 类比：门锁的钥匙

```
密码强度校验就像卖锁的人检查你配的钥匙：

"先生，你这钥匙齿太平了，随便找个铁丝就能捅开"
"我给你重新配一把，齿要多、要深、要乱"
"虽然你开门要多转两圈，但别人开不了你的门"
```

```diff
- 123456      → 钥匙只有 1 个齿，一捅就开  ❌
- Abc@123!   → 钥匙有 8 个齿，大小深浅不一 ✅
```

### 5.2 为什么服务端必须校验？前端不能代劳吗？

```html
<form>
  <input type="password" id="password" minlength="8" required>
  <input type="submit">
</form>

<script>
// 前端校验看起来没问题
document.querySelector('form').onsubmit = function() {
  if (password.value.length < 8) {
    alert('密码太短');
    return false;
  }
};
</script>
```

但攻击者可以用一行命令绕过整个网页：

```bash
# 完全不经过前端，直接发给服务器
curl -X POST https://api.example.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"hacker@evil.com","password":"123"}'
```

前端校验只是**用户体验**——让正常人填错了马上看到提示。
服务端校验才是**真正的安全**——防止恶意请求直接入库。

### 5.3 本项目的校验规则

```js
function validatePassword(password, email) {
  const errors = [];

  // 规则 1: 长度 ≥ 8
  if (!password || password.length < 8) {
    errors.push('密码至少需要 8 个字符');
  }

  // 规则 2: 包含大写字母 A-Z
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }

  // 规则 3: 包含小写字母 a-z
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }

  // 规则 4: 包含数字 0-9
  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }

  // 规则 5: 包含特殊字符
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }

  // 规则 6: 不在常见密码黑名单中
  const commonPasswords = [
    '123456', 'password', '12345678', 'qwerty',
    'admin123', 'passw0rd', 'password123',
    'abc123', 'letmein', 'welcome', 'monkey',
    'dragon', 'master', '123123', 'login',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('此密码过于常见，存在安全隐患');
  }

  // 规则 7: 不包含邮箱前缀
  if (email) {
    const emailPrefix = email.split('@')[0].toLowerCase();
    if (password.toLowerCase().includes(emailPrefix)) {
      errors.push('密码不能包含邮箱前缀');
    }
  }

  return errors;  // 空数组 → 校验通过
}
```

### 5.4 密码熵——用数学衡量密码强度

上面的规则是"定性"的（有没有大写、有没有数字），但我们需要一个**定量**的指标来衡量到底有多强。

**熵（Entropy）** 就是这个指标。单位是 bit。

**公式**：

```
熵 = log₂(字符集大小 ^ 密码长度) = 密码长度 × log₂(字符集大小)
```

```
类比：猜密码就像猜一个保险柜的密码锁

数字转盘（0-9），4 位：
  总共 10^4 = 10000 种组合
  熵 = log₂(10000) ≈ 13.3 bit

字母转盘（A-Z），6 位：
  总共 26^6 ≈ 3 亿种组合
  熵 = log₂(3亿) ≈ 28.2 bit
```

**各种字符集的大小：**

| 包含的字符 | 字符集大小 | 例子 |
|-----------|-----------|------|
| 纯数字 | 10 | `0-9` |
| 小写字母 | 26 | `a-z` |
| 大写字母 | 26 | `A-Z` |
| 数字+小写 | 36 | `0-9 + a-z` |
| 大小写+数字 | 62 | `0-9 + a-z + A-Z` |
| 全字符 | 94 | 以上 + 特殊符号 |

**算一算：**

```js
// 纯数字 8 位: "12345678"
熵 = log₂(10^8) = 8 × log₂(10) = 8 × 3.32 = 26.6 bit
// 需要尝试 2^26.6 ≈ 1 亿次 → GPU 几秒就算完了

// 大小写+数字 8 位: "Abcd1234"
熵 = log₂(62^8) = 8 × log₂(62) = 8 × 5.95 = 47.6 bit
// 需要尝试 2^47.6 ≈ 2 × 10^14 次 → GPU 要几天

// 全字符 12 位: "Abc@123!Xyz$"
熵 = log₂(94^12) = 12 × log₂(94) = 12 × 6.55 = 78.6 bit
// 需要尝试 2^78.6 ≈ 4 × 10^23 次 → GPU 要几亿年
```

**安全性分级：**

```
熵值         安全性    暴力破解耗时 (GPU)
─────────────────────────────────────
< 30 bit     极弱       几秒
30-50 bit    弱         几分钟~几小时
50-70 bit    中等       几天~几年
70-90 bit    强         几十年~几千年
> 90 bit     极强       宇宙年龄级别
```

**每多一种字符类型，时间指数级增长：**

| 规则 | 字符集大小 | 熵值 (8位) | 暴力破解需时 |
|------|-----------|-----------|-------------|
| 纯数字 | 10 | 26.6 bit | 1 秒 |
| + 小写字母 | 36 | 41.2 bit | 2 小时 |
| + 大写字母 | 62 | 47.6 bit | 2 天 |
| + 特殊字符 | 94 | 52.5 bit | 3 个月 |

### 5.5 为什么不能包含邮箱前缀？

```
邮箱: zhangsan@example.com
密码: Zhangsan@123!   ❌ 包含了 "zhangsan"
```

攻击者知道你的邮箱后，把邮箱前缀加到字典里优先尝试。本来需要试 10^14 种组合，现在先试 100 个跟邮箱相关的就能蒙对。

### 5.6 有了复杂度规则，为什么还需要黑名单？

`"Password1!"`——大写+小写+数字+特殊，8 位，熵值 52.5 bit，看起来很强。

但它是**常见模式**。攻击者的字典里一定有它。

```
熵值假设的是：密码是完全随机的。
但人选的密码不是随机的。
人类倾向：
  - 首字母大写
  - 结尾加个数字
  - 最后补个感叹号
  → "Password1!"、"Admin@123"、"Qwerty!1"

这些在攻击者的字典里排前 100 位。
理论熵值 52.5 bit，实际有效熵值不到 10 bit。
```

**黑名单就是弥补"理论"和"实际"的差距**：攻击者用统计学找规律，我们也用统计学堵漏洞。前 10000 个常见密码覆盖了约 90% 的真实用户密码。

---

## 附录：本项目修改汇总

| 安全措施 | 修改的文件 | 具体改动 |
|---------|-----------|---------|
| 1. bcrypt cost 提升 | authController.js | cost=10 → cost=12 |
| 2. 双 Token + 轮换 | authController.js, auth.js, routes/auth.js | 新增 makeTokens(), POST /refresh、轮换逻辑 |
| 3. 登录限流 + 锁定 | authController.js | 新增 checkRateLimit()、recordAttempt()、clearRateLimit() |
| 4. 修改密码二次验证 | authController.js, routes/auth.js | 新增 POST /change-password |
| 5. 密码强度校验 | authController.js | 新增 validatePassword() |
| 基础设施 | schema.prisma, config/index.js | 新增 RefreshToken 模型、jwtRefreshSecret |
