import { supabase, supabaseAdmin } from './supabase';
import { callGeminiWithFallback, generateEmbedding } from './gemini';
import { detectAndSaveLead } from './leads';
import { validateRateLimit } from './rate-limiter';
import { reportError } from './radar';
import { decideRoute, enforcePolicy, POLICY, runAI } from './ai-router';

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
  ip?: string; // Thêm IP để check Rate Limit
}

export interface ChatResponse {
  answer: string;
  source: 'faq' | 'cache' | 'ai';
  latency: number;
  intent?: string;
  shopName?: string;
}

export function normalizeMessage(text: string): string {
  return text.trim().toLowerCase()
    .replace(/[?.,!]/g, '') 
    .replace(/\s+/g, ' ');   
}

/**
 * Phát hiện chuỗi trông giống số điện thoại nhưng không đúng định dạng Việt Nam
 * VD: "4455660909" (thiếu số 0 đầu), "12345" (quá ngắn), "999888777666" (quá dài)
 */
function detectNearPhone(message: string): { hasNearPhone: boolean; rawNumber: string } {
  const validPhoneRegex = /(0|\+84)(3|5|7|8|9)[0-9]{8}/;
  const nearPhoneRegex = /\b\d{8,11}\b/;
  const nearMatch = message.match(nearPhoneRegex);
  if (!nearMatch) return { hasNearPhone: false, rawNumber: '' };
  const rawNumber = nearMatch[0];
  // Nếu đã đúng định dạng -> không cần nhắc
  if (validPhoneRegex.test(message)) return { hasNearPhone: false, rawNumber: '' };
  return { hasNearPhone: true, rawNumber };
}

export async function processChat(req: ChatRequest): Promise<ChatResponse> {
  const start = Date.now();
  const { shopId, message, history, externalUserId, platform, isPro, ip } = req;

  // 🛡️ LỚP BẢO VỆ REDIS: ĐÁNH CHẶN 4 TẦNG (BLACKLIST, WELCOME, USER, SHOP, IP)
  const rateLimitResult = await validateRateLimit(shopId, externalUserId, ip || '127.0.0.1', message);
  if (!rateLimitResult.allowed) {
    if (rateLimitResult.reason === 'silence') {
       return { answer: "", source: 'cache', latency: 0 };
    }
    return { 
      answer: rateLimitResult.reason || "Bạn đang nhắn quá nhanh, vui lòng đợi một chút nhe! 🙏", 
      source: 'faq', 
      latency: 0 
    };
  }

  const normalized = normalizeMessage(message);
  let finalResponse = '';
  let resultSource: 'faq' | 'cache' | 'ai' = 'ai';
  let queryEmbedding: number[] | null = null;
  let totalUsageTokens = 0;
  let shopCode = 'unknown';
  let faqContext = '';
  let topScore = 0;
  let detectedIntent = 'chat';

  const client = supabaseAdmin || supabase;

  try {
    const { data: shopData } = await client.from('shops').select('name, code').eq('id', shopId).maybeSingle();
    const { data: shopConfig, error: configError } = await client.from('chatbot_configs')
      .select('shop_name, product_info, pricing_info, faq, brand_voice, customer_insights, is_active, telegram_chat_id, telegram_bot_token')
      .eq('shop_id', shopId)
      .maybeSingle();
    
    shopCode = shopData?.code || 'unknown';

    // 🛡️ BẮT BUỘC VALIDATE CONFIG (1 dòng cứu cả hệ)
    if (configError) {
      console.error(`❌ Lỗi truy vấn chatbot_configs cho shop: ${shopId}:`, configError);
      return {
        answer: "Dạ, hệ thống đang gặp chút sự cố kết nối dữ liệu. Bạn vui lòng thử lại sau giây lát nhe! 🙏",
        source: 'faq',
        latency: 0
      };
    }

    if (!shopConfig) {
      console.error(`❌ chatbot_configs NULL cho shop: ${shopId} (#${shopCode})`);
      // 🔥 BÁO CÁO RADAR (Tự động gửi Telegram)
      reportError({
        shopId: shopId,
        errorType: 'CHATBOT_CONFIG_MISSING',
        errorMessage: `Shop #${shopCode} chưa có chatbot_configs. Khách hàng đang không được phục vụ.`,
        fileSource: 'chatbot-engine.ts',
        severity: 'critical',
        metadata: { shopId, shopCode }
      }).catch(() => {});

      return {
        answer: "Dạ xin lỗi bạn, hiện tại hệ thống đang bảo trì và sẽ sớm hoạt động trở lại. Bạn vui lòng liên hệ lại sau ít phút hoặc nhắn tin trực tiếp để được hỗ trợ nhé! 🙏",
        source: 'faq',
        latency: 0
      };
    }
    
    // Kiểm tra trạng thái hoạt động
    if (shopConfig.is_active === false) {
       return { answer: "Dạ, hiện tại chatbot đang tạm nghỉ bảo trì, bạn nhắn lại sau ít phút nhe! 🙏", source: 'faq', latency: 0 };
    }

    console.log(`[Engine] START chat for Shop: ${shopData?.name || shopConfig.shop_name} (#${shopCode})`);
    
    // 🌍 TẢI TRI THỨC KẾ THỪA TỪ SUPER ADMIN (Xưởng Tri Thức)
    let globalProductInfo = '';
    let globalFaq = '';
    let globalInsights = '';

    // 🕒 TẢI CẤU HÌNH ĐẶT LỊCH LIVE & GIỜ VÀNG
    const { data: bookingConfig } = await client.from('shop_settings').select('*').eq('shop_id', shopId).maybeSingle();
    const { data: happyHours } = await client.from('discount_rules')
      .select('*')
      .eq('shop_id', shopId)
      .eq('is_active', true);

    const bookingContext = bookingConfig 
      ? `[TRẠNG THÁI CUỘC HẸN LIVE]:\n- Dự kiến sẽ còn trống chỗ sau: ${bookingConfig.slot_duration_minutes} phút nữa.\n- Số chỗ dự kiến sẽ trống: ${bookingConfig.max_slot_per_block} chỗ.\n(Hãy dùng thông tin này để báo lịch cho khách nếu khách hỏi về chỗ trống hoặc muốn đặt lịch gấp).`
      : "";

    const happyHourContext = (happyHours && happyHours.length > 0)
      ? `[ƯU ĐÃI GIỜ VÀNG (HAPPY HOUR)]:\n${happyHours.map((h: any) => `- Từ ${h.start_time.substring(0,5)} đến ${h.end_time.substring(0,5)}: Giảm ${h.discount_value}${h.discount_type === 'percent' ? '%' : 'K'}`).join('\n')}\n(Hãy chủ động gợi ý ưu đãi này nếu khách hỏi giá hoặc đang đắn đo về giá).`
      : "";

    const { data: mappings } = await client.from('shop_templates').select('template_id').eq('shop_id', shopId);
    if (mappings && mappings.length > 0) {
      const templateIds = mappings.map((m: any) => m.template_id);
      const { data: templates } = await client.from('knowledge_templates').select('*').in('id', templateIds);
      if (templates && templates.length > 0) {
         globalProductInfo = templates.map((t: any) => `[Global: ${t.package_name}]\n${t.product_info || ''}`).join('\n\n');
         globalFaq = templates.map((t: any) => `[Global: ${t.package_name}]\n${t.faq || ''}`).join('\n\n');
         globalInsights = templates.map((t: any) => t.insights || '').join('\n');
      }
    }
    
    // 1. EMBEDDING (CHỈ 1 LẦN / REQUEST)
    queryEmbedding = await generateEmbedding(normalized, !!isPro);

    // 2. CACHE-FIRST (MỨC 0.9+)
    const { data: cacheMatches } = await client.rpc('match_cache', {
      query_embedding: queryEmbedding,
      match_threshold: 0.90, // Tối ưu: 0.9+ giảm 60-80% call AI
      match_count: 1,
      p_shop_id: shopId
    });

    if (cacheMatches && cacheMatches.length > 0) {
      console.log(`[Engine] Cache Match (0.90+) - FAST PATH, SKIP AI!`);
      return { 
        answer: cacheMatches[0].answer, 
        source: 'cache', 
        latency: Date.now() - start,
        shopName: shopConfig?.shop_name || shopData?.name
      };
    }

    // 3. VECTOR SEARCH (FAQ)
    faqContext = "";
    topScore = 0;
    const { data: vectorFaqs } = await client.rpc('match_faqs', {
      query_embedding: queryEmbedding,
      match_threshold: 0.50,
      match_count: 3, // Chỉ top 2-3 FAQ (Token discipline)
      p_shop_id: shopId
    });
    
    if (vectorFaqs && vectorFaqs.length > 0) {
      const scoredFaqs = vectorFaqs.map((f: any) => ({ ...f, hybridScore: (f.similarity * 0.7) + (f.question.toLowerCase().includes(normalized) ? 0.3 : 0) }))
                                   .sort((a: any, b: any) => b.hybridScore - a.hybridScore);

      topScore = scoredFaqs[0].hybridScore;

      // 🥇 MỨC 1: >= 0.85 (rất khớp) -> Trả thẳng FAQ (FAQ path)
      if (topScore >= 0.85) {
        console.log(`[Engine] FAQ Match (Hybrid: ${topScore.toFixed(2)} >= 0.85) - FAQ PATH`);
        return { 
          answer: scoredFaqs[0].answer, 
          source: 'faq', 
          latency: Date.now() - start,
          shopName: shopConfig?.shop_name || shopData?.name
        };
      } 
      // 🥈 MỨC 2: Inject context cho AI
      else if (topScore >= 0.70) {
         faqContext = scoredFaqs.slice(0, 3).map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
      }
    }

    // 4. ROUTER QUYẾT ĐỊNH
    const plan = isPro ? 'pro' : 'free';
    const decision = decideRoute({
      cacheHit: false, // Đã check ở trên
      faqScore: topScore,
      plan,
      input: message
    });

    if (decision === 'CACHE' || decision === 'FAQ') {
       // Thực tế đã return ở trên, nhưng giữ logic router cho đồng bộ
       return { answer: "Vui lòng thử lại", source: 'cache', latency: 0 };
    }

    // 5. AI INFERENCE (CHỈ 1 LẦN GỌI AI - HAPPY PATH)
    if (!finalResponse) {

        // Phát hiện khách nhập số điện thoại sai định dạng
        const { hasNearPhone, rawNumber } = detectNearPhone(message);
        
        let phoneActionRule = '';
        if (hasNearPhone) {
            phoneActionRule = `- ⚠️ CHÚ Ý: Khách vừa nhập dãy số "${rawNumber}" nhưng KHÔNG PHẢI định dạng số điện thoại Việt Nam hợp lệ. Hãy báo khách nhập lại cho đúng, TUYỆT ĐỐI KHÔNG CÁM ƠN hay xác nhận đặt lịch thành công lúc này.`;
        } else if (/(0|\+84)(3|5|7|8|9)[0-9]{8}/.test(message.replace(/[.\-\s]/g, ''))) {
            phoneActionRule = `- NẾU khách hàng vừa để lại số điện thoại hợp lệ, BẮT BUỘC TRONG CÂU TRẢ LỜI PHẢI CÓ LỜI CẢM ƠN và xác nhận sẽ có nhân viên liên hệ tư vấn sớm nhất.`;
        }

        let injectedGlobalFaq = globalFaq;
        let injectedGlobalProduct = globalProductInfo;

        if (topScore >= 0.75) {
             injectedGlobalFaq = ''; 
             injectedGlobalProduct = ''; 
        }

        // Schema YAML-like ngắn gọn và giới hạn Token mềm
        const systemPrompt = `SHOP:
  Name: "${shopConfig?.shop_name || shopData?.name || 'Shop'}"
  Voice: "${shopConfig?.brand_voice || 'Nhẹ nhàng, lễ phép'}"
  Insights: "${shopConfig?.customer_insights || ''}"
  
SERVICES_AND_PRODUCTS:
${(injectedGlobalProduct || shopConfig?.product_info || '').substring(0, 1500)}

PRICING:
${(shopConfig?.pricing_info || '').substring(0, 800)}

RULES:
- Ưu tiên trả lời theo dữ liệu shop.
- Nếu thiếu dữ liệu -> hỏi lại hoặc báo nhân viên.
- Tuyệt đối không nhắc đến các từ kỹ thuật như "Vector", "Metadata".
${phoneActionRule}

VECTOR_KNOWLEDGE (FAQ):
${faqContext}

LIVE_CONTEXT:
${bookingContext}
${happyHourContext}`;

        // Trimming History: Sliding window 8 messages
        const rawHistoryForAI = [
          ...(history || []).slice(-8),
          { role: 'user', content: message }
        ];

        const aiResult = await runAI(
           decision as any, // ép kiểu nếu cần
           { 
             history: rawHistoryForAI,
             temperature: 0.7,
             systemPrompt,
             tier: plan
           }
        );

       finalResponse = aiResult.text;
       totalUsageTokens = aiResult.tokens;
       resultSource = aiResult.source as any;

       if (queryEmbedding && finalResponse.length < 500) {
          await client.from('cache_answers').insert({ shop_id: shopId, question: normalized, answer: finalResponse, embedding: queryEmbedding });
       }
    }

    const latency = Date.now() - start;
    await saveLogs(shopId, message, finalResponse, resultSource, latency, platform, externalUserId, totalUsageTokens);
    summarizeThread(shopId, externalUserId, [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: finalResponse }]);

    // 🔥 PHÁT HIỆN VÀ LƯU LEAD (SĐT) TỪ TIN NHẮN KHÁCH HÀNG
    // PHẢI AWAIT để tránh bị Vercel Serverless đóng băng (giết tiến trình) trước khi gửi Telegram!
    try {
       await detectAndSaveLead(message, shopId, externalUserId, shopConfig);
    } catch (e) {
       console.error('[Engine] detectAndSaveLead error:', e);
    }

    return { 
      answer: finalResponse, 
      source: resultSource, 
      latency, 
      intent: detectedIntent,
      shopName: shopConfig?.shop_name || shopData?.name
    };

  } catch (error: any) {
    const latency = Date.now() - start;
    let errorResponse = "Dạ, hiện tại kết nối mạng đang hơi chậm, bạn vui lòng chờ vài giây rồi nhắn lại nhe! 🙏";
    
    // 🔥 Graceful Degradation: Fallback to Vector FAQ if AI fails
    if (typeof topScore !== 'undefined' && topScore >= 0.60 && faqContext) {
      // Lấy câu FAQ đầu tiên trong faqContext
      const firstFaq = faqContext.split('---')[0].replace('Q:', '').replace('A:', '').trim();
      errorResponse = `Dạ hệ thống đang hơi quá tải, em gửi bạn thông tin phù hợp nhé:\n- ${firstFaq}`;
    }
    
    console.error('Core Engine Error:', error);
    
    // LƯU LOG KỂ CẢ KHI LỖI để người dùng thấy tin nhắn họ đã gửi trong lịch sử
    try {
      await saveLogs(shopId, message, errorResponse, 'ai', latency, platform, externalUserId, 0);
    } catch (e) {}

    if (client) {
      reportError({
        shopId: shopId,
        errorType: 'ENGINE_CRASH_STABLE',
        errorMessage: error.message,
        fileSource: 'chatbot-engine.ts',
        severity: 'high',
        metadata: { shopCode, platform, stack: error.stack, message: message.substring(0, 50) }
      }).catch(() => {});
    }
    return { answer: errorResponse, source: 'faq', latency: latency };
  }
}

async function saveLogs(shopId: string, message: string, answer: string, source: string, latency: number, platform: string, externalUserId: string, tokens: number) {
  try {
    const client = supabaseAdmin || supabase;
    await client.from('chat_logs').insert({ shop_id: shopId, user_input: message, answer, source, latency_ms: latency, total_tokens: tokens });
    await client.from('messages').insert({ shop_id: shopId, user_message: message, ai_response: answer, platform, session_id: externalUserId, usage_tokens: tokens, metadata: { source, latency } });
  } catch (e) {
    console.error('[Engine] saveLogs error:', e);
  }
}

async function summarizeThread(shopId: string, externalUserId: string, fullHistory: any[]) {
  try {
    // Tối ưu Ý 5: Chỉ tóm tắt khi đạt mốc 20 tin nhắn để tiết kiệm 50-80% lượng token (không gọi liên tục mỗi tin)
    if (fullHistory.length > 0 && fullHistory.length % 20 !== 0) {
       return; 
    }

    const client = supabaseAdmin || supabase;
    const historyText = fullHistory.slice(-20).map((h: any) => `${h.role}: ${h.content}`).join('\n');
    const { text } = await callGeminiWithFallback([{ role: 'user', parts: [{ text: `Phân tích JSON: {summary, sentiment, satisfaction_score, new_faq} từ: ${historyText}` }] }], { temperature: 0.2, responseMimeType: "application/json" }, shopId, 'API_INTERNAL_ANALYST');
    if (text) {
      const result = JSON.parse(text);
      await client.from('conversations').update({ summary: result.summary, sentiment: result.sentiment, satisfaction_score: result.satisfaction_score, last_message_at: new Date().toISOString() }).eq('shop_id', shopId).eq('external_user_id', externalUserId);
    }
  } catch (e) {}
}
