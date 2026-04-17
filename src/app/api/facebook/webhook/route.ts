import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { processChat } from '@/lib/chatbot-engine';
import { sendFacebookMessage } from '@/lib/facebook';

/**
 * 🔒 FACEBOOK WEBHOOK HANDLER (Omnichannel Version)
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
    const body = await req.json();

    if (body.object === 'page') {
      for (const entry of body.entry) {
        if (!entry.messaging) continue;
        
        const webhook_event = entry.messaging[0];
        const sender_id = webhook_event.sender.id;
        const page_id = entry.id;

        if (webhook_event.message && webhook_event.message.text) {
          const message_text = webhook_event.message.text;
          
          // Xử lý không đồng bộ để không block Facebook Webhook
          handleFacebookMessage(sender_id, page_id, message_text).catch(e => 
            console.error('FB logic error:', e)
          );
        }
      }
      return NextResponse.json({ status: 'EVENT_RECEIVED' });
    } else {
      return NextResponse.json({ status: 'NOT_A_PAGE_EVENT' }, { status: 404 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * 🧠 LUỒNG XỬ LÝ TIN NHẮN FACEBOOK
 */
async function handleFacebookMessage(sender_id: string, page_id: string, text: string) {
  // 1. Tìm shop tương ứng
  const { data: shop } = await supabaseAdmin
    .from('shops')
    .select('id, name, plan, fb_page_access_token')
    .eq('fb_page_id', page_id)
    .single();

  if (!shop || !shop.fb_page_access_token) {
    console.warn(`⚠️ Page ${page_id} chưa cấu hình Access Token!`);
    return;
  }

  // 2. Lấy lịch sử hội thoại (6 tin gần nhất)
  const { data: history } = await supabaseAdmin
    .from('messages')
    .select('user_message, ai_response')
    .eq('shop_id', shop.id)
    .eq('external_user_id', sender_id)
    .eq('platform', 'facebook')
    .order('created_at', { ascending: false })
    .limit(6);

  const formattedHistory = (history || [])
    .reverse()
    .flatMap(m => [
      { role: 'user', content: m.user_message },
      { role: 'model', content: m.ai_response }
    ]);

  // 3. Gửi tới Bộ não xử lý (chatbot-engine)
  const result = await processChat({
    shopId: shop.id,
    message: text,
    history: formattedHistory,
    externalUserId: sender_id,
    platform: 'facebook',
    isPro: shop.plan === 'pro'
  });

  // 4. Phản hồi cho người dùng Facebook
  await sendFacebookMessage(sender_id, shop.fb_page_access_token, result.answer);
  
  console.log(`✅ FB Replied to ${sender_id}: ${result.answer.substring(0, 50)}... [Source: ${result.source}]`);
}
