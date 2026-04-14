import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { message, code } = await req.json();

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    const { data: config } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq').eq('shop_id', shop?.id).single();
    
    const shopName = config?.shop_name || shop?.name || 'Shop';
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });

    const systemPrompt = `
BẠN LÀ AI?
- Bạn là một "Người bạn đồng hành thông minh" của shop "${shopName}".
- Hôm nay là: ${now}.
- Tính cách: Thân thiện, ấm áp, có khiếu hài hước duyên dáng.

NHIỆM VỤ:
1. TRÒ CHUYỆN: Nếu khách hỏi về cuộc sống, tâm sự, hãy trả lời như một người bạn thân thiết.
2. TƯ VẤN: Sử dụng dữ liệu dưới đây tự nhiên nhất.
   - Sản phẩm: ${config?.product_info || 'Yến sào cao cấp và các mặt hàng sức khỏe'}
   - Câu hỏi thường gặp: ${config?.faq || 'Tư vấn nhiệt tình 24/7'}

QUY TẮC:
- Xưng hô linh hoạt: "Dạ", "Em", "Mình", "Bạn".
- Tuyệt đối không liệt kê máy móc 1, 2, 3 trừ khi khách yêu cầu.
- Luôn giữ thái độ tích cực, truyền năng lượng tốt.

CÂU HỎI TỪ KHÁCH HÀNG:
"${message}"
`;

    const contents = [{ role: 'user', parts: [{ text: systemPrompt }] }];

    const finalResponse = await callGeminiWithFallback(contents, {
      temperature: 0.8,
      maxOutputTokens: 800
    }, shop?.id || null);

    // Lưu tin nhắn vào database
    if (shop?.id) {
      await supabaseAdmin.from('messages').insert({
        shop_id: shop.id,
        session_id: `widget-${Date.now()}`,
        user_message: message,
        ai_response: finalResponse,
        usage_tokens: 0
      });
    }

    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
