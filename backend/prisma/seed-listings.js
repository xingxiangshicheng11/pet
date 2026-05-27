import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();

async function main() {
  const sitters = await prisma.user.findMany({ where: { roles: { contains: 'SITTER' } } });
  if (sitters.length === 0) {
    console.log('No sitters found, please run seed.js first');
    return;
  }

  const ownerPw = await bcrypt.hash('owner123', 10);

  const ownerData = [
    { email: 'alice@pet.com', password: ownerPw, name: 'Alice Wang', roles: 'OWNER', address: '北京市朝阳区建国路88号' },
    { email: 'bob@pet.com', password: ownerPw, name: 'Bob Chen', roles: 'OWNER', address: '上海市浦东新区陆家嘴环路1000号' },
    { email: 'carol@pet.com', password: ownerPw, name: 'Carol Liu', roles: 'OWNER', address: '广州市天河区珠江新城花城大道66号' },
    { email: 'dave@pet.com', password: ownerPw, name: 'Dave Zhang', roles: 'OWNER', address: '深圳市南山区科技园南区' },
  ];

  const owners = [];
  for (const od of ownerData) {
    let u = await prisma.user.findUnique({ where: { email: od.email } });
    if (!u) u = await prisma.user.create({ data: od });
    owners.push(u);
  }

  const petData = [
    { name: '豆豆', species: 'dog', breed: '金毛', age: 3, weight: 25, notes: '性格温顺，喜欢和人玩', ownerId: owners[0].id },
    { name: '咪咪', species: 'cat', breed: '英短', age: 2, weight: 4, notes: '怕生，需要温柔对待', ownerId: owners[0].id },
    { name: '旺财', species: 'dog', breed: '柴犬', age: 1, weight: 10, notes: '精力旺盛，需要大量运动', ownerId: owners[1].id },
    { name: '雪球', species: 'cat', breed: '布偶', age: 4, weight: 5, notes: '喜欢被摸肚子', ownerId: owners[1].id },
    { name: '小黑', species: 'dog', breed: '拉布拉多', age: 2, weight: 30, notes: '已打疫苗，性格友好', ownerId: owners[2].id },
    { name: '小黄', species: 'other', breed: '仓鼠', age: 1, weight: 0.1, notes: '需要每天换水喂食', ownerId: owners[2].id },
    { name: '团子', species: 'cat', breed: '橘猫', age: 5, weight: 6, notes: '减肥中，节制喂食', ownerId: owners[3].id },
    { name: '来福', species: 'dog', breed: '泰迪', age: 3, weight: 3, notes: '喜欢叫，需要耐心', ownerId: owners[3].id },
  ];

  const pets = [];
  for (const pd of petData) {
    const existing = await prisma.pet.findFirst({ where: { name: pd.name, ownerId: pd.ownerId } });
    if (existing) { pets.push(existing); continue; }
    const p = await prisma.pet.create({ data: pd });
    pets.push(p);
  }

  const now = new Date();
  const listingData = [
    { title: '周末遛狗服务', category: 'walking', description: '周末两天需要有人帮忙遛狗，每天早晚各一次，每次30分钟左右。狗狗很友好，不咬人。', price: 80, scheduledStart: new Date(now.getTime() + 86400000 * 2), scheduledEnd: new Date(now.getTime() + 86400000 * 4), address: '北京市朝阳区建国路88号', petId: pets[0].id, ownerId: owners[0].id },
    { title: '上门喂猫一周', category: 'feeding', description: '出差一周，需要每天上门喂猫、换水、清理猫砂。猫咪比较胆小，请不要强行抱它。', price: 350, scheduledStart: new Date(now.getTime() + 86400000 * 5), scheduledEnd: new Date(now.getTime() + 86400000 * 12), address: '北京市朝阳区建国路88号', petId: pets[1].id, ownerId: owners[0].id },
    { title: '柴犬日间照顾', category: 'sitting', description: '工作日白天需要有人在家陪伴柴犬，它精力很旺盛，需要玩耍和运动。最好有养狗经验。', price: 200, scheduledStart: new Date(now.getTime() + 86400000), scheduledEnd: new Date(now.getTime() + 86400000 * 5), address: '上海市浦东新区陆家嘴环路1000号', petId: pets[2].id, ownerId: owners[1].id },
    { title: '布偶猫上门照顾', category: 'sitting', description: '出差三天，需要上门照顾猫咪，包括喂食、换水、梳毛、铲屎。猫咪很乖。', price: 180, scheduledStart: new Date(now.getTime() + 86400000 * 3), scheduledEnd: new Date(now.getTime() + 86400000 * 6), address: '上海市浦东新区陆家嘴环路1000号', petId: pets[3].id, ownerId: owners[1].id },
    { title: '拉布拉多遛弯', category: 'walking', description: '每天早晚需要遛大型犬，狗狗力气大，建议有经验的接单者。每次1小时。', price: 120, scheduledStart: new Date(now.getTime() + 86400000), scheduledEnd: new Date(now.getTime() + 86400000 * 7), address: '广州市天河区珠江新城花城大道66号', petId: pets[4].id, ownerId: owners[2].id },
    { title: '仓鼠寄养', category: 'feeding', description: '旅游一周，需要有人每天上门喂仓鼠、换水、清理笼子。很简单，不花时间。', price: 140, scheduledStart: new Date(now.getTime() + 86400000 * 10), scheduledEnd: new Date(now.getTime() + 86400000 * 17), address: '广州市天河区珠江新城花城大道66号', petId: pets[5].id, ownerId: owners[2].id },
    { title: '橘猫减肥监督', category: 'feeding', description: '家里橘猫需要严格控制饮食，每天定时定量喂食。需要配合记录体重变化。', price: 100, scheduledStart: new Date(now.getTime() + 86400000 * 2), scheduledEnd: new Date(now.getTime() + 86400000 * 9), address: '深圳市南山区科技园南区', petId: pets[6].id, ownerId: owners[3].id },
    { title: '泰迪美容+遛狗', category: 'grooming', description: '需要给泰迪洗澡修剪毛发，顺便遛狗30分钟。狗狗有点胆小，需要耐心。', price: 150, scheduledStart: new Date(now.getTime() + 86400000 * 4), scheduledEnd: new Date(now.getTime() + 86400000 * 4), address: '深圳市南山区科技园南区', petId: pets[7].id, ownerId: owners[3].id },
  ];

  let count = 0;
  for (const ld of listingData) {
    const existing = await prisma.serviceListing.findFirst({ where: { title: ld.title, ownerId: ld.ownerId } });
    if (existing) continue;
    await prisma.serviceListing.create({ data: ld });
    count++;
  }

  console.log('Seeded ' + count + ' service listings');
}

main().catch(console.error).finally(() => prisma.$disconnect());
