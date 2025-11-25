import { createClient, RedisClientType } from 'redis';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const isTestEnv = process.env.NODE_ENV === 'test';

/**
 * Redis client instance.
 * Configured with the connection URL from environment variables.
 */
const redisClient: RedisClientType = createClient({ url: redisUrl });

redisClient.on('error', (err) => {
  console.error('Redis Client Error', err);
});

redisClient.on('connect', () => {
  console.log('Redis Client Connecting...');
});

redisClient.on('ready', () => {
  console.log('Redis Client Ready');
});

/**
 * Connect to Redis unless we are running tests. Jest already sets NODE_ENV to "test",
 * and skipping the connection there prevents an open Redis socket from keeping the
 * test runner alive after suites complete.
 */
const clientWithOptionalConnect = redisClient as RedisClientType & {
  connect?: () => Promise<void>;
};

if (!isTestEnv && typeof clientWithOptionalConnect.connect === 'function') {
  clientWithOptionalConnect.connect().catch((err) => {
    console.error('Error connecting to Redis:', err);
  });
}

/**
 * Gracefully closes the Redis connection.
 * Handles both V4 (isOpen/quit) and potentially older client versions.
 */
export const closeRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  } else if (typeof (redisClient as any).disconnect === 'function') {
    (redisClient as any).disconnect();
  }
};

export default redisClient;