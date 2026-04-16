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

    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    if (!shop) throw new Error('Shop không tồn tại');
    shopId = shop.id;

    // Lấy danh sách Template IDs mà shop này đang sử dụng
    const { data: stMap } = await supabaseAdmin.from('shop_templates').select('template_id').eq('shop_id', shopId);
    const myTemplateIds = stMap?.map(m => m.template_id) || [];

    const { data: config } = await supabaseAdmin.from('chatbot_configs')
        .select('shop_name, product_info, customer_insights, brand_voice')
        .eq('shop_id', shopId)
        .single();
    
    const shopName = config?.shop_name || shop.name || 'Shop';
    const voice = config?.brand_voice || 'nhẹ nhàng, ấm áp';
    const insights = config?.customer_insights || 'Hãy luôn chân thành.';

    let finalResponse = '';
    let usedVectorSearch = false;
    let resultSource: 'faq' | 'ai' = 'ai';
    let matchedTemplateId: string | null = null;

    if (message !== '[WELCOME]') {
      try {
        const queryEmbedding = await generateEmbedding(message);

        // 1. TÌM KIẾM TRONG CACHE (Ưu tiên câu đã trả lời chất lượng cao)
        // Tìm câu khớp trong Cache của Shop HOẶC Cache của các Template mà Shop đang dùng
        const { data: cachedFaqs } = await supabaseAdmin.rpc('match_cache', {
            query_embedding: queryEmbedding,
            match_threshold: 0.95, // Yêu cầu khớp cực cao để reuse cache
            match_count: 1,
            p_shop_id: shopId,
            p_template_ids: myTemplateIds
        });

        if (cachedFaqs && cachedFaqs.length > 0) {
            finalResponse = cachedFaqs[0].answer;
            resultSource = cachedFaqs[0].source_type;
            matchedTemplateId = cachedFaqs[0].template_id;
            console.log(`⚡ [Cache Hit] - Source: ${resultSource}`);
        }

        // 2. TÌM KIẾM TRONG FAQ CHUYÊN SÂU (Nếu Cache không có)
        if (!finalResponse) {
            const { data: matchedFaqs, error: rpcError } = await supabaseAdmin.rpc('match_faqs', {
                query_embedding: queryEmbedding,
                match_threshold: 0.82, 
                match_count: 3,
                p_shop_id: shopId
            });

            if (!rpcError && matchedFaqs && matchedFaqs.length > 0) {
                if (matchedFaqs[0].similarity > 0.92) {
                    finalResponse = matchedFaqs[0].answer;
                    resultSource = 'faq';
                    matchedTemplateId = matchedFaqs[0].template_id;
                    usedVectorSearch = true;
                }
            }
        }
      } catch (err) {
        console.error('RAG System Error:', err);
      }
    }

    // 3. AI FALLBACK & TỔNG HỢP KIẾN THỨC
    if (!finalResponse) {
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });
        
        let faqContext = 'Tư vấn nhiệt tình 24/7.';
        if (message !== '[WELCOME]') {
             const queryEmbedding = await generateEmbedding(message);
             const { data: topFaqs } = await supabaseAdmin.rpc('match_faqs', {
                query_embedding: queryEmbedding,
                match_threshold: 0.7,
                match_count: 5,
                p_shop_id: shopId
             });
             if (topFaqs && topFaqs.length > 0) {
                 faqContext = topFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
                 // Nếu dùng AI fallback, ta lấy template_id của câu gần nhất để lưu vào cache sau này
                 matchedTemplateId = topFaqs[0].template_id;
             }
        }

        const systemPrompt = `
BẠN LÀ AI?
- Trợ lý ảo của shop "${shopName}". Giọng văn: ${voice}. 
- Hôm nay: ${now}.

DỮ LIỆU TRI THỨC (CỦA CHÍNH SHOP):
${faqContext}

THÔNG TIN SẢN PHẨM KHÁC:
${config?.product_info || ''}

CHIẾN THUẬT NÍU KÉO:
${insights}

QUY TẮC:
- Trả lời theo DỮ LIỆU TRI THỨC được cung cấp. Nếu không thấy, dùng kiến thức bổ trợ nhưng phải hướng về sản phẩm của shop.
- Luôn lễ phép, kết thúc bằng một câu hỏi hoặc lời chúc.
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
        resultSource = 'ai';
    }

    // 4. LƯU TIN NHẮN & CACHE
    if (message !== '[WELCOME]') {
      await supabaseAdmin.from('messages').insert({
        shop_id: shopId,
        session_id: `widget-${Date.now()}`,
        user_message: message,
        ai_response: finalResponse,
        usage_tokens: resultSource === 'faq' ? 0 : 1
      });

      // LƯU CACHE (Nâng cấp: Gắn thêm source_type và template_id)
      try {
        const queryEmbedding = await generateEmbedding(message);
        await supabaseAdmin.from('chat_cache').insert({
            shop_id: shopId,
            template_id: matchedTemplateId,
            question: message,
            answer: finalResponse,
            embedding: queryEmbedding,
            source_type: resultSource
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
