import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createReview(req, res) {
  try {
    const { rating, comment, orderId, revieweeId } = req.body;
    const service = await prisma.serviceListing.findUnique({ where: { id: orderId } });
    if (!service) return res.status(404).json({ error: "Service not found" });
    if (service.status !== "COMPLETED") return res.status(400).json({ error: "Service not completed" });
    if (req.user.id !== service.ownerId && req.user.id !== service.sitterId) {
      return res.status(403).json({ error: "Not part of this service" });
    }
    const existing = await prisma.review.findUnique({ where: { orderId_reviewerId: { orderId, reviewerId: req.user.id } } });
    if (existing) return res.status(400).json({ error: "Already reviewed" });

    const review = await prisma.review.create({
      data: { rating, comment, orderId, reviewerId: req.user.id, revieweeId },
    });
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getReviews(req, res) {
  try {
    const { userId } = req.params;
    const reviews = await prisma.review.findMany({
      where: { revieweeId: +userId },
      include: { reviewer: { select: { id: true, name: true } }, order: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
