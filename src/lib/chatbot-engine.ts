import { supabaseAdmin } from './supabase';
import { callGeminiWithFallback, generateEmbedding } from './gemini';

/**
 * 🧠 CHATBOT ENGINE CORE (V2)
 * Hybrid Response logic for Multitenant SaaS
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
}

export function normalizeMessage(text: string): string {
  return text.trim().toLowerCase()
    .replace(/[?.,!]/g, '') 
    .replace(/\s+/g, ' ');   
}

/**
 * 🧠 CHATBOT ENGINE CORE (V3 - Enterprise Grade)
 */
export async function processChat(req: ChatRequest): Promise<ChatResponse> {
  const start = Date.now();
  const { shopId, message, history, externalUserId, platform, isPro } = req;
  const normalized = normalizeMessage(message);
  const wordCount = message.split(' ').length;

  // --- 1. NGƯỠNG ĐỘNG (Dynamic Threshold) ---
  // Ngắn (≤5 từ): 0.90, Trung bình: 0.85, Dài: 0.82
  const matchThreshold = wordCount <= 5 ? 0.90 : (wordCount <= 12 ? 0.85 : 0.82);

  let finalResponse = '';
  let resultSource: 'faq' | 'cache' | 'ai' = 'ai';
  let queryEmbedding: number[] | null = null;
  let totalUsageTokens = 0;

  try {
    // 🚦 BƯỚC 0: RATE LIMIT & QUOTA CHECK
    const { data: shopConfig } = await supabaseAdmin.from('chatbot_configs')
      .select('shop_name, product_info, customer_insights, brand_voice, is_active')
      .eq('shop_id', shopId)
      .single();
    
    // Giả sử có logic check quota ở đây (Gói Free/Pro) - Hard Fallback nếu hết hạn mức
    // (Trong phiên bản này ta tập trung vào logic Retrieval)

    // --- 2. HYBRID MATCHING (Lớp 1: FAQ & Cache kết hợp) ---
    // Tạo embedding trước để dùng cho cả FAQ và Semantic Cache
    queryEmbedding = await generateEmbedding(normalized, !!isPro);

    // --- 2. NHẬN DIỆN Ý ĐỊNH (Stage 1: Rule-based Intent Classifier) ---
    const { data: keywords } = await supabaseAdmin
      .from('keywords')
      .select('*')
      .eq('is_active', true)
      .or(`level.eq.global,and(level.eq.industry,industry.eq.${shopConfig?.industry || 'general'}),and(level.eq.shop,shop_id.eq.${shopId})`);

    let detectedIntent = 'unknown';
    let intentConfidence = 0;
    if (keywords && keywords.length > 0) {
      const intentScores: Record<string, number> = {};
      keywords.forEach(kw => {
        if (normalized.includes(kw.keyword.toLowerCase())) {
          intentScores[kw.intent] = (intentScores[kw.intent] || 0) + (Number(kw.weight) || 1);
        }
      });
      const topIntent = Object.entries(intentScores).sort((a, b) => b[1] - a[1])[0];
      if (topIntent) {
        detectedIntent = topIntent[0];
        intentConfidence = topIntent[1] > 2 ? 0.9 : 0.7; // Giả lập confidence dựa trên số từ khớp
      }
    }

    // --- 3. VECTOR SEARCH (Lớp 1: FAQ & Cache với Intent Boost) ---
    // Tìm kiếm trong FAQ có lọc theo Intent nếu độ tự tin cao
    const { data: vectorFaqs } = await supabaseAdmin.rpc('match_faqs', {
      query_embedding: queryEmbedding,
      match_threshold: dynamicThreshold,
      match_count: 5,
      p_shop_id: shopId
    });

    // 🏆 TRỌNG SỐ HỖN HỢP (Hybrid Score = 0.7*Vector + 0.3*Keyword)
    if (vectorFaqs && vectorFaqs.length > 0) {
      const scoredFaqs = vectorFaqs.map((f: any) => {
        const hasKeyword = f.question.toLowerCase().includes(normalized) ? 1 : 0;
        const hybridScore = (f.similarity * 0.7) + (hasKeyword * 0.3);
        return { ...f, hybridScore };
      }).sort((a: any, b: any) => b.hybridScore - a.hybridScore);

      if (scoredFaqs[0].hybridScore >= matchThreshold) {
        finalResponse = scoredFaqs[0].answer;
        resultSource = 'faq';
      }
    }

    // --- 3. SEMANTIC CACHE LOOKUP (Lớp 1.5) ---
    if (!finalResponse) {
      const { data: cacheMatches } = await supabaseAdmin.rpc('match_cache', {
        query_embedding: queryEmbedding,
        match_threshold: 0.95, // Cache cần độ chính xác rất cao
        match_count: 1,
        p_shop_id: shopId
      });
      if (cacheMatches && cacheMatches.length > 0) {
        finalResponse = cacheMatches[0].answer;
        resultSource = 'cache';
      }
    }

    // --- 4. AI INFERENCE (Lớp 2: AI Brain với Hybrid Memory) ---
    if (!finalResponse) {
       // A. Lấy Trí nhớ dài hạn (Summary) từ database
       const { data: convData } = await supabaseAdmin.from('conversations')
          .select('id, summary')
          .eq('shop_id', shopId)
          .eq('external_user_id', externalUserId)
          .single();

       let faqContext = "";
       if (vectorFaqs && vectorFaqs.length > 0) {
          faqContext = vectorFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
       }

       // B. Cấu trúc Prompt thông minh (Context + Summary + Short Memory)
       const systemPrompt = `BẠN LÀ Trợ lý shop "${shopConfig?.shop_name || 'Shop'}". Giọng: ${shopConfig?.brand_voice || 'nhẹ nhàng'}.
${convData?.summary ? `TÓM TẮT HỘI THOẠI TRƯỚC ĐÓ: ${convData.summary}\n` : ''}
${faqContext ? `TRI THỨC BỔ SUNG:\n${faqContext}\n\n` : ''}THÔNG TIN SHOP: ${shopConfig?.product_info || ''}
${shopConfig?.customer_insights || ''}
QUY TẮC: Trả lời lễ phép, dùng emoji. Nếu khách để lại SĐT, hãy xác nhận.`;

       // Gửi 5 tin nhắn gần nhất làm Short Memory
       const shortHistory = (history || []).slice(-5);
       const aiResult = await callGeminiWithFallback([
         { role: 'user', parts: [{ text: systemPrompt }] },
         ...shortHistory.map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })),
         { role: 'user', parts: [{ text: message }] }
       ], { temperature: 0.7 }, shopId);

       finalResponse = aiResult.text;
       totalUsageTokens = aiResult.tokens;
       resultSource = 'ai';

       // C. TRIGGER TỰ ĐỘNG TÓM TẮT (Mỗi 10 tin nhắn)
       const totalMsgs = (history?.length || 0) + 1;
       if (totalMsgs > 0 && totalMsgs % 10 === 0) {
          summarizeThread(shopId, externalUserId, [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: finalResponse }]);
       }

       // 🔹 TỰ ĐỘNG CẬP NHẬT CACHE
       if (queryEmbedding && resultSource === 'ai' && finalResponse.length < 500) {
          await supabaseAdmin.from('cache_answers').insert({ 
            shop_id: shopId, question: normalized, answer: finalResponse, embedding: queryEmbedding 
          }).catch(() => {});
       }
    }

    const latency = Date.now() - start;
    saveLogs(shopId, message, finalResponse, resultSource, latency, platform, externalUserId, totalUsageTokens).catch(e => console.error('Log error:', e));

    return { answer: finalResponse, source: resultSource, latency };

  } catch (error: any) {
    console.error('Core Engine Error:', error);
    return { answer: "Shop đang bận một chút, bạn nhắn lại sau giây lát nhe! 🙏", source: 'ai', latency: 0 };
  }
}

/**
 * 📦 Private Helpers
 */
async function saveLogs(shopId: string, message: string, answer: string, source: string, latency: number, platform: string, externalUserId: string, tokens: number) {
  // Ghi nhật ký chat_logs
  await supabaseAdmin.from('chat_logs').insert({
    shop_id: shopId, user_input: message, answer, source, latency_ms: latency, total_tokens: tokens
  });

  // Lưu hội thoại
  await supabaseAdmin.from('messages').insert({
    shop_id: shopId, 
    user_message: message, 
    ai_response: answer,
    platform, 
    session_id: externalUserId,
    total_tokens: tokens,
    metadata: { source, latency }
  });
}

async function detectLead(shopId: string, message: string, externalUserId: string) {
  const { data: config } = await supabaseAdmin.from('chatbot_configs').select('*').eq('shop_id', shopId).single();
  const leadsLib = await import('./leads');
  await leadsLib.detectAndSaveLead(message, shopId, externalUserId, config);
}

/**
 * 📝 Worker: Trợ lý Phân tích hội thoại (Memory + Sentiment + FAQ Suggestion)
 */
async function summarizeThread(shopId: string, externalUserId: string, fullHistory: any[]) {
  try {
    const historyText = fullHistory.slice(-10).map(h => `${h.role}: ${h.content}`).join('\n');
    
    // Prompt tổ hợp: Tóm tắt + Cảm xúc + Đề xuất FAQ
    const analysisPrompt = `Hãy phân tích đoạn hội thoại sau và trả về kết quả dưới định dạng JSON:
{
  "summary": "Tóm tắt ngắn gọn dưới 100 chữ",
  "sentiment": "positive/neutral/negative",
  "satisfaction_score": 1-10,
  "new_faq": { "question": "câu hỏi hay khách vừa hỏi", "answer": "cách bạn đã trả lời" } // (Chỉ điền nếu thấy đây là kiến thức mới có ích cho shop, nếu không hãy để null)
}

NỘI DUNG:
${historyText}`;

    const { text } = await callGeminiWithFallback([
      { role: 'user', parts: [{ text: analysisPrompt }] }
    ], { temperature: 0.2, responseMimeType: "application/json" }, shopId, 'API_INTERNAL_ANALYST');

    if (text) {
      const result = JSON.parse(text);

      // 1. Cập nhật trí nhớ và cảm xúc
      await supabaseAdmin.from('conversations')
        .update({ 
          summary: result.summary, 
          sentiment: result.sentiment,
          satisfaction_score: result.satisfaction_score,
          last_message_at: new Date().toISOString() 
        })
        .eq('shop_id', shopId)
        .eq('external_user_id', externalUserId);
      
      // 2. Nếu có đề xuất nội dung mới -> Lưu vào danh sách chờ duyệt
      if (result.new_faq && result.new_faq.question && result.new_faq.answer) {
         await supabaseAdmin.from('faq_suggestions').insert({
            shop_id: shopId,
            question: result.new_faq.question,
            suggested_answer: result.new_faq.answer,
            status: 'pending'
         }).catch(() => {});
      }
      
      console.log(`[AI-Analyst] Processed thread for ${externalUserId}. Sentiment: ${result.sentiment}`);
    }
  } catch (e) {
    console.error('AI-Analyst Error:', e);
  }
}
