import { supabase, supabaseAdmin } from '@/lib/supabase';
import { reportError } from './radar';

export type AIProvider = 'gemini' | 'deepseek';
export type AITier = 'free' | 'pro';

export interface AIKey {
  id: string;
  key: string;
  value: string;
  status: string;
  fail_count: number;
  success_count: number;
  usage_count: number;
  cooldown_until: string | null;
  last_used_at: string | null;
  last_error: string | null;
}

/**
 * 1. SMART ROUTER: Chấm điểm độ khó câu hỏi để chọn Provider
 * Score > 1.2 -> Gemini, Score <= 1.2 -> DeepSeek
 */
export function calculateComplexityScore(userInput: string): number {
  const tokens = userInput.trim().split(/\s+/);
  
  // Các từ khóa gợi ý độ phức tạp cao (cần Gemini)
  const complexKeywords = ['so sánh', 'tại sao', 'phân tích', 'hướng dẫn chi tiết', 'tổng hợp'];
  const hasComplexKeyword = complexKeywords.some(word => userInput.toLowerCase().includes(word)) ? 1 : 0;
  
  // Thực thể thời gian hoặc số lượng (cần Gemini xử lý chính xác hơn)
  const hasEntity = /[\d]{1,}/.test(userInput) ? 1 : 0;

  // Công thức: độ dài * 0.2 + từ khóa * 0.5 + thực thể * 0.3
  const score = (tokens.length * 0.15) + (hasComplexKeyword * 0.6) + (hasEntity * 0.3);
  
  return score;
}

/**
 * 2. RETRY MATRIX: Định nghĩa thứ tự ưu tiên cứu hộ
 */
/**
 * 2. RETRY MATRIX: Định nghĩa thứ tự ưu tiên cứu hộ thông minh
 */
export function getRetryPath(isPro: boolean, complexity: number): {provider: AIProvider, tier: AITier}[] {
  if (isPro || complexity > 7) {
    // Ưu tiên Pro cho shop Pro hoặc câu hỏi khó
    return [
      { provider: 'deepseek', tier: 'pro' },
      { provider: 'gemini', tier: 'pro' },
      { provider: 'gemini', tier: 'free' }
    ];
  } else {
    // Shop thường / Câu hỏi dễ: Tiết kiệm
    return [
      { provider: 'deepseek', tier: 'free' },
      { provider: 'gemini', tier: 'free' },
      { provider: 'deepseek', tier: 'pro' }
    ];
  }
}

/**
 * 3. HEALTHY KEY SELECTOR: Với cơ chế Self-healing (Probing)
 */
export async function getHealthyKeys(provider: AIProvider, tier: AITier): Promise<AIKey[]> {
  try {
    const client = supabaseAdmin || supabase;
    if (!client) return [];

    let searchKeys: string[] = [];
    if (provider === 'gemini') {
      searchKeys = tier === 'pro' ? ['gemini_api_key_pro'] : ['gemini_api_key_1', 'gemini_api_key_2'];
    } else {
      searchKeys = tier === 'pro' ? ['deepseek_api_key_pro'] : ['deepseek_api_key_free1', 'deepseek_api_key_free2'];
    }

    const now = new Date().toISOString();

    // Query lấy key Active HOẶC Probing (đã hết hạn Cooldown)
    // Đã loại bỏ 'status.is.null' vì DB bắt buộc phải có giá trị
    const { data, error } = await client
      .from('system_settings')
      .select('*')
      .in('key', searchKeys)
      .neq('value', '')
      .not('value', 'is', null)
      .not('value', 'eq', 'DeepSeek free')
      .not('status', 'eq', 'disabled') // Không lấy key đã bị Admin tắt
      .or(`status.eq.active,cooldown_until.lt.${now}`);

    let dbKeys = (data || []).map((k: any) => {
      // Nếu đã hết hạn cooldown -> Tự động chuyển sang trạng thái probing
      if (k.status !== 'active' && k.status !== 'disabled' && k.cooldown_until && new Date(k.cooldown_until) < new Date()) {
        return { ...k, status: 'probing' };
      }
      return { ...k, status: k.status || 'active' }; // Dù đã chặn NULL nhưng vẫn fallback an toàn
    }) as AIKey[];

    // 1 & 2. NẾU DB CÓ KEY HỢP LỆ -> TRẢ VỀ NGAY LẬP TỨC
    if (dbKeys.length > 0) {
      return dbKeys.sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1;
        if (a.status !== 'active' && b.status === 'active') return 1;
        if (a.fail_count !== b.fail_count) return a.fail_count - b.fail_count;
        return (a.usage_count || 0) - (b.usage_count || 0);
      });
    }

    // 3. FALLBACK .ENV (Chỉ khi DB không có key nào dùng được)
    console.error({ reason: "NO_DB_KEYS", provider, tier, fallback_used: true });
    
    // 🔥 Báo cáo Radar: Hệ thống đang phải sống sót bằng ENV
    reportError({
      errorType: 'AI_KEY_ENV_FALLBACK',
      errorMessage: `CẢNH BÁO: Không có API Key hợp lệ trong Database cho ${provider} (${tier}). Hệ thống đang tự động kích hoạt key dự phòng từ file .env để sinh tồn.`,
      fileSource: 'ai-manager.ts',
      severity: 'high',
      metadata: { provider, tier }
    }).catch(() => {});

    let envKeys: AIKey[] = [];
    if (provider === 'gemini') {
      if (tier === 'free') {
        if (process.env.GEMINI_API_KEY_1) envKeys.push({ id: '', key: 'gemini_api_key_1', value: process.env.GEMINI_API_KEY_1, status: 'active', fail_count: 0, success_count: 0, usage_count: 0, cooldown_until: null, last_used_at: null, last_error: null });
        if (process.env.GEMINI_API_KEY_2) envKeys.push({ id: '', key: 'gemini_api_key_2', value: process.env.GEMINI_API_KEY_2, status: 'active', fail_count: 0, success_count: 0, usage_count: 0, cooldown_until: null, last_used_at: null, last_error: null });
      } else {
        if (process.env.GEMINI_API_KEY_PRO) envKeys.push({ id: '', key: 'gemini_api_key_pro', value: process.env.GEMINI_API_KEY_PRO, status: 'active', fail_count: 0, success_count: 0, usage_count: 0, cooldown_until: null, last_used_at: null, last_error: null });
      }
    } else if (provider === 'deepseek') {
       if (tier === 'free' && process.env.DEEPSEEK_API_KEY) {
         envKeys.push({ id: '', key: 'deepseek_api_key_free1', value: process.env.DEEPSEEK_API_KEY, status: 'active', fail_count: 0, success_count: 0, usage_count: 0, cooldown_until: null, last_used_at: null, last_error: null });
       }
    }

    if (envKeys.length > 0) return envKeys;

    // 4. THẤT BẠI HOÀN TOÀN
    throw new Error(`NO_AI_KEYS_AVAILABLE for ${provider} ${tier}`);
  } catch (e) {
    return [];
  }
}

export async function reportKeyFailure(keyId: string, errorMessage: string) {
  const client = supabaseAdmin || supabase;
  if (!client) return;

  const { data: keyData } = await client.from('system_settings').select('fail_count, error_count').eq('id', keyId).single();
  const newFailCount = (keyData?.fail_count || 0) + 1;
  const newErrorCount = (keyData?.error_count || 0) + 1;
  
  const updates: any = {
    fail_count: newFailCount,
    error_count: newErrorCount,
    last_error: errorMessage,
    last_used_at: new Date().toISOString()
  };

  // Cooldown Budget: Exponential Backoff (2p * 2^(fail_count - 5))
  if (newFailCount >= 5) {
    const retryLevel = newFailCount - 5; 
    const baseMinutes = 2;
    const cooldownMinutes = Math.min(baseMinutes * Math.pow(2, retryLevel), 1440);
    
    const cooldownDate = new Date();
    cooldownDate.setMinutes(cooldownDate.getMinutes() + cooldownMinutes);
    
    updates.cooldown_until = cooldownDate.toISOString();
    updates.status = 'error';

    // 🔥 THÔNG BÁO RADAR: KEY BỊ KHÓA DO LỖI LIÊN TỤC
    reportError({
      errorType: 'CIRCUIT_BREAKER_OPEN',
      errorMessage: `Key ID ${keyId} lỗi liên tục (${newFailCount} lần) -> Nghỉ ${cooldownMinutes} phút. Lỗi cuối: ${errorMessage}`,
      fileSource: 'ai-manager.ts',
      severity: 'high',
      metadata: { keyId, failCount: newFailCount, cooldownMinutes }
    }).catch(() => {});
  }

  await client.from('system_settings').update(updates).eq('id', keyId);
}

export async function reportKeySuccess(keyId: string, latencyMs?: number) {
  const client = supabaseAdmin || supabase;
  if (!client) return;

  const { data: keyData } = await client.from('system_settings').select('usage_count, avg_latency').eq('id', keyId).single();
  
  const updates: any = {
    fail_count: 0,
    status: 'active',
    cooldown_until: null,
    last_used_at: new Date().toISOString(),
    usage_count: (keyData?.usage_count || 0) + 1
  };

  // Tính Moving Average cho Latency (0.9 cũ + 0.1 mới)
  if (latencyMs) {
    const oldAvg = keyData?.avg_latency || latencyMs;
    updates.avg_latency = Math.round(oldAvg * 0.9 + latencyMs * 0.1);
  }

  await client.from('system_settings').update(updates).eq('id', keyId);
}
