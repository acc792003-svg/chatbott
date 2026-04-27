const { Redis } = require('@upstash/redis');
require('dotenv').config({ path: '.env.local' });

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function clearPromptCache() {
    console.log('Clearing prompt cache...');
    const shopId = 'b6d7c606-ab54-4937-adf3-02d274287dc1'; // 70WPN
    await redis.del(`prompt:${shopId}:no_global`);
    await redis.del(`prompt:${shopId}:with_global`);
    await redis.del(`config:${shopId}`);
    console.log('Cache cleared for 70WPN!');
}

clearPromptCache();
