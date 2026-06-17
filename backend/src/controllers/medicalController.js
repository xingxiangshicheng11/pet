import prisma from '../utils/prisma.js';

export async function addMedicalRecord(req, res) {
  try {
    const petId = +req.params.petId;
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    if (pet.ownerId !== req.user.id) return res.status(403).json({ error: 'Not your pet' });
    const { type, title, description, date, vetName, notes, attachment } = req.body;
    const record = await prisma.medicalRecord.create({
      data: { petId, type, title, description, date: new Date(date), vetName, notes, attachment },
    });
    res.json(record);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

export async function getMedicalRecords(req, res) {
  try {
    const petId = +req.params.petId;
    const pet = await prisma.pet.findUnique({ where: { id: petId } });
    if (!pet) return res.status(404).json({ error: 'Pet not found' });
    if (pet.ownerId !== req.user.id) return res.status(403).json({ error: 'Not your pet' });
    const records = await prisma.medicalRecord.findMany({
      where: { petId },
      orderBy: { date: 'desc' },
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
