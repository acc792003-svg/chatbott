import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { processChat, normalizeMessage } from '@/lib/chatbot-engine';

/**
 * 📦 WIDGET CHAT API (Engine V2)
 */

const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const dailyQuotaMap = new Map<string, { count: number, date: string }>();

function checkRateLimit(key: string, limit: number, durationMs: number = 60000) {
    const now = Date.now();
    const info = rateLimitMap.get(key) || { count: 0, resetTime: now + durationMs };
    if (now > info.resetTime) {
        info.count = 1;
        info.resetTime = now + durationMs;
        rateLimitMap.set(key, info);
        return true;
    }
    if (info.count >= limit) return false;
    info.count += 1;
    rateLimitMap.set(key, info);
    return true;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, code, history, clientId } = body;
    const normalizedMsg = (message || '').trim();
    
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || 'anon-ip';

    // --- 1. RATE LIMITS ---
    if (!checkRateLimit(`ip:${ip}`, 20) || !checkRateLimit(`user:${code}:${ip}`, 10)) {
        return NextResponse.json({ response: "Bạn nhắn tin nhanh quá, hãy đợi chút nhé! ☕" });
    }

    if (!supabaseAdmin) throw new Error('DB Connection Error');
    
    // --- 2. SHOP & QUOTA ---
    const { data: shop } = await supabaseAdmin.from('shops').select('id, name, plan').eq('code', code).single();
    if (!shop) throw new Error('Shop không tồn tại');
    
    const isPro = shop.plan === 'pro';
    const today = new Date().toISOString().split('T')[0];
    const userQuotaKey = `quota:${today}:${ip}`;
    const userQuota = dailyQuotaMap.get(userQuotaKey) || { count: 0, date: today };
    
    if (userQuota.date !== today) { userQuota.count = 0; userQuota.date = today; }
    userQuota.count += 1;
    dailyQuotaMap.set(userQuotaKey, userQuota);

    const softLimit = isPro ? 250 : 80;
    const hardLimit = isPro ? 300 : 100;
    
    if (userQuota.count > hardLimit) {
        return NextResponse.json({ response: "Hôm nay bạn đã hỏi em rất nhiều rồi đó! Hãy nghỉ ngơi nhé. 😊" });
    }

    // --- 3. PROCESS WITH CORE ENGINE ---
    const externalUserId = clientId || `anon-${ip}`;
    const result = await processChat({
      shopId: shop.id,
      message: normalizedMsg,
      history: history || [],
      externalUserId,
      platform: 'widget',
      isPro
    });

    return NextResponse.json({ 
        response: result.answer + (userQuota.count >= softLimit ? "\n\n(Lưu ý: Bạn sắp hết lượt hỏi trong ngày.)" : ""), 
        shop_name: code 
    });

  } catch (error: any) {
    console.error('Widget Chat Error:', error);
    return NextResponse.json({ response: "Shop đang bận một chút, bạn thử lại sau giây lát nhe! 🙏" });
  }
}
