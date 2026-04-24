import { supabase, supabaseAdmin } from '@/lib/supabase';

export type AIProvider = 'gemini' | 'deepseek';
export type AITier = 'free' | 'pro';

export interface AIKey {
  id: string;
  key: string;
  value: string;
  status: string;
  fail_count: number;
  cooldown_until: string | null;
  last_error: string | null;
}

/**
 * Lấy danh sách Key "khỏe mạnh" cho một Provider và Tier cụ thể
 */
export async function getHealthyKeys(provider: AIProvider, tier: AITier): Promise<AIKey[]> {
  try {
    const client = supabaseAdmin || supabase;
    if (!client) return [];

    // Tạo danh sách key cần tìm dựa trên provider và tier
    let searchKeys: string[] = [];
    if (provider === 'gemini') {
      searchKeys = tier === 'pro' ? ['gemini_api_key_pro'] : ['gemini_api_key_1', 'gemini_api_key_2'];
    } else {
      searchKeys = tier === 'pro' ? ['deepseek_api_key_pro'] : ['deepseek_api_key_free1', 'deepseek_api_key_free2'];
    }

    const now = new Date().toISOString();

    const { data, error } = await client
      .from('system_settings')
      .select('*')
      .in('key', searchKeys)
      .eq('status', 'active')
      .or(`cooldown_until.is.null,cooldown_until.lt.${now}`);

    if (error) {
      console.error(`Error fetching healthy keys for ${provider}:`, error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    // Load Balancing: Xáo trộn danh sách key để dàn đều tải
    return (data as AIKey[]).sort(() => Math.random() - 0.5);
  } catch (e) {
    console.error('getHealthyKeys crash:', e);
    return [];
  }
}

/**
 * Báo cáo lỗi khi sử dụng Key
 */
export async function reportKeyFailure(keyId: string, errorMessage: string) {
  try {
    const client = supabaseAdmin || supabase;
    if (!client) return;

    // 1. Lấy thông tin hiện tại của key
    const { data: keyData } = await client
      .from('system_settings')
      .select('fail_count')
      .eq('id', keyId)
      .single();

    const newFailCount = (keyData?.fail_count || 0) + 1;
    const updates: any = {
      fail_count: newFailCount,
      last_error: errorMessage,
      updated_at: new Date().toISOString()
    };

    // 2. Nếu lỗi quá nhiều (vd: >= 5), đưa vào cooldown 10 phút
    if (newFailCount >= 5) {
      const cooldownDate = new Date();
      cooldownDate.setMinutes(cooldownDate.getMinutes() + 10);
      updates.cooldown_until = cooldownDate.toISOString();
      // updates.status = 'cooldown'; // Hoặc giữ active nhưng dựa vào cooldown_until để lọc
    }

    await client
      .from('system_settings')
      .update(updates)
      .eq('id', keyId);

  } catch (e) {
    console.error('reportKeyFailure error:', e);
  }
}

/**
 * Báo cáo sử dụng Key thành công (Reset chỉ số sức khỏe)
 */
export async function reportKeySuccess(keyId: string) {
  try {
    const client = supabaseAdmin || supabase;
    if (!client) return;

    await client
      .from('system_settings')
      .update({
        fail_count: 0,
        last_error: null,
        cooldown_until: null,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('id', keyId);
  } catch (e) {
    console.error('reportKeySuccess error:', e);
  }
}
