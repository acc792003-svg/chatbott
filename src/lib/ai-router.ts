import { getHealthyKeys, reportKeyFailure, reportKeySuccess } from './ai-manager';
import { callGeminiWithFallback } from './gemini';

export function decideRoute({ cacheHit, faqScore }: { cacheHit: boolean; faqScore: number; }) {
  if (cacheHit) return 'CACHE';
  if (faqScore >= 0.85) return 'FAQ';
  return 'DEEPSEEK';
}

export function safeTrim(text: string, max = 4000) {
  if (!text || text.length <= max) return text || '';
  const sliced = text.slice(0, max);
  const parts = sliced.split('.');
  if (parts.length === 1) return sliced; // Tránh lỗi trả về "." nếu không có dấu chấm
  return parts.slice(0, -1).join('.') + '.';
}

export function fallbackResponse(vectorFaqs: any[]) {
  const bestFaq = vectorFaqs?.find(f => (f.hybridScore || f.score || 0) > 0.7);
  if (bestFaq) {
    return { 
      text: `Dạ hệ thống đang hơi quá tải, em gửi bạn thông tin phù hợp nhé:\n- ${bestFaq.answer}`, 
      source: 'fallback', 
      tokens: 0 
    };
  }
  return { 
    text: "Hệ thống đang hơi bận, bạn đợi mình 1 chút nhé 🙏", 
    source: 'fallback', 
    tokens: 0 
  };
}

async function fetchWithTimeout(resource: string, options: any, timeout: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
}

export async function runAI(payload: { history: any[], temperature: number, systemPrompt?: string, tier: 'free' | 'pro', vectorFaqs: any[] }) {
  let systemPrompt = safeTrim(payload.systemPrompt || '', 6000);

  try {
    const result = await callGeminiWithFallback(
      payload.history,
      { temperature: payload.temperature, isPro: payload.tier === 'pro' },
      null, // shopId
      `chat_${payload.tier}`,
      systemPrompt
    );
    
    return result;
  } catch (err: any) {
    console.error('All AI providers failed:', err.message);
    return fallbackResponse(payload.vectorFaqs);
  }
}
