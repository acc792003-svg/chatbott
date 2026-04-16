import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback, generateEmbedding } from '@/lib/gemini';

// Memory cache đơn giản để chặn spam và quota ngày (IP-based)
const rateLimitMap = new Map<string, { count: number, resetTime: number }>();
const dailyQuotaMap = new Map<string, { count: number, date: string }>();

function checkRateLimit(key: string, limit: number, durationMs: number = 60000) {
    const now = Date.now();
    const info = rateLimitMap.get(key) || { count: 0, resetTime: now + durationMs };
    
    if (now > info.resetTime) {
        info.count = 1;
        info.resetTime = now + durationMs;
        rateLimitMap.set(key, info);
        return true;
    }

    if (info.count >= limit) return false;
    
    info.count += 1;
    rateLimitMap.set(key, info);
    return true;
}

export async function POST(req: Request) {
  let shopId: string | null = null;
  let shopCode: string | null = null;

  try {
    // --- 0. GLOBAL RATE LIMIT (PHANH KHẨN CẤP TOÀN HỆ THỐNG) ---
    // Giới hạn 300 request/phút toàn server để tránh sập hạ tầng
    if (!checkRateLimit(`global:system`, 300)) {
        return NextResponse.json({ response: "Hệ thống đang bảo trì định kỳ do lưu lượng quá tải, vui lòng quay lại sau 1 phút!" }, { status: 429 });
    }

    const body = await req.json();
    const { message: rawMessage, code, history } = body;
    const message = rawMessage?.trim();
    shopCode = code;

    // --- RATE LIMIT 3 TẦNG (CHỐNG SPAM PRODUCTION) ---
    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || 'anon-ip';
    
    // Tầng 1: IP Level (Max 20 req/min) - Chặn bot lùa
    if (!checkRateLimit(`ip:${ip}`, 20)) {
        return NextResponse.json({ response: "Hệ thống đang bận xử lý lưu lượng lớn từ nguồn của bạn, vui lòng đợi 1 phút." });
    }

    // --- RATE LIMIT TẦNG 3: User Level (Max 10 req/min) ---
    if (!checkRateLimit(`user:${shopCode}:${ip}`, 10)) {
        return NextResponse.json({ response: "Bạn nhắn tin nhanh quá, hãy đợi chút để em kịp trả lời nhé! ☕" });
    }

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    
    // --- 0.2 DAILY QUOTA CHECK (CHỈNH GIỚI HẠN NGÀY) ---
    const today = new Date().toISOString().split('T')[0];
    const userQuotaKey = `quota:${today}:${ip}`;
    const userQuota = dailyQuotaMap.get(userQuotaKey) || { count: 0, date: today };
    
    // Nếu qua ngày mới thì reset
    if (userQuota.date !== today) { userQuota.count = 0; userQuota.date = today; }
    
    // Check quota dựa trên plan (Free: 100, Pro: 300)
    // Lưu ý: isPro chưa định nghĩa ở đây, ta sẽ check tạm mặc định 100 
    // và sẽ check kỹ hơn sau khi lấy shop data. Ở đây ta chỉ tăng count tạm.
    userQuota.count += 1;
    dailyQuotaMap.set(userQuotaKey, userQuota);

    // 1. LẤY CONFIG SHOP
    const { data: shop } = await supabaseAdmin.from('shops').select('id, name, plan').eq('code', code).single();
    if (!shop) throw new Error('Shop không tồn tại');
    shopId = shop.id;
    const isPro = shop.plan === 'pro';

    // --- RATE LIMIT TẦNG 2: Shop Level (Hạng PRO: 100 req/phút | FREE: 50 req/phút) ---
    const shopLimit = isPro ? 100 : 50;
    if (!checkRateLimit(`shop:${shopCode}`, shopLimit)) {
        return NextResponse.json({ response: "Shop này hiện đang nhận quá nhiều tin nhắn, bạn vui lòng đợi chút nhé!" });
    }

    // --- BƯỚC 0.3: KIỂM TRA LẠI QUOTA CỨNG SAU KHI BIẾT SHOP PLAN ---
    const softLimit = isPro ? 250 : 80;
    const hardLimit = isPro ? 300 : 100;

    if (userQuota.count > hardLimit) {
        return NextResponse.json({ response: "Hôm nay bạn đã hỏi em rất nhiều rồi đó! Hãy nghỉ ngơi và quay lại vào ngày mai nhé. Chúc một ngày tốt lành! 😊" });
    }

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

    const isPro = shop.plan === 'pro';

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

        // --- BƯỚC 2.2: CACHE TẦNG 2 (L2 - SEMANTIC CACHE TỪ AI) ---
        // Chỉ dùng lại câu trả lời AI của CHÍNH gói tri thức này (myTemplateIds)
        if (!finalResponse) {
            const queryEmbedding = await generateEmbedding(message, isPro);
            const { data: cachedSemantic } = await supabaseAdmin.rpc('match_cache', {
                query_embedding: queryEmbedding,
                match_threshold: 0.95, // AI Cache cần độ chính xác cực cao
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

                    // Nếu cực kỳ khớp (> 0.85 cho FAQ) -> Trả lời ngay
                    if (similarityScore >= 0.85) {
                        finalResponse = matchedFaqs[0].answer;
                        resultSource = 'faq';
                    } else {
                        // Khớp vừa -> AI xử lý
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
            const queryEmbedding = await generateEmbedding(message, isPro);
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
            const queryEmbedding = await generateEmbedding(message, isPro);
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

    // Thêm cảnh báo soft limit vào câu trả lời
    let displayResponse = finalResponse;
    if (userQuota.count >= softLimit && userQuota.count <= hardLimit) {
        displayResponse += "\n\n(Lưu ý: Bạn sắp hết lượt hỏi miễn phí trong ngày hôm nay. Hãy tận dụng nhé! 😊)";
    }

    return NextResponse.json({ 
        response: displayResponse, 
        shop_name: shopName 
    });

  } catch (error: any) {
    console.error('Final Optimized RAG Error:', error);
    return NextResponse.json({ response: "Em đây, em đang gặp chút gián đoạn. Anh/chị đợi em tí nhé! 🙏" });
  }
}
