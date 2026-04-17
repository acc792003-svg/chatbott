import { supabaseAdmin } from './supabaseAdmin';
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

export async function processChat(req: ChatRequest): Promise<ChatResponse> {
  const start = Date.now();
  const { shopId, message, history, externalUserId, platform, isPro } = req;
  const normalized = normalizeMessage(message);

  let finalResponse = '';
  let resultSource: 'faq' | 'cache' | 'ai' = 'ai';
  let queryEmbedding: number[] | null = null;
  let similarityScore = 0;

  try {
    // --- 1. SPECIAL COMMANDS ---
    if (message === '[welcome]') {
      return { answer: "Chào bạn! Shop có thể giúp gì cho bạn hôm nay? 😊", source: 'faq', latency: 0 };
    }

    // --- 2. FAQ MATCHING (Lớp 1: Keywords) ---
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

    // --- 3. VECTOR SEARCH (Lớp 1.5: Semantic) ---
    if (!finalResponse) {
      queryEmbedding = await generateEmbedding(normalized, !!isPro);
      const { data: vectorFaqs } = await supabaseAdmin.rpc('match_faqs', {
        query_embedding: queryEmbedding,
        match_threshold: 0.85, 
        match_count: 1,
        p_shop_id: shopId
      });

      if (vectorFaqs && vectorFaqs.length > 0) {
        finalResponse = vectorFaqs[0].answer;
        resultSource = 'faq';
        similarityScore = vectorFaqs[0].similarity;
      }
    }

    // --- 4. CACHE MATCHING (Lớp 2: Memory) ---
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

    // --- 5. AI FALLBACK (Lớp 3: Brain) ---
    if (!finalResponse) {
      const { data: config } = await supabaseAdmin.from('chatbot_configs')
        .select('shop_name, product_info, customer_insights, brand_voice')
        .eq('shop_id', shopId)
        .single();

      // Lấy ngữ cảnh FAQ hàng đầu
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

      const shopName = config?.shop_name || 'Shop';
      const now = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'full', timeStyle: 'short' });
      
      // CRM Lead Instruction
      const leadsLib = await import('./leads');
      const historyText = (history || []).map(h => h.content).join(" ");
      const alreadyHasPhone = !!leadsLib.extractPhone(historyText) || !!leadsLib.extractPhone(message);
      const { count: askedCount, gap } = leadsLib.countPreviousAsks(history || []);
      const hasIntent = leadsLib.hasHighIntent(normalized);

      let leadInstruction = "";
      if (!alreadyHasPhone && hasIntent && askedCount < 2 && gap >= 3) {
        leadInstruction = "\n👉 HÀNH ĐỘNG: Khách đang quan tâm, hãy gợi ý họ để lại SĐT để được tư vấn kĩ hơn.";
      }

      const systemPrompt = `BẠN LÀ Trợ lý shop "${shopName}". Giọng: ${config?.brand_voice || 'nhẹ nhàng'}. Hôm nay: ${now}.
${faqContext ? `TRI THỨC BỔ SUNG:\n${faqContext}\n\n` : ''}THÔNG TIN SHOP: ${config?.product_info || ''}
${config?.customer_insights || ''}
QUY TẮC: Trả lời lễ phép, dùng emoji. Nếu khách để lại SĐT, hãy xác nhận.${leadInstruction}`;

      const contents = [
        { role: 'user', parts: [{ text: systemPrompt }] },
        ...(history || []).map(msg => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })),
        { role: 'user', parts: [{ text: message }] }
      ];

      finalResponse = await callGeminiWithFallback(contents, { temperature: 0.7 }, shopId);
      resultSource = 'ai';

      // Update Cache
      if (queryEmbedding) {
        await supabaseAdmin.from('cache_answers').insert({ 
          shop_id: shopId, question: normalized, answer: finalResponse 
        }).catch(() => {});
      }
    }

    const latency = Date.now() - start;

    // --- 6. LOGGING (Background) ---
    saveLogs(shopId, message, finalResponse, resultSource, latency, platform, externalUserId, similarityScore).catch(e => console.error('Save logs error:', e));

    // --- 7. LEAD DETECTION (Background) ---
    detectLead(shopId, message, externalUserId).catch(e => console.error('Lead detection error:', e));

    return { answer: finalResponse, source: resultSource, latency };

  } catch (error: any) {
    console.error('Core Engine Error:', error);
    return { answer: "Shop đang bận một chút, bạn nhắn lại sau giây lát nhe! 🙏", source: 'ai', latency: 0 };
  }
}

/**
 * 📦 Private Helpers
 */
async function saveLogs(shopId: string, message: string, answer: string, source: string, latency: number, platform: string, externalUserId: string, score: number) {
  // Ghi nhật ký chat_logs
  await supabaseAdmin.from('chat_logs').insert({
    shop_id: shopId, user_input: message, answer, source, latency_ms: latency
  });

  // Lưu hội thoại
  await supabaseAdmin.from('messages').insert({
    shop_id: shopId, user_message: message, ai_response: answer,
    platform, external_user_id: externalUserId,
    metadata: { source, score, latency }
  });
}

async function detectLead(shopId: string, message: string, externalUserId: string) {
  const { data: config } = await supabaseAdmin.from('chatbot_configs').select('*').eq('shop_id', shopId).single();
  const leadsLib = await import('./leads');
  await leadsLib.detectAndSaveLead(message, shopId, externalUserId, config);
}
