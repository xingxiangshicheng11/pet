import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function getStats(req, res) {
  try {
    const uid = req.user.id;
    const services = await prisma.serviceListing.findMany({ where: { sitterId: uid } });
    const products = await prisma.serviceProduct.findMany({ where: { sitterId: uid } });
    const orders = await prisma.productOrder.findMany({ where: { product: { sitterId: uid } } });
    const completed = services.filter(s => s.status === 'COMPLETED');
    const active = services.filter(s => s.status === 'ACCEPTED' || s.status === 'IN_PROGRESS' || s.status === 'WAITING_PAYMENT');
    const revenue = completed.reduce((s, x) => s + x.price, 0);
    const todayRevenue = completed.filter(s => new Date(s.updatedAt).toDateString() === new Date().toDateString()).reduce((s, x) => s + x.price, 0);
    const monthRevenue = completed.filter(s => {
      const d = new Date(s.updatedAt);
      const n = new Date();
      return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
    }).reduce((s, x) => s + x.price, 0);
    const reviews = await prisma.review.findMany({ where: { revieweeId: uid } });
    const goodReviews = reviews.filter(r => r.rating >= 4).length;
    const totalOrders = services.length;
    const acceptedOrders = services.filter(s => s.status !== 'OPEN').length;
    res.json({
      pending: services.filter(s => s.status === 'OPEN').length,
      active: active.length,
      completed: completed.length,
      todayRevenue, monthRevenue, totalRevenue: revenue,
      goodRate: reviews.length > 0 ? (goodReviews / reviews.length * 100).toFixed(1) : 0,
      acceptRate: totalOrders > 0 ? (acceptedOrders / totalOrders * 100).toFixed(1) : 0,
      totalServices: uid,
      reviews: reviews.length,
      products: products.length,
      orders: orders.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function toggleReceive(req, res) {
  try {
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { receiveEnabled: req.body.receiveEnabled },
      select: { receiveEnabled: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getWallet(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { walletBalance: true, frozenAmount: true },
    });
    const services = await prisma.serviceListing.findMany({ where: { sitterId: req.user.id, status: 'COMPLETED' } });
    const totalRevenue = services.reduce((s, x) => s + x.price, 0);
    const withdrawals = await prisma.withdrawal.findMany({ where: { userId: req.user.id }, orderBy: { createdAt: 'desc' } });
    res.json({ ...user, totalRevenue, withdrawals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

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

export async function createEmergency(req, res) {
  try {
    const { serviceId, type, description, photos } = req.body;
    const alert = await prisma.emergencyAlert.create({ data: { userId: req.user.id, serviceId, type, description, photos } });
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getNotifications(req, res) {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function markNotificationRead(req, res) {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, id: { in: req.body.ids || [] } },
      data: { read: true },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getDataDashboard(req, res) {
  try {
    const uid = req.user.id;
    const services = await prisma.serviceListing.findMany({ where: { sitterId: uid }, orderBy: { updatedAt: 'desc' } });
    const completed = services.filter(s => s.status === 'COMPLETED');
    const monthlyData = {};
    completed.forEach(s => {
      const m = new Date(s.updatedAt).getFullYear() + '-' + String(new Date(s.updatedAt).getMonth() + 1).padStart(2, '0');
      if (!monthlyData[m]) monthlyData[m] = { count: 0, revenue: 0 };
      monthlyData[m].count++;
      monthlyData[m].revenue += s.price;
    });
    const categoryData = {};
    completed.forEach(s => {
      if (!categoryData[s.category]) categoryData[s.category] = { count: 0, revenue: 0 };
      categoryData[s.category].count++;
      categoryData[s.category].revenue += s.price;
    });
    const reviews = await prisma.review.findMany({ where: { revieweeId: uid } });
    const goodRate = reviews.length > 0 ? (reviews.filter(r => r.rating >= 4).length / reviews.length * 100).toFixed(1) : 0;
    res.json({ monthlyData, categoryData, totalCompleted: completed.length, totalRevenue: completed.reduce((s, x) => s + x.price, 0), goodRate, reviewCount: reviews.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
