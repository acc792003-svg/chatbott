// Hệ thống tự động phát hiện và gọi model Gemini khả dụng
// Với cơ chế retry thông minh, API key từ DB, và ghi log lỗi

import { supabase, supabaseAdmin } from '@/lib/supabase';

const MODEL_CACHE_TTL = 5 * 60 * 1000; // Cache 5 phút
let cachedModels: string[] = [];
let cacheTimestamp = 0;

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

  // Fallback .env.local nếu không có key nào
  if (keys.length === 0) {
    const envKey = (process.env.GEMINI_API_KEY || '').trim();
    if (envKey) keys.push({ name: 'Key .ENV', value: envKey });
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
  }
  
  if (keysToTry.length === 0) {
    throw new Error('Hệ thống đang bảo trì dịch vụ AI, vui lòng quay lại sau! 🙏');
  }

  const config = generationConfig || { temperature: 0.8, maxOutputTokens: 1000 };
  let lastError = '';

  // 3. Vòng lặp thử từng API Key
  for (const keyObj of keysToTry) {
    const models = await getAvailableModels(keyObj.value);

    for (const fullModelName of models) {
      const apiURL = `https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${keyObj.value}`;
      
      try {
        const response = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents, generationConfig: config })
        });

        const data = await response.json();

        if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
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
           // Nếu là Key Pro bị quá tải, ghi log để Super Admin biết gói pro đang bị nghẽn
           if (keyObj.name === 'Key PRO') {
              await logError(shopId || null, 'PRO_KEY_OVERLOAD', `Key PRO đang bị quá tải (429/503). Hệ thống đang tự chuyển về Key Free cho khách.`, 'gemini');
           }
           break; // Chuyển sang key tiếp theo
        }

        // Các lỗi khác (404, 400, ...) → Log lại và thử model tiếp theo trong cùng key
        await logError(shopId || null, 'AI_ERROR', `[${keyObj.name}] Model ${fullModelName} lỗi: ${errorMsg}`, 'gemini');
        continue; 

      } catch (e: any) {
        lastError = `${keyObj.name}: ${e.message}`;
        await logError(shopId || null, 'FETCH_FAILED', `[${keyObj.name}] Lỗi kết nối: ${e.message}`, 'gemini');
        break;
      }
    }
  }

  throw new Error('Trợ lý AI đang bận xử lý, bạn vui lòng đợi 1-2 phút rồi thử lại nhé! 😊');
}
