import { supabase, supabaseAdmin } from '@/lib/supabase';
import { 
  getHealthyKeys, 
  reportKeyFailure, 
  reportKeySuccess, 
  calculateComplexityScore, 
  getRetryPath 
} from './ai-manager';

export type DetailedKey = {
  id?: string;
  name: string;
  value: string;
};

// --- CACHE ANTI-POISONING ---
const UNCERTAIN_KEYWORDS = ['có thể', 'có lẽ', 'tôi nghĩ', 'không chắc', 'tùy thuộc'];
function isSafeToCache(text: string): boolean {
  if (text.length < 10 || text.length > 2000) return false;
  const lowerText = text.toLowerCase();
  return !UNCERTAIN_KEYWORDS.some(word => lowerText.includes(word));
}

/**
 * HÀM GỌI AI TỔNG LỰC (SMART HUB)
 * - Tự động định tuyến (Routing)
 * - Tự động cứu hộ (Failover)
 * - Kiểm soát thời gian (Timeout Budget)
 */
export async function callAIHub(
  userInput: string,
  history: any[],
  shopId: string | null,
  source: string = "WIDGET_CHAT"
): Promise<{ text: string, tokens: number, source: string }> {
  const globalStart = Date.now();
  const TIMEOUT_BUDGET = 8500; // 8.5 giây cho toàn bộ quá trình
  
  // 1. CHUẨN HÓA & EMBEDDING (CHỈ LÀM 1 LẦN DUY NHẤT)
  const embedding = await generateEmbedding(userInput);
  
  // 2. SEARCH CACHE (FAQ > AI CACHE)
  // --- Ưu tiên tuyệt đối FAQ (Độ tin cậy 100%) ---
  const { data: faqMatch } = await supabase.rpc('match_faqs', {
    query_embedding: embedding,
    match_threshold: 0.85,
    match_count: 1,
    p_shop_id: shopId
  });

  if (faqMatch?.[0]) {
    return { text: faqMatch[0].answer, tokens: 0, source: 'faq_cache' };
  }

  // --- Search AI Cache (Độ tin cậy 95%) ---
  const { data: aiCacheMatch } = await supabase.from('cache_answers')
    .select('answer')
    .eq('shop_id', shopId)
    .ilike('question', userInput) // Simple match for now, could use vector search later
    .limit(1)
    .single();

  if (aiCacheMatch) {
    return { text: aiCacheMatch.answer, tokens: 0, source: 'ai_cache' };
  }

  // 3. ROUTER & RETRY MATRIX
  const score = calculateComplexityScore(userInput);
  const initialProvider = score > 1.2 ? 'gemini' : 'deepseek';
  
  // Lấy thông tin shop để biết tier (Free/Pro)
  let shopTier: 'free' | 'pro' = 'free';
  if (shopId) {
    const { data: shop } = await supabase.from('shops').select('plan').eq('id', shopId).single();
    if (shop?.plan === 'pro') shopTier = 'pro';
  }

  const retryPath = getRetryPath(initialProvider, shopTier);
  let lastError = '';

  // 4. VÒNG LẶP CỨU HỘ THÔNG MINH (TIMEOUT-CONTROLLED)
  for (const step of retryPath) {
    // Kiểm tra Budget thời gian
    const elapsed = Date.now() - globalStart;
    if (elapsed > TIMEOUT_BUDGET - 1000) break; 

    const keys = await getHealthyKeys(step.provider, step.tier);
    if (keys.length === 0) continue;

    for (const keyObj of keys.slice(0, 2)) { 
      const stepStart = Date.now();
      try {
        const result = await callSpecificAI(step.provider, step.tier, keyObj.value, userInput, history);
        
        if (result) {
          const stepLatency = Date.now() - stepStart;
          reportKeySuccess(keyObj.id, stepLatency);
          
          // 5. LƯU CACHE (NẾU AN TOÀN)
          if (isSafeToCache(result.text)) {
            saveToCache(shopId, userInput, result.text);
          }
          
          return { ...result, source: `ai_${step.provider}` };
        }
      } catch (e: any) {
        lastError = e.message;
        reportKeyFailure(keyObj.id, e.message);
      }
    }
  }

  return { 
    text: "Hiện tại các chuyên gia AI đang bận một chút, bạn vui lòng đợi vài giây và gửi lại tin nhắn nhé! 🙏", 
    tokens: 0, 
    source: 'fallback' 
  };
}

/**
 * Hàm gọi API với Timeout để kiểm soát Budget thời gian
 */
async function fetchWithTimeout(url: string, options: any, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Timeout after ${timeout}ms`);
    }
    throw error;
  }
}

/**
 * Gọi API cụ thể (Gemini hoặc DeepSeek) với Timeout riêng biệt
 */
async function callSpecificAI(provider: string, tier: string, apiKey: string, userInput: string, history: any[]) {
  // Định nghĩa Timeout cho từng loại Provider/Tier
  let timeout = 2500; // Mặc định 2.5s (Gemini)
  if (provider === 'deepseek') {
    timeout = tier === 'pro' ? 2000 : 1500; // DS Pro: 2s, DS Free: 1.5s
  }

  if (provider === 'gemini') {
    const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetchWithTimeout(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [...history, { role: 'user', parts: [{ text: userInput }] }]
      })
    }, timeout);

    const data = await response.json();
    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { text: data.candidates[0].content.parts[0].text, tokens: data.usageMetadata?.totalTokenCount || 0 };
    }
  } else {
    // DeepSeek API
    const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [...history, { role: 'user', content: userInput }]
      })
    }, timeout);

    const data = await response.json();
    if (response.ok && data.choices?.[0]?.message?.content) {
      return { text: data.choices[0].message.content, tokens: data.usageMetadata?.total_tokens || 0 };
    }
  }
  throw new Error(`${provider} ${tier} API failed or timeout`);
}

const embeddingCache = new Map<string, number[]>();

export async function generateEmbedding(text: string): Promise<number[]> {
  const validKeys = [
    process.env.GEMINI_EMBEDDING_KEY_1,
    process.env.GEMINI_EMBEDDING_KEY_2,
    process.env.GEMINI_API_KEY
  ].filter(k => k && k.trim() !== '') as string[];

  if (validKeys.length === 0) {
    throw new Error('Hệ thống thiếu cấu hình Embedding Key (Gemini).');
  }

  const normalizedText = text.trim().toLowerCase();
  if (embeddingCache.has(normalizedText)) return embeddingCache.get(normalizedText)!;

  for (const key of validKeys) {
    try {
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: normalizedText }] }
        })
      }, 2000);

      const data = await res.json();
      if (res.ok && data.embedding?.values) {
        const vector = data.embedding.values;
        if (embeddingCache.size > 100) embeddingCache.clear();
        embeddingCache.set(normalizedText, vector);
        return vector;
      }
    } catch (e) {
      console.error(`[EMBEDDING_RETRY] Key failed, trying next...`);
    }
  }

  throw new Error('Tất cả các Key Embedding đều thất bại.');
}

async function saveToCache(shopId: string | null, question: string, answer: string) {
  if (!shopId) return;
  await supabase.from('cache_answers').insert({ shop_id: shopId, question, answer });
}
