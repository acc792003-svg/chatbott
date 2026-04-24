import { supabaseAdmin } from './supabase';

/**
 * 🛰️ RADAR SYSTEM - TRUNG TÂM GIÁM SÁT LỖI TOÀN HỆ THỐNG
 * Nhiệm vụ: Ghi log vào DB và thông báo ngay cho Super Admin qua Telegram
 */

export async function reportError(params: {
  shopId?: string;
  errorType: string;
  errorMessage: string;
  fileSource: string;
  metadata?: any;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}) {
  const { shopId, errorType, errorMessage, fileSource, metadata, severity = 'medium' } = params;

  try {
    if (!supabaseAdmin) return;

    // 1. Ghi vào Database
    const { data: errorLog, error: dbError } = await supabaseAdmin
      .from('system_errors')
      .insert({
        shop_id: shopId,
        error_type: errorType,
        error_message: errorMessage,
        file_source: fileSource,
        metadata: metadata,
        severity: severity // Nếu bảng có cột này
      })
      .select()
      .single();

    if (dbError) {
      console.error('Radar DB Error:', dbError.message);
    }

    // 2. Thông báo qua Telegram cho Super Admin
    await notifyAdmin(params);

  } catch (e: any) {
    console.error('Radar System Crash:', e.message);
  }
}

async function notifyAdmin(params: {
  shopId?: string;
  errorType: string;
  errorMessage: string;
  fileSource: string;
  severity?: string;
}) {
  try {
    const { data: settings } = await supabaseAdmin!
      .from('system_settings')
      .select('key, value')
      .in('key', ['system_telegram_bot_token', 'admin_telegram_chat_id']);

    const botToken = settings?.find(s => s.key === 'system_telegram_bot_token')?.value;
    const adminChatId = settings?.find(s => s.key === 'admin_telegram_chat_id')?.value;

    if (!botToken || !adminChatId) {
      console.warn('Radar: Thiếu system_telegram_bot_token hoặc admin_telegram_chat_id để gửi thông báo.');
      return;
    }

    const emoji = params.severity === 'critical' ? '🔴' : (params.severity === 'high' ? '🟠' : '⚠️');
    const text = `${emoji} *HỆ THỐNG BÁO LỖI (RADAR)*\n\n` +
                 `*Loại:* ${params.errorType}\n` +
                 `*Nguồn:* \`${params.fileSource}\`\n` +
                 `*Shop ID:* \`${params.shopId || 'System'}\`\n` +
                 `*Nội dung:* _${params.errorMessage}_\n\n` +
                 `👉 [Xem chi tiết Radar](${process.env.NEXT_PUBLIC_APP_URL}/dashboard/superadmin)`;

    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: adminChatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });

  } catch (e: any) {
    console.error('Radar Notification Failed:', e.message);
  }
}
