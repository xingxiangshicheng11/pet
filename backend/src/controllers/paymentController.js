import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createPayment(req, res) {
  try {
    const { orderId, amount, method } = req.body;
    const service = await prisma.serviceListing.findUnique({ where: { id: orderId } });
    if (!service) return res.status(404).json({ error: "Service not found" });
    if (req.user.id !== service.ownerId) return res.status(403).json({ error: "Only owner can pay" });
    if (service.status !== "WAITING_PAYMENT") return res.status(400).json({ error: "Service is not waiting for payment" });

    const payment = await prisma.payment.create({
      data: {
        orderId, amount, method,
        status: "COMPLETED",
        transactionId: "TXN" + Date.now(),
        paidAt: new Date(),
      },
    });

    const updated = await prisma.serviceListing.update({
      where: { id: orderId },
      data: { status: "COMPLETED" },
      include: { owner: { select: { id: true, name: true } }, pet: true, sitter: { select: { id: true, name: true } } },
    });

    const io = req.app.get("io");
    io.to(`user:${service.ownerId}`).emit("service:status", updated);
    if (service.sitterId) io.to(`user:${service.sitterId}`).emit("service:status", updated);

    res.status(201).json({ payment, service: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
