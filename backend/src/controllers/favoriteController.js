import prisma from '../utils/prisma.js';

export async function addFavorite(req, res) {
  try {
    const { sitterId } = req.body;
    if (!sitterId) return res.status(400).json({ error: 'sitterId required' });
    const existing = await prisma.favoriteSitter.findUnique({
      where: { ownerId_sitterId: { ownerId: req.user.id, sitterId: +sitterId } },
    });
    if (existing) return res.status(400).json({ error: 'Already favorited' });
    const fav = await prisma.favoriteSitter.create({
      data: { ownerId: req.user.id, sitterId: +sitterId },
      include: { sitter: { select: { id: true, name: true, avatar: true, rating: true, bio: true } } },
    });
    res.json(fav);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function removeFavorite(req, res) {
  try {
    await prisma.favoriteSitter.deleteMany({
      where: { id: +req.params.id, ownerId: req.user.id },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function listFavorites(req, res) {
  try {
    const favs = await prisma.favoriteSitter.findMany({
      where: { ownerId: req.user.id },
      include: {
        sitter: {
          select: { id: true, name: true, avatar: true, rating: true, bio: true, totalServices: true, experience: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(favs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
