import { getHealthyKeys, reportKeyFailure, reportKeySuccess } from './ai-manager';
import { callGeminiWithFallback } from './gemini';

export function decideRoute({ cacheHit, faqScore }: { cacheHit: boolean; faqScore: number; }) {
  if (cacheHit) return 'CACHE';
  if (faqScore >= 0.85) return 'FAQ';
  return 'DEEPSEEK';
}

export function safeTrim(text: string, max = 1500) {
  if (!text || text.length <= max) return text || '';
  const sliced = text.slice(0, max);
  const lastDot = sliced.lastIndexOf('.');
  if (lastDot === -1) return sliced;
  return sliced.slice(0, lastDot + 1);
}

export function fallbackResponse(vectorFaqs: any[]) {
  // Tìm FAQ có độ khớp tốt nhất (> 0.7)
  const bestFaq = vectorFaqs?.find(f => (f.hybridScore || f.score || 0) > 0.7);
  
  if (bestFaq) {
    return { 
      text: bestFaq.answer, // Trả về trực tiếp câu trả lời FAQ
      source: 'faq_fallback', 
      tokens: 0 
    };
  }
  
  return { 
    text: "Dạ, hiện tại em đang bận xử lý một chút dữ liệu, bạn vui lòng để lại câu hỏi hoặc số điện thoại, em sẽ phản hồi bạn ngay sau ít phút nhe! 🙏", 
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

export async function runAI(payload: { history: any[], temperature: number, systemPrompt?: string, tier: 'free' | 'pro', vectorFaqs: any[], platform?: string }) {
  let systemPrompt = safeTrim(payload.systemPrompt || '', 6000);

  try {
    const result = await callGeminiWithFallback(
      payload.history,
      { temperature: payload.temperature, isPro: payload.tier === 'pro', platform: payload.platform },
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
