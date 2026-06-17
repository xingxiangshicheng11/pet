import prisma from '../utils/prisma.js';

export async function getOwnerNotifications(req, res) {
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

export async function markOwnerNotificationRead(req, res) {
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

export async function createOwnerEmergency(req, res) {
  try {
    const { serviceId, type, description, photos } = req.body;
    const alert = await prisma.emergencyAlert.create({
      data: { userId: req.user.id, serviceId: serviceId ? +serviceId : null, type, description, photos },
    });
    const io = req.app.get('io');
    io.to('admin').emit('admin:alert', { type: 'emergency', alert });
    if (serviceId) {
      const service = await prisma.serviceListing.findUnique({ where: { id: +serviceId } });
      if (service?.sitterId) {
        io.to('user:' + service.sitterId).emit('notification', {
          title: '紧急求助',
          content: description || '宠物主发起了紧急求助',
        });
      }
    }
    res.json(alert);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPaymentHistory(req, res) {
  try {
    const services = await prisma.serviceListing.findMany({
      where: { ownerId: req.user.id, status: { in: ['COMPLETED', 'WAITING_PAYMENT'] } },
      include: { payments: true, sitter: { select: { id: true, name: true } }, pet: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    const payments = services.flatMap(s =>
      s.payments.map(p => ({
        id: p.id,
        serviceId: s.id,
        serviceTitle: s.title,
        sitterName: s.sitter?.name,
        petName: s.pet?.name,
        amount: p.amount,
        method: p.method,
        status: p.status,
        paidAt: p.paidAt,
        createdAt: p.createdAt,
      }))
    );
    res.json(payments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
