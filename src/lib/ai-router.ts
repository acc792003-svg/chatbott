import { getHealthyKeys } from './ai-manager';
import { callSpecificAI } from './gemini';
import { reportKeyFailure, reportKeySuccess } from './ai-manager';

export type Provider = 'gemini' | 'openrouter' | 'deepseek';

export type RouteDecision = {
  provider: Provider;
  model: string;
  parallel?: Array<{ provider: Provider; model: string }>;
};

export const POLICY = {
  free: {
    allowClaude: false,
    maxTokens: 300,
    dailyLimit: 100,
    parallel: false
  },
  pro: {
    allowClaude: true,
    maxTokens: 600,
    dailyLimit: 1000,
    parallel: true
  }
};

export function enforcePolicy(plan: 'free' | 'pro', model: string) {
  if (plan === 'free' && model.includes('claude')) {
    return 'deepseek/deepseek-chat';
  }
  return model;
}

export function classify(input: string) {
  const len = input.length;
  const hasMultiIntent = /và|hay|hoặc|so sánh|tư vấn|nên chọn/i.test(input);
  const simple = len < 80 && !hasMultiIntent;
  const complex = len > 200 || hasMultiIntent;
  return { simple, complex };
}

export function decideRoute({
  cacheHit,
  faqScore,
  plan,
  input
}: {
  cacheHit: boolean;
  faqScore: number;
  plan: 'free' | 'pro';
  input: string;
}): RouteDecision | 'CACHE' | 'FAQ' {

  if (cacheHit) return 'CACHE';
  if (faqScore >= 0.85) return 'FAQ';

  const { simple, complex } = classify(input);

  if (plan === 'free') {
    if (simple) {
      return { provider: 'gemini', model: 'gemini-1.5-flash' };
    }
    return {
      provider: 'openrouter',
      model: 'deepseek/deepseek-chat'
    };
  }

  // PRO: chất lượng cao hơn
  if (simple) {
    return { provider: 'gemini', model: 'gemini-1.5-flash' };
  }

  if (complex) {
    return {
      provider: 'openrouter',
      model: 'anthropic/claude-3-haiku',
      parallel: [
        { provider: 'openrouter', model: 'anthropic/claude-3-haiku' },
        { provider: 'openrouter', model: 'deepseek/deepseek-chat' }
      ]
    };
  }

  return { provider: 'gemini', model: 'gemini-1.5-flash' };
}

export async function runAI(decision: RouteDecision, payload: { history: any[], temperature: number, systemPrompt?: string, tier: 'free' | 'pro' }) {
  const timeout = 3500; // ms

  const callProviderWrap = async (p: Provider, m: string) => {
    // 1. Enforce policy
    const safeModel = enforcePolicy(payload.tier, m);
    // 2. Lấy API key
    const keys = await getHealthyKeys(p, payload.tier);
    if (keys.length === 0) throw new Error(`No healthy keys for ${p} ${payload.tier}`);

    const keyObj = keys[0];
    const stepStart = performance.now();
    try {
      const result = await callSpecificAI(p, payload.tier, keyObj.value, payload.history, payload.temperature, payload.systemPrompt, timeout, POLICY[payload.tier].maxTokens);
      const stepLatency = Math.round(performance.now() - stepStart);
      if (keyObj.id) reportKeySuccess(keyObj.id, stepLatency);
      return { ...result, source: `${p}_${payload.tier}` };
    } catch (e: any) {
      if (keyObj.id) reportKeyFailure(keyObj.id, e.message);
      throw e;
    }
  };

  if (!decision.parallel || !POLICY[payload.tier].parallel) {
    return callProviderWrap(decision.provider, decision.model);
  }

  const tasks = decision.parallel.slice(0, 2).map(x => callProviderWrap(x.provider, x.model));
  return Promise.any(tasks);
}
