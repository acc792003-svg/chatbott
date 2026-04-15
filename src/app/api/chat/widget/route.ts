import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback } from '@/lib/gemini';

export async function POST(req: Request) {
  let shopId: string | null = null;
  let shopCode: string | null = null;

  try {
    const body = await req.json();
    const { message, code, history } = body;
    shopCode = code;

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    shopId = shop?.id || null;
    const { data: configData } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq, customer_insights, brand_voice').eq('shop_id', shop?.id).single();
    
    let config = configData;

    // Nếu shop không có cấu hình (ví dụ shop dùng thử mới tạo), lấy mặc định từ shop mẫu
    if (!config || (!config.product_info && !config.faq)) {
      // Lấy mã shop mẫu từ cài đặt (mặc định 70WPN)
      const { data: st } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'trial_template_shop_code').single();
      const templateCode = st?.value || '70WPN';

      const { data: sourceShop } = await supabaseAdmin.from('shops').select('id').eq('code', templateCode).single();
      if (sourceShop) {
        const { data: sourceConfig } = await supabaseAdmin.from('chatbot_configs').select('shop_name, product_info, faq, customer_insights, brand_voice').eq('shop_id', sourceShop.id).single();
        if (sourceConfig) {
          config = sourceConfig;
        }
      }
    }
    
    const shopName = config?.shop_name || shop?.name || 'Shop';
    const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });
    const voice = config?.brand_voice || 'nhẹ nhàng, ấm áp';
    const insights = config?.customer_insights || 'Hãy luôn chân thành và chủ động giúp đỡ khách hàng.';

    const systemPrompt = `
BẠN LÀ AI?
- Bạn là một "Người bạn đồng hành tâm hồn" của shop "${shopName}". 
- Tính cách & Giọng văn: ${voice}. Bạn không chỉ là AI, bạn là một người bạn luôn quan tâm đến cảm xúc của khách hàng.
- Hôm nay là: ${now}.

NHIỆM VỤ CHIẾN LƯỢC:
1. CHIẾN THUẬT NÍU KÉO (CUSTOMER INSIGHTS): ${insights}
2. NÍU KÉO & GẮN KẾT: Luôn tìm cách kết thúc câu trả lời bằng một câu hỏi gợi mở hoặc một lời chúc, lời hỏi thăm chân thành.
3. TRÒ CHUYỆN: Khách tâm lý, tâm sự thì hãy đồng cảm sâu sắc.
4. TƯ VẤN KHÉO LÉO: Đừng chỉ quăng thông tin sản phẩm, hãy lồng ghép nó vào lợi ích cho khách.
   - Sản phẩm: ${config?.product_info || 'Sản phẩm tâm huyết từ cửa hàng'}
   - FAQ: ${config?.faq || 'Tư vấn nhiệt tình 24/7'}

QUY TẮC:
- Xưng hô linh hoạt, lễ phép. Tránh trả lời máy móc.
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

    const finalResponse = await callGeminiWithFallback(
      contents.map(c => 
        c.role === 'user' && c.parts[0].text === message && message === '[WELCOME]' 
        ? { ...c, parts: [{ text: "Chào bạn! Hãy gửi cho mình một lời chào thật ấm áp, sâu sắc và chủ động hỏi thăm mình nhé. Đừng quên giới thiệu bạn là trợ lý của shop." }] } 
        : c
      ), 
      { temperature: 0.8, maxOutputTokens: 800 }, 
      shop?.id || null
    );

    // Lưu tin nhắn vào database
    if (shop?.id) {
      // Không lưu tin nhắn chào mừng tự động vào DB lịch sử để tránh loãng
      if (message !== '[WELCOME]') {
        await supabaseAdmin.from('messages').insert({
          shop_id: shop.id,
          session_id: `widget-${Date.now()}`,
          user_message: message,
          ai_response: finalResponse,
          usage_tokens: 0
        });
      }

      // Tự động xóa tin nhắn cũ hơn 10 ngày để nhẹ DB
      const tenDaysAgo = new Date();
      tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
      await supabaseAdmin.from('messages').delete().lt('created_at', tenDaysAgo.toISOString());
    }

    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    console.error('Lỗi Chatbot Widget:', error);
    
    // GHI LOG LỖI VÀO DB ĐỂ SUPER ADMIN BIẾT
    if (supabaseAdmin) {
      try {
        // Lấy thông tin shop để ghim vào tin nhắn lỗi cho dễ tìm
        const { data: shop } = await supabaseAdmin.from('shops').select('name, code').eq('id', shopId).single();
        const shopPrefix = shop 
          ? `[SHOP: ${shop.name} - #${shop.code}] ` 
          : `[LỖI MÃ: #${shopCode || 'Trống'}] `;
        
        await supabaseAdmin.from('error_logs').insert({
          shop_id: shopId,
          error_type: 'CHATBOT_WIDGET_ERROR',
          error_message: shopPrefix + (error.message || 'Lỗi không xác định'),
          source: 'API_CHAT_WIDGET'
        });
      } catch (logErr) {}
    }

    return NextResponse.json({ 
      response: "Dạ, em (Trợ lý ảo của shop) đang gặp chút gián đoạn kết nối kỹ thuật. Anh/chị vui lòng đợi em giây lát hoặc thử lại nhé. Shop xin lỗi vì sự bất tiện này ạ! 🙏",
      error: error.message 
    }, { status: 200 }); 
  }
}
