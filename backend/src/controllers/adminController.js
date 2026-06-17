import prisma from '../utils/prisma.js';

async function log(adminId, action, targetType, targetId, detail) {
  await prisma.adminLog.create({ data: { adminId, action, targetType, targetId, detail } });
}

// ─── Users ────────────────────────────────────────────
export async function getUsers(req, res) {
  try {
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, Math.max(1, +req.query.limit || 20));
    const skip = (page - 1) * limit;
    const { search, role, status } = req.query;

    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) where.roles = { contains: role };
    if (status === 'active') where.isActive = true;
    if (status === 'disabled') where.isActive = false;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, phone: true, roles: true, isActive: true, createdAt: true, rating: true },
        orderBy: { createdAt: 'desc' },
        skip, take: limit,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ users, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getUserDetail(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: +req.params.id },
      select: {
        id: true, email: true, name: true, phone: true, roles: true, isActive: true, bio: true, avatar: true,
        address: true, rating: true, walletBalance: true, frozenAmount: true, totalServices: true, totalHours: true,
        createdAt: true, experience: true, skills: true, gender: true, age: true, serviceArea: true,
      },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const [pets, services, reviews, payments] = await Promise.all([
      prisma.pet.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: 'desc' } }),
      prisma.serviceListing.findMany({
        where: { OR: [{ ownerId: user.id }, { sitterId: user.id }] },
        include: { pet: { select: { name: true } }, owner: { select: { name: true } }, sitter: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, take: 20,
      }),
      prisma.review.findMany({ where: { OR: [{ reviewerId: user.id }, { revieweeId: user.id }] }, take: 20, orderBy: { createdAt: 'desc' } }),
      prisma.payment.findMany({ where: { order: { ownerId: user.id } }, take: 20, orderBy: { createdAt: 'desc' } }),
    ]);
    res.json({ ...user, pets, services, reviews, payments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateUser(req, res) {
  try {
    const allowed = ['name', 'phone', 'roles', 'isActive', 'bio', 'address'];
    const data = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    const user = await prisma.user.update({
      where: { id: +req.params.id },
      data,
      select: { id: true, email: true, name: true, phone: true, roles: true, isActive: true },
    });
    await log(req.user.id, 'update_user', 'User', user.id, 'Updated fields: ' + Object.keys(data).join(', '));
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Services ─────────────────────────────────────────
export async function getAdminServices(req, res) {
  try {
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, Math.max(1, +req.query.limit || 20));
    const skip = (page - 1) * limit;
    const { status, category, search } = req.query;
    const where = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (search) where.OR = [{ title: { contains: search, mode: 'insensitive' } }];
    const [services, total] = await Promise.all([
      prisma.serviceListing.findMany({
        where,
        include: { owner: { select: { id: true, name: true } }, sitter: { select: { id: true, name: true } }, pet: { select: { name: true, species: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.serviceListing.count({ where }),
    ]);
    res.json({ services, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAdminServiceDetail(req, res) {
  try {
    const service = await prisma.serviceListing.findUnique({
      where: { id: +req.params.id },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
        sitter: { select: { id: true, name: true, phone: true } },
        pet: true,
        messages: { include: { sender: { select: { name: true } } }, orderBy: { createdAt: 'asc' }, take: 50 },
        payments: true,
        reviews: true,
        photos: true,
      },
    });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adminUpdateServiceStatus(req, res) {
  try {
    const { status } = req.body;
    const valid = ['OPEN', 'ACCEPTED', 'IN_PROGRESS', 'WAITING_PAYMENT', 'COMPLETED', 'CANCELLED'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const service = await prisma.serviceListing.findUnique({ where: { id: +req.params.id } });
    if (!service) return res.status(404).json({ error: 'Service not found' });
    const updated = await prisma.serviceListing.update({
      where: { id: +req.params.id },
      data: { status },
      include: { owner: { select: { name: true } }, sitter: { select: { name: true } }, pet: { select: { name: true } } },
    });
    const io = req.app.get('io');
    io.to('user:' + service.ownerId).emit('service:status', updated);
    if (service.sitterId) io.to('user:' + service.sitterId).emit('service:status', updated);
    await log(req.user.id, 'update_service_status', 'ServiceListing', service.id, 'Status: ' + service.status + ' -> ' + status);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adminAssignSitter(req, res) {
  try {
    const { sitterId } = req.body;
    if (!sitterId) return res.status(400).json({ error: 'sitterId required' });
    const sitter = await prisma.user.findUnique({ where: { id: +sitterId } });
    if (!sitter || !sitter.roles.includes('SITTER')) return res.status(400).json({ error: 'Invalid sitter' });
    const result = await prisma.serviceListing.updateMany({
      where: { id: +req.params.id, status: 'OPEN' },
      data: { sitterId: +sitterId, status: 'ACCEPTED' },
    });
    if (result.count === 0) {
      return res.status(400).json({ error: 'Service is not OPEN' });
    }
    const updated = await prisma.serviceListing.findUnique({
      where: { id: +req.params.id },
      include: { owner: { select: { name: true } }, sitter: { select: { name: true } } },
    });
    const io = req.app.get('io');
    io.to('user:' + updated.ownerId).emit('service:accepted', updated);
    io.to('user:' + sitterId).emit('service:accepted', updated);
    await log(req.user.id, 'assign_sitter', 'ServiceListing', updated.id, 'Assigned sitter: ' + sitter.name);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Stats ────────────────────────────────────────────
export async function getAdminStats(req, res) {
  try {
    const [users, services, payments, withdrawals] = await Promise.all([
      prisma.user.findMany({ select: { roles: true, createdAt: true } }),
      prisma.serviceListing.findMany({ select: { status: true, price: true, createdAt: true, updatedAt: true } }),
      prisma.payment.findMany({ where: { status: 'COMPLETED' }, select: { amount: true, paidAt: true } }),
      prisma.withdrawal.findMany({ where: { status: 'PENDING' }, select: { amount: true } }),
    ]);
    const roles = users.map(u => u.roles);
    const completed = services.filter(s => s.status === 'COMPLETED');
    const pendingWithdrawals = withdrawals.length;
    const pendingWithdrawalAmount = withdrawals.reduce((s, w) => s + w.amount, 0);
    res.json({
      totalUsers: users.length,
      totalOwners: roles.filter(r => r.includes('OWNER')).length,
      totalSitters: roles.filter(r => r.includes('SITTER')).length,
      totalAdmins: roles.filter(r => r.includes('ADMIN')).length,
      totalServices: services.length,
      completedServices: completed.length,
      activeServices: services.filter(s => ['OPEN', 'ACCEPTED', 'IN_PROGRESS'].includes(s.status)).length,
      cancelledServices: services.filter(s => s.status === 'CANCELLED').length,
      totalRevenue: completed.reduce((s, x) => s + x.price, 0),
      totalPayments: payments.length,
      totalPaymentAmount: payments.reduce((s, p) => s + p.amount, 0),
      pendingWithdrawals,
      pendingWithdrawalAmount,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAdminTrends(req, res) {
  try {
    const months = +req.query.months || 12;
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    const [services, payments] = await Promise.all([
      prisma.serviceListing.findMany({ where: { createdAt: { gte: startDate } }, select: { price: true, status: true, createdAt: true } }),
      prisma.payment.findMany({ where: { status: 'COMPLETED', paidAt: { gte: startDate } }, select: { amount: true, paidAt: true } }),
    ]);
    const monthlyData = {};
    const now = new Date();
    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      monthlyData[key] = { month: key, services: 0, completed: 0, revenue: 0, payments: 0 };
    }
    services.forEach(s => {
      const d = new Date(s.createdAt);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (monthlyData[key]) {
        monthlyData[key].services++;
        if (s.status === 'COMPLETED') monthlyData[key].completed++;
      }
    });
    payments.forEach(p => {
      if (!p.paidAt) return;
      const d = new Date(p.paidAt);
      const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (monthlyData[key]) {
        monthlyData[key].payments += p.amount;
        monthlyData[key].revenue += p.amount;
      }
    });
    res.json(Object.values(monthlyData).reverse());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getAdminCategoryStats(req, res) {
  try {
    const services = await prisma.serviceListing.findMany({
      where: { status: 'COMPLETED' },
      select: { category: true, price: true },
    });
    const catData = {};
    services.forEach(s => {
      if (!catData[s.category]) catData[s.category] = { count: 0, revenue: 0 };
      catData[s.category].count++;
      catData[s.category].revenue += s.price;
    });
    res.json(catData);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Withdrawals ──────────────────────────────────────
export async function getAdminWithdrawals(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const withdrawals = await prisma.withdrawal.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true } }, reviewer: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(withdrawals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adminReviewWithdrawal(req, res) {
  try {
    const { action, rejectReason } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
    if (action === 'REJECTED' && !rejectReason) return res.status(400).json({ error: 'Reject reason required' });
    const result = await prisma.$transaction(async (tx) => {
      const r = await tx.withdrawal.updateMany({
        where: { id: +req.params.id, status: 'PENDING' },
        data: { status: action, reviewedBy: req.user.id, reviewedAt: new Date(), ...(action === 'REJECTED' ? { rejectReason } : {}) },
      });
      if (r.count === 0) {
        const exists = await tx.withdrawal.findUnique({ where: { id: +req.params.id }, select: { id: true } });
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
    await log(req.user.id, action === 'APPROVED' ? 'approve_withdrawal' : 'reject_withdrawal', 'Withdrawal', result.id, 'Amount: ' + result.amount);
    res.json(result);
  } catch (err) {
    if (err.message === 'Withdrawal not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Already processed') return res.status(400).json({ error: err.message });
    if (err.message === 'Reject reason required') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
}

// ─── Emergencies ──────────────────────────────────────
export async function getAdminEmergencies(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const emergencies = await prisma.emergencyAlert.findMany({
      where,
      include: { user: { select: { id: true, name: true, phone: true } }, handler: { select: { name: true } }, service: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(emergencies);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adminHandleEmergency(req, res) {
  try {
    const { handlingNote, status } = req.body;
    const valid = ['PENDING', 'RESOLVED', 'DISMISSED'];
    if (status && !valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const data = { handledBy: req.user.id, handledAt: new Date(), status: status || 'RESOLVED' };
    if (handlingNote) data.handlingNote = handlingNote;
    const result = await prisma.emergencyAlert.updateMany({
      where: { id: +req.params.id, status: 'PENDING' },
      data,
    });
    if (result.count === 0) {
      return res.status(400).json({ error: 'Emergency already handled or not found' });
    }
    const updated = await prisma.emergencyAlert.findUnique({ where: { id: +req.params.id } });
    await log(req.user.id, 'handle_emergency', 'EmergencyAlert', updated.id, 'Status: ' + updated.status);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Reviews ──────────────────────────────────────────
export async function getAdminReviews(req, res) {
  try {
    const { rating } = req.query;
    const where = {};
    if (rating) where.rating = +rating;
    const reviews = await prisma.review.findMany({
      where,
      include: { reviewer: { select: { name: true } }, reviewee: { select: { name: true } }, order: { select: { id: true, title: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adminDeleteReview(req, res) {
  try {
    const review = await prisma.review.findUnique({ where: { id: +req.params.id } });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    await prisma.review.delete({ where: { id: +req.params.id } });
    await log(req.user.id, 'delete_review', 'Review', review.id, 'Rating: ' + review.rating);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Payments ─────────────────────────────────────────
export async function getAdminPayments(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const payments = await prisma.payment.findMany({
      where,
      include: { order: { select: { id: true, title: true, owner: { select: { name: true } }, sitter: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adminRefundPayment(req, res) {
  try {
    const payment = await prisma.payment.findUnique({ where: { id: +req.params.id }, include: { order: true } });
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    if (payment.status !== 'COMPLETED') return res.status(400).json({ error: 'Payment is not completed' });
    await prisma.payment.update({ where: { id: +req.params.id }, data: { status: 'REFUNDED' } });
    await prisma.serviceListing.update({ where: { id: payment.orderId }, data: { status: 'CANCELLED' } });
    await log(req.user.id, 'refund_payment', 'Payment', payment.id, 'Amount: ' + payment.amount);
    const io = req.app.get('io');
    io.to('user:' + payment.order.ownerId).emit('service:status', { id: payment.orderId, status: 'CANCELLED' });
    if (payment.order.sitterId) io.to('user:' + payment.order.sitterId).emit('service:status', { id: payment.orderId, status: 'CANCELLED' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Products ─────────────────────────────────────────
export async function getAdminProducts(req, res) {
  try {
    const { isActive, category } = req.query;
    const where = {};
    if (isActive !== undefined) where.isActive = isActive === 'true';
    if (category) where.category = category;
    const products = await prisma.serviceProduct.findMany({
      where,
      include: { sitter: { select: { id: true, name: true, email: true } }, _count: { select: { orders: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function adminToggleProduct(req, res) {
  try {
    const { isActive } = req.body;
    const product = await prisma.serviceProduct.update({
      where: { id: +req.params.id },
      data: { isActive },
      include: { sitter: { select: { name: true } } },
    });
    await log(req.user.id, isActive ? 'enable_product' : 'disable_product', 'ServiceProduct', product.id, product.title);
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Notifications ────────────────────────────────────
export async function sendSystemNotification(req, res) {
  try {
    const { title, content, targetRole } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const notif = await prisma.systemNotification.create({
      data: { title, content, targetRole, sentBy: req.user.id },
    });
    const io = req.app.get('io');
    if (targetRole) {
      io.to(targetRole.toLowerCase() + 's').emit('notification', { title, content, type: 'system' });
    } else {
      io.emit('notification', { title, content, type: 'system' });
    }
    if (targetRole) {
      const users = await prisma.user.findMany({ where: { roles: { contains: targetRole } } });
      await prisma.notification.createMany({
        data: users.map(u => ({ userId: u.id, type: 'system', title, content })),
      });
    }
    await log(req.user.id, 'send_notification', 'SystemNotification', notif.id, 'Target: ' + (targetRole || 'all'));
    res.json(notif);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getSystemNotifications(req, res) {
  try {
    const notifs = await prisma.systemNotification.findMany({
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Config ───────────────────────────────────────────
export async function getPlatformConfig(req, res) {
  try {
    const configs = await prisma.platformConfig.findMany({ orderBy: { key: 'asc' } });
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updatePlatformConfig(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;
    const config = await prisma.platformConfig.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description },
    });
    await log(req.user.id, 'update_config', 'PlatformConfig', config.id, key + ' = ' + value);
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ─── Logs ─────────────────────────────────────────────
export async function getAdminLogs(req, res) {
  try {
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, Math.max(1, +req.query.limit || 30));
    const skip = (page - 1) * limit;
    const { action, targetType } = req.query;
    const where = {};
    if (action) where.action = action;
    if (targetType) where.targetType = targetType;
    const [logs, total] = await Promise.all([
      prisma.adminLog.findMany({
        where,
        include: { admin: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }, skip, take: limit,
      }),
      prisma.adminLog.count({ where }),
    ]);
    res.json({ logs, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
