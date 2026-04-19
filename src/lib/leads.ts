import { supabaseAdmin } from './supabase';

const phoneRegex = /(0|\+84)(3|5|7|8|9)[0-9]{8}/g;

// CACHE & RATE LIMITS
let cachedSystemToken: string | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; 
let lastSystemSendTime = 0;
const SYSTEM_SEND_INTERVAL = 200; // 5 tin/giây để an toàn tuyệt đối

// THỐNG KÊ SHOP (Rate limit theo shop)
const shopRequestCounter: Record<string, { count: number, resetAt: number }> = {};

/**
 * 🚦 Per-Shop Rate Limit: Giới hạn mỗi shop tối đa 5 lead/phút qua System Bot
 */
function checkShopRateLimit(shopId: string): boolean {
  const now = Date.now();
  const shopData = shopRequestCounter[shopId];

  if (!shopData || now > shopData.resetAt) {
    shopRequestCounter[shopId] = { count: 1, resetAt: now + 60000 };
    return true;
  }

  if (shopData.count >= 5) return false;
  shopData.count++;
  return true;
}

/**
 * 💬 Dịch lỗi Telegram sang tiếng Việt (UX xịn)
 */
export function translateTelegramError(error: string): string {
  if (error.includes('chat not found')) return 'Khách chưa nhấn START Bot 🛑';
  if (error.includes('forbidden') || error.includes('blocked')) return 'Shop đã chặn Bot hoặc chưa phân quyền 🚫';
  if (error.includes('invalid token')) return 'Bot Token sai định dạng ❌';
  if (error.includes('too many requests')) return 'Hệ thống đang quá tải, sẽ gửi lại sau ⏳';
  return error;
}

/**
 * 🔐 Lấy Token hệ thống (Optimized with In-Memory Cache)
 * Giảm truy vấn DB, tăng tốc độ xử lý thông báo
 */
async function getSystemToken(): Promise<string | null> {
  const now = Date.now();
  
  // Trình tự ưu tiên: 
  // 1. Cache còn hạn (< 5 phút)
  // 2. Query Database & Cập nhật cache
  // 3. Fallback Env
  
  if (cachedSystemToken && (now - lastCacheUpdate < CACHE_TTL)) {
    return cachedSystemToken;
  }

  try {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', 'system_telegram_bot_token')
        .maybeSingle();

      if (data?.value) {
        cachedSystemToken = data.value;
        lastCacheUpdate = now;
        return cachedSystemToken;
      }
    }
  } catch (e) {
    console.error('Cache Miss - DB Error:', e);
  }

  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/**
 * 🚀 Gửi Telegram Production 99%: Retry + Backoff + RateLimit + Error Translate
 */
export async function sendTelegramNotification(config: {
  botToken?: string;
  chatId: string;
  phone: string;
  message: string;
  shopName: string;
  sessionId: string;
  leadId: string;
  shopId: string;
}) {
  if (!config.chatId || !supabaseAdmin) return;

  const text = `🔔 *KHÁCH HÀNG MỚI từ ${config.shopName}*\n\n` +
               `📱 *SĐT:* \`${config.phone}\`\n` +
               `💬 *Nội dung:* _${config.message}_\n\n` +
               `🔗 [Xem lịch sử](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/history?session=${config.sessionId})`;

  const retryDelays = [2000, 5000, 10000]; // 2s, 5s, 10s backoff
  let lastError = '';

  // Ưu tiên dùng token shop
  const tokenToUse = config.botToken || await getSystemToken();
  if (!tokenToUse) return;

  // Nếu dùng Bot hệ thống -> Check Rate Limit theo shop
  if (!config.botToken && !checkShopRateLimit(config.shopId)) {
    await supabaseAdmin.from('leads').update({ 
      telegram_status: 'failed', 
      telegram_error: 'Shop bị giới hạn tốc độ gửi (Spam protection)' 
    }).eq('id', config.leadId);
    return;
  }

  for (let i = 0; i <= retryDelays.length; i++) {
    try {
      // 🚦 Global Rate Limit
      const now = Date.now();
      const waitTime = Math.max(0, lastSystemSendTime + SYSTEM_SEND_INTERVAL - now);
      if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
      lastSystemSendTime = Date.now();

      const res = await fetch(`https://api.telegram.org/bot${tokenToUse}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: config.chatId, text, parse_mode: 'Markdown' })
      });

      const data = await res.json();
      if (res.ok) {
        await supabaseAdmin.from('leads').update({ 
          telegram_status: 'success', 
          telegram_sent_at: new Date().toISOString(),
          telegram_error: config.botToken ? null : 'Sent via System Bot'
        }).eq('id', config.leadId);
        return;
      }
      
      lastError = translateTelegramError(data.description || 'Unknown');
      
      // Nếu lỗi do User (Chat not found, Blocked) -> KHÔNG retry
      if (data.description.includes('chat not found') || data.description.includes('blocked')) {
        break; 
      }
    } catch (err: any) {
      lastError = err.message;
    }

    // Đợi trước khi thử lại
    if (i < retryDelays.length) {
      await new Promise(r => setTimeout(r, retryDelays[i]));
    }
  }

  // Nếu tất cả các lần thử đều thất bại
  await supabaseAdmin.from('leads').update({ 
    telegram_status: 'failed', 
    telegram_error: lastError 
  }).eq('id', config.leadId);
}

// Giữ lại các hàm tiện ích
export function normalizeInput(text: string): string { return text.replace(/[.\-\s]/g, "").replace(/\+84/g, "0"); }
export function hasHighIntent(message: string): boolean { return ['gọi', 'liên hệ', 'tư vấn', 'sđt', 'số điện thoại', 'mua', 'giá', 'ship', 'đặt hàng', 'zalo'].some(key => message.toLowerCase().includes(key)); }
export function userRefusedPhone(message: string): boolean { return ['không cần gọi', 'đừng hỏi', 'chat thôi', 'tư vấn đây'].some(key => message.toLowerCase().includes(key)); }
export function extractPhone(input: string): string | null {
  const phoneRegex = /(0|\+84)(3|5|7|8|9)[0-9]{8}/g;
  const cleaned = normalizeInput(input);
  const matches = cleaned.match(phoneRegex);
  return matches ? matches[0] : null;
}
export function countPreviousAsks(history: any[]): { count: number, gap: number } {
  let count = 0; let gap = 10;
  if (!history || history.length === 0) return { count, gap };
  for (let i = history.length - 1; i >= 0; i--) {
     const msg = history[i];
     if ((msg.role === 'assistant' || msg.role === 'model') && (msg.content?.includes('SĐT') || msg.content?.includes('số điện thoại'))) {
        count++; if (count === 1) gap = (history.length - 1) - i;
     }
  }
  return { count, gap };
}

export async function detectAndSaveLead(message: string, shopId: string, sessionId: string, shopConfig: any) {
  try {
    const cleanPhone = extractPhone(message);
    if (!cleanPhone || !supabaseAdmin) return null;

    const tenMinutesAgo = new Date();
    tenMinutesAgo.setMinutes(tenMinutesAgo.getMinutes() - 10);
    
    // Tìm lead gần nhất của SĐT này trong 10 phút qua
    const { data: recentLead } = await supabaseAdmin.from('leads')
      .select('id, first_message, status')
      .eq('shop_id', shopId)
      .eq('phone', cleanPhone)
      .gte('created_at', tenMinutesAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // LOGIC CHỐNG TRÙNG: Chỉ chặn nếu lead cũ vẫn đang ở trạng thái 'new' (chưa xử lý)
    // Nếu lead cũ đã 'contacted' hoặc 'done' -> Cho phép khách tạo lead mới (Ví dụ: khách quay lại mua thêm)
    if (recentLead && recentLead.status === 'new') {
       await supabaseAdmin.from('leads').insert({ 
         shop_id: shopId, 
         session_id: sessionId, 
         phone: cleanPhone, 
         first_message: `[TRÙNG] ${message}`, 
         status: 'new',
         telegram_status: 'duplicate' 
       });
       return null;
    }

    const { data: newLead, error } = await supabaseAdmin.from('leads').insert({ shop_id: shopId, session_id: sessionId, phone: cleanPhone, first_message: message, telegram_status: 'pending' }).select().single();
    if (error) throw error;

    if (shopConfig?.telegram_enabled !== false && shopConfig?.telegram_chat_id) {
       // BẮT BUỘC AWAIT trên môi trường Serverless để tránh bị giết vòng lặp
       await sendTelegramNotification({
         botToken: shopConfig.telegram_bot_token,
         chatId: shopConfig.telegram_chat_id,
         phone: cleanPhone,
         message: message,
         shopName: shopConfig.shop_name || 'Cửa hàng',
         sessionId: sessionId,
         leadId: newLead.id,
         shopId: shopId
       });
    }
    return newLead;
  } catch (error) {
    console.error('Core Lead Error:', error); return null;
  }
}
