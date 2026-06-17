import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import prisma from '../utils/prisma.js';
const ADMIN_SECRET = 'zcc';

// ============================================================
// 安全措施 5: 服务端密码强度校验
// ============================================================
function validatePassword(password, email) {
  const errors = [];

  // 5.1 长度校验
  if (!password || password.length < 8) {
    errors.push('密码至少需要 8 个字符');
  }

  // 5.2 复杂度校验
  if (!/[A-Z]/.test(password)) {
    errors.push('密码必须包含至少一个大写字母');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('密码必须包含至少一个小写字母');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('密码必须包含至少一个数字');
  }
  if (!/[!@#$%^&*(),.?":{}|<>_\-]/.test(password)) {
    errors.push('密码必须包含至少一个特殊字符');
  }

  // 5.3 常见密码黑名单
  const commonPasswords = [
    '123456', 'password', '12345678', 'qwerty', 'admin123',
    'passw0rd', 'password123', 'abc123', 'letmein', 'welcome',
    'monkey', 'dragon', 'master', '123123', 'login',
  ];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('此密码过于常见，存在安全隐患，请更换');
  }

  // 5.4 禁止包含邮箱前缀
  if (email) {
    const emailPrefix = email.split('@')[0].toLowerCase();
    if (password.toLowerCase().includes(emailPrefix)) {
      errors.push('密码不能包含邮箱前缀');
    }
  }

  return errors;
}

// ============================================================
// 安全措施 2: 双 Token 机制 (Access + Refresh)
// ============================================================
function makeTokens(user) {
  const tv = user.tokenVersion ?? 0;
  // Access Token: 短期有效 (15 分钟)
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, roles: user.roles, type: 'access', tokenVersion: tv },
    config.jwtSecret,
    { expiresIn: '15m' }
  );

  // Refresh Token: 长期有效 (7 天)
  const jti = crypto.randomBytes(8).toString('hex');
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh', jti, tokenVersion: tv },
    config.jwtRefreshSecret,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

function userResponse(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
    phone: user.phone,
  };
}

// ============================================================
// 安全措施 3: 登录限流 + 账号锁定 (内存版)
// ============================================================
// 用 Map 做限流计数 (生产环境应改用 Redis)
// 结构: key → { attempts: [timestamps], locked: timestamp|null }
const rateLimitStore = new Map();

// 每 5 分钟清理一次过期记录
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore) {
    // 清理旧尝试记录
    data.attempts = data.attempts.filter(t => t > now - 900000);
    if (data.attempts.length === 0 && !data.locked) {
      rateLimitStore.delete(key);
    }
    // 清理已解锁的锁定
    if (data.locked && data.locked < now - 1800000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

function checkRateLimit(userId, ip) {
  const now = Date.now();
  const keys = [
    `login:user:${userId}`,
    `login:ip:${ip}`,
  ];

  for (const key of keys) {
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { attempts: [], locked: null });
    }
    const data = rateLimitStore.get(key);

    // 检查是否被锁定
    if (data.locked) {
      const lockDuration = 30 * 60 * 1000; // 30 分钟
      if (now - data.locked < lockDuration) {
        const retryAfter = Math.ceil((data.locked + lockDuration - now) / 1000);
        return { allowed: false, retryAfter };
      } else {
        // 锁定时间已过，解锁
        data.locked = null;
        data.attempts = [];
      }
    }

    // 清除窗口外的旧记录
    const windowMs = 15 * 60 * 1000; // 15 分钟
    data.attempts = data.attempts.filter(t => t > now - windowMs);

    // 检查是否超过阈值 (5 次)
    if (data.attempts.length >= 5) {
      data.locked = now;
      return { allowed: false, retryAfter: 1800, locked: true };
    }
  }

  return { allowed: true };
}

function recordAttempt(userId, ip) {
  const now = Date.now();
  const keys = [
    `login:user:${userId}`,
    `login:ip:${ip}`,
  ];
  for (const key of keys) {
    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, { attempts: [], locked: null });
    }
    rateLimitStore.get(key).attempts.push(now);
  }
}

function clearRateLimit(userId, ip) {
  rateLimitStore.delete(`login:user:${userId}`);
  rateLimitStore.delete(`login:ip:${ip}`);
}

// ============================================================
// 注册
// ============================================================
export async function register(req, res) {
  try {
    const { email, password, name, phone, roles, adminCode } = req.body;

    // 检查邮箱是否已注册
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    // 安全措施 5: 服务端密码校验
    const pwdErrors = validatePassword(password, email);
    if (pwdErrors.length > 0) {
      return res.status(400).json({ error: pwdErrors.join('; ') });
    }

    let finalRoles = 'OWNER';
    if (roles) {
      finalRoles = Array.isArray(roles) ? roles.join(',') : roles;
    }
    if (adminCode) {
      if (adminCode !== ADMIN_SECRET) return res.status(403).json({ error: '管理员注册码错误' });
      if (!finalRoles.split(',').includes('ADMIN')) {
        finalRoles = finalRoles ? finalRoles + ',ADMIN' : 'ADMIN';
      }
    }

    // 安全措施 1: bcrypt 哈希 (cost = 12, 约 400ms)
    const hashed = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { email, password: hashed, name, phone, roles: finalRoles },
    });

    // 签发双 token
    const tokens = makeTokens(user);

    // 存储 refresh token
    const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.status(201).json({ ...tokens, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ============================================================
// 登录 (含限流)
// ============================================================
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const ip = req.ip || req.connection.remoteAddress;

    // 先查用户，用于限流 key
    const user = await prisma.user.findUnique({ where: { email } });

    // 安全措施 3: 限流检查
    if (user) {
      const limit = checkRateLimit(user.id, ip);
      if (!limit.allowed) {
        if (limit.locked) {
          return res.status(429).json({
            error: '登录失败次数过多，账号已锁定 30 分钟',
            retryAfter: limit.retryAfter,
          });
        }
        return res.status(429).json({
          error: `尝试过于频繁，请 ${limit.retryAfter} 秒后再试`,
          retryAfter: limit.retryAfter,
        });
      }
    }

    if (!user) {
      // 恒定时间响应：假 bcrypt 比对，防止邮箱枚举（时间攻击）
      await bcrypt.compare(password, '$2a$12$0000000000000000000000000000000000000000000000000000000');
      return res.status(401).json({ error: '邮箱或密码错误' });
    }

    // 安全措施 1: bcrypt 比对
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      // 记录失败尝试
      recordAttempt(user.id, ip);
      return res.status(401).json({ error: '密码错误' });
    }

    if (!user.isActive) return res.status(403).json({ error: '该账号已被禁用' });

    // 登录成功 → 清限流
    clearRateLimit(user.id, ip);

    // tokenVersion +1：旧 token 立即失效
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { tokenVersion: { increment: 1 } },
    });

    // 签发双 token
    const tokens = makeTokens(updatedUser);

    // 清理该用户旧 refresh token，再存新的
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });
    const tokenHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ ...tokens, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ============================================================
// 安全措施 2: Refresh Token 轮换 (Rotation)
// ============================================================
export async function refresh(req, res) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json({ error: '缺少 refreshToken' });
    }

    // 验证 refresh token 签名
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, config.jwtRefreshSecret);
    } catch (err) {
      return res.status(401).json({ error: 'Refresh token 无效或已过期' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Token 类型错误' });
    }

    // 查数据库验证 token 是否仍有效 (防重复使用)
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!stored) {
      // Token 已被使用过 → 可能是重放攻击，作废该用户所有 refresh token
      await prisma.refreshToken.deleteMany({
        where: { userId: decoded.id },
      });
      return res.status(401).json({ error: 'Refresh token 已失效，请重新登录' });
    }

    if (stored.expiresAt < new Date()) {
      await prisma.refreshToken.delete({ where: { id: stored.id } });
      return res.status(401).json({ error: 'Refresh token 已过期' });
    }

    // === 轮换：删除旧 token，签发新 token ===
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    // 查用户
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ error: '用户不存在' });
    if (!user.isActive) return res.status(403).json({ error: '账号已被禁用' });

    // 检查 tokenVersion：如果用户在别处重新登录过，旧 refresh token 失效
    if (decoded.tokenVersion !== undefined && decoded.tokenVersion !== user.tokenVersion) {
      return res.status(401).json({ error: '已在其他设备登录，请重新登录' });
    }

    // 签发新 token 对
    const tokens = makeTokens(user);

    // 存储新 refresh token
    const newHash = crypto.createHash('sha256').update(tokens.refreshToken).digest('hex');
    await prisma.refreshToken.create({
      data: {
        tokenHash: newHash,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    res.json({ ...tokens, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ============================================================
// 安全措施 4: 修改密码 — 需当前密码 (Step-up)
// ============================================================
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // 查用户
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: '用户不存在' });

    // Step 1: 验证当前密码 (Step-up 认证)
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return res.status(403).json({ error: '当前密码错误' });
    }

    // Step 2: 校验新密码强度
    const pwdErrors = validatePassword(newPassword, user.email);
    if (pwdErrors.length > 0) {
      return res.status(400).json({ error: pwdErrors.join('; ') });
    }

    // Step 3: 新密码不能与旧密码相同
    const same = await bcrypt.compare(newPassword, user.password);
    if (same) {
      return res.status(400).json({ error: '新密码不能与当前密码相同' });
    }

    // Step 4: 更新密码 + tokenVersion +1 (旧 access token 立即失效)
    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, tokenVersion: { increment: 1 } },
    });

    // Step 5: 作废该用户所有 refresh token (强制重新登录)
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });

    res.json({ message: '密码修改成功，请重新登录' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ============================================================
// 忘记密码 / 重置密码 (原有逻辑保留)
// ============================================================
export async function forgotPassword(req, res) {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: '该邮箱未注册' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpires: expires },
    });

    res.json({ message: '重置链接已发送到您的邮箱', resetToken: token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function resetPassword(req, res) {
  try {
    const { email, token, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (!user.resetToken || user.resetToken !== token) return res.status(400).json({ error: '验证码无效' });
    if (!user.resetTokenExpires || user.resetTokenExpires < new Date()) return res.status(400).json({ error: '验证码已过期' });

    // 校验新密码强度
    const pwdErrors = validatePassword(password, email);
    if (pwdErrors.length > 0) {
      return res.status(400).json({ error: pwdErrors.join('; ') });
    }

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpires: null },
    });

    // 作废所有 refresh token
    await prisma.refreshToken.deleteMany({ where: { userId: user.id } });

    res.json({ message: '密码重置成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ============================================================
// 其他: 更新资料 / 获取用户 / 获取当前用户
// ============================================================
export async function updateProfile(req, res) {
  try {
    const allowed = ['name', 'phone', 'bio', 'experience', 'skills', 'address', 'latitude', 'longitude', 'avatar', 'gender', 'age', 'serviceArea', 'serviceTags', 'holidayPrice', 'distancePrice', 'certificates', 'maxDistance', 'acceptUrgent', 'acceptNight', 'receiveEnabled'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, name: true, phone: true, roles: true, bio: true, experience: true, skills: true, address: true, avatar: true, gender: true, age: true, serviceArea: true, serviceTags: true, holidayPrice: true, distancePrice: true, certificates: true, maxDistance: true, acceptUrgent: true, acceptNight: true, receiveEnabled: true, walletBalance: true, frozenAmount: true, totalServices: true, totalHours: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getUserProfile(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: +req.params.id },
      select: { id: true, name: true, avatar: true, bio: true, experience: true, skills: true, rating: true, address: true, roles: true, phone: true, gender: true, age: true, serviceArea: true, serviceTags: true, holidayPrice: true, distancePrice: true, certificates: true, totalServices: true, totalHours: true, maxDistance: true, acceptUrgent: true, acceptNight: true, receiveEnabled: true, walletBalance: true, frozenAmount: true },
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    const reviews = await prisma.review.findMany({
      where: { revieweeId: +req.params.id },
      include: { reviewer: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    });
    res.json({ ...user, reviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, phone: true, roles: true, avatar: true, address: true, latitude: true, longitude: true, gender: true, age: true, serviceArea: true, serviceTags: true, bio: true, experience: true, skills: true, rating: true, holidayPrice: true, distancePrice: true, certificates: true, maxDistance: true, acceptUrgent: true, acceptNight: true, receiveEnabled: true, walletBalance: true, frozenAmount: true, totalServices: true, totalHours: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
