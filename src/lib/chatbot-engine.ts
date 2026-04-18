import { supabase, supabaseAdmin } from './supabase';
import { callGeminiWithFallback, generateEmbedding } from './gemini';

/**
 * 🧠 CHATBOT ENGINE CORE (V3.1 - Hyper Resilience)
 * Cấu trúc đồng bộ hóa Radar và chống lỗi thầm lặng
 */

export interface ChatRequest {
  shopId: string;
  message: string;
  history?: { role: string; content: string }[];
  externalUserId: string;
  platform: 'widget' | 'facebook' | 'telegram';
  isPro?: boolean;
  metadata?: any;
}

export interface ChatResponse {
  answer: string;
  source: 'faq' | 'cache' | 'ai';
  latency: number;
  intent?: string;
}

export function normalizeMessage(text: string): string {
  return text.trim().toLowerCase()
    .replace(/[?.,!]/g, '') 
    .replace(/\s+/g, ' ');   
}

export async function processChat(req: ChatRequest): Promise<ChatResponse> {
  const start = Date.now();
  const { shopId, message, history, externalUserId, platform, isPro } = req;
  const normalized = normalizeMessage(message);
  
  let finalResponse = '';
  let resultSource: 'faq' | 'cache' | 'ai' = 'ai';
  let queryEmbedding: number[] | null = null;
  let totalUsageTokens = 0;
  let shopCode = 'unknown';

  const client = supabaseAdmin || supabase;

  try {
    const { data: shopData } = await client.from('shops').select('name, code').eq('id', shopId).maybeSingle();
    const { data: shopConfig } = await client.from('chatbot_configs')
      .select('shop_name, product_info, pricing_info, faq, is_active, industry')
      .eq('shop_id', shopId)
      .maybeSingle();
    
    shopCode = shopData?.code || 'unknown';
    
    // Kiểm tra hoạt động
    if (shopConfig && shopConfig.is_active === false) {
       return { answer: "Dạ, hiện tại chatbot đang tạm nghỉ bảo trì, bạn nhắn lại sau ít phút nhe! 🙏", source: 'faq', latency: 0 };
    }

    console.log(`[Engine] START chat for Shop: ${shopData?.name || shopConfig?.shop_name || shopId} (#${shopCode})`);
    
    // 1. EMBEDDING
    queryEmbedding = await generateEmbedding(normalized, !!isPro);

    // 2. Ý ĐỊNH
    const { data: keywords } = await client
      .from('keywords')
      .select('*')
      .eq('is_active', true)
      .or(`level.eq.global,and(level.eq.industry,industry.eq.${shopConfig?.industry || 'general'}),and(level.eq.shop,shop_id.eq.${shopId})`);

    let detectedIntent = 'unknown';
    if (keywords && keywords.length > 0) {
      const intentScores: Record<string, number> = {};
      keywords.forEach((kw: any) => {
        if (normalized.includes(kw.keyword.toLowerCase())) {
          intentScores[kw.intent] = (intentScores[kw.intent] || 0) + (Number(kw.weight) || 1);
        }
      });
      const topIntent = Object.entries(intentScores).sort((a: any, b: any) => b[1] - a[1])[0];
      if (topIntent) detectedIntent = topIntent[0];
    }

    // 3. VECTOR SEARCH
    const { data: vectorFaqs } = await client.rpc('match_faqs', {
      query_embedding: queryEmbedding,
      match_threshold: 0.85,
      match_count: 5,
      p_shop_id: shopId
    });
    
    if (vectorFaqs && vectorFaqs.length > 0) {
      const scoredFaqs = vectorFaqs.map((f: any) => ({ ...f, hybridScore: (f.similarity * 0.7) + (f.question.toLowerCase().includes(normalized) ? 0.3 : 0) }))
                                   .sort((a: any, b: any) => b.hybridScore - a.hybridScore);

      if (scoredFaqs[0].hybridScore >= 0.85) {
        finalResponse = scoredFaqs[0].answer;
        resultSource = 'faq';
      }
    }

    if (!finalResponse) {
      const { data: cacheMatches } = await client.rpc('match_cache', {
        query_embedding: queryEmbedding,
        match_threshold: 0.95,
        match_count: 1,
        p_shop_id: shopId
      });
      if (cacheMatches && cacheMatches.length > 0) {
        finalResponse = cacheMatches[0].answer;
        resultSource = 'cache';
      }
    }

    // 4. AI INFERENCE
    if (!finalResponse) {
       const faqContext = vectorFaqs && vectorFaqs.length > 0 ? vectorFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n') : "";

        const systemPrompt = `BẠN LÀ Trợ lý shop chuyên nghiệp của "${shopData?.name || shopConfig?.shop_name || 'Shop'}". 
HÃY SỬ DỤNG CÁC THÔNG TIN DƯỚI ĐÂY ĐỂ TRẢ LỜI KHÁCH HÀNG MỘT CÁCH TỰ NHIÊN. ĐỪNG LIỆT KÊ TÊN CÁC ĐẦU MỤC (NHƯ TRI THỨC VECTOR, GIÁ CẢ...).

TRI THỨC VECTOR (KẾT QUẢ TÌM KIẾM): ${faqContext}
THÔNG TIN CHĂM SÓC: ${shopConfig?.product_info || ''}
BẢNG GIÁ: ${shopConfig?.pricing_info || ''}
CÁC CÂU HỎI THƯỜNG GẶP: ${shopConfig?.faq || ''}

QUY TẮC: 
1. Nếu không có thông tin trong các mục trên, hãy trả lời lịch sự là "Dạ mình chưa có thông tin về vấn đề này, mình sẽ báo quản lý hỗ trợ bạn sớm nhe!".
2. Luôn xưng hô thân thiện, dùng emoji phù hợp.`;

        const aiResult = await callGeminiWithFallback([
          ...(history || []).slice(-5).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: message }] }
        ], { temperature: 0.7 }, shopId, 'API_CHAT_WIDGET', systemPrompt);

       finalResponse = aiResult.text;
       totalUsageTokens = aiResult.tokens;
       resultSource = 'ai';

       if (queryEmbedding && finalResponse.length < 500) {
          await client.from('cache_answers').insert({ shop_id: shopId, question: normalized, answer: finalResponse, embedding: queryEmbedding });
       }
    }

    const latency = Date.now() - start;
    await saveLogs(shopId, message, finalResponse, resultSource, latency, platform, externalUserId, totalUsageTokens);
    summarizeThread(shopId, externalUserId, [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: finalResponse }]);

    return { answer: finalResponse, source: resultSource, latency, intent: detectedIntent };

  } catch (error: any) {
    console.error('Core Engine Error:', error);
    if (client) {
      // Dùng AWAIT để chắc chắn log được bay đi
      await client.from('system_errors').insert({
        shop_id: shopId,
        error_type: 'ENGINE_CRASH_STABLE',
        error_message: error.message,
        file_source: 'chatbot-engine.ts',
        metadata: { shopCode, platform, stack: error.stack, message: message.substring(0, 50) }
      });
    }
    return { answer: "Dạ, chatbot hiện đang bận một chút, bạn chờ vài giây rồi nhắn lại nhe! 🙏", source: 'ai', latency: 0 };
  }
}

async function saveLogs(shopId: string, message: string, answer: string, source: string, latency: number, platform: string, externalUserId: string, tokens: number) {
  try {
    const client = supabaseAdmin || supabase;
    await client.from('chat_logs').insert({ shop_id: shopId, user_input: message, answer, source, latency_ms: latency, total_tokens: tokens });
    await client.from('messages').insert({ shop_id: shopId, user_message: message, ai_response: answer, platform, session_id: externalUserId, total_tokens: tokens, metadata: { source, latency } });
  } catch (e) {}
}

async function summarizeThread(shopId: string, externalUserId: string, fullHistory: any[]) {
  try {
    const client = supabaseAdmin || supabase;
    const historyText = fullHistory.slice(-10).map((h: any) => `${h.role}: ${h.content}`).join('\n');
    const { text } = await callGeminiWithFallback([{ role: 'user', parts: [{ text: `Phân tích JSON: {summary, sentiment, satisfaction_score, new_faq} từ: ${historyText}` }] }], { temperature: 0.2, responseMimeType: "application/json" }, shopId, 'API_INTERNAL_ANALYST');
    if (text) {
      const result = JSON.parse(text);
      await client.from('conversations').update({ summary: result.summary, sentiment: result.sentiment, satisfaction_score: result.satisfaction_score, last_message_at: new Date().toISOString() }).eq('shop_id', shopId).eq('external_user_id', externalUserId);
    }
  } catch (e) {}
}
