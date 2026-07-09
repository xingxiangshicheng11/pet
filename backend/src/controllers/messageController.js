import prisma from '../utils/prisma.js';

export async function sendMessage(req, res) {
  try {
    const { content, orderId, productOrderId, receiverId } = req.body;

    if (orderId) {
      const service = await prisma.serviceListing.findUnique({ where: { id: orderId } });
      if (!service) return res.status(404).json({ error: "Service not found" });
      if (req.user.id !== service.ownerId && req.user.id !== service.sitterId) {
        return res.status(403).json({ error: "Not part of this service" });
      }
    } else if (productOrderId) {
      const po = await prisma.productOrder.findUnique({ where: { id: productOrderId }, include: { product: { select: { sitterId: true } } } });
      if (!po) return res.status(404).json({ error: "Order not found" });
      if (req.user.id !== po.buyerId && req.user.id !== po.product.sitterId) {
        return res.status(403).json({ error: "Not part of this order" });
      }
    } else {
      return res.status(400).json({ error: "orderId or productOrderId required" });
    }

    const message = await prisma.message.create({
      data: { content, orderId, productOrderId, senderId: req.user.id, receiverId },
      include: { sender: { select: { id: true, name: true } } },
    });

    const io = req.app.get("io");
    io.to("user:" + receiverId).emit("message:new", message);
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMessages(req, res) {
  try {
    const orderId = req.params.orderId;
    const productOrderId = req.query.productOrderId ? +req.query.productOrderId : null;
    const page = Math.max(1, +req.query.page || 1);
    const limit = Math.min(100, Math.max(1, +req.query.limit || 50));
    const skip = (page - 1) * limit;

    if (orderId && orderId !== '0') {
      const service = await prisma.serviceListing.findUnique({ where: { id: +orderId } });
      if (!service) return res.status(404).json({ error: "Service not found" });
      if (req.user.id !== service.ownerId && req.user.id !== service.sitterId && !(req.user.roles || '').split(',').includes('ADMIN')) {
        return res.status(403).json({ error: "Forbidden" });
      }
    }

    const where = productOrderId ? { productOrderId } : { orderId: +req.params.orderId };
    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: { sender: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip,
      }),
      prisma.message.count({ where }),
    ]);
    res.json({ messages: messages.reverse(), total, page, limit, hasMore: skip + limit < total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
