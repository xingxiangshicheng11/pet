import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const sitters = await prisma.user.findMany({ where: { roles: { contains: 'SITTER' } } });

if (sitters.length > 0) {
  const products = [
    { title: '专业遛狗服务', description: '专业遛狗师，每次30分钟，确保您的狗狗得到充足运动', category: 'walking', price: 49, duration: 30, sitterId: sitters[0].id },
    { title: '宠物陪伴照顾', description: '上门陪伴宠物，喂食、玩耍、清理，让您的宠物不孤单', category: 'sitting', price: 99, duration: 120, sitterId: sitters[0].id },
    { title: '宠物美容护理', description: '洗澡、修剪、清洁耳朵，让宠物焕然一新', category: 'grooming', price: 159, duration: 60, sitterId: sitters[0].id },
  ];
  if (sitters[1]) {
    products.push(
      { title: '狗狗训练课程', description: '基础服从训练、社交训练，让您的狗狗更听话', category: 'training', price: 199, duration: 60, sitterId: sitters[1].id },
      { title: '上门喂猫服务', description: '专业上门喂猫，包括喂食、换水、清理猫砂', category: 'feeding', price: 59, duration: 30, sitterId: sitters[1].id },
    );
  }
  for (const p of products) {
    const existing = await prisma.serviceProduct.findFirst({ where: { title: p.title, sitterId: p.sitterId } });
    if (!existing) {
      await prisma.serviceProduct.create({ data: p });
    }
  }
  console.log('Seeded ' + products.length + ' service products');
} else {
  console.log('No sitters found, skipping product seed');
}

await prisma.$disconnect();
