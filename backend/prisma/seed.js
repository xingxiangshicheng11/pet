import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const sitterPassword = await bcrypt.hash('sitter123', 10);
  const ownerPassword = await bcrypt.hash('owner123', 10);

  await prisma.user.createMany({
    data: [
      { email: 'admin@pet.com', password: adminPassword, name: 'Admin', roles: 'ADMIN' },
      { email: 'sitter@pet.com', password: sitterPassword, name: 'Zhang San', roles: 'SITTER' },
      { email: 'owner@pet.com', password: ownerPassword, name: 'Li Si', roles: 'OWNER' },
    ],
    skipDuplicates: true,
  });

  console.log('Seed data created');
}

main().catch(console.error).finally(() => prisma.$disconnect());
