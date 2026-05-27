import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createProduct(req, res) {
  try {
    const data = { ...req.body, sitterId: req.user.id };
    const product = await prisma.serviceProduct.create({
      data,
      include: { sitter: { select: { id: true, name: true, avatar: true } } },
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listProducts(req, res) {
  try {
    const where = {};
    if (req.query.all !== 'true') where.isActive = true;
    if (req.query.sitterId) where.sitterId = +req.query.sitterId;
    if (req.query.category) where.category = req.query.category;
    const products = await prisma.serviceProduct.findMany({
      where,
      include: {
        sitter: { select: { id: true, name: true, avatar: true } },
        _count: { select: { orders: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getProduct(req, res) {
  try {
    const product = await prisma.serviceProduct.findUnique({
      where: { id: +req.params.id },
      include: { sitter: { select: { id: true, name: true, avatar: true, phone: true } } },
    });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const product = await prisma.serviceProduct.findUnique({ where: { id: +req.params.id } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.sitterId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    const updated = await prisma.serviceProduct.update({
      where: { id: +req.params.id },
      data: req.body,
    });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const product = await prisma.serviceProduct.findUnique({ where: { id: +req.params.id } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (product.sitterId !== req.user.id && !(req.user.roles || '').split(',').includes('ADMIN')) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await prisma.serviceProduct.delete({ where: { id: +req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function buyProduct(req, res) {
  try {
    const { productId, message, scheduledTime, address } = req.body;
    const product = await prisma.serviceProduct.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: "Product not found" });
    if (!product.isActive) return res.status(400).json({ error: "Product is not available" });
    if (product.sitterId === req.user.id) return res.status(400).json({ error: "Cannot buy your own product" });

    const order = await prisma.productOrder.create({
      data: {
        productId,
        buyerId: req.user.id,
        message,
        scheduledTime: scheduledTime ? new Date(scheduledTime) : null,
        address,
        status: "PENDING",
      },
      include: {
        product: { include: { sitter: { select: { id: true, name: true, avatar: true } } } },
        buyer: { select: { id: true, name: true, avatar: true } },
      },
    });

    const io = req.app.get("io");
    io.to("user:" + product.sitterId).emit("product:ordered", order);
    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listMyOrders(req, res) {
  try {
    const orders = await prisma.productOrder.findMany({
      where: {
        OR: [{ buyerId: req.user.id }, { product: { sitterId: req.user.id } }],
      },
      include: {
        product: {
          include: { sitter: { select: { id: true, name: true, avatar: true } } },
        },
        buyer: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateOrderStatus(req, res) {
  try {
    const order = await prisma.productOrder.findUnique({ where: { id: +req.params.id } });
    if (!order) return res.status(404).json({ error: "Order not found" });
    const product = await prisma.serviceProduct.findUnique({ where: { id: order.productId } });
    if (req.user.id !== product.sitterId) return res.status(403).json({ error: "Forbidden" });

    const updated = await prisma.productOrder.update({
      where: { id: +req.params.id },
      data: { status: req.body.status },
      include: {
        product: true,
        buyer: { select: { id: true, name: true } },
      },
    });

    const io = req.app.get("io");
    io.to("user:" + order.buyerId).emit("order:status", updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
