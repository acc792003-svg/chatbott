// Hệ thống tự động phát hiện và gọi model Gemini khả dụng
// Với cơ chế retry thông minh khi bị quá tải

const MODEL_CACHE_TTL = 5 * 60 * 1000; // Cache 5 phút
let cachedModels: string[] = [];
let cacheTimestamp = 0;

export async function getAvailableModels(apiKey: string): Promise<string[]> {
  // Trả về cache nếu còn hạn
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
        // Ưu tiên flash > pro, và phiên bản mới nhất
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

  // Fallback cứng nếu không lấy được danh sách
  return ['models/gemini-2.5-flash', 'models/gemini-2.0-flash'];
}

// Delay helper
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function callGeminiWithFallback(
  apiKey: string,
  contents: any[],
  generationConfig?: any
): Promise<string> {
  const models = await getAvailableModels(apiKey);
  
  let lastError = '';
  const config = generationConfig || { temperature: 0.8, maxOutputTokens: 1000 };

  for (const fullModelName of models) {
    // Chỉ thử v1beta (v1 đã bị deprecated cho hầu hết model)
    const apiURL = `https://generativelanguage.googleapis.com/v1beta/${fullModelName}:generateContent?key=${apiKey}`;
    
    // Thử tối đa 2 lần cho mỗi model (retry khi bị overload)
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

        // Nếu bị quá tải (429 hoặc 503), chờ 1 giây rồi thử lại
        if (response.status === 429 || response.status === 503 || errorMsg.includes('high demand')) {
          if (attempt === 0) {
            await delay(1500);
            continue; // Retry cùng model
          }
        }

        // Nếu model không tồn tại (404), bỏ qua ngay sang model khác
        if (response.status === 404 || errorMsg.includes('not found')) {
          break; // Sang model tiếp theo
        }

        break; // Lỗi khác, sang model tiếp theo
      } catch (e: any) {
        lastError = e.message;
        break;
      }
    }
  }

  throw new Error(lastError || 'Không thể kết nối với AI. Vui lòng thử lại sau.');
}
