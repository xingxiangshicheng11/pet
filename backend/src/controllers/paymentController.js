import bcrypt from 'bcryptjs';
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createPayment(req, res) {
  try {
    const { orderId, amount, method, password } = req.body;
    if (!password) return res.status(400).json({ error: '请验证当前密码' });

    // Step-up：验证当前密码
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(403).json({ error: '密码错误，无法完成支付' });

    const result = await prisma.$transaction(async (tx) => {
      const service = await tx.serviceListing.findUnique({ where: { id: orderId } });
      if (!service) throw new Error('Service not found');
      if (req.user.id !== service.ownerId) throw new Error('Only owner can pay');

      const r = await tx.serviceListing.updateMany({
        where: { id: orderId, status: 'WAITING_PAYMENT' },
        data: { status: 'COMPLETED' },
      });
      if (r.count === 0) throw new Error('Service is not waiting for payment');

      const payment = await tx.payment.create({
        data: {
          orderId, amount, method,
          status: 'COMPLETED',
          transactionId: 'TXN' + Date.now(),
          paidAt: new Date(),
        },
      });

      return { payment, ownerId: service.ownerId, sitterId: service.sitterId };
    });

    const io = req.app.get('io');
    io.to(`user:${result.ownerId}`).emit('service:status', { id: orderId, status: 'COMPLETED' });
    if (result.sitterId) io.to(`user:${result.sitterId}`).emit('service:status', { id: orderId, status: 'COMPLETED' });

    res.status(201).json({ payment: result.payment, service: { id: orderId, status: 'COMPLETED' } });
  } catch (err) {
    if (err.message === 'Service not found') return res.status(404).json({ error: err.message });
    if (err.message === 'Only owner can pay') return res.status(403).json({ error: err.message });
    if (err.message === 'Service is not waiting for payment') return res.status(400).json({ error: err.message });
    res.status(500).json({ error: err.message });
  }
}
