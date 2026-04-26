import { supabase, supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';
import { redis } from './rate-limiter';
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
 * Tương thích ngược với tên callGeminiWithFallback
 */
export async function callGeminiWithFallback(
  history: any[],
  options: any,
  shopId: string | null,
  source: string = "WIDGET_CHAT",
  systemPrompt?: string
): Promise<{ text: string, tokens: number, source: string }> {
  
  // Trích xuất nội dung tin nhắn cuối cùng từ history
  const lastMsg = history[history.length - 1]?.parts?.[0]?.text || "";
  const complexity = calculateComplexityScore(lastMsg);
  const path = getRetryPath(options.isPro || false, complexity, options.platform);

  let finalResult = null;
  const triedKeys = new Set<string>(); // 🛡️ CHỐNG LẶP KEY

  for (const step of path) {
    const keys = await getHealthyKeys(step.provider, step.tier);
    if (keys.length === 0) continue;

    // Chỉ thử tối đa 2 key mỗi tầng để tiết kiệm thời gian
    for (const keyObj of keys.slice(0, 2)) { 
      if (triedKeys.has(keyObj.value)) continue; // Bỏ qua nếu đã thử key này
      triedKeys.add(keyObj.value);

      const stepStart = Date.now();
      try {
        const result = await callSpecificAI(
            step.provider, 
            step.tier, 
            keyObj.value, 
            history, 
            options.temperature || 0.7, 
            systemPrompt,
            undefined, // customTimeout (sẽ dùng mặc định trong hàm)
            undefined, // maxTokens
            step.model // Truyền model ID từ router
        );
        
        if (result) {
          const stepLatency = Date.now() - stepStart;
          if (keyObj.id) reportKeySuccess(keyObj.id, stepLatency);
          
          return { 
            text: result.text, 
            tokens: result.tokens, 
            source: `${step.provider}_${step.tier}${step.model ? `_${step.model.split('/')[1]}` : ''}` 
          };
        }
      } catch (e: any) {
        if (keyObj.id) reportKeyFailure(keyObj.id, e.message);
        console.error(`[Fail-Fast] ${step.provider} failed (${e.message}), switching...`);
        // Nhảy sang key/step tiếp theo ngay lập tức
      }
    }
  }

  throw new Error("Tất cả các tầng AI đều thất bại.");
}

export function normalizeChatPipeline(history: any[], provider: string) {
  // 1) Lọc message rỗng
  const cleaned = history.filter(m => (m.parts?.[0]?.text || m.content || '').trim());

  // 2) Gộp liên tiếp cùng role nhưng giữ intent
  const merged: any[] = [];
  for (const m of cleaned) {
    const last = merged[merged.length - 1];
    const textContent = m.parts?.[0]?.text || m.content || '';
    const currentRole = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
    
    if (last && last.role === currentRole) {
      last.text += `\n[+] ${textContent}`;
    } else {
      merged.push({ role: currentRole, text: textContent });
    }
  }

  // 3) Chuẩn hóa theo provider
  if (provider === 'gemini') {
    return merged.map(m => ({
       role: m.role, // 'model' hoặc 'user'
       parts: [{ text: m.text }]
    }));
  }

  if (provider === 'deepseek' || provider === 'openrouter') {
    return merged.map(m => ({
       role: m.role === 'model' ? 'assistant' : 'user',
       content: m.text
    }));
  }

  return merged;
}

/**
 * Gọi API cụ thể (Gemini, DeepSeek hoặc OpenRouter)
 */
export async function callSpecificAI(provider: string, tier: string, apiKey: string, history: any[], temperature: number, systemPrompt?: string, customTimeout?: number, maxTokens?: number, overrideModel?: string) {
  // ⚡ ULTRA FAIL-FAST: 3.5s cho OR, 5s cho Gemini
  const timeout = customTimeout || (provider === 'openrouter' ? 3500 : 5000);
  
  const normalizedHistory = normalizeChatPipeline(history, provider);

  if (provider === 'gemini') {
    const apiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
    
    const payload: any = {
      contents: normalizedHistory,
      generationConfig: { 
          temperature,
          maxOutputTokens: maxTokens || (tier === 'pro' ? 600 : 300)
      }
    };
    
    if (systemPrompt) {
      payload.systemInstruction = { parts: [{ text: systemPrompt }] };
    }

    const response = await fetchWithTimeout(apiURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }, timeout);

    const data = await response.json();
    if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
      return { text: data.candidates[0].content.parts[0].text, tokens: data.usageMetadata?.totalTokenCount || 0 };
    } else if (!response.ok) {
       console.error(`Gemini Error:`, data);
    }
  } else if (provider === 'deepseek') {
    // DeepSeek API
    if (systemPrompt) {
       normalizedHistory.unshift({ role: 'system', content: systemPrompt });
    }

    const response = await fetchWithTimeout('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: normalizedHistory,
        temperature,
        max_tokens: maxTokens || (tier === 'pro' ? 600 : 300)
      })
    }, timeout);

    const data = await response.json();
    if (response.ok && data.choices?.[0]?.message?.content) {
      return { text: data.choices[0].message.content, tokens: data.usageMetadata?.total_tokens || 0 };
    }
  } else if (provider === 'openrouter') {
    // OpenRouter API (OpenAI Compatible)
    if (systemPrompt) {
        normalizedHistory.unshift({ role: 'system', content: systemPrompt });
    }

    // Lấy model_id từ DB theo tier
    const modelKey = tier === 'pro' ? 'openrouter_model_id_pro' : 'openrouter_model_id';
    const { data: modelSetting } = await (supabaseAdmin || supabase)
        .from('system_settings')
        .select('value')
        .eq('key', modelKey)
        .single();
    
    let targetModel = modelSetting?.value;
    
    // Nếu là Pro mà chưa cấu hình model riêng, fallback về model chung
    if (!targetModel && tier === 'pro') {
      const { data: globalModel } = await (supabaseAdmin || supabase)
        .from('system_settings')
        .select('value')
        .eq('key', 'openrouter_model_id')
        .single();
      targetModel = globalModel?.value;
    }

    const targetModelFinal = overrideModel || targetModel || "deepseek/deepseek-chat";

    const response = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://q-chatbot.vercel.app',
        'X-Title': 'Q-Chatbot SaaS'
      },
      body: JSON.stringify({
        model: targetModelFinal,
        messages: normalizedHistory,
        temperature,
        max_tokens: maxTokens || (tier === 'pro' ? 600 : 300)
      })
    }, timeout);

    const data = await response.json();
    if (response.ok && data.choices?.[0]?.message?.content) {
      return { text: data.choices[0].message.content, tokens: data.usageMetadata?.total_tokens || 0 };
    }
  }
  throw new Error(`${provider} ${tier} failed`);
}

async function fetchWithTimeout(resource: string, options: any, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  const response = await fetch(resource, { ...options, signal: controller.signal });
  clearTimeout(id);
  return response;
}

export async function generateEmbedding(text: string, isPro: boolean = false): Promise<number[]> {
  const hash = crypto.createHash('md5').update(text).digest('hex');
  const cacheKey = `emb:${hash}`;

  if (redis) {
    try {
      const cached = await redis.get<number[]>(cacheKey);
      if (cached) return cached;
    } catch (e) {}
  }

  const envKeys = [
    process.env.GEMINI_EMBEDDING_KEY_1,
    process.env.GEMINI_EMBEDDING_KEY_2,
  ].filter(k => k && k.trim() !== '') as string[];

  let dbKeys: any[] = [];
  try {
    dbKeys = await getHealthyKeys('gemini', 'free');
    console.log('[DEBUG] dbKeys length:', dbKeys.length);
  } catch(e) {
    console.error('[DEBUG] getHealthyKeys error:', e);
  }

  const allKeys = [...envKeys, ...dbKeys.map(k => k.value)];
  // Lọc key trùng lặp
  const validKeys = Array.from(new Set(allKeys));
  console.log('[DEBUG] validKeys to test:', validKeys.length);

  if (validKeys.length === 0) throw new Error('Thiếu GEMINI_EMBEDDING_KEY_1/2');

  for (const key of validKeys) {
    try {
      const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: "models/gemini-embedding-2",
          content: { parts: [{ text }] }
        })
      }, 2000); // ⚡ Ép xung Embedding xuống 2s (Phải cực nhanh)

      const data = await res.json();
      if (res.ok && data.embedding?.values) {
         const vector = data.embedding.values;
         if (redis) {
           redis.set(cacheKey, vector, { ex: 600 }).catch(() => {});
         }
         // Nếu key này từ DB thì báo cáo thành công (tuỳ chọn)
         const dbKeyMatch = dbKeys.find(k => k.value === key);
         if (dbKeyMatch && dbKeyMatch.id) {
             reportKeySuccess(dbKeyMatch.id).catch(() => {});
         }
         return data.embedding.values;
      } else {
         // Gọi reportKeyFailure để kích hoạt Cầu Dao Tự Động (Circuit Breaker)
         const dbKeyMatch = dbKeys.find(k => k.value === key);
         if (dbKeyMatch && dbKeyMatch.id) {
             await reportKeyFailure(dbKeyMatch.id, data.error?.message || 'Lỗi lúc gọi Embedding API');
         }
      }
    } catch (e: any) {
         const dbKeyMatch = dbKeys.find(k => k.value === key);
         if (dbKeyMatch && dbKeyMatch.id) {
             await reportKeyFailure(dbKeyMatch.id, e.message || 'Lỗi mạng lúc gọi Embedding');
         }
    }
  }
  throw new Error('Embedding failed');
}

export async function batchGenerateEmbeddings(texts: string[], isPro?: boolean): Promise<number[][]> {
  // Vì Gemini hỗ trợ batch nhưng rate limit rất gắt, ta sẽ xử lý tuần tự hoặc song song có kiểm soát
  // Ở đây ta dùng generateEmbedding đơn lẻ cho từng text trong mảng để tận dụng logic retry có sẵn
  const results: number[][] = [];
  for (const text of texts) {
    const vector = await generateEmbedding(text);
    results.push(vector);
  }
  return results;
}
