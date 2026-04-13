import { NextResponse } from 'next/server';

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
    const PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

    if (body.object === 'page') {
      for (const entry of body.entry) {
        const webhookEvent = entry.messaging[0];
        const senderId = webhookEvent.sender.id;
        const messageText = webhookEvent.message?.text;

        if (messageText && PAGE_ACCESS_TOKEN) {
          // 1. Gọi API nội bộ của chúng ta để lấy câu trả lời từ AI
          // Ở bản SaaS, bạn cần logic tìm shop_id dựa trên PageID, 
          // nhưng tạm thời chúng ta dùng cấu hình mặc định:
          const chatResponse = await fetch(`${new URL(req.url).origin}/api/chat`, {
            method: 'POST',
            body: JSON.stringify({
              message: messageText,
              shopConfig: {
                shop_name: "Cửa hàng của bạn",
                product_info: "Vui lòng cập nhật thông tin sản phẩm trong dashboard",
                faq: "Vui lòng cập nhật FAQ"
              }
            })
          });

          const chatData = await chatResponse.json();
          const aiReply = chatData.response || "Xin lỗi, em đang bận một chút.";

          // 2. Gửi trả lời lại Facebook Graph API
          await fetch(`https://graph.facebook.com/v19.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`, {
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
  } catch (error) {
    return new Response('Error', { status: 500 });
  }
}
