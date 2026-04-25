import { Redis } from '@upstash/redis';
import { reportError } from './radar';

// Khởi tạo Redis client (Server-side)
export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * MODULE BẢO VỆ NHIỀU LỚP (ANTIGRAVITY PRO) - HARDENED
 */
export async function validateRateLimit(shopId: string, sessionId: string, ip: string, message: string, isTrusted: boolean = false) {
  if (!process.env.UPSTASH_REDIS_REST_URL) return { allowed: true };

  try {
    // 🔴 LỚP 0: BLACKLIST CHECK (Cực nhanh)
    const isBlacklisted = await redis.get(`bl:${ip}`);
    if (isBlacklisted) {
      return { allowed: false, reason: 'System detects suspicious activity. Please try again later.' };
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

    // 🟣 LỚP 4: SHOP RATE LIMIT (SHARDING + GRADUAL BAN + CLUSTER DETECTION)
    // Phân vùng key theo 10s window (sharding chống hotspot theo yêu cầu)
    const windowSlot = Math.floor(Date.now() / 10000); 
    const shopKey = `rl:shop:${shopId}:${windowSlot}`;
    const shopStatusKey = `rl:shop_status:${shopId}`;
    const ipClusterKey = `rl:cluster:${shopId}:${windowSlot}`;

    const [shopCount] = await Promise.all([
      redis.incr(shopKey),
      redis.sadd(ipClusterKey, ip)
    ]);
    const uniqueIps = await redis.scard(ipClusterKey);

    if (shopCount === 1) {
       await redis.expire(shopKey, 15); // Dọn dẹp key sau 15s
       await redis.expire(ipClusterKey, 15);

       // 🟢 4. LOG RECOVERY SIGNAL
       const wasBlocked = await redis.get(shopStatusKey);
       if (wasBlocked) {
          await redis.del(shopStatusKey);
          reportError({
            shopId,
            errorType: 'SHOP_RECOVERED',
            errorMessage: `Shop đã hoạt động ổn định trở lại sau đợt bão traffic. Lá chắn đã được thu hồi.`,
            fileSource: 'rate-limiter.ts',
            severity: 'low',
            metadata: { shopId }
          }).catch(() => {});
       }
    }

    // Ngưỡng chia theo 10s window:
    let level = 0;
    if (shopCount > 100) level = 1;
    if (shopCount > 150) level = 2;
    if (shopCount > 200) level = 3;

    // 🔥 2. IP CLUSTER DETECTION (BOTNET ATTACK)
    // Nếu có hơn 15 IP khác nhau cùng đâm vào 1 shop trong vòng 10s -> Kích hoạt Block
    if (uniqueIps > 15) {
       level = 3; 
    }

    if (level > 0) {
      // 🔥 1. AUTO COOLDOWN EXTEND
      if (level === 3) {
        await redis.expire(shopKey, 120); // Phạt khóa cứng toàn shop 2 phút
      }

      await redis.set(shopStatusKey, 'blocked', { ex: 300 }); // Đánh dấu trạng thái

      // 🔥 3. PRIORITY QUEUE: TRUSTED USER BYPASS (SOFT SHIELD)
      // Khách quen/đã xác thực thì được châm chước qua vòng 1 và vòng 2.
      if (isTrusted && level < 3) {
         return { allowed: true };
      }

      // Xử lý theo Level
      if (level === 1) {
        if (shopCount === 101) {
           reportError({
              shopId,
              errorType: 'SHOP_SPAM_WARN',
              errorMessage: `[Cấp 1] Lưu lượng shop tăng bất thường. Bật khiên mềm (ưu tiên khách quen, xếp hàng khách mới).`,
              fileSource: 'rate-limiter.ts',
              severity: 'medium',
              metadata: { shopId }
           }).catch(() => {});
        }
        return { allowed: false, reason: 'Hệ thống đang phục vụ đông khách, bạn chờ xíu rồi nhắn lại nhé 🙏' };
      }

      if (level === 2) {
        if (shopCount === 151) {
           reportError({
              shopId,
              errorType: 'SHOP_SPAM_THROTTLE',
              errorMessage: `[Cấp 2] Bão tin nhắn rất mạnh. Đã bật Throttle.`,
              fileSource: 'rate-limiter.ts',
              severity: 'high',
              metadata: { shopId }
           }).catch(() => {});
        }
        return { allowed: false, reason: 'Shop đang nhận lượng lớn tin nhắn, bạn thử lại sau 1 chút nhé.' };
      }

      if (level === 3) {
        if (shopCount === 201 || uniqueIps === 16) {
           reportError({
              shopId,
              errorType: 'SHOP_SPAM_BLOCK',
              errorMessage: `[Cấp 3] DDoS hoặc Botnet tàn phá (Traffic: ${shopCount}, IPs: ${uniqueIps}). Kích hoạt Hard Block toàn cục để cứu Server.`,
              fileSource: 'rate-limiter.ts',
              severity: 'critical',
              metadata: { shopId }
           }).catch(() => {});
        }
        return { allowed: false, reason: 'Hệ thống đang bảo trì nghẽn mạng khẩn cấp, mong bạn thông cảm quay lại sau.' };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Redis Rate Limit Error:', error);
    return { allowed: true }; // Fallback an toàn
  }
}

/**
 * Cơ chế Soft Ban lũy tiến
 */
async function triggerSoftBan(ip: string) {
  const levelKey = `bl:lvl:${ip}`;
  const level = (await redis.get<number>(levelKey)) || 0;
  const newLevel = level + 1;
  
  let duration = 120; // 2 phút
  if (newLevel === 2) duration = 600; // 10 phút
  if (newLevel >= 3) duration = 3600; // 60 phút

  await Promise.all([
    redis.set(`bl:${ip}`, 'banned', { ex: duration }),
    redis.set(levelKey, newLevel, { ex: 86400 }) // Nhớ level trong 1 ngày
  ]);
  
  console.warn(`[SPAM_DETECTED] IP ${ip} banned for ${duration}s (Level ${newLevel})`);
}
