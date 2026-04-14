import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback } from '@/lib/gemini';

export async function POST(req: Request) {
  try {
    const { message, code, history } = await req.json();

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    const { data: configData } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq').eq('shop_id', shop?.id).single();
    
    let config = configData;

    // Nếu shop không có cấu hình (ví dụ shop dùng thử mới tạo), lấy mặc định từ shop mẫu
    if (!config || (!config.product_info && !config.faq)) {
      // Lấy mã shop mẫu từ cài đặt (mặc định 70WPN)
      const { data: st } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'trial_template_shop_code').single();
      const templateCode = st?.value || '70WPN';

      const { data: sourceShop } = await supabaseAdmin.from('shops').select('id').eq('code', templateCode).single();
      if (sourceShop) {
        const { data: sourceConfig } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq').eq('shop_id', sourceShop.id).single();
        if (sourceConfig) {
          config = sourceConfig;
        }
      }
    }
    
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
`;

    // Chuyển đổi lịch sử chat từ frontend sang định dạng của Gemini
    const historyContents = (history || []).map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }]
    }));

    // Tạo danh sách tin nhắn gửi cho AI (System Prompt + History + Current Message)
    const contents = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      ...historyContents,
      { role: 'user', parts: [{ text: message }] }
    ];

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

      // Tự động xóa tin nhắn cũ hơn 10 ngày để nhẹ DB
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      await supabaseAdmin.from('messages').delete().lt('created_at', tenDaysAgo.toISOString());
    }

    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
