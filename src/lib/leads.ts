import { supabaseAdmin } from './supabase';

const phoneRegex = /(0|\+84)(3|5|7|8|9)[0-9]{8}/g;

// CACHE: Bộ đệm cho cấu hình hệ thống (hết hạn sau 5 phút)
let cachedSystemToken: string | null = null;
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; 

/**
 * 🔐 Lấy Token hệ thống với cơ chế Caching
 */
async function getSystemToken(): Promise<string | null> {
  const now = Date.now();
  if (cachedSystemToken && (now - lastCacheUpdate < CACHE_TTL)) {
    return cachedSystemToken;
  }

  if (!supabaseAdmin) return process.env.TELEGRAM_BOT_TOKEN || null;

  const { data } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'system_telegram_bot_token')
    .single();

  if (data?.value) {
    cachedSystemToken = data.value;
    lastCacheUpdate = now;
    return cachedSystemToken;
  }

  return process.env.TELEGRAM_BOT_TOKEN || null;
}

/**
 * 🚦 Rate Limiter đơn giản cho System Bot
 */
let lastSystemSendTime = 0;
const SYSTEM_SEND_INTERVAL = 100; // Tối đa 10 tin/giây

async function waitRateLimit() {
    const now = Date.now();
    const waitTime = Math.max(0, lastSystemSendTime + SYSTEM_SEND_INTERVAL - now);
    if (waitTime > 0) await new Promise(r => setTimeout(r, waitTime));
    lastSystemSendTime = Date.now();
}

/**
 * Logic gửi lõi
 */
async function callTelegramAPI(token: string, chatId: string, text: string) {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
    });
    return res;
}

/**
 * 🚀 Gửi Telegram Production-Ready: Fallback + Cache + RateLimit
 */
export async function sendTelegramNotification(config: {
  botToken?: string;
  chatId: string;
  phone: string;
  message: string;
  shopName: string;
  sessionId: string;
  leadId: string;
}) {
  if (!config.chatId || !supabaseAdmin) return;

  const text = `🔔 *KHÁCH HÀNG MỚI từ ${config.shopName}*\n\n` +
               `📱 *SĐT:* \`${config.phone}\`\n` +
               `💬 *Nội dung:* _${config.message}_\n\n` +
               `🔗 [Xem lịch sử](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/history?session=${config.sessionId})`;

  let response: Response;
  let usedSystemBot = false;

  // 1. Thử gửi bằng Bot riêng của Shop (nếu có)
  if (config.botToken) {
    try {
      response = await callTelegramAPI(config.botToken, config.chatId, text);
      if (response.ok) {
        await supabaseAdmin.from('leads').update({ telegram_status: 'success', telegram_sent_at: new Date().toISOString() }).eq('id', config.leadId);
        return;
      }
      // Nếu lỗi 401 (token sai) hoặc 404, sẽ tiếp tục fallback xuống dưới
      console.warn('Shop Bot failed, attempting fallback to System Bot...');
    } catch (err) {
      console.error('Shop Bot Error:', err);
    }
  }

  // 2. FALLBACK: Thử gửi bằng Bot hệ thống
  const systemToken = await getSystemToken();
  if (systemToken) {
    await waitRateLimit(); // Chống spam hệ thống
    try {
      response = await callTelegramAPI(systemToken, config.chatId, text);
      if (response.ok) {
        await supabaseAdmin.from('leads').update({ 
          telegram_status: 'success', 
          telegram_sent_at: new Date().toISOString(),
          telegram_error: 'Sent via System Bot fallback'
        }).eq('id', config.leadId);
        return;
      }
      
      // Nếu cả 2 đều hỏng
      const data = await response.json();
      await supabaseAdmin.from('leads').update({ telegram_status: 'failed', telegram_error: `System Bot Error: ${data.description}` }).eq('id', config.leadId);
    } catch (err: any) {
      await supabaseAdmin.from('leads').update({ telegram_status: 'failed', telegram_error: err.message }).eq('id', config.leadId);
    }
  }
}

// Giữ lại các hàm normalizeInput, extractPhone, hasHighIntent...
export function normalizeInput(text: string): string {
  return text.replace(/[.\-\s]/g, "").replace(/\+84/g, "0");    
}
export function hasHighIntent(message: string): boolean {
  const keywords = ['gọi', 'liên hệ', 'tư vấn', 'sđt', 'số điện thoại', 'mua', 'giá', 'ship', 'đặt hàng', 'zalo'];
  return keywords.some(key => message.toLowerCase().includes(key));
}
export function userRefusedPhone(message: string): boolean {
  return ['không cần gọi', 'đừng hỏi', 'chat thôi', 'tư vấn đây'].some(key => message.toLowerCase().includes(key));
}
export function extractPhone(input: string): string | null {
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
    const { data: recentLead } = await supabaseAdmin.from('leads').select('id, first_message, status').eq('shop_id', shopId).eq('phone', cleanPhone).gte('created_at', tenMinutesAgo.toISOString()).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (recentLead && (recentLead.first_message === message || recentLead.status === 'new')) {
       await supabaseAdmin.from('leads').insert({ shop_id: shopId, session_id: sessionId, phone: cleanPhone, first_message: `[TRÙNG] ${message}`, telegram_status: 'duplicate' });
       return null;
    }

    const { data: newLead, error } = await supabaseAdmin.from('leads').insert({ shop_id: shopId, session_id: sessionId, phone: cleanPhone, first_message: message, telegram_status: 'pending' }).select().single();
    if (error) throw error;

    if (shopConfig?.telegram_enabled !== false && shopConfig?.telegram_chat_id) {
       await sendTelegramNotification({
         botToken: shopConfig.telegram_bot_token,
         chatId: shopConfig.telegram_chat_id,
         phone: cleanPhone,
         message: message,
         shopName: shopConfig.shop_name || 'Cửa hàng',
         sessionId: sessionId,
         leadId: newLead.id
       });
    }
    return newLead;
  } catch (error) {
    console.error('Core Lead Error:', error);
    return null;
  }
}
