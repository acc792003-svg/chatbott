import { supabase, supabaseAdmin } from './supabase';
import { callGeminiWithFallback, generateEmbedding } from './gemini';
import { detectAndSaveLead } from './leads';
import { validateRateLimit } from './rate-limiter';

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

  const client = supabaseAdmin || supabase;

  try {
    const { data: shopData } = await client.from('shops').select('name, code').eq('id', shopId).maybeSingle();
    const { data: shopConfig, error: configError } = await client.from('chatbot_configs')
      .select('shop_name, product_info, pricing_info, faq, brand_voice, customer_insights, is_active, telegram_chat_id, telegram_bot_token')
      .eq('shop_id', shopId)
      .maybeSingle();
    
    shopCode = shopData?.code || 'unknown';

    // 🛡️ BẮT BUỘC VALIDATE CONFIG (1 dòng cứu cả hệ)
    if (!shopConfig) {
      console.error(`❌ chatbot_configs NULL cho shop: ${shopId} (#${shopCode})`);
      // Ghi lỗi vào Radar để admin biết, KHÔNG lộ lỗi kỹ thuật ra ngoài cho khách
      try {
        await client.from('system_errors').insert({
          shop_id: shopId,
          error_type: 'CHATBOT_CONFIG_MISSING',
          error_message: `Shop #${shopCode} chưa có chatbot_configs. Khách hàng đang không được phục vụ.`,
          file_source: 'chatbot-engine.ts',
          metadata: { shopId, shopCode }
        });
      } catch (e) {}

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
    
    // 1. EMBEDDING
    queryEmbedding = await generateEmbedding(normalized, !!isPro);

    // 2. Ý ĐỊNH
    const { data: keywords } = await client
      .from('keywords')
      .select('*')
      .eq('is_active', true)
      .or(`level.eq.global,level.eq.industry,and(level.eq.shop,shop_id.eq.${shopId})`);

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
    let faqContext = "";
    const { data: vectorFaqs } = await client.rpc('match_faqs', {
      query_embedding: queryEmbedding,
      match_threshold: 0.60, // Lower threshold to allow routing logic (0.6 - 0.9)
      match_count: 3,
      p_shop_id: shopId
    });
    
    if (vectorFaqs && vectorFaqs.length > 0) {
      const scoredFaqs = vectorFaqs.map((f: any) => ({ ...f, hybridScore: (f.similarity * 0.7) + (f.question.toLowerCase().includes(normalized) ? 0.3 : 0) }))
                                   .sort((a: any, b: any) => b.hybridScore - a.hybridScore);

      const topScore = scoredFaqs[0].hybridScore;

      // 🥇 MỨC 1: >= 0.89 (rất khớp) -> Trả thẳng FAQ, không gọi AI
      if (topScore >= 0.89) {
        console.log(`[Engine] FAQ Match (Hybrid: ${topScore.toFixed(2)} >= 0.89) - FAST PATH, SKIP AI!`);
        finalResponse = scoredFaqs[0].answer;
        resultSource = 'faq';
      } 
      // 🥈 MỨC 2: 0.80 - 0.89 -> Inject Vector only
      else if (topScore >= 0.80) {
         console.log(`[Engine] FAQ Match (Hybrid: ${topScore.toFixed(2)} - 0.80~0.89) - Lazy Inject: Vector Only`);
         const validFaqs = scoredFaqs.filter((f: any) => f.hybridScore >= 0.80);
         faqContext = validFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
      }
      // 🥉 MỨC 3: 0.60 - 0.80 -> Inject Vector + partial Fallback
      else if (topScore >= 0.60) {
         console.log(`[Engine] FAQ Match (Hybrid: ${topScore.toFixed(2)} - 0.60~0.80) - Lazy Inject: Vector + Partial`);
         const validFaqs = scoredFaqs.filter((f: any) => f.hybridScore >= 0.60);
         faqContext = validFaqs.map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
      }
      else {
         console.log(`[Engine] FAQ Match (Hybrid: ${topScore.toFixed(2)} < 0.60) - FULL FALLBACK MODE`);
      }
    } else {
        console.log(`[Engine] No Vector Match - FULL FALLBACK MODE`);
    }

    if (!finalResponse) {
      const { data: cacheMatches } = await client.rpc('match_cache', {
        query_embedding: queryEmbedding,
        match_threshold: 0.95,
        match_count: 1,
        p_shop_id: shopId
      });
      if (cacheMatches && cacheMatches.length > 0) {
        console.log(`[Engine] Cache Match (0.95+) - FAST PATH, SKIP AI!`);
        finalResponse = cacheMatches[0].answer;
        resultSource = 'cache';
      }
    }

    // 4. AI INFERENCE
    if (!finalResponse) {

        // Phát hiện khách nhập số điện thoại sai định dạng
        const { hasNearPhone, rawNumber } = detectNearPhone(message);
        
        let phoneActionRule = '';
        if (hasNearPhone) {
            phoneActionRule = `- ⚠️ CHÚ Ý: Khách vừa nhập dãy số "${rawNumber}" nhưng KHÔNG PHẢI định dạng số điện thoại Việt Nam hợp lệ. Hãy báo khách nhập lại cho đúng, TUYỆT ĐỐI KHÔNG CÁM ƠN hay xác nhận đặt lịch thành công lúc này.`;
        } else if (/(0|\+84)(3|5|7|8|9)[0-9]{8}/.test(message.replace(/[.\-\s]/g, ''))) {
            phoneActionRule = `- NẾU khách hàng vừa để lại số điện thoại hợp lệ, BẮT BUỘC TRONG CÂU TRẢ LỜI PHẢI CÓ LỜI CẢM ƠN và xác nhận sẽ có nhân viên liên hệ tư vấn sớm nhất.`;
        }

        // Tối ưu Payload: Nếu Vector Match đủ tốt (>0.80), cắt bỏ globalFaq (tuyệt chiêu Context Layering)
        let injectedGlobalFaq = globalFaq;
        let injectedGlobalProduct = globalProductInfo;
        const currentTopScore = (vectorFaqs && vectorFaqs.length > 0) 
             ? ((vectorFaqs[0].similarity * 0.7) + (vectorFaqs[0].question.toLowerCase().includes(normalized) ? 0.3 : 0))
             : 0;

        if (currentTopScore >= 0.80) {
             injectedGlobalFaq = ''; // Bỏ hoàn toàn rác FAQ thô vì Vector đã lo
        } else if (currentTopScore >= 0.60) {
             // Giữ nguyên product info, nhưng FAQ thô vẫn kìm bớt
             injectedGlobalFaq = injectedGlobalFaq ? "--- Ghi chú: Hãy tra trong TRI THỨC VECTOR là chính ---" : '';
        }

        const systemPrompt = `BẠN LÀ Trợ lý shop chuyên nghiệp của "${shopConfig?.shop_name || shopData?.name || 'Shop'}". 
GIỌNG ĐIỆU CỦA BẠN: ${shopConfig?.brand_voice || 'Nhẹ nhàng, lễ phép, hỗ trợ tận tình'}
CHIẾN LƯỢC BÁN HÀNG & THẤU HIỂU KHÁCH HÀNG: ${shopConfig?.customer_insights || ''}
${globalInsights ? `\nCHIẾN LƯỢC TOÀN CỤC:\n${globalInsights}` : ''}

HÃY TUÂN THỦ THỨ TỰ ƯU TIÊN DỮ LIỆU SAU:
1. 🥇 ƯU TIÊN 1 (TỐI CAO): Các thông tin trong "THÔNG TIN CHUNG", "GIÁ CẢ" và "FAQ VĂN BẢN" bên dưới.
2. 🥈 ƯU TIÊN 2: Dữ liệu từ "TRI THỨC VECTOR" (dùng để bổ trợ nếu Ưu tiên 1 không có).

THÔNG TIN CHUNG (Nguồn chính):
${injectedGlobalProduct}
${shopConfig?.product_info || ''}

GIÁ CẢ (Nguồn chính):
${shopConfig?.pricing_info || ''}

FAQ VĂN BẢN (Nguồn chính):
${injectedGlobalFaq}
${shopConfig?.faq || ''}

TRI THỨC VECTOR (Tham khảo thêm): ${faqContext}
${bookingContext}
${happyHourContext}

QUY TẮC PHẢN HỒI:
- Phải nhập vai theo đúng GIỌNG ĐIỆU và CHIẾN LƯỢC BÁN HÀNG ở trên.
- Ưu tiên lệnh tại Shop Config hơn Global Config.
- Tuyệt đối không nhắc đến các từ kỹ thuật như "Vector", "Metadata", "Config".
${phoneActionRule}
- Nếu không có bất kỳ thông tin nào, trả lời lịch sự: "Dạ mình chưa có thông tin chính xác, mình xin phép báo quản lý hỗ trợ bạn ngay nhe!"`;
        const aiResult = await callGeminiWithFallback([
          ...(history || []).slice(-3).map((m: any) => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
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
    const errorResponse = "Dạ, hiện tại kết nối mạng đang hơi chậm, bạn vui lòng chờ vài giây rồi nhắn lại nhe! 🙏";
    
    console.error('Core Engine Error:', error);
    
    // LƯU LOG KỂ CẢ KHI LỖI để người dùng thấy tin nhắn họ đã gửi trong lịch sử
    try {
      await saveLogs(shopId, message, errorResponse, 'ai', latency, platform, externalUserId, 0);
    } catch (e) {}

    if (client) {
      await client.from('system_errors').insert({
        shop_id: shopId,
        error_type: 'ENGINE_CRASH_STABLE',
        error_message: error.message,
        file_source: 'chatbot-engine.ts',
        metadata: { shopCode, platform, stack: error.stack, message: message.substring(0, 50) }
      });
    }
    return { answer: errorResponse, source: 'ai', latency: latency };
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
