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
      await client.from('error_logs').insert({
        shop_id: shopId,
        error_type: errorType,
        error_message: errorMessage,
        source: source
      });
    }
  } catch (e) {
    console.error('Lỗi khi ghi error_log:', e);
  }
}

async function getAvailableModels(apiKey: string): Promise<string[]> {
  if (cachedModels.length > 0 && Date.now() - cacheTimestamp < MODEL_CACHE_TTL) {
    return cachedModels;
  }

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await res.json();

    if (data.models) {
      const models = data.models
        .filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
        .map((m: any) => m.name as string)
        .sort((a: string, b: string) => {
          const score = (name: string) => {
            if (name.includes('2.5-flash')) return 100;
            if (name.includes('2.0-flash')) return 90;
            if (name.includes('1.5-flash')) return 80;
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
  return ['models/gemini-2.0-flash', 'models/gemini-1.5-flash'];
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callGeminiWithFallback(
  contents: any[],
  generationConfig?: any,
  shopId?: string | null
): Promise<string> {
  // 1. Kiểm tra trạng thái PRO của Shop
  let shopPlan: 'free' | 'pro' = 'free';
  const client = supabaseAdmin || supabase;
  if (shopId && client) {
    const { data: shop } = await client.from('shops').select('plan, plan_expiry_date').eq('id', shopId).single();
    if (shop?.plan === 'pro') {
      const expiry = shop.plan_expiry_date ? new Date(shop.plan_expiry_date) : null;
      if (!expiry || expiry > new Date()) shopPlan = 'pro';
      else await client.from('shops').update({ plan: 'free' }).eq('id', shopId);
    }
  }

  // 2. Lấy danh sách Key cần thử
  // Nếu là PRO → thử Key PRO trước. Nếu thất bại → thử Key Free dự phòng.
  let keysToTry: DetailedKey[] = [];
  if (shopPlan === 'pro') {
    const proKeys = await getDetailedApiKeys(true);
    const freeKeys = await getDetailedApiKeys(false);
    keysToTry = [...proKeys, ...freeKeys];
  } else {
    keysToTry = await getDetailedApiKeys(false);
    // Xoay vòng ngẫu nhiên để chia tải đều cho các Key Free
    keysToTry = keysToTry.sort(() => Math.random() - 0.5);
  }
  
  if (keysToTry.length === 0) {
    throw new Error('Hệ thống đang bảo trì dịch vụ AI, vui lòng quay lại sau! 🙏');
  }

  const config = generationConfig || { temperature: 0.8, maxOutputTokens: 1000 };
  let lastError = '';
  const now = Date.now();

  // --- CHIẾN THUẬT CHỌN KEY: LEAST-USED + COOLDOWN + SHUFFLE ---
  const sortedKeys = [...keysToTry].sort((a, b) => {
    const statsA = keyStatsMap.get(a.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
    const statsB = keyStatsMap.get(b.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
    
    // Nếu cả 2 đều đang "nghỉ ngơi" (Cooldown 2s) hoặc cả 2 đều rảnh
    const isCoolingA = now - statsA.lastUsedTime < 2000;
    const isCoolingB = now - statsB.lastUsedTime < 2000;

    if (isCoolingA !== isCoolingB) return isCoolingA ? 1 : -1; // Ưu tiên thằng không bị cooldown
    if (statsA.usageCount !== statsB.usageCount) return statsA.usageCount - statsB.usageCount; // Ưu tiên thằng ít dùng
    return Math.random() - 0.5; // Nếu bằng nhau hết thì random
  });

  // 3. Vòng lặp thử từng API Key đã được sắp xếp ưu tiên
  for (const keyObj of sortedKeys) {
    const stats = keyStatsMap.get(keyObj.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
    
    // Nếu key đang bị disable (Circuit Breaker)
    if (stats.isDisabled) {
        if (now - stats.lastErrorTime > 120000) {
            stats.isDisabled = false; 
            stats.errorCount = 3; 
        } else {
            continue; 
        }
    }

    const models = await getAvailableModels(keyObj.value);

    for (const fullModelName of models) {
      const apiURL = `https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${keyObj.value}`;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s Timeout cho mỗi API call

        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: config }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
          // --- THÀNH CÔNG: Cập nhật stats & Self-healing ---
          const s = keyStatsMap.get(keyObj.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
          s.usageCount += 1;
          s.lastUsedTime = Date.now();
          s.errorCount = Math.max(0, s.errorCount - 3);
          s.isDisabled = false;
          keyStatsMap.set(keyObj.value, s);
          return data.candidates[0].content.parts[0].text;
        }

        // --- XỬ LÝ LỖI ---
        const errorMsg = data.error?.message || 'Lỗi không xác định';
        const errorCode = data.error?.status || response.status;
        lastError = `${keyObj.name}: ${errorMsg}`;

        // Nếu lỗi do Key (Sai key, Hết hạn, Vô hiệu hóa) → Báo Super Admin ngay
        if (errorCode === 'INVALID_ARGUMENT' || errorCode === 400 || errorMsg.includes('API key not valid')) {
           await logError(shopId || null, 'API_KEY_INVALID', `[${keyObj.name}] bị sai hoặc hư: ${errorMsg}`, 'gemini');
           break; // Chuyển sang key tiếp theo ngay lập tức
        }

        if (response.status === 429 || response.status === 503 || errorMsg.includes('high demand')) {
           // --- EXPONENTIAL BACKOFF + JITTER (MAX 3 RETRIES TRONG 1 REQUEST) ---
           // Lưu ý: callGeminiWithFallback đang chạy vòng lặp Keys, nên ta chỉ retry nội bộ 1 lần 
           // rồi chuyển key để đảm bảo tốc độ.
           const retryDelay = Math.min((2000 * Math.pow(2, 0)) + Math.floor(Math.random() * 500), 10000);
           await delay(retryDelay);

           const controller = new AbortController();
           const timeoutId = setTimeout(() => controller.abort(), 10000); // Timeout 10s cho retry

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
             return retryData.candidates[0].content.parts[0].text;
           }

           if (keyObj.name === 'Key PRO') {
              await logError(shopId || null, 'PRO_KEY_OVERLOAD', `Key PRO đang bị quá tải.`, 'gemini');
           }
        }

        // --- CẬP NHẬT LỖI (CIRCUIT BREAKER) ---
        const s = keyStatsMap.get(keyObj.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
        s.errorCount += 1;
        s.lastErrorTime = Date.now();
        s.lastUsedTime = Date.now(); // Kể cả lỗi cũng tính là vừa mới dùng để cooldown
        if (s.errorCount >= 5) {
            s.isDisabled = true;
            await logError(shopId || null, 'CIRCUIT_BREAKER_OPEN', `Key ${keyObj.name} lỗi liên tục -> Nghỉ 2p.`, 'gemini');
        }
        keyStatsMap.set(keyObj.value, s);
        
        lastError = `${keyObj.name}: ${errorMsg}`;
        continue; 

      } catch (e: any) {
        lastError = `${keyObj.name}: ${e.message}`;
        await logError(shopId || null, 'FETCH_FAILED', `[${keyObj.name}] Lỗi: ${e.message}`, 'gemini');
        continue;
      }
    }
  }

  throw new Error(`AI đang bận (Quá tải). Vui lòng thử lại sau 1 phút hoặc nạp thêm API Key mới vào hệ thống bạn nhé! (Lỗi: ${lastError})`);
}

/**
 * Tạo Vector Embedding cho văn bản sử dụng model text-embedding-004
 */
export async function generateEmbedding(text: string, isPro: boolean = false): Promise<number[]> {
  // Lấy key: Nếu là luyện tri thức (isPro=true) thì ưu tiên Key PRO
  const keys = await getDetailedApiKeys(isPro); 
  if (keys.length === 0) throw new Error('Không có API Key để tạo Embedding');
  
  // Nếu luyện tri thức thì bắt buộc dùng key đầu tiên (thường là Pro nếu isPro=true)
  const apiKey = keys[0].value;
  const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-04:embedContent?key=${apiKey}`;

  try {
    const response = await fetch(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "models/text-embedding-04",
        content: { parts: [{ text }] }
      })
    });

    const data = await response.json();
    if (response.ok && data.embedding?.values) {
      return data.embedding.values;
    }
    
    // Nếu key Pro lỗi mà đang là tác vụ training, thử lùi về key thường để chữa cháy
    if (keys.length > 1) {
       console.warn("Key ưu tiên lỗi, thử key dự phòng cho Embedding...");
       return generateEmbedding(text, false); 
    }

    throw new Error(data.error?.message || 'Lỗi tạo Embedding');
  } catch (error: any) {
    console.error('Embedding Error:', error);
    throw error;
  }
}
