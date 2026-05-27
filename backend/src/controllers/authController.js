import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import config from '../config/index.js';

const prisma = new PrismaClient();
const ADMIN_SECRET = 'zcc123456';

function makeToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, roles: user.roles },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
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

export async function register(req, res) {
  try {
    const { email, password, name, phone, roles, adminCode } = req.body;
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(400).json({ error: 'Email already registered' });

    let finalRoles = 'OWNER';
    if (roles) {
      finalRoles = Array.isArray(roles) ? roles.join(',') : roles;
    }
    if (adminCode) {
      if (adminCode !== ADMIN_SECRET) return res.status(403).json({ error: '管理员注册码错误' });
      finalRoles = finalRoles ? finalRoles + ',ADMIN' : 'ADMIN';
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name, phone, roles: finalRoles },
    });

    const token = makeToken(user);
    res.status(201).json({ token, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = makeToken(user);
    res.json({ token, user: userResponse(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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

    // In production, send email. For demo, return token directly.
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

    const hashed = await bcrypt.hash(password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpires: null },
    });

    res.json({ message: '密码重置成功' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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
