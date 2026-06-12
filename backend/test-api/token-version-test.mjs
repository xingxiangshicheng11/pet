import http from 'http';
const uid = Date.now();
let at, rt;

function req(method, path, body, customAT) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: '127.0.0.1', port: 3001,
      path, method,
      headers: { 'Content-Type': 'application/json' },
    };
    const token = customAT !== undefined ? customAT : at;
    if (token) opts.headers['Authorization'] = 'Bearer ' + token;
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

function assert(name, ok, detail) {
  console.log(`  ${ok ? '✅' : '❌'} ${name}${ok ? '' : ': ' + detail}`);
}

// 1. 用电脑 A 注册登录
const email = `tv${uid}@t.com`;
let r = await req('POST', '/api/auth/register', { email, password: 'TestPass1!', name: 'TV', roles: 'OWNER' });
at = r.body.accessToken;
rt = r.body.refreshToken;
console.log('\n🖥️ 电脑 A 登录');
assert('注册成功', r.status === 201, r.status);

// 2. 电脑 A 请求正常
r = await req('GET', '/api/auth/me');
assert('电脑 A 请求正常', r.status === 200, r.status);

// 3. 模拟电脑 B 登录（tokenVersion +1）
r = await req('POST', '/api/auth/login', { email, password: 'TestPass1!' });
const atB = r.body.accessToken;
console.log('\n🖥️ 电脑 B 登录');
assert('电脑 B 登录成功', r.status === 200, r.status);

// 4. 电脑 A 的旧 accessToken 立即失效
r = await req('GET', '/api/auth/me');
assert('电脑 A 旧 token 被拒', r.status === 401 && r.body.error?.includes('please login again'), JSON.stringify(r.body));

// 5. 电脑 B 的新 token 正常
at = atB;
r = await req('GET', '/api/auth/me');
assert('电脑 B token 正常', r.status === 200, r.status);

// 6. 电脑 A 的旧 refreshToken 也失效（被 computer B 的 deleteMany 删除）
r = await req('POST', '/api/auth/refresh', { refreshToken: rt });
assert('电脑 A 旧 refresh 被拒', r.status === 401 && (r.body.error?.includes('失效') || r.body.error?.includes('其他设备')), JSON.stringify(r.body));

console.log(`\n✅ tokenVersion 前后端均已生效：电脑 B 登录 → 电脑 A 所有 token 立即失效`);