
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback } from '@/lib/gemini';

const APP_SECRET = process.env.FB_APP_SECRET || ''; 
const GLOBAL_VERIFY_TOKEN = process.env.FB_VERIFY_TOKEN || 'chatbot_verify_token_2026';

// 1. Xác thực Webhook (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === GLOBAL_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

// 2. Tiếp nhận và xử lý tin nhắn (POST)
export async function POST(req: Request) {
  try {
    const rawBody = await req.text(); // Dùng raw text để verify signature chính xác nhất
    const body = JSON.parse(rawBody);

    // --- A. BẢO MẬT: VERIFY SIGNATURE (X-Hub-Signature-256) ---
    if (APP_SECRET) {
        const signature = req.headers.get('x-hub-signature-256');
        if (!signature) return new Response('Unauthorized', { status: 401 });
        
        const hmac = crypto.createHmac('sha256', APP_SECRET);
        const digest = 'sha256=' + hmac.update(rawBody, 'utf8').digest('hex');
        
        if (signature !== digest) {
            console.error('[SECURITY_ALERT] Invalid HMAC Signature');
            return new Response('Invalid Signature', { status: 401 });
        }
    }

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const event = entry.messaging?.[0];
        if (!event) continue;

        const senderPsid = event.sender.id;
        const pageId = entry.id;
        const message = event.message;

        // --- B. CHỐNG LOOP (ANTI-LOOP): Bỏ qua tin nhắn do bot/app gửi ra ---
        if (message?.is_echo || message?.app_id) {
           continue; 
        }

        if (message?.text && message?.mid) {
          // Xử lý background để trả 200 OK ngay lập tức (tránh Meta timeout)
          processBackground(pageId, senderPsid, message.text, message.mid).catch(err => {
             console.error('[BG_PROCESS_ERROR]', err);
          });
        }
      }
      return new Response('EVENT_RECEIVED', { status: 200 });
    }
  } catch (error) {
    console.error('[WEBHOOK_CRASH]', error);
    return new Response('Internal error', { status: 500 });
  }
}

async function processBackground(pageId: string, senderPsid: string, userText: string, mid: string) {
  if (!supabaseAdmin) return;

  // 1. Tìm Shop & cấu hình (Dùng cache hoặc select nhanh)
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, fb_page_token, fb_enabled')
    .eq('fb_page_id', pageId)
    .single();

  if (!shop || !shop.fb_page_token || !shop.fb_enabled) return;

  // 2. CHỐNG TRÙNG TIN (Idempotency) - Kiểm tra MID đã tồn tại chưa
  const { data: existing } = await supabaseAdmin
    .from('messages')
    .select('id')
    .eq('shop_id', shop.id)
    .contains('metadata', { mid: mid })
    .single();

  if (existing) return;

  // 3. LOAD LỊCH SỬ HỘI THOẠI (Dùng PSID định danh cứng)
  const { data: historyLogs } = await supabaseAdmin
    .from('messages')
    .select('user_message, ai_response')
    .eq('shop_id', shop.id)
    .eq('fb_psid', senderPsid)
    .order('created_at', { ascending: false })
    .limit(3);

  // 4. LẤY CẤU HÌNH AI CỦA SHOP
  const { data: config } = await supabaseAdmin
    .from('chatbot_configs')
    .select('shop_name, product_info, pricing_info, faq, customer_insights, brand_voice')
    .eq('shop_id', shop.id)
    .single();

  const systemPrompt = `BẠN LÀ Trợ lý ảo của fanpage "${config?.shop_name || 'Shop'}". Giọng: ${config?.brand_voice || 'thân thiện'}. 
${config?.product_info ? `KIẾN THỨC: ${config.product_info}` : ''}
${config?.pricing_info ? `GIÁ CẢ: ${config.pricing_info}` : ''}
${config?.faq ? `HỎI ĐÁP: ${config.faq}` : ''}
QUY TẮC: Trả lời ngắn nhất có thể, dùng icon 😊. Tuyệt đối không spam khách.`;

  const historyContents = (historyLogs || []).reverse().flatMap((h: any) => [
    { role: 'user', parts: [{ text: h.user_message }] },
    { role: 'model', parts: [{ text: h.ai_response }] }
  ]);

  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    ...historyContents,
    { role: 'user', parts: [{ text: userText }] }
  ];

  // 5. GỌI AI NHANH (Gemini Flash Lite)
  const aiResponse = await callGeminiWithFallback(contents, { temperature: 0.7 }, shop.id, 'FB_MESSENGER');

  // 6. TRẢ LỜI FACEBOOK
  const success = await sendFbResponse(shop.fb_page_token, senderPsid, aiResponse);
  
  // 7. LƯU LẠI NHẬT KÝ
  if (success) {
      await supabaseAdmin.from('messages').insert({
        shop_id: shop.id,
        session_id: `fb-${senderPsid}`,
        fb_psid: senderPsid,
        user_message: userText,
        ai_response: aiResponse,
        metadata: { mid: mid, source: 'facebook' }
      });
  }
}

async function sendFbResponse(pageToken: string, recipientId: string, text: string) {
  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/me/messages?access-token=${pageToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text: text }
        })
    });
    const result = await res.json();
    return !result.error;
  } catch (e) {
    console.error('[SEND_FAILURE]', e);
    return false;
  }
}
