import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Realistic Beijing-area coordinates for each service
const coords = {
  3: { lat: 39.9042, lng: 116.4074, address: '北京市东城区王府井大街' },
  4: { lat: 39.9147, lng: 116.3462, address: '北京市西城区金融街' },
  5: { lat: 39.9929, lng: 116.3912, address: '北京市朝阳区望京SOHO' },
  6: { lat: 39.9597, lng: 116.2983, address: '北京市海淀区中关村大街' },
  7: { lat: 39.8688, lng: 116.4572, address: '北京市东城区南锣鼓巷' },
  8: { lat: 39.9065, lng: 116.3982, address: '北京市东城区故宫博物院' },
  9: { lat: 39.9450, lng: 116.4592, address: '北京市朝阳区三里屯' },
  10: { lat: 39.8167, lng: 116.5072, address: '北京市通州区万达广场' },
};

const ids = await prisma.serviceListing.findMany({
  where: { status: 'OPEN', latitude: null },
  select: { id: true },
});

let updated = 0;
for (const { id } of ids) {
  const c = coords[id];
  if (!c) continue;
  await prisma.serviceListing.update({
    where: { id },
    data: { latitude: c.lat, longitude: c.lng, address: c.address },
  });
  updated++;
}

console.log(`Updated ${updated} services with coordinates`);
await prisma.$disconnect();
