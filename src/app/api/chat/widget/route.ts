import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback, generateEmbedding } from '@/lib/gemini';

export async function POST(req: Request) {
  let shopId: string | null = null;
  let shopCode: string | null = null;

  try {
    const body = await req.json();
    const { message: rawMessage, code, history } = body;
    const message = rawMessage?.trim();
    shopCode = code;

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });

    // 1. LẤY CONFIG SHOP
    const { data: shop } = await supabaseAdmin.from('shops').select('id, name').eq('code', code).single();
    if (!shop) throw new Error('Shop không tồn tại');
    shopId = shop.id;

    const { data: stMap } = await supabaseAdmin.from('shop_templates').select('template_id').eq('shop_id', shopId);
    const myTemplateIds = stMap?.map((m: any) => m.template_id) || [];

    const { data: config } = await supabaseAdmin.from('chatbot_configs')
        .select('shop_name, product_info, customer_insights, brand_voice')
        .eq('shop_id', shopId)
        .single();
    
    const shopName = config?.shop_name || shop.name || 'Shop';
    const voice = config?.brand_voice || 'nhẹ nhàng, ấm áp';
    const insights = config?.customer_insights || 'Hãy luôn chân thành.';

    let finalResponse = '';
    let resultSource: 'faq' | 'ai' | 'cache_exact' | 'cache_semantic' = 'ai';
    let matchedTemplateId: string | null = null;
    let similarityScore = 0;

    if (message && message !== '[WELCOME]') {
      try {
        // --- BƯỚC 2.1: CACHE TẦNG 1 (L1 - EXACT MATCH) ---
        // Tiết kiệm 100% phí Embedding nếu khách hỏi câu cũ y hệt
        const { data: exactMatch } = await supabaseAdmin
            .from('chat_cache')
            .select('answer, source_type, template_id')
            .eq('question', message)
            .eq('shop_id', shopId)
            .limit(1)
            .single();

        if (exactMatch) {
            finalResponse = exactMatch.answer;
            resultSource = 'cache_exact';
            matchedTemplateId = exactMatch.template_id;
            similarityScore = 1.0;
        }

        // --- BƯỚC 2.2: CACHE TẦNG 2 (L2 - SEMANTIC CACHE) ---
        if (!finalResponse) {
            const queryEmbedding = await generateEmbedding(message);
            const { data: cachedSemantic } = await supabaseAdmin.rpc('match_cache', {
                query_embedding: queryEmbedding,
                match_threshold: 0.90, // Threshold tối ưu theo đề xuất
                match_count: 1,
                p_shop_id: shopId,
                p_template_ids: myTemplateIds
            });

            if (cachedSemantic && cachedSemantic.length > 0) {
                finalResponse = cachedSemantic[0].answer;
                resultSource = 'cache_semantic';
                matchedTemplateId = cachedSemantic[0].template_id;
                similarityScore = cachedSemantic[0].similarity;
            }

            // --- BƯỚC 2.3: TRUY VẤN XƯỞNG TRI THỨC (RAG) ---
            if (!finalResponse) {
                const { data: matchedFaqs } = await supabaseAdmin.rpc('match_faqs', {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.80, // Lấy rộng hơn để AI tổng hợp
                    match_count: 3,
                    p_shop_id: shopId
                });

                if (matchedFaqs && matchedFaqs.length > 0) {
                    similarityScore = matchedFaqs[0].similarity;
                    matchedTemplateId = matchedFaqs[0].template_id;

                    // Nếu cực kỳ khớp (> 0.9) -> Trả lời ngay
                    if (similarityScore > 0.90) {
                        finalResponse = matchedFaqs[0].answer;
                        resultSource = 'faq';
                    } else {
                        // Khớp vừa (0.8 - 0.9) -> AI sẽ dùng làm ngữ cảnh ở Bước 3
                        console.log('Khớp vừa, chuyển AI xử lý kèm ngữ cảnh...');
                    }
                }
            }
        }
      } catch (err) {
        console.error('Production RAG Error:', err);
      }
    }

    // 3. AI GENERATION (FALLBACK & PHỐI HỢP)
    if (!finalResponse) {
        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });
        
        let faqContext = '';
        // Chỉ lấy FAQ làm context nếu độ khớp tương đối tốt (> 0.75)
        if (similarityScore > 0.75) {
            const queryEmbedding = await generateEmbedding(message);
            const { data: topContext } = await supabaseAdmin.rpc('match_faqs', {
                query_embedding: queryEmbedding,
                match_threshold: 0.7,
                match_count: 3,
                p_shop_id: shopId
            });
            if (topContext) faqContext = topContext.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
        }

        const systemPrompt = `
BẠN LÀ AI?
- Trợ lý của shop "${shopName}". Giọng: ${voice}. 
- Hôm nay: ${now}.

${faqContext ? `TRI THỨC ƯU TIÊN:\n${faqContext}\n\n` : ''}
THÔNG TIN SHOP: ${config?.product_info || ''}
CHIẾN THUẬT: ${insights}

QUY TẮC:
- Dùng "TRI THỨC ƯU TIÊN" để trả lời nếu có. Nếu không, dùng "THÔNG TIN SHOP".
- KHÔNG tự chế thông tin nhạy cảm (giá, ưu đãi) nếu không có trong dữ liệu.
- Luôn lễ phép, kết thúc gợi mở.
`;

        const historyContents = (history || []).map((msg: any) => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...historyContents,
          { role: 'user', parts: [{ text: message === '[WELCOME]' ? 'Chào bạn! Hãy giới thiệu shop và hỏi thăm mình nhé.' : message }] }
        ];

        finalResponse = await callGeminiWithFallback(contents, { temperature: 0.7 }, shopId);
        resultSource = 'ai';
    }

    // 4. LƯU TIN NHẮN & CACHE
    if (message !== '[WELCOME]') {
      await supabaseAdmin.from('messages').insert({
        shop_id: shopId,
        session_id: `widget-${Date.now()}`,
        user_message: message,
        ai_response: finalResponse,
        usage_tokens: similarityScore > 0.9 ? 0 : 1, // Log token dựa trên độ khớp
        metadata: { source: resultSource, score: similarityScore } // Lưu metadata để debug
      });

      // Chỉ lưu vào Cache nếu chưa có trong L1 (Exact match)
      if (resultSource !== 'cache_exact') {
        try {
            const queryEmbedding = await generateEmbedding(message);
            await supabaseAdmin.from('chat_cache').insert({
                shop_id: shopId,
                template_id: matchedTemplateId,
                question: message,
                answer: finalResponse,
                embedding: queryEmbedding,
                source_type: resultSource === 'faq' ? 'faq' : 'ai'
            });
        } catch (e) {}
      }
    }

    return NextResponse.json({ response: finalResponse, shop_name: shopName });

  } catch (error: any) {
    console.error('Final Optimized RAG Error:', error);
    return NextResponse.json({ response: "Em đây, em đang gặp chút gián đoạn. Anh/chị đợi em tí nhé! 🙏" });
  }
}
