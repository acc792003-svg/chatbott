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
        console.log(`[Engine] FAQ Match (Hybrid: ${scoredFaqs[0].hybridScore.toFixed(2)}), passing to AI to ensure Config priority.`);
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
        console.log(`[Engine] Cache Match (0.95+), but passing to AI to ensure Config priority.`);
      }
    }

    // 4. AI INFERENCE
    if (!finalResponse) {
       const faqContext = vectorFaqs && vectorFaqs.length > 0 ? vectorFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n') : "";

        const systemPrompt = `BẠN LÀ Trợ lý shop chuyên nghiệp của "${shopData?.name || shopConfig?.shop_name || 'Shop'}". 

HÃY TUÂN THỦ THỨ TỰ ƯU TIÊN DỮ LIỆU SAU:
1. 🥇 ƯU TIÊN 1 (TỐI CAO): Các thông tin trong "THÔNG TIN CHUNG", "GIÁ CẢ" và "FAQ VĂN BẢN" bên dưới.
2. 🥈 ƯU TIÊN 2: Dữ liệu từ "TRI THỨC VECTOR" (dùng để bổ trợ nếu Ưu tiên 1 không có).

THÔNG TIN CHUNG (Nguồn chính): ${shopConfig?.product_info || 'Không có'}
GIÁ CẢ (Nguồn chính): ${shopConfig?.pricing_info || 'Không có'}
FAQ VĂN BẢN (Nguồn chính): ${shopConfig?.faq || 'Không có'}

TRI THỨC VECTOR (Tham khảo thêm): ${faqContext}

QUY TẮC PHẢN HỒI:
- Nếu thông tin trong "Nguồn chính" có, hãy dùng nó để trả lời ngay, kể cả khi "Tri thức Vector" nói khác.
- Tuyệt đối không nhắc đến các từ kỹ thuật như "Vector", "Metadata", "Config".
- Nếu không có bất kỳ thông tin nào ở cả 2 nguồn, hãy trả lời: "Dạ hiện tại mình chưa có thông tin chính xác về vấn đề này, mình xin phép báo quản lý hỗ trợ bạn ngay nhe! 🙏"`;

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
