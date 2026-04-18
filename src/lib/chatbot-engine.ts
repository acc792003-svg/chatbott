import { supabase, supabaseAdmin } from './supabase';
import { callGeminiWithFallback, generateEmbedding } from './gemini';

/**
 * 🧠 CHATBOT ENGINE CORE (V3 - Enterprise Grade)
 * Đã gia cố cơ chế chống Crash khi thiếu API Key Admin
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
  const wordCount = message.split(' ').length;

  const matchThreshold = wordCount <= 5 ? 0.90 : (wordCount <= 12 ? 0.85 : 0.82);

  let finalResponse = '';
  let resultSource: 'faq' | 'cache' | 'ai' = 'ai';
  let queryEmbedding: number[] | null = null;
  let totalUsageTokens = 0;
  let shopCode = 'unknown';

  // Sử dụng Client an toàn (Ưu tiên Admin, fallback về Anon)
  const client = supabaseAdmin || supabase;

  try {
    const { data: shopData } = await client.from('shops').select('name, code').eq('id', shopId).maybeSingle();
    const { data: shopConfig } = await client.from('chatbot_configs')
      .select('shop_name, product_info, customer_insights, brand_voice, is_active, industry')
      .eq('shop_id', shopId)
      .maybeSingle();
    
    shopCode = shopData?.code || 'unknown';
    console.log(`[Engine] START chat for Shop: ${shopData?.name || shopConfig?.shop_name || shopId} (#${shopCode})`);
    
    // 1. EMBEDDING
    console.log(`[Engine] Lấy Embedding...`);
    queryEmbedding = await generateEmbedding(normalized, !!isPro);

    // 2. NHẬN DIỆN Ý ĐỊNH (Rule-based)
    console.log(`[Engine] Kiểm tra Intent...`);
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
    console.log(`[Engine] Intent: ${detectedIntent}`);

    // 3. VECTOR SEARCH
    console.log(`[Engine] Gọi RPC match_faqs...`);
    const { data: vectorFaqs, error: rpcError } = await client.rpc('match_faqs', {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: 5,
      p_shop_id: shopId
    });
    
    if (rpcError) console.error(`[Engine] RPC match_faqs ERROR:`, rpcError);

    if (vectorFaqs && vectorFaqs.length > 0) {
      console.log(`[Engine] Found ${vectorFaqs.length} FAQs`);
      const scoredFaqs = vectorFaqs.map((f: any) => {
        const hasKeyword = f.question.toLowerCase().includes(normalized) ? 1 : 0;
        const hybridScore = (f.similarity * 0.7) + (hasKeyword * 0.3);
        return { ...f, hybridScore };
      }).sort((a: any, b: any) => b.hybridScore - a.hybridScore);

      if (scoredFaqs[0].hybridScore >= matchThreshold) {
        finalResponse = scoredFaqs[0].answer;
        resultSource = 'faq';
        console.log(`[Engine] Ranker HIT: FAQ`);
      }
    }

    if (!finalResponse) {
      console.log(`[Engine] Gọi RPC match_cache...`);
      const { data: cacheMatches } = await client.rpc('match_cache', {
        query_embedding: queryEmbedding,
        match_threshold: 0.95,
        match_count: 1,
        p_shop_id: shopId
      });
      if (cacheMatches && cacheMatches.length > 0) {
        finalResponse = cacheMatches[0].answer;
        resultSource = 'cache';
        console.log(`[Engine] Ranker HIT: Cache`);
      }
    }

    // 4. AI INFERENCE
    if (!finalResponse) {
       console.log(`[Engine] AI Brain Inference starting...`);
       const { data: convData } = await client.from('conversations')
          .select('id, summary')
          .eq('shop_id', shopId)
          .eq('external_user_id', externalUserId)
          .maybeSingle();

       let faqContext = "";
       if (vectorFaqs && vectorFaqs.length > 0) {
          faqContext = vectorFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
       }

       const systemPrompt = `BẠN LÀ Trợ lý shop "${shopConfig?.shop_name || 'Shop'}". Giọng: ${shopConfig?.brand_voice || 'nhẹ nhàng'}.
${convData?.summary ? `TÓM TẮT HỘI THOẠI TRƯỚC ĐÓ: ${convData.summary}\n` : ''}
${faqContext ? `TRI THỨC BỔ SUNG:\n${faqContext}\n\n` : ''}THÔNG TIN SHOP: ${shopConfig?.product_info || ''}
${shopConfig?.customer_insights || ''}
QUY TẮC: Trả lời lễ phép, dùng emoji. Nếu khách để lại SĐT, hãy xác nhận.`;

       const shortHistory = (history || []).slice(-5);
       const aiResult = await callGeminiWithFallback([
         { role: 'user', parts: [{ text: systemPrompt }] },
         ...shortHistory.map((msg: any) => ({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] })),
         { role: 'user', parts: [{ text: message }] }
       ], { temperature: 0.7 }, shopId);

       finalResponse = aiResult.text;
       totalUsageTokens = aiResult.tokens;
       resultSource = 'ai';
       console.log(`[Engine] AI Brain finished. Tokens: ${totalUsageTokens}`);

       if (queryEmbedding && resultSource === 'ai' && finalResponse.length < 500) {
          // Ghi đè cache thầm lặng
          client.from('cache_answers').insert({ 
            shop_id: shopId, question: normalized, answer: finalResponse, embedding: queryEmbedding 
          }).then(({error}: any) => { if(error) console.error('Cache error:', error.message) });
       }
    }

    // 5. FUNNEL "TRIGGER-ACTION"
    console.log(`[Engine] Applying Funnel rules...`);
    const isTechnical = /thành phần|quy trình|nguyên lý|kỹ thuật|tại sao|có tốt không/i.test(normalized);
    const { data: convInfo } = await client.from('conversations')
      .select('id, triggered_actions, last_action_at')
      .eq('shop_id', shopId)
      .eq('external_user_id', externalUserId)
      .maybeSingle();

    if (convInfo && !isTechnical && detectedIntent !== 'unknown') {
      const triggeredActions = convInfo.triggered_actions || [];
      const now = new Date();
      const isCooldownOk = !convInfo.last_action_at || (now.getTime() - new Date(convInfo.last_action_at).getTime() > 30000);
      const alreadyTriggered = triggeredActions.some((a: any) => a.intent === detectedIntent);

      if (isCooldownOk && !alreadyTriggered) {
        const { data: actions } = await client.from('shop_actions')
          .select('*').eq('shop_id', shopId).eq('is_active', true).eq('intent_binding', detectedIntent).order('priority', { ascending: false });
        
        if (actions && actions.length > 0) {
          const bestAction = actions[0];
          finalResponse += `\n\n👉 ${bestAction.content}`;
          await client.from('conversations').update({
            triggered_actions: [...triggeredActions, { intent: detectedIntent, action_id: bestAction.id, at: now.toISOString() }],
            last_action_at: now.toISOString()
          }).eq('id', convInfo.id);
          console.log(`[Engine] Funnel Triggered: ${bestAction.type}`);
        }
      }
    }

    const latency = Date.now() - start;
    console.log(`[Engine] DONE. Total Latency: ${latency}ms`);
    
    saveLogs(shopId, message, finalResponse, resultSource, latency, platform, externalUserId, totalUsageTokens).catch(e => console.error('Log error:', e));

    // 🔥 KÍCH HOẠT PHÂN TÍCH HỘI THOẠI CHẠY NGẦM
    summarizeThread(shopId, externalUserId, [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: finalResponse }]).catch(e => console.error('Summary error:', e));

    return { answer: finalResponse, source: resultSource, latency, intent: detectedIntent };

  } catch (error: any) {
    console.error('Core Engine Error:', error);
    
    // 🔥 BÁO CÁO RADAR (Sử dụng client dự phòng nếu supabaseAdmin lỗi)
    if (client) {
      client.from('system_errors').insert({
        shop_id: shopId,
        error_type: 'ENGINE_CRASH',
        error_message: error.message,
        file_source: 'chatbot-engine.ts',
        metadata: { shopCode: shopCode, platform, externalUserId, message: message.substring(0, 50) }
      }).then(({error}: any) => { if(error) console.error('Radar report failed:', error.message) });
    }

    return { answer: "Dạ, hệ thống đang bận một chút, bạn chờ mình vài giây rồi nhắn lại nhe! 🙏", source: 'ai', latency: 0 };
  }
}

async function saveLogs(shopId: string, message: string, answer: string, source: string, latency: number, platform: string, externalUserId: string, tokens: number) {
  const client = supabaseAdmin || supabase;
  await client.from('chat_logs').insert({
    shop_id: shopId, user_input: message, answer, source, latency_ms: latency, total_tokens: tokens
  });
  await client.from('messages').insert({
    shop_id: shopId, user_message: message, ai_response: answer,
    platform, session_id: externalUserId, total_tokens: tokens,
    metadata: { source, latency }
  });
}

async function summarizeThread(shopId: string, externalUserId: string, fullHistory: any[]) {
  try {
    const client = supabaseAdmin || supabase;
    const historyText = fullHistory.slice(-10).map((h: any) => `${h.role}: ${h.content}`).join('\n');
    const analysisPrompt = `Hãy phân tích đoạn hội thoại sau và trả về JSON:
{
  "summary": "Tóm tắt ngắn gọn",
  "sentiment": "positive/neutral/negative",
  "satisfaction_score": 1-10,
  "new_faq": { "question": "...", "answer": "..." }
}
NỘI DUNG: ${historyText}`;

    const { text } = await callGeminiWithFallback([{ role: 'user', parts: [{ text: analysisPrompt }] }], { temperature: 0.2, responseMimeType: "application/json" }, shopId, 'API_INTERNAL_ANALYST');
    if (text) {
      const result = JSON.parse(text);
      await client.from('conversations').update({ 
        summary: result.summary, sentiment: result.sentiment, satisfaction_score: result.satisfaction_score, 
        last_message_at: new Date().toISOString() 
      }).eq('shop_id', shopId).eq('external_user_id', externalUserId);
      
      if (result.new_faq && result.satisfaction_score >= 8) {
         client.from('faq_suggestions').insert({
            shop_id: shopId, question: result.new_faq.question, 
            suggested_answer: result.new_faq.answer, status: 'pending'
         }).then(({error}: any) => { if(error) console.error('FAQ suggestion failed:', error.message) });
      }
      
      if (result.satisfaction_score <= 4 || result.sentiment === 'negative') {
         await client.from('conversations').update({ status: 'hot_issue' }).eq('shop_id', shopId).eq('external_user_id', externalUserId);
      }
    }
  } catch (e) {}
}
