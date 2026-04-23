// Hệ thống tự động phát hiện và gọi model Gemini khả dụng
// Với cơ chế retry thông minh, API key từ DB, và ghi log lỗi

import { supabase, supabaseAdmin } from '@/lib/supabase';

const MODEL_CACHE_TTL = 5 * 60 * 1000; // Cache 5 phút
let cachedModels: string[] = [];
let cacheTimestamp = 0;

// Bộ nhớ theo dõi sức khỏe và hiệu suất API Key (Circuit Breaker + Least Used)
export const keyStatsMap = new Map<string, { 
    errorCount: number, 
    lastErrorTime: number, 
    isDisabled: boolean,
    usageCount: number,
    lastUsedTime: number 
}>();

export type DetailedKey = {
  name: string;
  value: string;
};

// Lấy API Keys từ database (Super Admin quản lý), fallback về .env.local
export async function getDetailedApiKeys(isPro: boolean = false): Promise<DetailedKey[]> {
  const keys: DetailedKey[] = [];
  
  try {
    const client = supabaseAdmin || supabase;
    if (client) {
      const searchKeys = isPro ? ['gemini_api_key_pro'] : ['gemini_api_key_1', 'gemini_api_key_2'];
      const { data } = await client
        .from('system_settings')
        .select('key, value')
        .in('key', searchKeys);
      
      if (data) {
        // Thứ tự ưu tiên đúng như searchKeys
        searchKeys.forEach(sk => {
           const found = data.find((d: any) => d.key === sk);
           if (found && found.value && found.value.trim()) {
              let displayName = 'Key 1';
              if (sk === 'gemini_api_key_2') displayName = 'Key 2';
              if (sk === 'gemini_api_key_pro') displayName = 'Key PRO';
              keys.push({ name: displayName, value: found.value.trim() });
           }
        });
      }
    }
  } catch (e) {}

  // Luôn thêm key từ .env.local vào cuối danh sách như phương án dự phòng cuối cùng
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  if (envKey && !keys.find(k => k.value === envKey)) {
    keys.push({ name: 'Key .ENV', value: envKey });
  }
  
  return keys;
}

// Ghi log lỗi vào database (Ưu tiên dùng supabaseAdmin, nếu không có thì dùng supabase anon)
async function logError(shopId: string | null, errorType: string, errorMessage: string, source: string) {
  try {
    const client = supabaseAdmin || supabase;
    if (client) {
      await client.from('system_errors').insert({
        shop_id: shopId,
        error_type: errorType,
        error_message: errorMessage,
        file_source: 'gemini.ts',
        metadata: { source }
      });
    }
  } catch (e) {
    console.error('Lỗi khi ghi system_error:', e);
  }
}

async function getAvailableModels(apiKey: string): Promise<string[]> {
  if (cachedModels.length > 0 && Date.now() - cacheTimestamp < MODEL_CACHE_TTL) {
    return cachedModels;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
        next: { revalidate: 300 }
    });
    
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Invalid content type: ${contentType}`);
    }

    const data = await res.json();
    if (data.models) {
      const models = data.models
        .filter((m: any) => 
          m.supportedGenerationMethods?.includes('generateContent') &&
          !m.name.includes('-tts') &&
          !m.name.includes('-image') &&
          !m.name.includes('-audio') &&
          !m.name.includes('-predict')
        )
        .map((m: any) => m.name as string)
        .sort((a: string, b: string) => {
          const score = (name: string) => {
            if (name.includes('2.0-flash')) return 150; // Priority for Latest Stable
            if (name.includes('1.5-flash-8b')) return 140; // Extremely fast
            if (name.includes('1.5-flash')) return 130;
            if (name.includes('flash-lite')) return 125;
            return 10;
          };
          return score(b) - score(a);
        });
      
      if (models.length > 0) {
        cachedModels = models;
        cacheTimestamp = Date.now();
        return models;
      }
    }
  } catch (e) {}
  return ['models/gemini-2.0-flash', 'models/gemini-1.5-flash', 'models/gemini-1.5-flash-8b'];
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callGeminiWithFallback(
  contents: any[],
  generationConfig?: any,
  shopId?: string | null,
  source: string = "API_CHAT_WIDGET",
  systemInstruction?: string
): Promise<{ text: string, tokens: number }> {
  const globalStart = Date.now();
  const GLOBAL_TIMEOUT = 14000; // Tăng giới hạn lên 14s để AI có thêm thời gian suy nghĩ

  // -- HỖ TRỢ CHUẨN HÓA ROLE (TRÁNH LỖI CONSECUTIVE ROLES) --
  let normalizedContents: any[] = [];
  contents.forEach(item => {
    if (normalizedContents.length > 0 && normalizedContents[normalizedContents.length - 1].role === item.role) {
        // Gộp nội dung nếu trùng role liên tiếp
        normalizedContents[normalizedContents.length - 1].parts[0].text += "\n" + item.parts[0].text;
    } else {
        normalizedContents.push(JSON.parse(JSON.stringify(item)));
    }
  });
  let shopPlan: 'free' | 'pro' = 'free';
  const client = supabaseAdmin || supabase;
  if (shopId && client) {
    const { data: shop } = await client.from('shops').select('plan, plan_expiry_date').eq('id', shopId).single();
    if (shop?.plan === 'pro') {
      const expiry = shop.plan_expiry_date ? new Date(shop.plan_expiry_date) : null;
      if (!expiry || expiry > new Date()) shopPlan = 'pro';
      else {
        client.from('shops').update({ plan: 'free' }).eq('id', shopId)
          .then(({error}: any) => { if(error) console.error('Downgrade error:', error.message) });
      }
    }
  }

  // 2. Lấy danh sách Key cần thử
  let keysToTry: DetailedKey[] = [];
  if (shopPlan === 'pro') {
    const proKeys = await getDetailedApiKeys(true);
    const freeKeys = await getDetailedApiKeys(false);
    keysToTry = [...proKeys, ...freeKeys];
  } else {
    keysToTry = await getDetailedApiKeys(false);
    keysToTry = keysToTry.sort(() => Math.random() - 0.5);
  }
  
  if (keysToTry.length === 0) {
    return { text: "Hệ thống đang bảo trì dịch vụ AI, bạn vui lòng quay lại sau ít phút nhé! 🙏", tokens: 0 };
  }

  const config = generationConfig || { temperature: 0.8, maxOutputTokens: 1000 };
  let lastError = '';

  // --- CHIẾN THUẬT CHỌN KEY: LEAST-USED + COOLDOWN + SHUFFLE ---
  const sortedKeys = [...keysToTry].sort((a, b) => {
    const now = Date.now();
    const statsA = keyStatsMap.get(a.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
    const statsB = keyStatsMap.get(b.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
    const isCoolingA = now - statsA.lastUsedTime < 2000;
    const isCoolingB = now - statsB.lastUsedTime < 2000;
    if (isCoolingA !== isCoolingB) return isCoolingA ? 1 : -1;
    if (statsA.usageCount !== statsB.usageCount) return statsA.usageCount - statsB.usageCount;
    return Math.random() - 0.5;
  });

  // GIỚI HẠN: Chỉ thử tối đa 2 Key tốt nhất để fail nhanh,UX tốt
  const activeKeys = sortedKeys.slice(0, 2);

  // 3. Vòng lặp thử từng API Key (Max 2)
  for (const keyObj of activeKeys) {
    // ANTI-TIMEOUT: Nếu tổng thời gian đã trôi qua > 13s, ngừng thử key mới để trả fallback ngay
    if (Date.now() - globalStart > 13000) {
        console.warn(`[GLOBAL_TIMEOUT] Sắp hết hạn (13s). Dừng tìm Key mới.`);
        break;
    }

    const stats = keyStatsMap.get(keyObj.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
    if (stats.isDisabled) {
        if (Date.now() - stats.lastErrorTime > 120000) {
            stats.isDisabled = false; 
            stats.errorCount = 3; 
        } else continue; 
    }

    const models = await getAvailableModels(keyObj.value);

    for (const fullModelName of models) {
      const apiURL = `https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${keyObj.value}`;
      const stepStart = Date.now();
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000); // Tăng Timeout lên 12s/key

        const body: any = { contents: normalizedContents, generationConfig: config };
        if (systemInstruction) {
            body.system_instruction = { parts: [{ text: systemInstruction }] };
        }

        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const text = await response.text();
            throw new Error(`API returned non-JSON (${response.status}): ${text.substring(0, 50)}`);
        }

        const data = await response.json();
        console.log(`[AI_STEP] ${keyObj.name} (${fullModelName}): ${Date.now() - stepStart}ms`);

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          const s = keyStatsMap.get(keyObj.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
          s.usageCount += 1;
          s.lastUsedTime = Date.now();
          s.errorCount = Math.max(0, s.errorCount - 3);
          s.isDisabled = false;
          keyStatsMap.set(keyObj.value, s);
          return { 
            text: data.candidates[0].content.parts[0].text, 
            tokens: data.usageMetadata?.totalTokenCount || 0 
          };
        }

        // XỬ LÝ LỖI
        const errorMsg = data.error?.message || 'Lỗi không xác định';
        const errorCode = data.error?.status || response.status;
        lastError = `${keyObj.name}: ${errorMsg}`;

        if (errorCode === 'INVALID_ARGUMENT' || errorCode === 400) {
           if (errorMsg.includes('API key not valid') || errorMsg.includes('API_KEY_INVALID')) {
              await logError(shopId || null, 'API_KEY_INVALID', `[${keyObj.name}] hư: ${errorMsg}`, source);
              break; // Thử Key tiếp theo
           }
           // Nếu là lỗi liên quan model (như multiturn không hỗ trợ), thử model tiếp theo của Key này
           console.warn(`[AI_MODEL_ERROR] ${keyObj.name} (${fullModelName}): ${errorMsg}`);
           continue; 
        }

        if (response.status === 429 || response.status === 503 || errorMsg.includes('high demand')) {
           // Retry nội bộ 1 lần nếu còn dư thời gian
           if (Date.now() - globalStart < 6000) {
               const retryDelay = Math.min(1000 + Math.floor(Math.random() * 500), 2000);
               await delay(retryDelay);

               const controller = new AbortController();
               const timeoutId = setTimeout(() => controller.abort(), 4000);
               const retryResponse = await fetch(apiURL, {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ contents, generationConfig: config }),
                 signal: controller.signal
               });
               clearTimeout(timeoutId);
               
               const retryData = await retryResponse.json();
               if (retryResponse.ok && retryData.candidates?.[0]?.content?.parts?.[0]?.text) {
                 const s = keyStatsMap.get(keyObj.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
                 s.usageCount += 1;
                 s.lastUsedTime = Date.now();
                 s.errorCount = Math.max(0, s.errorCount - 3);
                 keyStatsMap.set(keyObj.value, s);
                 return { 
                    text: retryData.candidates[0].content.parts[0].text, 
                    tokens: retryData.usageMetadata?.totalTokenCount || 0 
                 };
               }
           }

           if (keyObj.name === 'Key PRO') {
              await logError(shopId || null, 'PRO_KEY_OVERLOAD', `Key PRO quá tải.`, source);
           }
        }

        // CIRCUIT BREAKER
        const s = keyStatsMap.get(keyObj.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
        s.errorCount += 1;
        s.lastErrorTime = Date.now();
        s.lastUsedTime = Date.now();
        if (s.errorCount >= 5) {
            s.isDisabled = true;
            await logError(shopId || null, 'CIRCUIT_BREAKER_OPEN', `Key ${keyObj.name} lỗi liên tục -> Nghỉ 2p.`, source);
        }
        keyStatsMap.set(keyObj.value, s);
        
        lastError = `${keyObj.name}: ${errorMsg}`;
        continue; 

      } catch (e: any) {
        lastError = `${keyObj.name}: ${e.message}`;
        await logError(shopId || null, 'FETCH_FAILED', `[${keyObj.name}] Lỗi: ${e.message}`, source);
        continue;
      }
    }
  }

  // FALLBACK CUỐI CÙNG (An toàn, không để client dính Failed to fetch)
  console.log(`[GLOBAL_FINISH] Tổng thời gian xử lý: ${Date.now() - globalStart}ms`);
  return { text: "Hiện tại hệ thống đang kết nối hơi chậm, bạn vui lòng đợi vài giây và gửi lại tin nhắn nhé! 🙏", tokens: 0 };
}

/**
 * Tạo Vector Embedding cho văn bản sử dụng model text-embedding-004
 */
export async function generateEmbedding(text: string, isPro: boolean = false): Promise<number[]> {
  const stepStart = Date.now();
  const keys = await getDetailedApiKeys(isPro); 
  if (keys.length === 0) throw new Error('Không có API Key để tạo Embedding');
  
  let lastError = '';
  // Thử tối đa 2 key để tránh chờ quá lâu
  for (const keyObj of keys.slice(0, 2)) {
    const apiKey = keyObj.value;
    const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); 

    try {
      const response = await fetch(apiURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const data = await response.json();
      if (response.ok && data.embedding?.values) {
        console.log(`[EMBED_STEP] Finish with ${keyObj.name}: ${Date.now() - stepStart}ms`);
        return data.embedding.values;
      }
      lastError = data.error?.message || 'Lỗi không xác định';
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error.message;
      console.warn(`[EMBED_RETRY] Key ${keyObj.name} thất bại: ${error.message}`);
    }
  }

  throw new Error(`Tất cả API Key tạo Embedding đều thất bại: ${lastError}`);
}

/**
 * Batch Tạo Vector Embedding cho mảng văn bản (gom 10-20 câu / lần)
 * Sử dụng API batchEmbedContents để tiết kiệm quota và tăng tốc độ.
 */
export async function batchGenerateEmbeddings(texts: string[], isPro: boolean = false): Promise<number[][]> {
  if (texts.length === 0) return [];
  const stepStart = Date.now();
  const keys = await getDetailedApiKeys(isPro); 
  if (keys.length === 0) throw new Error('Không có API Key để tạo Batch Embedding');
  
  const apiKey = keys[0].value;
  const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s cho batch

  const requests = texts.map(text => ({
    model: "models/gemini-embedding-001",
    content: { parts: [{ text }] }
  }));

  try {
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requests }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const data = await response.json();
    console.log(`[BATCH_EMBED_STEP] Finish ${texts.length} items: ${Date.now() - stepStart}ms`);

    if (response.ok && data.embeddings) {
      return data.embeddings.map((embed: any) => embed.values);
    }
    
    throw new Error(data.error?.message || 'Lỗi tạo Batch Embedding');
  } catch (error: any) {
    clearTimeout(timeoutId);
    console.error('Batch Embedding Error:', error);
    
    // Ghi log vào system_errors để không bị mất dấu
    try {
      const client = supabaseAdmin || supabase;
      if (client) {
        await client.from('system_errors').insert({
          error_type: 'EMBEDDING_FAIL',
          error_message: error.message,
          file_source: 'gemini.ts - batchGenerateEmbeddings'
        });
      }
    } catch(e) {}
    
    throw error;
  }
}
