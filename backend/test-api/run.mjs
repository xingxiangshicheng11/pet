const BASE = 'http://localhost:3001/api';
let pass = 0, fail = 0;

async function test(name, fn) {
  try {
    const result = await fn();
    if (result.passed) {
      pass++;
      console.log(`  ✅ ${name}`);
    } else {
      fail++;
      console.log(`  ❌ ${name}: ${result.reason}`);
    }
  } catch (e) {
    fail++;
    console.log(`  ❌ ${name}: ${e.message}`);
  }
}

async function api(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  try { return { status: res.status, data: JSON.parse(text) }; }
  catch { return { status: res.status, data: text }; }
}

const email = 'apitest' + Date.now() + '@test.com';
const pw = 'StrongPass1!';
let accessToken, refreshToken;

console.log('\n=== 宠物平台 API 集成测试 ===\n');

// 1. 弱密码
await test('弱密码拒绝', async () => {
  const r = await api('POST', '/auth/register', { email: 'weak@t.com', name: 'Weak', password: '123', roles: 'OWNER' });
  return { passed: !!r.data.error, reason: r.data.error || JSON.stringify(r.data) };
});

// 2. 注册
await test('强密码注册 → 双 token', async () => {
  const r = await api('POST', '/auth/register', { email, name: 'Test User', password: pw, roles: 'OWNER' });
  if (r.data.accessToken && r.data.refreshToken) {
    accessToken = r.data.accessToken;
    refreshToken = r.data.refreshToken;
    return { passed: true };
  }
  return { passed: false, reason: JSON.stringify(r.data) };
});

// 3. 重复注册
await test('重复邮箱拒绝', async () => {
  const r = await api('POST', '/auth/register', { email, name: 'Test', password: pw, roles: 'OWNER' });
  return { passed: !!r.data.error, reason: r.data.error };
});

// 4. 登录
await test('正确密码登录', async () => {
  const r = await api('POST', '/auth/login', { email, password: pw });
  if (r.data.accessToken && r.data.refreshToken) {
    accessToken = r.data.accessToken;
    refreshToken = r.data.refreshToken;
    return { passed: true };
  }
  return { passed: false, reason: JSON.stringify(r.data) };
});

// 5. 错误密码
await test('错误密码拒绝', async () => {
  const r = await api('POST', '/auth/login', { email, password: 'wrong' });
  return { passed: !!r.data.error, reason: r.data.error };
});

// 6. Refresh
await test('Refresh 轮换', async () => {
  const r = await api('POST', '/auth/refresh', { refreshToken });
  if (r.data.accessToken && r.data.refreshToken) {
    const oldRt = refreshToken;
    accessToken = r.data.accessToken;
    refreshToken = r.data.refreshToken;
    // 验证旧 token 已作废
    const r2 = await api('POST', '/auth/refresh', { refreshToken: oldRt });
    if (!r2.data.error) return { passed: false, reason: '旧 token 未被作废' };
    return { passed: true };
  }
  return { passed: false, reason: JSON.stringify(r.data) };
});

// 7. 重放攻击
await test('重放攻击拒绝', async () => {
  const r = await api('POST', '/auth/refresh', { refreshToken });
  return { passed: !!r.data.error, reason: r.data.error };
});

// 8. 修改密码
await test('修改密码', async () => {
  const newPw = 'NewStrong2@x';
  const r = await api('POST', '/auth/change-password', { currentPassword: pw, newPassword: newPw }, accessToken);
  if (!r.data.error) {
    // 用新密码登录
    const r2 = await api('POST', '/auth/login', { email, password: newPw });
    if (r2.data.accessToken) return { passed: true };
    return { passed: false, reason: '新密码无法登录' };
  }
  return { passed: false, reason: r.data.error };
});

// 9. 限流: 5 次失败登录+1次成功登录
await test('登录限流', async () => {
  let locked = false;
  for (let i = 0; i < 6; i++) {
    const r = await api('POST', '/auth/login', { email, password: 'badpass' + i });
    if (r.status === 429) {
      locked = true;
      break;
    }
  }
  return { passed: locked, reason: locked ? '5 次失败后触发 429' : '始终未触发 429' };
});

console.log(`\n===== ${pass} 通过, ${fail} 失败 =====`);
process.exit(fail > 0 ? 1 : 0);
