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
  const start = Date.now();
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
  let detectedIntent = 'chat';
  let scoredFaqs: any[] = [];

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
        answer: humanizeResponse(cacheMatches[0].answer, message, shopConfig), 
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
            latency: Date.now() - start,
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
    }

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
        const systemPrompt = `SHOP:
  Name: "${shopConfig?.shop_name || shopData?.name || 'Shop'}"
  Voice: "${shopConfig?.brand_voice || 'Nhẹ nhàng, lễ phép'}"
  Insights: "${shopConfig?.customer_insights || ''}"
  
SERVICES_AND_PRODUCTS:
${(injectedGlobalProduct || shopConfig?.product_info || '').substring(0, 1500)}

PRICING:
${(shopConfig?.pricing_info || '').substring(0, 800)}

RULES:
- Trả lời ĐẦY ĐỦ Ý nhưng súc tích, tự nhiên và lịch sự. Đi thẳng vào trọng tâm câu hỏi.
- KHÔNG trả lời cụt lủn. Đảm bảo giải quyết trọn vẹn thắc mắc của khách hàng trong một lần đáp.
- Cung cấp thông tin vừa đủ, đúng trọng tâm. (Ví dụ: khách hỏi giá 1 món thì báo giá món đó kèm thông tin cơ bản, không copy paste toàn bộ menu).
- Ưu tiên trả lời dựa trên dữ liệu của shop. Nếu thiếu dữ liệu -> lịch sự mời khách để lại SĐT hoặc đợi nhân viên.
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

        const aiResult = await runAI({ 
             history: rawHistoryForAI,
             temperature: 0.7,
             systemPrompt,
             tier: plan,
             vectorFaqs: scoredFaqs
        });

       finalResponse = aiResult.text;
       totalUsageTokens = aiResult.tokens;
       resultSource = aiResult.source as any;

       if (queryEmbedding && finalResponse.length < 500 && resultSource !== 'fallback') {
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
    
    // 🔥 Graceful Degradation: Fallback to Vector FAQ if AI fails
    const fallback = fallbackResponse(scoredFaqs);
    let errorResponse = fallback.text;
    
    console.error('Core Engine Error:', error);
    
    // LƯU LOG KỂ CẢ KHI LỖI để người dùng thấy tin nhắn họ đã gửi trong lịch sử
    try {
      await saveLogs(shopId, message, errorResponse, 'fallback', latency, platform, externalUserId, 0);
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
    return { answer: errorResponse, source: 'fallback', latency: latency };
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
