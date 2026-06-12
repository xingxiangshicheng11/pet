import http from 'http';

const BASE = 'http://127.0.0.1:3001';
const uid = Date.now();
let accessToken, refreshToken;

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1', port: 3001,
      path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (accessToken) opts.headers['Authorization'] = 'Bearer ' + accessToken;
    const r = http.request(opts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

let passed = 0, failed = 0;
function assert(name, ok, detail) {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name}: ${detail}`); }
}

// ===== 测试 5: 密码强度校验 =====
console.log('\n5️⃣ 密码强度校验');
let r = await req('POST', '/api/auth/register', { email: `weak${uid}@t.com`, password: '123456', name: 'Weak', roles: 'OWNER' });
assert('太短拒绝', r.status === 400 && r.body.error?.includes('8 个字符'), r.body.error);

r = await req('POST', '/api/auth/register', { email: `weak2${uid}@t.com`, password: 'onlylower', name: 'Weak', roles: 'OWNER' });
assert('缺大写/数字/特殊字符拒绝', r.status === 400, r.body.error);

r = await req('POST', '/api/auth/register', { email: `weak3${uid}@t.com`, password: 'Admin123', name: 'Weak', roles: 'OWNER' });
assert('缺特殊字符拒绝', r.status === 400, r.body.error);

r = await req('POST', '/api/auth/register', { email: `strong${uid}@t.com`, password: 'Pass1234!', name: 'Strong', roles: 'OWNER' });
assert('强密码通过', r.status === 201, 'status=' + r.status);

// ===== 测试 1+2: bcrypt 存储 + 双 Token 机制 =====
console.log('\n1️⃣ bcrypt 存储 + 2️⃣ 双 Token');
assert('返回 accessToken', !!r.body.accessToken, '无 accessToken');
assert('返回 refreshToken', !!r.body.refreshToken, '无 refreshToken');

r = await req('POST', '/api/auth/register', { email: `strong${uid}@t.com`, password: 'Pass1234!', name: 'Strong', roles: 'OWNER' });
assert('重复邮箱拒绝', r.status === 400, 'status=' + r.status);

// ===== 测试 4: 修改密码二次验证 =====
console.log('\n4️⃣ 修改密码二次验证');
const cpEmail = `changepwd${uid}@t.com`;
r = await req('POST', '/api/auth/register', { email: cpEmail, password: 'TestPass1!', name: 'CP', roles: 'OWNER' });
accessToken = r.body.accessToken;
refreshToken = r.body.refreshToken;

r = await req('POST', '/api/auth/change-password', { currentPassword: 'WrongOld!', newPassword: 'NewPass123!' });
assert('旧密码错误拒绝', r.status === 403, `status=${r.status} error=${r.body.error||r.body}`);

r = await req('POST', '/api/auth/change-password', { currentPassword: 'TestPass1!', newPassword: 'NewPass1@' });
assert('旧密码正确通过', r.status === 200, 'status=' + r.status);

r = await req('POST', '/api/auth/login', { email: cpEmail, password: 'NewPass1@' });
assert('新密码登录成功', r.status === 200, 'status=' + r.status);
accessToken = r.body.accessToken;
const cpRefreshToken = r.body.refreshToken;

// 测试密码错误
r = await req('POST', '/api/auth/login', { email: cpEmail, password: 'wrongpass1!' });
assert('密码错误 → 401', r.status === 401, 'status=' + r.status);

// ===== Refresh Token 轮换 =====
console.log('\n🔄 Refresh Token 轮换');
let rt2 = cpRefreshToken;

r = await req('POST', '/api/auth/refresh', { refreshToken: rt2 });
assert('第一次 refresh 成功', r.status === 200 && r.body.accessToken, r.body.error || '无 token');
const rt3 = r.body.refreshToken;

// 先用 RT3（轮换出的新 token 应可用）
r = await req('POST', '/api/auth/refresh', { refreshToken: rt3 });
assert('新 token RT3 可用', r.status === 200, r.body.error || 'ok');
const rt4 = r.body.refreshToken;

// 然后重放 RT2 → 触发 deleteMany，所有 token 作废
r = await req('POST', '/api/auth/refresh', { refreshToken: rt2 });
assert('重放 RT2 被拒绝', r.status === 401 && r.body.error?.includes('失效'), r.body.error);

// RT3 和 RT4 也一并被作废
r = await req('POST', '/api/auth/refresh', { refreshToken: rt3 });
assert('RT3 也失效', r.status === 401, r.body.error);
r = await req('POST', '/api/auth/refresh', { refreshToken: rt4 });
assert('RT4 也失效', r.status === 401, r.body.error);

// ===== 测试 3: 登录限流（放最后，因为会锁 IP 30 分钟）=====
console.log('\n3️⃣ 登录限流');
const rlEmail = `ratelimit${uid}@t.com`;
await req('POST', '/api/auth/register', { email: rlEmail, password: 'TestPass1!', name: 'RL', roles: 'OWNER' });
for (let i = 0; i < 5; i++) {
  await req('POST', '/api/auth/login', { email: rlEmail, password: 'WrongPass1!' });
}
r = await req('POST', '/api/auth/login', { email: rlEmail, password: 'WrongPass1!' });
assert('5 次失败 → 429 限流', r.status === 429 && r.body.retryAfter > 0, `${r.status} ${r.body.error}`);

console.log(`\n========================`);
console.log(`结果: ${passed} 通过, ${failed} 失败`);
