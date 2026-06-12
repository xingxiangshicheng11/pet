import http from 'http';
const BASE = 'http://127.0.0.1:3001';
let ownerAT, sitterAT, adminAT, petId, serviceId;

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: '127.0.0.1', port: 3001, path, method, headers: { 'Content-Type': 'application/json' } };
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
    const r = http.request(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve({ s: res.statusCode, b: JSON.parse(d) }); } catch { resolve({ s: res.statusCode, b: d }); } }); });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let passed = 0, failed = 0;
function assert(name, ok, detail) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); } else { failed++; console.log(`  ❌ ${name}: ${detail}`); }
}

const uid = Date.now();

// 1. 注册 Owner
let r = await req('POST', '/api/auth/register', { email: `own${uid}@t.com`, password: 'TestPass1!', name: 'Owner', roles: 'OWNER' });
ownerAT = r.b.accessToken;
assert('Owner 注册', r.s === 201, r.s);

// 2. 创建宠物
r = await req('POST', '/api/pets', { name: '旺财', species: 'dog', age: 3 }, ownerAT);
petId = r.b.id;
assert('创建宠物', r.s === 201 && petId, JSON.stringify(r.b));

// 3. Owner 发布服务
r = await req('POST', '/api/services', {
  title: '遛狗服务', description: '帮我遛狗', category: 'walking', price: 100,
  scheduledStart: new Date(Date.now() + 86400000).toISOString(),
  scheduledEnd: new Date(Date.now() + 86400000 + 3600000).toISOString(),
  petId,
}, ownerAT);
serviceId = r.b.id;
assert('发布服务', r.s === 201 && serviceId, JSON.stringify(r.b));

// 4. 注册 Sitter
r = await req('POST', '/api/auth/register', { email: `sit${uid}@t.com`, password: 'TestPass1!', name: 'Sitter', roles: 'SITTER' });
sitterAT = r.b.accessToken;
assert('Sitter 注册', r.s === 201, r.s);

// 5. Sitter 接单
r = await req('POST', `/api/services/${serviceId}/accept`, {}, sitterAT);
assert('接单', r.s === 200, `status=${r.s}`);

// 6. 用管理员直接改状态为 WAITING_PAYMENT
r = await req('POST', '/api/auth/register', { email: `admin${uid}@t.com`, password: 'TestPass1!', name: 'Admin', roles: 'ADMIN', adminCode: 'zcc' });
adminAT = r.b.accessToken;
assert('Admin 注册', r.s === 201, r.s);

r = await req('PATCH', `/api/admin/services/${serviceId}/status`, { status: 'WAITING_PAYMENT' }, adminAT);
assert('管理员改状态为 WAITING_PAYMENT', r.s === 200, `status=${r.s}`);

// ===== 测试支付二次验证 =====
console.log('\n💰 支付二次验证测试');

// 7. 不传密码
r = await req('POST', '/api/payments', { orderId: serviceId, amount: 100, method: 'alipay' }, ownerAT);
assert('缺密码 → 400', r.s === 400 && r.b.error?.includes('当前密码'), JSON.stringify(r.b));

// 8. 密码错误
r = await req('POST', '/api/payments', { orderId: serviceId, amount: 100, method: 'alipay', password: 'WrongPass1!' }, ownerAT);
assert('密码错误 → 403', r.s === 403 && r.b.error?.includes('密码错误'), JSON.stringify(r.b));

// 9. 密码正确
r = await req('POST', '/api/payments', { orderId: serviceId, amount: 100, method: 'alipay', password: 'TestPass1!' }, ownerAT);
assert('密码正确 → 支付成功', r.s === 201 && r.b.payment?.status === 'COMPLETED', JSON.stringify(r.b));

// 10. 重复支付
r = await req('POST', '/api/payments', { orderId: serviceId, amount: 100, method: 'alipay', password: 'TestPass1!' }, ownerAT);
assert('重复支付 → 400', r.s === 400 && r.b.error?.includes('waiting'), JSON.stringify(r.b));

console.log(`\n========================`);
console.log(`结果: ${passed} 通过, ${failed} 失败`);
if (failed === 0) console.log('🎉 支付二次验证全流程测试通过！');