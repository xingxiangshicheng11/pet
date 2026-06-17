import prisma from '../utils/prisma.js';

export async function createPet(req, res) {
  try {
    const data = { ...req.body, ownerId: req.user.id };
    const pet = await prisma.pet.create({ data });
    res.status(201).json(pet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMyPets(req, res) {
  try {
    const pets = await prisma.pet.findMany({ where: { ownerId: req.user.id } });
    res.json(pets);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getPet(req, res) {
  try {
    const pet = await prisma.pet.findUnique({ where: { id: +req.params.id } });
    if (!pet) return res.status(404).json({ error: "Pet not found" });
    if (pet.ownerId !== req.user.id && !(req.user.roles || '').split(',').includes('ADMIN')) {
      return res.status(403).json({ error: "Forbidden" });
    }
    res.json(pet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function updatePet(req, res) {
  try {
    const pet = await prisma.pet.findUnique({ where: { id: +req.params.id } });
    if (!pet) return res.status(404).json({ error: "Pet not found" });
    if (pet.ownerId !== req.user.id) return res.status(403).json({ error: "Forbidden" });
    const updated = await prisma.pet.update({ where: { id: +req.params.id }, data: req.body });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function deletePet(req, res) {
  try {
    const pet = await prisma.pet.findUnique({ where: { id: +req.params.id } });
    if (!pet) return res.status(404).json({ error: "Pet not found" });
    if (pet.ownerId !== req.user.id && !(req.user.roles || '').split(',').includes('ADMIN')) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await prisma.pet.delete({ where: { id: +req.params.id } });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
