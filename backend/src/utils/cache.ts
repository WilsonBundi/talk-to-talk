import Redis from 'ioredis';

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL);
  redis.on('error', (err) => console.error('Redis error', err));
}

export const getCached = async (key: string) => {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
};

export const setCached = async (key: string, value: string, ttlSeconds = 60) => {
  if (!redis) return;
  try {
    await redis.set(key, value, 'EX', ttlSeconds);
  } catch (error) {
    console.error('Redis set failed', error);
  }
};
