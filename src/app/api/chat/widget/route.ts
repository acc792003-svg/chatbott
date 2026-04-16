import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback, generateEmbedding } from '@/lib/gemini';

export async function POST(req: Request) {
  let shopId: string | null = null;
  let shopCode: string | null = null;

  try {
    const body = await req.json();
    const { message, code, history } = body;
    shopCode = code;

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    if (message === '[WELCOME]') {
         // Logic cho tin nhắn chào mừng (giữ nguyên hoặc tùy biến)
    }

    // 1. Lấy thông tin Shop & Cấu hình cơ bản
    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    if (!shop) throw new Error('Shop không tồn tại');
    shopId = shop.id;

    const { data: config } = await supabaseAdmin.from('chatbot_configs')
        .select('shop_name, product_info, customer_insights, brand_voice')
        .eq('shop_id', shopId)
        .single();
    
    const shopName = config?.shop_name || shop.name || 'Shop';
    const voice = config?.brand_voice || 'nhẹ nhàng, ấm áp';
    const insights = config?.customer_insights || 'Hãy luôn chân thành.';

    let finalResponse = '';
    let usedVectorSearch = false;

    // 2. TÌM KIẾM THÔNG MINH BẰNG VECTOR (Chỉ khi không phải tin nhắn đặc biệt)
    if (message !== '[WELCOME]') {
      try {
        // Tạo embedding cho câu hỏi của khách
        const queryEmbedding = await generateEmbedding(message);
        
        // Gọi hàm tìm kiếm Vector trong Database (RPC match_faqs)
        const { data: matchedFaqs, error: rpcError } = await supabaseAdmin.rpc('match_faqs', {
            query_embedding: queryEmbedding,
            match_threshold: 0.82, // Độ chính xác > 82%
            match_count: 1,
            p_shop_id: shopId
        });

        if (!rpcError && matchedFaqs && matchedFaqs.length > 0) {
            finalResponse = matchedFaqs[0].answer;
            usedVectorSearch = true;
            console.log(`✅ [Vector Match] - Shop: ${shopCode} - Độ khớp: ${matchedFaqs[0].similarity}`);
        }
      } catch (err: any) {
        console.error('Vector Search Error:', err);
        // Fallback sang AI nếu lỗi search
      }
    }

    // 3. AI FALLBACK (Nếu không tìm thấy FAQ khớp hoặc là tin [WELCOME])
    if (!finalResponse) {
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });
        const systemPrompt = `
BẠN LÀ AI?
- Bạn là trợ lý ảo của shop "${shopName}". 
- Tính cách & Giọng văn: ${voice}. 
- Hôm nay là: ${now}.

NHIỆM VỤ:
- CHIẾN THUẬT NÍU KÉO: ${insights}
- SẢN PHẨM: ${config?.product_info || 'Liên hệ shop để biết thêm chi tiết.'}
- LUÔN kết thúc bằng một câu hỏi gợi mở hoặc lời chúc chân thành để níu kéo khách hàng.
`;

        const historyContents = (history || []).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...historyContents,
          { role: 'user', parts: [{ text: message === '[WELCOME]' ? 'Chào bạn! Hãy giới thiệu bạn là trợ lý của shop và hỏi thăm mình nhé.' : message }] }
        ];

        finalResponse = await callGeminiWithFallback(contents, { temperature: 0.8, maxOutputTokens: 800 }, shopId);
    }

    // 4. LƯU TIN NHẮN & LOG
    if (message !== '[WELCOME]') {
      await supabaseAdmin.from('messages').insert({
        shop_id: shopId,
        session_id: `widget-${Date.now()}`,
        user_message: message,
        ai_response: finalResponse,
        usage_tokens: usedVectorSearch ? 0 : 1 // Đánh dấu 0 nếu dùng vector để thống kê tiết kiệm được bao nhiêu
      });
    }

    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    console.error('Chat Widget Error:', error);
    return NextResponse.json({ 
      response: "Dạ, em đang gặp chút gián đoạn kỹ thuật. Anh/chị vui lòng thử lại sau giây lát nhé! 🙏"
    }, { status: 200 }); 
  }
}
