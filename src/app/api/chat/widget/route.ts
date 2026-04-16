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
  const globalStart = Date.now();
  let shopId: string | null = null;
  let shopCode: string | null = null;

  try {
    // --- 0. RATE LIMITS ---
    if (!checkRateLimit(`global:system`, 300)) {
        return NextResponse.json({ response: "Hệ thống đang bận, vui lòng thử lại sau 1 phút!" }, { status: 429 });
    }

    const body = await req.json();
    const { message: rawMessage, code, history } = body;

    // --- CHUẨN HÓA TIN NHẮN (PRODUCTION CLEANUP) ---
    const message = rawMessage?.trim().toLowerCase();
    shopCode = code;

    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || 'anon-ip';

    console.log(`[REQUEST_START] Shop: ${shopCode} | User: ${ip}`);

    if (!checkRateLimit(`ip:${ip}`, 20) || !checkRateLimit(`user:${shopCode}:${ip}`, 10)) {
        return NextResponse.json({ response: "Bạn nhắn tin nhanh quá, hãy đợi chút nhé! ☕" });
    }

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    
    // --- SHOP CONFIG ---
    const { data: shop } = await supabaseAdmin.from('shops').select('id, name, plan').eq('code', code).single();
    if (!shop) throw new Error('Shop không tồn tại');
    shopId = shop.id;
    const isPro = shop.plan === 'pro';

    // --- DAILY QUOTA ---
    const today = new Date().toISOString().split('T')[0];
    const userQuotaKey = `quota:${today}:${ip}`;
    const userQuota = dailyQuotaMap.get(userQuotaKey) || { count: 0, date: today };
    if (userQuota.date !== today) { userQuota.count = 0; userQuota.date = today; }
    userQuota.count += 1;
    dailyQuotaMap.set(userQuotaKey, userQuota);

    const softLimit = isPro ? 250 : 80;
    const hardLimit = isPro ? 300 : 100;
    if (userQuota.count > hardLimit) {
        return NextResponse.json({ response: "Hôm nay bạn đã hỏi em rất nhiều rồi đó! Hãy nghỉ ngơi nhé. 😊" });
    }

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
    let queryEmbedding: number[] | null = null;

    if (message && message !== '[WELCOME]') {
      try {
        // --- CACHE L1: EXACT MATCH (0ms Embedding) ---
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

        // --- NẾU L1 FAIL -> TẠO EMBEDDING 1 LẦN DUY NHẤT ---
        if (!finalResponse) {
          queryEmbedding = await generateEmbedding(message, isPro);
          
          // CACHE L2: SEMANTIC CACHE
          const { data: stMap } = await supabaseAdmin.from('shop_templates').select('template_id').eq('shop_id', shopId);
          const myTemplateIds = stMap?.map((m: any) => m.template_id) || [];

          const { data: cachedSemantic } = await supabaseAdmin.rpc('match_cache', {
              query_embedding: queryEmbedding,
              match_threshold: 0.95,
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

          // FAQ SEARCH
          if (!finalResponse) {
            const { data: matchedFaqs } = await supabaseAdmin.rpc('match_faqs', {
                query_embedding: queryEmbedding,
                match_threshold: 0.80,
                match_count: 3,
                p_shop_id: shopId
            });

            if (matchedFaqs && matchedFaqs.length > 0) {
                similarityScore = matchedFaqs[0].similarity;
                matchedTemplateId = matchedFaqs[0].template_id;

                if (similarityScore >= 0.85) {
                    finalResponse = matchedFaqs[0].answer;
                    resultSource = 'faq';
                }
            }
          }
        }
      } catch (err) {
        console.error('Core Logic Error:', err);
      }
    }

    // --- AI GENERATION ---
    if (!finalResponse) {
        let faqContext = '';
        if (similarityScore > 0.75 && queryEmbedding) {
            const { data: topContext } = await supabaseAdmin.rpc('match_faqs', {
                query_embedding: queryEmbedding,
                match_threshold: 0.7,
                match_count: 3,
                p_shop_id: shopId
            });
            if (topContext) faqContext = topContext.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
        }

        const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });
        const systemPrompt = `BẠN LÀ Trợ lý shop "${shopName}". Giọng: ${voice}. Hôm nay: ${now}.\n${faqContext ? `TRI THỨC:\n${faqContext}\n\n` : ''}SHOP INFO: ${config?.product_info || ''}\n${insights}\nQUY TẮC: Trả lời lễ phép, dùng thông tin shop, không tự chế.`;

        const contents = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          ...(history || []).map((msg: any) => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })),
          { role: 'user', parts: [{ text: message === '[WELCOME]' ? 'Chào bạn!' : message }] }
        ];

        finalResponse = await callGeminiWithFallback(contents, { temperature: 0.7 }, shopId);
        resultSource = 'ai';
    }

    // --- LƯU TIN NHẮN & CACHE (DÙNG LẠI EMBEDDING CÓ SẴN) ---
    if (message && message !== '[WELCOME]') {
      await supabaseAdmin.from('messages').insert({
        shop_id: shopId,
        session_id: `widget-${Date.now()}`,
        user_message: message,
        ai_response: finalResponse,
        usage_tokens: 1,
        metadata: { source: resultSource, score: similarityScore, time: Date.now() - globalStart }
      });

      if (resultSource !== 'cache_exact' && queryEmbedding) {
        try {
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

    let displayResponse = finalResponse;
    if (userQuota.count >= softLimit && userQuota.count <= hardLimit) {
        displayResponse += "\n\n(Lưu ý: Bạn sắp hết lượt hỏi trong ngày.)";
    }

    console.log(`[TOTAL_TIME] ${Date.now() - globalStart}ms`);
    return NextResponse.json({ response: displayResponse, shop_name: shopName });

  } catch (error: any) {
    console.error('Final Optimized Error:', error);
    return NextResponse.json({ response: "Em đang bận một chút, bạn thử lại sau vài giây nhé! 🙏" });
  }
}
