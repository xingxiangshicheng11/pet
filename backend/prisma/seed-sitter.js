import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const s = await prisma.user.findFirst({ where: { roles: { contains: 'SITTER' } } });
if (s) {
  await prisma.user.update({
    where: { id: s.id },
    data: { bio: '热爱动物的专业宠物服务者，有3年宠物照顾经验，耐心细致，深受宠物主好评。', experience: '2023-2025 在宠享平台完成50+次服务\n2020-2023 在宠物店工作3年\n持有宠物护理证书', skills: '宠物美容,专业遛狗,宠物训练,医疗护理' }
  });
  console.log('Updated sitter: ' + s.name);
} else {
  console.log('No sitter found');
}
await prisma.$disconnect();
