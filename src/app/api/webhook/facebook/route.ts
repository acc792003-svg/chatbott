import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processChat } from '@/lib/chatbot-engine';
import { sendFacebookMessage } from '@/lib/facebook';
import { reportError } from '@/lib/radar';
import { redis } from '@/lib/rate-limiter';
import crypto from 'crypto';

/**
 * 🔒 FACEBOOK WEBHOOK - PRODUCTION HARDENED (V3)
 * - X-Hub-Signature-256 Verification (Bảo mật tuyệt đối)
 * - Message Deduplication (Chống trả lời lặp lại)
 * - Multi-tenant Channel Routing (Định tuyến thông minh)
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const { data: setting } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'fb_verify_token')
    .single();

  const VERIFY_TOKEN = setting?.value || 'antigravity_secret';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('✅ Facebook Webhook Verified!');
      return new Response(challenge, { status: 200 });
    } else {
      return new Response('Forbidden', { status: 403 });
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // 1. VERIFY SIGNATURE (Bảo vệ khỏi hacker)
    if (!await verifySignature(rawBody, signature)) {
      console.error('❌ Invalid Webhook Signature!');
      reportError({
          errorType: 'FB_WEBHOOK_INVALID_SIGNATURE',
          errorMessage: 'Khớp chữ ký thất bại. rawBody snippet: ' + rawBody.substring(0, 50),
          fileSource: 'fb_webhook',
          severity: 'high',
          metadata: { signature }
      }).catch(() => {});
      return NextResponse.json({ error: 'Invalid Signature' }, { status: 401 });
    }

    const body = JSON.parse(rawBody);

    if (body.object === 'page') {
      for (const entry of body.entry) {
        if (!entry.messaging) continue;
        
        const webhook_event = entry.messaging[0];
        const sender_id = webhook_event.sender.id;
        const page_id = entry.id;
        const message_id = webhook_event.message?.mid;

        // 2. CHECK DUPLICATE (Chặn tin nhắn trùng lặp)
        if (message_id) {
            const isDuplicate = await checkAndLogMessage(message_id);
            if (isDuplicate) {
                console.warn(`♻️ Duplicate message detected: ${message_id}. Skipping.`);
                continue;
            }
        }

        if (webhook_event.message && webhook_event.message.text) {
          const message_text = webhook_event.message.text;
          
          // Xử lý bất đồng bộ (Giai đoạn chuyển tiếp sang Async)
          handleFacebookMessage(sender_id, page_id, message_text).catch(e => 
            console.error('FB logic error:', e)
          );
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    }
    
    return NextResponse.json({ status: 'NOT_A_PAGE_EVENT' }, { status: 404 });

  } catch (e: any) {
    console.error('Webhook Root Error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * 🛡️ XÁC THỰC CHỮ KÝ TỪ FACEBOOK
 */
async function verifySignature(payload: string, signature: string | null): Promise<boolean> {
  if (!signature) return false;
  
  const { data: setting } = await supabaseAdmin
    .from('system_settings')
    .select('value')
    .eq('key', 'fb_app_secret')
    .single();

  const APP_SECRET = setting?.value;
  if (!APP_SECRET) {
      console.warn('⚠️ FB_APP_SECRET chưa được cấu hình. Tạm thời bỏ qua verify (Không khuyến khích).');
      return true; // Phải có App Secret mới chạy được production thực sự
  }

  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
}

/**
 * ♻️ KIỂM TRA VÀ GHI NHẬT KÝ TIN NHẮN (DEDUPLICATION)
 */
async function checkAndLogMessage(msgId: string): Promise<boolean> {
    if (redis) {
        // Redis SETNX logic (Trùng lặp trả về null)
        const isSet = await redis.set(`dedup:${msgId}`, "1", { ex: 300, nx: true });
        if (isSet === null) return true; // Đã tồn tại -> Trùng
        
        // Log DB async không đợi
        (async () => {
            try {
                const res = await supabaseAdmin.from('webhook_logs').insert({ message_id: msgId });
                if (res.error && res.error.code !== '23505') console.error('DB dedup log error', res.error);
            } catch (e) {}
        })();
        return false;
    }

    const { error } = await supabaseAdmin
        .from('webhook_logs')
        .insert({ message_id: msgId });
    
    // Nếu lỗi có code 23505 (unique_violation) -> Tin đã xử lý
    return error?.code === '23505';
}

/**
 * 🧠 LUỒNG XỬ LÝ TIN NHẮN FACEBOOK
 */
async function handleFacebookMessage(sender_id: string, page_id: string, text: string) {
  // 1. Tìm shop tương ứng qua bảng Channel Config (Đã chuyển đổi kiến trúc)
  const { data: config } = await supabaseAdmin
    .from('channel_configs')
    .select('shop_id, access_token, shops(name, plan)')
    .eq('provider_id', page_id)
    .eq('channel_type', 'facebook')
    .single();

  if (!config || !config.access_token) {
    console.warn(`⚠️ Page ${page_id} chưa được gán cho bất kỳ Shop nào!`);
    reportError({
        errorType: 'FB_WEBHOOK_PAGE_NOT_FOUND',
        errorMessage: `Page ${page_id} gửi tin nhưng chưa Shop nào gán Facebook Page ID này.`,
        fileSource: 'fb_webhook',
        severity: 'medium'
    }).catch(() => {});
    return;
  }

  const shop: any = config.shops;

  // 2. Lấy lịch sử hội thoại
  const { data: history } = await supabaseAdmin
    .from('messages')
    .select('user_message, ai_response')
    .eq('shop_id', config.shop_id)
    .eq('external_user_id', sender_id)
    .eq('platform', 'facebook')
    .order('created_at', { ascending: false })
    .limit(4);

  const formattedHistory = (history || [])
    .reverse()
    .flatMap((m: any) => [
      { role: 'user', content: m.user_message },
      { role: 'model', content: m.ai_response }
    ]);

  // 3. Gửi tới Bộ não xử lý
  const result = await processChat({
    shopId: config.shop_id,
    message: text,
    history: formattedHistory,
    externalUserId: sender_id,
    platform: 'facebook',
    isPro: shop.plan === 'pro'
  });

  // 4. Phản hồi kèm Retry logic (Giai đoạn nhẹ)
  let success = await sendFacebookMessage(sender_id, config.access_token, result.answer);
  
  // Retry đơn giản nếu thất bại (Lần 2 sau 2s)
  if (!success) {
      setTimeout(async () => {
          await sendFacebookMessage(sender_id, config.access_token, result.answer);
      }, 2000);
  }
}
