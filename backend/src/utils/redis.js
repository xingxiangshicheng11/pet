import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

let client = null;

try {
  client = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 200, 2000);
    },
    lazyConnect: true,
  });
  client.on('error', () => {});
} catch {
  client = null;
}

export async function get(key) {
  if (!client) return null;
  try {
    return await client.get(key);
  } catch {
    return null;
  }
}

export async function setex(key, ttl, value) {
  if (!client) return;
  try {
    await client.setex(key, ttl, value);
  } catch {}
}

export async function del(key) {
  if (!client) return;
  try {
    await client.del(key);
  } catch {}
}

export async function incr(key) {
  if (!client) return null;
  try {
    return await client.incr(key);
  } catch {
    return null;
  }
}

export async function expire(key, ttl) {
  if (!client) return;
  try {
    await client.expire(key, ttl);
  } catch {}
}

export async function psetex(key, ttlMs, value) {
  if (!client) return;
  try {
    await client.psetex(key, ttlMs, value);
  } catch {}
}

export default { get, setex, del, incr, expire, psetex };
