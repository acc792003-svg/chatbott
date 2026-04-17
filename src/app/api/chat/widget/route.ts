import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';
import { callGeminiWithFallback, generateEmbedding } from '@/lib/gemini';
import { detectAndSaveLead } from '@/lib/leads';

// --- UTILS ---
function normalizeMessage(text: string): string {
    return text.trim().toLowerCase()
        .replace(/[?.,!]/g, '') // Loại bỏ dấu câu
        .replace(/\s+/g, ' ');   // Thu gọn khoảng trắng
}

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
  let conversationId: string | null = null;

  try {
    const body = await req.json();
    const { message: rawMessage, code, history, clientId } = body;
    const message = rawMessage?.trim();
    const normalized = normalizeMessage(message || '');
    shopCode = code;

    const headerList = await headers();
    const ip = headerList.get('x-forwarded-for') || 'anon-ip';

    // --- 1. RATE LIMITS ---
    if (!checkRateLimit(`ip:${ip}`, 20) || !checkRateLimit(`user:${shopCode}:${ip}`, 10)) {
        return NextResponse.json({ response: "Bạn nhắn tin nhanh quá, hãy đợi chút nhé! ☕" });
    }

    if (!supabaseAdmin) throw new Error('DB Connection Error');
    
    // --- 2. SHOP & CONFIG ---
    const { data: shop } = await supabaseAdmin.from('shops').select('id, name, plan').eq('code', code).single();
    if (!shop) throw new Error('Shop không tồn tại');
    shopId = shop.id;
    const isPro = shop.plan === 'pro';

    // (Vẫn giữ logic Quota ngày)
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

    // --- 3. CONVERSATION MANAGEMENT ---
    const externalUserId = clientId || `anon-${ip}`;
    const { data: conv } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .eq('shop_id', shopId)
        .eq('external_user_id', externalUserId)
        .eq('platform', 'widget')
        .maybeSingle();
    
    if (conv) {
        conversationId = conv.id;
    } else {
        const { data: newConv } = await supabaseAdmin
            .from('conversations')
            .insert({ shop_id: shopId, external_user_id: externalUserId, platform: 'widget' })
            .select()
            .single();
        conversationId = newConv?.id;
    }

    // --- 4. HYBRID AI ENGINE (FAQ -> CACHE -> AI) ---
    let finalResponse = '';
    let resultSource: 'faq' | 'cache' | 'ai' = 'ai';
    let similarityScore = 0;
    let queryEmbedding: number[] | null = null;

    if (message && message !== '[welcome]') {
        // LỚP 1: FAQ MATCHING (Keyword FIRST)
        const { data: exactFaq } = await supabaseAdmin
            .from('faqs')
            .select('answer')
            .eq('shop_id', shopId)
            .ilike('question', normalized)
            .maybeSingle();
        
        if (exactFaq) {
            finalResponse = exactFaq.answer;
            resultSource = 'faq';
            similarityScore = 1.0;
        }

        // LỚP 1.5: VECTOR SEARCH (Nếu Keyword fail)
        if (!finalResponse) {
            queryEmbedding = await generateEmbedding(normalized, isPro);
            const { data: vectorFaqs } = await supabaseAdmin.rpc('match_faqs', {
                query_embedding: queryEmbedding,
                match_threshold: 0.85, // Ngưỡng chính xác cao
                match_count: 1,
                p_shop_id: shopId
            });

            if (vectorFaqs && vectorFaqs.length > 0) {
                finalResponse = vectorFaqs[0].answer;
                resultSource = 'faq';
                similarityScore = vectorFaqs[0].similarity;
            }
        }

        // LỚP 2: CACHE MATCHING
        if (!finalResponse) {
            const { data: cacheMatch } = await supabaseAdmin
                .from('cache_answers')
                .select('answer')
                .eq('shop_id', shopId)
                .eq('question', normalized)
                .maybeSingle();
            
            if (cacheMatch) {
                finalResponse = cacheMatch.answer;
                resultSource = 'cache';
            }
        }

        // LỚP 3: AI FALLBACK (Gemini)
        if (!finalResponse) {
            const { data: config } = await supabaseAdmin.from('chatbot_configs')
                .select('shop_name, product_info, customer_insights, brand_voice')
                .eq('shop_id', shopId)
                .single();

            // Lấy thêm ngữ cảnh từ FAQ (Top 3 tương đồng)
            let faqContext = '';
            if (queryEmbedding) {
                const { data: topFaqs } = await supabaseAdmin.rpc('match_faqs', {
                    query_embedding: queryEmbedding,
                    match_threshold: 0.6,
                    match_count: 3,
                    p_shop_id: shopId
                });
                if (topFaqs) faqContext = topFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
            }

            const shopName = config?.shop_name || shop.name || 'Shop';
            const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });
            
            // CRM HOOK LOGIC (Phối hợp với lib/leads)
            const leadsLib = await import('@/lib/leads');
            const hasPhoneInMsg = leadsLib.extractPhone(message);
            const historyText = (history || []).map((h: any) => h.content).join(" ");
            const alreadyHasPhone = !!leadsLib.extractPhone(historyText) || !!hasPhoneInMsg;
            const { count: askedCount, gap } = leadsLib.countPreviousAsks(history || []);
            const hasIntent = leadsLib.hasHighIntent(normalized);

            let leadInstruction = "";
            if (!alreadyHasPhone && hasIntent && askedCount < 2 && gap >= 3) {
                leadInstruction = "\n👉 HÀNH ĐỘNG: Khách đang quan tâm, hãy khéo léo gợi ý họ để lại SĐT để shop hỗ trợ nhanh nhất.";
            }

            const systemPrompt = `BẠN LÀ Trợ lý shop "${shopName}". Giọng: ${config?.brand_voice || 'nhẹ nhàng'}. Hôm nay: ${now}.
${faqContext ? `TRI THỨC BỔ SUNG:\n${faqContext}\n\n` : ''}THÔNG TIN SHOP: ${config?.product_info || ''}
${config?.customer_insights || ''}
QUY TẮC: Trả lời lễ phép, dùng icon emoji. Nếu khách để lại SĐT, hãy cảm ơn.${leadInstruction}`;

            const contents = [
              { role: 'user', parts: [{ text: systemPrompt }] },
              ...(history || []).map((msg: any) => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })),
              { role: 'user', parts: [{ text: message }] }
            ];

            finalResponse = await callGeminiWithFallback(contents, { temperature: 0.7 }, shopId);
            resultSource = 'ai';

            // Lưu vào Cache cho lần sau
            if (queryEmbedding) {
                await supabaseAdmin.from('cache_answers').insert({ 
                    shop_id: shopId, question: normalized, answer: finalResponse 
                }).catch(() => {});
            }
        }
    } else if (message === '[welcome]') {
        finalResponse = "Chào bạn! Shop có thể giúp gì cho bạn hôm nay? 😊";
        resultSource = 'faq';
    }

    // --- 5. LOGGING & LEADS ---
    const latency = Date.now() - globalStart;
    
    // Ghi nhật ký vận hành (Production Monitor)
    await supabaseAdmin.from('chat_logs').insert({
        shop_id: shopId,
        user_input: message,
        answer: finalResponse,
        source: resultSource,
        latency_ms: latency
    });

    // Lưu tin nhắn vào lịch sử hội thoại
    await supabaseAdmin.from('messages').insert({
        shop_id: shopId,
        conversation_id: conversationId,
        user_message: message,
        ai_response: finalResponse,
        platform: 'widget',
        external_user_id: externalUserId,
        metadata: { source: resultSource, score: similarityScore, latency }
    });

    // Xử lý Lead (SĐT) ngầm
    if (message && message !== '[welcome]' && shopId) {
        const { data: config } = await supabaseAdmin.from('chatbot_configs').select('*').eq('shop_id', shopId).single();
        (await import('@/lib/leads')).detectAndSaveLead(message, shopId, externalUserId, config).catch(() => {});
    }

    return NextResponse.json({ 
        response: finalResponse + (userQuota.count >= softLimit ? "\n\n(Lưu ý: Bạn sắp hết lượt hỏi trong ngày.)" : ""), 
        shop_name: shopCode 
    });

  } catch (error: any) {
    console.error('Widget Chat Error:', error);
    return NextResponse.json({ response: "Em đang bận một chút, bạn thử lại sau vài giây nhé! 🙏" });
  }
}
