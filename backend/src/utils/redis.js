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

export default { get, setex };
