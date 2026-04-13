import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const VERIFY_TOKEN = 'my_secret_token_123';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const pageId = entry.id; // ID của Fanpage nhận tin nhắn
        const webhookEvent = entry.messaging[0];
        const senderId = webhookEvent.sender.id;
        const messageText = webhookEvent.message?.text;

        if (messageText && pageId) {
          // 1. Tìm cấu hình shop dựa trên Facebook Page ID
          const { data: config } = await supabaseAdmin
            .from('chatbot_configs')
            .select('*')
            .eq('fb_page_id', pageId)
            .single();

          if (!config || !config.fb_access_token) {
            console.error(`Không tìm thấy cấu hình cho Page ID: ${pageId}`);
            continue;
          }

          // 2. Gọi AI Gemini để lấy câu trả lời (Dùng model ổn định nhất)
          const aiResponse = await fetch(`${new URL(req.url).origin}/api/chat`, {
            method: 'POST',
            body: JSON.stringify({
              message: messageText,
              shopConfig: {
                shop_name: config.shop_name,
                product_info: config.product_info,
                faq: config.faq
              }
            })
          });

          const chatData = await aiResponse.json();
          const aiReply = chatData.response || "Dạ, em chưa hiểu ý mình, anh chị đợi nhân viên trực hỗ trợ ạ.";

          // 3. Gửi tin nhắn trả lời lại Facebook
          await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${config.fb_access_token}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipient: { id: senderId },
              message: { text: aiReply }
            })
          });
        }
      }
      return new Response('EVENT_RECEIVED', { status: 200 });
    }
    return new Response('Not Found', { status: 404 });
  } catch (error: any) {
    console.error('FB Webhook Error:', error.message);
    return new Response('Error', { status: 500 });
  }
}
