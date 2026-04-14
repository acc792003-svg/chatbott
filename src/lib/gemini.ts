// Hệ thống tự động phát hiện và gọi model Gemini khả dụng
// Với cơ chế retry thông minh, API key từ DB, và ghi log lỗi

import { supabaseAdmin } from '@/lib/supabase';

const MODEL_CACHE_TTL = 5 * 60 * 1000; // Cache 5 phút
let cachedModels: string[] = [];
let cacheTimestamp = 0;

// Lấy API Keys từ database (Super Admin quản lý), fallback về .env.local
export async function getApiKeys(): Promise<string[]> {
  const keys: string[] = [];
  
  try {
    if (supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('system_settings')
        .select('key, value')
        .in('key', ['gemini_api_key_1', 'gemini_api_key_2']);
      
      if (data) {
        data.forEach((s: any) => {
          if (s.value && s.value.trim()) keys.push(s.value.trim());
        });
      }
    }
  } catch (e) {
    // Nếu bảng chưa tồn tại, bỏ qua
  }

  // Nếu không có key nào trong DB, fallback về .env.local
  const envKey = (process.env.GEMINI_API_KEY || '').trim();
  if (keys.length === 0 && envKey) {
    keys.push(envKey);
  }
  
  return keys;
}

// Ghi log lỗi vào database
async function logError(shopId: string | null, errorType: string, errorMessage: string, source: string) {
  try {
    if (supabaseAdmin) {
      await supabaseAdmin.from('error_logs').insert({
        shop_id: shopId,
        error_type: errorType,
        error_message: errorMessage,
        source: source
      });
    }
  } catch (e) {
    // Ghi log thất bại thì bỏ qua, không block luồng chính
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
            if (name.includes('2.5-pro')) return 70;
            if (name.includes('2.0-pro')) return 60;
            if (name.includes('1.5-pro')) return 50;
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
  } catch (e) {
    // Nếu fetch list thất bại, dùng fallback
  }

  return ['models/gemini-2.5-flash', 'models/gemini-2.0-flash'];
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callGeminiWithFallback(
  contents: any[],
  generationConfig?: any,
  shopId?: string | null
): Promise<string> {
  const apiKeys = await getApiKeys();
  
  if (apiKeys.length === 0) {
    await logError(shopId || null, 'NO_API_KEY', 'Không có API Key nào được cấu hình. Hãy vào Super Admin để nhập API Key.', 'gemini');
    throw new Error('Hệ thống đang bảo trì, vui lòng quay lại sau ít phút nhé! 🙏');
  }

  const config = generationConfig || { temperature: 0.8, maxOutputTokens: 1000 };
  let lastError = '';

  // Thử lần lượt từng API Key
  for (const apiKey of apiKeys) {
    const models = await getAvailableModels(apiKey);

    for (const fullModelName of models) {
      const apiURL = `https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${apiKey}`;
      
      for (let attempt = 0; attempt < 2; attempt++) {
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

          const errorMsg = data.error?.message || 'Unknown error';
          lastError = errorMsg;

          // Quá tải → retry sau 1.5s
          if (response.status === 429 || response.status === 503 || errorMsg.includes('high demand')) {
            if (attempt === 0) {
              await delay(1500);
              continue;
            }
          }

          // Model không tồn tại → bỏ qua
          if (response.status === 404 || errorMsg.includes('not found')) {
            break;
          }

          break; 
        } catch (e: any) {
          lastError = e.message;
          break;
        }
      }
    }
  }

  // Tất cả đều thất bại → ghi log lỗi cho Super Admin
  await logError(
    shopId || null,
    'AI_CALL_FAILED',
    `Tất cả API Key và model đều thất bại. Lỗi cuối: ${lastError}`,
    'gemini'
  );

  throw new Error('Trợ lý AI đang bận, bạn vui lòng đợi 1-2 phút rồi thử lại nhé! 😊');
}
