import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, phone: true, roles: true, isActive: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function toggleUserStatus(req, res) {
  try {
    const { isActive } = req.body;
    const user = await prisma.user.update({
      where: { id: +req.params.id },
      data: { isActive },
      select: { id: true, email: true, name: true, roles: true, isActive: true },
    });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
