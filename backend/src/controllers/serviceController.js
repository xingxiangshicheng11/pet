import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function createService(req, res) {
  try {
    const data = { ...req.body, ownerId: req.user.id, status: "OPEN" };
    const service = await prisma.serviceListing.create({ data, include: { owner: { select: { id: true, name: true } }, pet: true } });
    const io = req.app.get("io");
    io.to("sitters").emit("service:new", service);
    io.to("admin").emit("admin:alert", { type: "service_new", service });
    res.status(201).json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listServices(req, res) {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.ownerId) {
      where.ownerId = +req.query.ownerId;
    } else {
      const userRoles = (req.user.roles || '').split(',');
      if (userRoles.includes('OWNER') && !userRoles.includes('SITTER') && !req.query.all) {
        where.ownerId = req.user.id;
      } else if (userRoles.includes('SITTER') && !userRoles.includes('OWNER') && !req.query.all) {
        where.status = 'OPEN';
      }
    }
    const services = await prisma.serviceListing.findMany({
      where, include: { owner: { select: { id: true, name: true, avatar: true } }, pet: true, sitter: { select: { id: true, name: true } }, reviews: { include: { reviewer: { select: { id: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getService(req, res) {
  try {
    const service = await prisma.serviceListing.findUnique({
      where: { id: +req.params.id },
      include: { owner: { select: { id: true, name: true, avatar: true, phone: true, bio: true } }, pet: true, sitter: { select: { id: true, name: true, avatar: true, phone: true, bio: true } }, reviews: { include: { reviewer: { select: { id: true, name: true } } } } },
    });
    if (!service) return res.status(404).json({ error: "Service not found" });
    res.json(service);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function acceptService(req, res) {
  try {
    const result = await prisma.serviceListing.updateMany({
      where: { id: +req.params.id, status: "OPEN" },
      data: { sitterId: req.user.id, status: "ACCEPTED" },
    });
    if (result.count === 0) {
      return res.status(400).json({ error: "Service is not available" });
    }
    const updated = await prisma.serviceListing.findUnique({
      where: { id: +req.params.id },
      include: { owner: { select: { id: true, name: true } }, pet: true, sitter: { select: { id: true, name: true } } },
    });
    const io = req.app.get("io");
    io.to(`user:${updated.ownerId}`).emit("service:accepted", updated);
    io.to("admin").emit("admin:alert", { type: "service_accepted", service: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateService(req, res) {
  try {
    const service = await prisma.serviceListing.findUnique({ where: { id: +req.params.id } });
    if (!service) return res.status(404).json({ error: "Service not found" });
    if (service.ownerId !== req.user.id) return res.status(403).json({ error: "Not your service" });
    if (service.status !== 'OPEN') return res.status(400).json({ error: "Can only edit OPEN services" });
    const { title, description, category, price, scheduledStart, scheduledEnd, address, latitude, longitude, petId, isUrgent, extraTip } = req.body;
    const data = {};
    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (category !== undefined) data.category = category;
    if (price !== undefined) data.price = price;
    if (scheduledStart !== undefined) data.scheduledStart = scheduledStart;
    if (scheduledEnd !== undefined) data.scheduledEnd = scheduledEnd;
    if (address !== undefined) data.address = address;
    if (latitude !== undefined) data.latitude = latitude;
    if (longitude !== undefined) data.longitude = longitude;
    if (petId !== undefined) data.petId = petId;
    if (isUrgent !== undefined) data.isUrgent = isUrgent;
    if (extraTip !== undefined) data.extraTip = extraTip;
    const updated = await prisma.serviceListing.update({
      where: { id: +req.params.id },
      data,
      include: { owner: { select: { id: true, name: true } }, pet: true, sitter: { select: { id: true, name: true } } },
    });
    const io = req.app.get("io");
    io.to("sitters").emit("service:new", updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function nearbyServices(req, res) {
  try {
    const { lat, lng, radius } = req.query;
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchRadius = parseFloat(radius) || 50;

    if (!lat || !lng || isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({ error: "lat and lng query params required" });
    }

    const rows = await prisma.$queryRawUnsafe(`
      SELECT id, distance FROM (
        SELECT id,
          ROUND((6371 * acos(
            cos(radians($1)) * cos(radians(latitude)) *
            cos(radians(longitude) - radians($2)) +
            sin(radians($1)) * sin(radians(latitude))
          ))::numeric, 2)::float AS distance
        FROM "ServiceListing"
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND status = 'OPEN'
      ) sub
      WHERE sub.distance < $3
      ORDER BY sub.distance
    `, userLat, userLng, searchRadius);

    if (!rows || rows.length === 0) return res.json([]);

    const ids = rows.map(r => r.id);
    const distMap = {};
    for (const r of rows) distMap[r.id] = r.distance;

    const services = await prisma.serviceListing.findMany({
      where: { id: { in: ids } },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        pet: true,
        sitter: { select: { id: true, name: true } },
      },
    });

    const result = services
      .map(s => ({ ...s, distance: distMap[s.id] }))
      .sort((a, b) => (distMap[a.id] || 0) - (distMap[b.id] || 0));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updateServiceStatus(req, res) {
  try {
    const { status } = req.body;
    const service = await prisma.serviceListing.findUnique({ where: { id: +req.params.id } });
    if (!service) return res.status(404).json({ error: "Service not found" });
    const userRoles = (req.user.roles || '').split(',');
    const isAdmin = userRoles.includes('ADMIN');
    const isOwner = service.ownerId === req.user.id;
    const isSitter = service.sitterId === req.user.id;
    if (!isAdmin && !isOwner && !isSitter) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const valid = ["OPEN", "ACCEPTED", "IN_PROGRESS", "WAITING_PAYMENT", "COMPLETED", "CANCELLED"];
    if (!valid.includes(status)) return res.status(400).json({ error: "Invalid status" });
    if (status === 'IN_PROGRESS' && service.status !== 'ACCEPTED') return res.status(400).json({ error: "Must be ACCEPTED first" });
    if (status === 'WAITING_PAYMENT' && service.status !== 'IN_PROGRESS') return res.status(400).json({ error: "Must be IN_PROGRESS first" });
    const updated = await prisma.serviceListing.update({
      where: { id: +req.params.id },
      data: { status },
      include: { owner: { select: { id: true, name: true } }, pet: true, sitter: { select: { id: true, name: true } }, reviews: { include: { reviewer: { select: { id: true, name: true } } } } },
    });
    const io = req.app.get("io");
    io.to(`user:${service.ownerId}`).emit("service:status", updated);
    if (service.sitterId) io.to(`user:${service.sitterId}`).emit("service:status", updated);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
