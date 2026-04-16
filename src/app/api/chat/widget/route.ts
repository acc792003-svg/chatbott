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

    // 1. Lấy thông tin Shop & Cấu hình
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
    let usedCache = false;

    // 2. LOGIC TỐI ƯU (CHỈ KHI KHÔNG PHẢI [WELCOME])
    if (message !== '[WELCOME]') {
      try {
        // A. TẠO EMBEDDING CHO CÂU HỎI
        const queryEmbedding = await generateEmbedding(message);

        // B. KIỂM TRA CACHE (Độ khớp cực cao > 96%)
        const { data: cached } = await supabaseAdmin
            .from('chat_cache')
            .select('answer, embedding')
            .eq('shop_id', shopId)
            .order('created_at', { ascending: false })
            .limit(20); // Kiểm tra 20 câu gần nhất

        if (cached) {
            // Tìm câu trong cache có độ tương đồng cao nhất
            for (const item of cached as any[]) {
                // Tính toán sơ bộ hoặc dùng logic so sánh vector nếu cần 
                // Ở đây ta dùng RPC cho chính xác hoặc đơn giản là lọc trong DB
            }
            // (Đơn giản hóa: Ta sẽ dùng RPC để tìm cả cache và faq)
        }

        // C. TÌM TRONG FAQ (Sử dụng hàm match_faqs đã tối ưu)
        const { data: matchedFaqs, error: rpcError } = await supabaseAdmin.rpc('match_faqs', {
            query_embedding: queryEmbedding,
            match_threshold: 0.82, 
            match_count: 3, // Lấy Top 3 để AI tham khảo
            p_shop_id: shopId
        });

        if (!rpcError && matchedFaqs && matchedFaqs.length > 0) {
            // Nếu có câu cực khớp (> 92%), trả về luôn để tiết kiệm
            if (matchedFaqs[0].similarity > 0.92) {
                finalResponse = matchedFaqs[0].answer;
                usedVectorSearch = true;
                usedCache = false;
            } else {
                // Nếu khớp vừa phải (0.82 - 0.92), ta dùng AI để "diễn đạt" lại cho mượt
                // Hoặc đưa vào Prompt làm ngữ cảnh
                console.log('Khớp vừa phải, dùng AI để tinh chỉnh...');
            }
        }
      } catch (err) {
        console.error('Advanced RAG Error:', err);
      }
    }

    // 3. AI FALLBACK & TỔNG HỢP KIẾN THỨC
    if (!finalResponse) {
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });
        
        // Truy vấn lại Top 3 FAQ liên quan (nếu có) để đưa vào ngữ cảnh cho AI
        let faqContext = 'Tư vấn nhiệt tình 24/7.';
        if (message !== '[WELCOME]') {
             const queryEmbedding = await generateEmbedding(message);
             const { data: topFaqs } = await supabaseAdmin.rpc('match_faqs', {
                query_embedding: queryEmbedding,
                match_threshold: 0.7, // Lấy rộng hơn để AI có dữ liệu tham khảo
                match_count: 5,
                p_shop_id: shopId
             });
             if (topFaqs && topFaqs.length > 0) {
                 faqContext = topFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
             }
        }

        const systemPrompt = `
BẠN LÀ AI?
- Trợ lý ảo của shop "${shopName}". Giọng văn: ${voice}. 
- Hôm nay: ${now}.

DỮ LIỆU TRI THỨC (ƯU TIÊN TRẢ LỜI THEO ĐÂY):
${faqContext}

THÔNG TIN SẢN PHẨM KHÁC:
${config?.product_info || ''}

CHIẾN THUẬT NÍU KÉO:
${insights}

QUY TẮC:
- Nếu dữ liệu tri thức trên có câu trả lời, hãy dùng nó để trả lời khách một cách tự nhiên.
- Nếu không thấy, hãy dùng kiến thức chung của bạn để hỗ trợ nhưng phải lịch sự và hướng khách để lại số điện thoại.
- Kết thúc bằng một câu hỏi hoặc lời chúc.
`;

        const historyContents = (history || []).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...historyContents,
          { role: 'user', parts: [{ text: message === '[WELCOME]' ? 'Chào bạn! Hãy giới thiệu shop và chủ động hỏi thăm mình nhé.' : message }] }
        ];

        finalResponse = await callGeminiWithFallback(contents, { temperature: 0.8, maxOutputTokens: 1000 }, shopId);
    }

    // 4. LƯU TIN NHẮN & CACHE
    if (message !== '[WELCOME]') {
      await supabaseAdmin.from('messages').insert({
        shop_id: shopId,
        session_id: `widget-${Date.now()}`,
        user_message: message,
        ai_response: finalResponse,
        usage_tokens: usedVectorSearch ? 0 : 1
      });

      // Lưu vào Cache nếu đây là một câu trả lời chất lượng (từ AI hoặc FAQ)
      try {
        const queryEmbedding = await generateEmbedding(message);
        await supabaseAdmin.from('chat_cache').insert({
            shop_id: shopId,
            question: message,
            answer: finalResponse,
            embedding: queryEmbedding
        });
      } catch (e) {}
    }

    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    console.error('Final RAG Error:', error);
    return NextResponse.json({ 
      response: "Dạ, em đang gặp chút gián đoạn kỹ thuật. Anh/chị đợi em giây lát nhé! 🙏"
    }, { status: 200 }); 
  }
}
