import { Redis } from '@upstash/redis';

// Khởi tạo Redis client (Server-side)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * MODULE BẢO VỆ 4 LỚP (ANTIGRAVITY PRO)
 */
export async function validateRateLimit(shopId: string, sessionId: string, ip: string, message: string) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return { allowed: true }; // Fallback nếu chưa cấu hình Redis

  try {
    // 🔴 LỚP 0: BLACKLIST CHECK (Cực nhanh)
    const isBlacklisted = await redis.get(`bl:${ip}`);
    if (isBlacklisted) {
      return { allowed: false, reason: 'Sytem detects suspicious activity. Please try again later.' };
    }

    // 🟢 LỚP 1: WELCOME FLOOD PROTECTION
    if (message === '[WELCOME]') {
      const welcomeKey = `rl:welcome:${sessionId}`;
      const count = await redis.incr(welcomeKey);
      if (count === 1) await redis.expire(welcomeKey, 30);
      if (count > 1) return { allowed: false, reason: 'silence' }; // Chặn thầm lặng
    }

    // 🟡 LỚP 2: USER RATE LIMIT (Burst: 5/10s, Sustained: 20/60s)
    const userSessKey = `rl:sess:${sessionId}`;
    const userBurstKey = `rl:burst:${sessionId}`;
    
    const [sessCount, burstCount] = await Promise.all([
      redis.incr(userSessKey),
      redis.incr(userBurstKey)
    ]);

    if (sessCount === 1) await redis.expire(userSessKey, 60);
    if (burstCount === 1) await redis.expire(userBurstKey, 10);

    if (burstCount > 5 || sessCount > 20) {
      // VI PHẠM -> Kích hoạt Soft Ban
      await triggerSoftBan(ip);
      return { allowed: false, reason: 'Bạn đang nhắn quá nhanh, vui lòng chậm lại một chút nhé! 🙏' };
    }

    // 🔵 LỚP 3: IP RATE LIMIT (30/60s)
    const ipKey = `rl:ip:${ip}`;
    const ipCount = await redis.incr(ipKey);
    if (ipCount === 1) await redis.expire(ipKey, 60);
    if (ipCount > 30) {
      await triggerSoftBan(ip);
      return { allowed: false, reason: 'Phát hiện truy cập bất thường từ IP của bạn.' };
    }

    // 🟣 LỚP 4: SHOP RATE LIMIT (100/60s)
    const shopKey = `rl:shop:${shopId}`;
    const shopCount = await redis.incr(shopKey);
    if (shopCount === 1) await redis.expire(shopKey, 60);
    if (shopCount > 100) {
      return { allowed: false, reason: 'Cửa hàng đang nhận quá nhiều tin nhắn, vui lòng thử lại sau giây lát.' };
    }

    return { allowed: true };
  } catch (error) {
    console.error('Redis Rate Limit Error:', error);
    return { allowed: true }; // Nếu Redis lỗi, cho phép qua để không làm gián đoạn khách hàng
  }
}

/**
 * Cơ chế Soft Ban lũy tiến
 */
async function triggerSoftBan(ip: string) {
  const levelKey = `bl:lvl:${ip}`;
  const level = (await redis.get<number>(levelKey)) || 0;
  const newLevel = level + 1;
  
  // Xác định thời gian ban (2p, 10p, 60p)
  let duration = 120; // 2 phút
  if (newLevel === 2) duration = 600; // 10 phút
  if (newLevel >= 3) duration = 3600; // 60 phút

  await Promise.all([
    redis.set(`bl:${ip}`, 'banned', { ex: duration }),
    redis.set(levelKey, newLevel, { ex: 86400 }) // Nhớ level trong 1 ngày
  ]);
  
  console.warn(`[SPAM_DETECTED] IP ${ip} banned for ${duration}s (Level ${newLevel})`);
}
