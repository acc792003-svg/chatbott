import { supabase, supabaseAdmin } from './supabase';
import { callGeminiWithFallback, generateEmbedding } from './gemini';
import { detectAndSaveLead } from './leads';
import { validateRateLimit, redis } from './rate-limiter';
import { reportError } from './radar';
import { decideRoute, runAI, fallbackResponse } from './ai-router';

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
  source: string;
  latency: number;
  intent?: string;
  shopName?: string;
}

export function normalizeMessage(text: string): string {
  return text.trim().toLowerCase()
    .replace(/[?.,!]/g, '') 
    .replace(/\s+/g, ' ');   
}

function humanizeResponse(text: string, userMessage: string, shopConfig?: any) {
  if (!text) return text;
  // Tránh bọc 2 lần nếu câu trả lời đã có từ đệm lịch sự
  if (/^(dạ|vâng|chào|chúc|cảm ơn)/i.test(text.trim())) return text;

  const prefix = shopConfig?.prefix || 'Dạ,';
  const suffix = shopConfig?.suffix || 'ạ.';
  
  const isPricing = /(giá|bao nhiêu|nhiêu|mấy tiền|chi phí)/i.test(userMessage);
  const isLocation = /(địa chỉ|ở đâu|chỗ nào|đường nào)/i.test(userMessage);

  let cleanText = text.trim();
  
  // Nếu quá ngắn (trả lời cụt lủn kiểu "50k") -> Thêm prefix và suffix
  if (cleanText.length < 30) {
     cleanText = `${prefix} ${cleanText} ${cleanText.endsWith('.') || cleanText.endsWith('!') ? '' : suffix}`;
  } else {
     // Vẫn bọc Dạ cho lịch sự
     cleanText = `${prefix} ${cleanText}`;
  }

  // Tiêm Context-aware nếu câu trả lời khá ngắn
  if (isPricing && cleanText.length < 60) {
     return `${cleanText} Bạn cần tư vấn thêm thì cứ nhắn mình nhé!`;
  }
  if (isLocation && cleanText.length < 60) {
     return `${cleanText} Bạn định ghé lúc nào để mình chuẩn bị đón tiếp nhé!`;
  }
  
  return cleanText;
}

function keywordMatchScore(input: string, question: string) {
  const tokens = input.split(' ').filter(t => t.length > 2);
  if (tokens.length === 0) return input.length > 0 && question.toLowerCase().includes(input) ? 1 : 0;
  const qLower = question.toLowerCase();
  const matches = tokens.filter(t => qLower.includes(t));
  return matches.length / tokens.length;
}

function detectIntentBoost(input: string, f: any) {
  let score = 0;
  const combined = ((f.question || '') + ' ' + (f.answer || '')).toLowerCase();
  if (/(giá|tiền|bao nhiêu|nhiêu|bảng giá)/.test(input) && /(giá|tiền|bao nhiêu|vnd|đ|k|chi phí)/.test(combined)) score += 1;
  if (/(địa chỉ|ở đâu|chỗ nào|đường nào|quận mấy)/.test(input) && /(địa chỉ|nằm ở|đường|quận|phường)/.test(combined)) score += 1;
  if (/(giờ|khi nào|mấy giờ|mở cửa|đóng cửa)/.test(input) && /(giờ|sáng|chiều|tối|ngày)/.test(combined)) score += 1;
  if (/(ship|giao hàng|phí ship)/.test(input) && /(ship|giao|vận chuyển|phí)/.test(combined)) score += 1;
  
  return score > 0 ? 1 : 0;
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
  const marks: any = { start: Date.now() };
  const { shopId, message, history, externalUserId, platform, isPro, ip } = req;

  // 🛡️ LỚP BẢO VỆ REDIS: ĐÁNH CHẶN 4 TẦNG (BLACKLIST, WELCOME, USER, SHOP, IP)
  const isTrusted = (history && history.length > 2) || platform !== 'widget';
  const rateLimitResult = await validateRateLimit(shopId, externalUserId, ip || '127.0.0.1', message, isTrusted);
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
  let resultSource: string = 'ai';
  let queryEmbedding: number[] | null = null;
  let totalUsageTokens = 0;
  let shopCode = 'unknown';
  let faqContext = '';
  let topScore = 0;
  let scoredFaqs: any[] = [];

  const client = supabaseAdmin || supabase;
  marks.init = Date.now() - marks.start;


  try {
    // ⚡ 4) PARALLEL ĐÚNG CÁCH + CACHING CONFIG (TTL 5 PHÚT)
    const configCacheKey = `config:${shopId}`;
    let shopData: any, shopConfig: any, configError: any, bookingConfig: any, happyHours: any, mappings: any;

    const cachedConfig = redis ? await redis.get<any>(configCacheKey) : null;

    if (cachedConfig) {
      ({ shopData, shopConfig, bookingConfig, happyHours, mappings } = cachedConfig);
      marks.db_cache = Date.now() - marks.start - marks.init;
    } else {
      const [
        { data: sData },
        { data: sConfigRes, error: cError },
        { data: bConfig },
        { data: hHours },
        { data: maps }
      ] = await Promise.all([
        client.from('shops').select('name, code').eq('id', shopId).maybeSingle(),
        client.from('chatbot_configs')
          .select('shop_name, product_info, pricing_info, faq, brand_voice, customer_insights, is_active, telegram_chat_id, telegram_bot_token')
          .eq('shop_id', shopId)
          .maybeSingle(),
        client.from('shop_settings').select('*').eq('shop_id', shopId).maybeSingle(),
        client.from('discount_rules').select('*').eq('shop_id', shopId).eq('is_active', true),
        client.from('shop_templates').select('template_id').eq('shop_id', shopId)
      ]);

      shopData = sData; shopConfig = sConfigRes; configError = cError; bookingConfig = bConfig; happyHours = hHours; mappings = maps;
      
      if (redis && shopConfig) {
        await redis.set(configCacheKey, { shopData, shopConfig, bookingConfig, happyHours, mappings }, { ex: 300 });
      }
      marks.db_fetch = Date.now() - marks.start - marks.init;
    }

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
      reportError({
        shopId: shopId,
        errorType: 'CHATBOT_CONFIG_MISSING',
        errorMessage: `Shop #${shopCode} chưa có chatbot_configs.`,
        fileSource: 'chatbot-engine.ts',
        severity: 'critical',
        metadata: { shopId, shopCode }
      }).catch(() => {});

      return {
        answer: "Dạ xin lỗi bạn, hiện tại hệ thống đang bảo trì. Bạn vui lòng liên hệ lại sau nhé! 🙏",
        source: 'faq',
        latency: 0
      };
    }

    // Kiểm tra trạng thái hoạt động
    if (shopConfig.is_active === false) {
       return { answer: "Dạ, hiện tại chatbot đang tạm nghỉ bảo trì, bạn nhắn lại sau ít phút nhe! 🙏", source: 'faq', latency: 0 };
    }

    // 🌍 TẢI TRI THỨC KẾ THỪA
    let globalProductInfo = '';
    let globalFaq = '';
    let globalInsights = '';

    if (mappings && mappings.length > 0) {
      const templateIds = mappings.map((m: any) => m.template_id);
      const { data: templates } = await client.from('knowledge_templates').select('*').in('id', templateIds);
      if (templates && templates.length > 0) {
         globalProductInfo = templates.map((t: any) => `[Global: ${t.package_name}]\n${t.product_info || ''}`).join('\n\n');
         globalFaq = templates.map((t: any) => `[Global: ${t.package_name}]\n${t.faq || ''}`).join('\n\n');
         globalInsights = templates.map((t: any) => t.insights || '').join('\n');
      }
    }

    // 🕒 XỬ LÝ CONTEXT ĐẶT LỊCH & GIỜ VÀNG
    const bookingContext = bookingConfig 
      ? `[TRẠNG THÁI CUỘC HẸN LIVE]:\n- Dự kiến sẽ còn trống chỗ sau: ${bookingConfig.slot_duration_minutes} phút nữa.\n- Số chỗ dự kiến sẽ trống: ${bookingConfig.max_slot_per_block} chỗ.`
      : "";

    const happyHourContext = (happyHours && happyHours.length > 0)
      ? `[ƯU ĐÃI GIỜ VÀNG (HAPPY HOUR)]:\n${happyHours.map((h: any) => `- Từ ${h.start_time.substring(0,5)} đến ${h.end_time.substring(0,5)}: Giảm ${h.discount_value}${h.discount_type === 'percent' ? '%' : 'K'}`).join('\n')}`
      : "";

    
    
    // ⚡ 1) FAST PATH UPGRADED (Intent + Keyword Index) - < 5ms
    const fastMatch = detectFastKeyword(normalized);
    if (fastMatch) {
       let fastAnswer = "";
       if (fastMatch === 'greeting') {
           fastAnswer = `Dạ ${shopConfig?.shop_name || 'shop'} xin chào bạn ạ! Em có thể giúp gì cho mình về sản phẩm hay dịch vụ của bên em không ạ? 😊`;
       } else if (fastMatch === 'address') {
           fastAnswer = shopConfig?.address ? `Dạ, địa chỉ của bên em tại: ${shopConfig.address} ạ. Mời bạn ghé qua shop nhe! 🌿` : "";
       }
       
       if (fastAnswer) {
          marks.fast_path = Date.now() - marks.start;
          return {
            answer: humanizeResponse(fastAnswer, message, shopConfig),
            source: 'fast_path',
            latency: marks.fast_path,
            shopName: shopConfig?.shop_name || shopData?.name
          };
       }
    }

    // 🚀 2) EMBEDDING CHỈ KHI CẦN (LAZY + 2S TIMEOUT + SKIP FOR SHORT TEXT)
    const shouldUseVector = normalized.length > 35;

    if (shouldUseVector) {
        try {
          queryEmbedding = await generateEmbedding(normalized, !!isPro);
          marks.embedding = Date.now() - marks.start;
        } catch (e) {
          console.warn('[Engine] Embedding failed or timeout, skipping vector search.');
          marks.embedding_fail = Date.now() - marks.start;
        }
    } else {
        marks.embedding_skipped = true;
    }

    // 🧠 3) VECTOR SEARCH NHẸ HÓA (topK=3, Early Exit)
    if (queryEmbedding) {
      const { data: cacheMatches } = await client.rpc('match_cache', {
        query_embedding: queryEmbedding,
        match_threshold: 0.90,
        match_count: 1,
        p_shop_id: shopId
      });

      if (cacheMatches?.[0]) {
        marks.cache_hit = Date.now() - marks.start;
        return { 
          answer: humanizeResponse(cacheMatches[0].answer, message, shopConfig), 
          source: 'cache', 
          latency: marks.cache_hit,
          shopName: shopConfig?.shop_name || shopData?.name
        };
      }

      const { data: vectorFaqs } = await client.rpc('match_faqs', {
        query_embedding: queryEmbedding,
        match_threshold: 0.50,
        match_count: 3, 
        p_shop_id: shopId
      });
      marks.vector = Date.now() - marks.start;

    
    if (vectorFaqs && vectorFaqs.length > 0) {
      const wordCount = normalized.split(' ').length;
      const isShort = wordCount <= 5;

      const vWeight = isShort ? 0.5 : 0.75;
      const kWeight = isShort ? 0.4 : 0.15;
      const iWeight = 0.1;

      scoredFaqs = vectorFaqs.map((f: any) => {
        const keywordScore = keywordMatchScore(normalized, f.question);
        const intentScore = detectIntentBoost(normalized, f);

        return {
          ...f,
          hybridScore:
            (f.similarity * vWeight) +
            (keywordScore * kWeight) +
            (intentScore * iWeight)
        };
      }).sort((a: any, b: any) => b.hybridScore - a.hybridScore);

      topScore = scoredFaqs[0].hybridScore;

      // 🥇 MỨC 1: >= 0.85 (rất khớp) -> Trả thẳng FAQ (FAQ path)
      if (topScore >= 0.85) {
        // 🔥 Re-ranking check (Lớp an toàn cuối)
        const isSafeToAutoFaq = scoredFaqs.length > 1 ? (topScore - scoredFaqs[1].hybridScore >= 0.05) : true;
        
        if (isSafeToAutoFaq) {
          console.log(`[Engine] FAQ Match (Hybrid: ${topScore.toFixed(2)} >= 0.85) - FAQ PATH`);
          return { 
            answer: humanizeResponse(scoredFaqs[0].answer, message, shopConfig), 
            source: 'faq', 
            latency: Date.now() - marks.start,
            shopName: shopConfig?.shop_name || shopData?.name
          };
        } else {
          console.log(`[Engine] Re-ranking Check Failed (Distance < 0.05). Downgrading to AI Path.`);
        }
      } 
      
      // 🥈 MỨC 2: Inject context cho AI (Kể cả khi Re-ranking check fail ở mức 1)
      if (topScore >= 0.70) {
         faqContext = scoredFaqs.slice(0, 3).map((f: any) => `Q: ${f.question}\nA: ${f.answer}`).join('\n---\n');
      }
    } // End if vectorFaqs
  } // End if queryEmbedding

    // 4. ROUTER QUYẾT ĐỊNH
    const plan = isPro ? 'pro' : 'free';
    const decision = decideRoute({
      cacheHit: false, // Đã check ở trên
      faqScore: topScore
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
        // ⚙️ 8) CONTEXT NHẸ - ĐỦ DÙNG (Cắt basePrompt ≤ 1500 ký tự)
        const basePromptKey = `prompt:${shopId}:${topScore >= 0.75 ? 'no_global' : 'with_global'}`;
        let basePrompt = redis ? await redis.get<string>(basePromptKey) : null;

        if (!basePrompt) {
          basePrompt = `SHOP: "${shopConfig?.shop_name || shopData?.name || 'Shop'}"
VOICE: "${shopConfig?.brand_voice || 'Nhẹ nhàng, lễ phép'}"
INSIGHTS: "${shopConfig?.customer_insights || ''}"
PRODUCTS: ${(injectedGlobalProduct || shopConfig?.product_info || '').substring(0, 1200)}
PRICING: ${(shopConfig?.pricing_info || '').substring(0, 500)}
RULES: Trả lời ĐẦY ĐỦ Ý, súc tích. Nếu thiếu dữ liệu -> xin SĐT tư vấn.`;
          
          if (redis) await redis.set(basePromptKey, basePrompt, { ex: 600 });
        }

        // TẠO DYNAMIC CONTEXT (KHÔNG CACHE VÌ THAY ĐỔI THEO TỪNG LƯỢT CHAT)
        const finalFaqContext = faqContext || (!shouldUseVector ? (shopConfig?.faq || '').substring(0, 1500) : '');
        const systemPrompt = `${basePrompt}
${phoneActionRule}
FAQ: ${finalFaqContext}
LIVE: ${bookingContext} ${happyHourContext}`;









        const aiResult = await runAI({ 
             history: (history || []).slice(-4),
             temperature: 0.7,
             systemPrompt,
             tier: plan,
             vectorFaqs: scoredFaqs,
             platform: platform
        });

        finalResponse = aiResult.text;
        totalUsageTokens = aiResult.tokens;
        resultSource = aiResult.source as any;
        marks.ai = Date.now() - marks.start;

       if (queryEmbedding && finalResponse.length < 500 && resultSource !== 'fallback') {
          await client.from('cache_answers').insert({ shop_id: shopId, question: normalized, answer: finalResponse, embedding: queryEmbedding });
       }
    }

    const latency = Date.now() - marks.start;
    
    // 📦 7) ASYNC HÓA TOÀN BỘ PHẦN PHỤ (Fire-and-forget)
    void saveLogs(shopId, message, finalResponse, resultSource, latency, platform, externalUserId, totalUsageTokens);
    void summarizeThread(shopId, externalUserId, [...(history || []), { role: 'user', content: message }, { role: 'assistant', content: finalResponse }]);
    void detectAndSaveLead(message, shopId, externalUserId, shopConfig);

    return { 
      answer: finalResponse, 
      source: resultSource, 
      latency, 
      shopName: shopConfig?.shop_name || shopData?.name
    };

  } catch (error: any) {
    const latency = Date.now() - marks.start;
    const fallback = fallbackResponse(scoredFaqs);
    
    void saveLogs(shopId, message, fallback.text, 'fallback', latency, platform, externalUserId, 0);

    if (client) {
      reportError({
        shopId: shopId,
        errorType: 'ENGINE_CRASH_STABLE',
        errorMessage: error.message,
        fileSource: 'chatbot-engine.ts',
        severity: 'high',
        metadata: { shopCode, platform, marks, message: message.substring(0, 50) }
      }).catch(() => {});
    }
    return { answer: fallback.text, source: 'fallback', latency: latency };
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
    if (!fullHistory || fullHistory.length < 2) return;

    const historyText = fullHistory.slice(-20).map((h: any) => `${h.role}: ${h.content}`).join('\n');
    
    // 1. Kiểm tra Booking Intent (Strict Regex)
    const bookingIntent = /(đặt lịch|đặt chỗ|hẹn|book)/i.test(historyText);
    const pricingIntent = /(giá|bao nhiêu tiền|phí|cost)/i.test(historyText);
    const hasBookingIntent = bookingIntent || pricingIntent;

    const client = supabaseAdmin || supabase;
    // Tạm bỏ select created_at, lấy last_message_at
    const { data: conv } = await client.from('conversations')
       .select('last_message_at')
       .eq('shop_id', shopId)
       .eq('external_user_id', externalUserId)
       .maybeSingle();
    
    // 2. Kiểm tra Inactive > 5 phút (Chờ khách nghỉ tay rồi mới tổng hợp)
    const lastMessageAt = conv?.last_message_at;
    const isActive5Mins = lastMessageAt && (Date.now() - new Date(lastMessageAt).getTime() > 300000);

    if (!isActive5Mins && !hasBookingIntent) return;

    if (redis) {
       // 4. Kiểm tra Max Summary Limit (Tối đa 3 lần / ngày / user để chống lãng phí cực đoan)
       const limitKey = `summary_limit:${shopId}:${externalUserId}`;
       const summaryCount = (await redis.get<number>(limitKey)) || 0;
       if (summaryCount >= 3) return;

       // 3. Debounce theo Session Bucket (5 phút = 1 bucket mới)
       const sessionBucket = Math.floor(Date.now() / 300000); 
       const summaryKey = `summary:${shopId}:${externalUserId}:${sessionBucket}`;
       
       const isThrottled = await redis.get(summaryKey);
       if (isThrottled) return;
       
       // Đánh dấu đã gọi trong bucket này và tăng biến đếm limit
       await redis.set(summaryKey, '1', { ex: 300 }); 
       await redis.incr(limitKey);
       await redis.expire(limitKey, 86400); // Reset biến đếm sau 1 ngày
    }

    const { text } = await callGeminiWithFallback([{ role: 'user', parts: [{ text: `Phân tích JSON: {summary, sentiment, satisfaction_score, new_faq} từ: ${historyText}` }] }], { temperature: 0.2, responseMimeType: "application/json" }, shopId, 'API_INTERNAL_ANALYST');
    if (text) {
      const result = JSON.parse(text);
      await client.from('conversations').update({ 
          summary: result.summary, 
          sentiment: result.sentiment, 
          satisfaction_score: result.satisfaction_score, 
          last_message_at: new Date().toISOString() 
      }).eq('shop_id', shopId).eq('external_user_id', externalUserId);
    }
  } catch (e) {}
}

/**
 * ⚡ TIER 0: FAST KEYWORD DETECTOR
 * Nhiệm vụ: Nhận diện siêu tốc các ý định phổ biến để trả lời ngay lập tức (< 1ms)
 */
/**
 * ⚡ 1) FAST PATH UPGRADED (Intent + Keyword Index)
 */
function detectFastKeyword(text: string): 'greeting' | 'address' | 'hours' | 'price' | null {
  const t = text.toLowerCase().trim();
  
  const INTENTS = {
    greeting: /^(hi|hello|chào|xin chào|alo|ê|ad|bot|hey|hola)$/i,
    address: /(địa chỉ|ở đâu|chỗ nào|đường nào|map|vị trí)/i,
    hours: /(giờ mở cửa|mấy giờ|mở cửa lúc|đóng cửa lúc|giờ làm việc)/i,
    price: /(giá|bao nhiêu|nhiêu|mấy tiền|chi phí|rổ giá)/i
  };

  if (INTENTS.greeting.test(t)) return 'greeting';
  if (INTENTS.address.test(t)) return 'address';
  if (INTENTS.hours.test(t)) return 'hours';
  if (INTENTS.price.test(t)) return 'price';

  return null;
}
