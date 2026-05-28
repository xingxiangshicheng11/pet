const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.serviceProduct.count().then(c => {
  console.log('Products count:', c);
  return p.serviceProduct.findMany({ take: 3, include: { sitter: { select: { id: true, name: true } } } });
}).then(r => {
  console.log(JSON.stringify(r, null, 2));
  p.\();
}).catch(e => { console.error(e.message); p.\(); });
