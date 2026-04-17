import { supabaseAdmin } from './supabase';

const phoneRegex = /(0|\+84)(3|5|7|8|9)[0-9]{8}/g;

/**
 * 🔥 Normalize triệt để: Xóa ký tự nhiễu và chuyển +84 -> 0
 */
function normalizeInput(text: string): string {
  return text
    .replace(/[.\-\s]/g, "")   // Xóa dấu chấm, gạch ngang, khoảng trắng
    .replace(/\+84/g, "0");    // Chuẩn hóa +84 về 0
}

/**
 * Lấy SĐT từ tin nhắn sau khi đã làm sạch
 */
function extractPhone(input: string): string | null {
  const cleaned = normalizeInput(input);
  const matches = cleaned.match(phoneRegex);
  return matches ? matches[0] : null;
}

/**
 * Gửi thông báo Telegram với cơ chế RETRY
 */
export async function sendTelegramNotification(config: {
  botToken?: string;
  chatId: string;
  phone: string;
  message: string;
  shopName: string;
  sessionId: string;
  leadId: string;
}) {
  const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7851978255:AAH-S5iX_8F0YJ5uX_fV9XqS7Xg9p9S7Xg9';
  const token = config.botToken || DEFAULT_BOT_TOKEN;
  
  if (!config.chatId) return;

  const text = `🔔 *KHÁCH HÀNG MỚI từ ${config.shopName}*\n\n` +
               `📱 *SĐT:* \`${config.phone}\`\n` +
               `💬 *Nội dung:* _${config.message}_\n\n` +
               `🕒 *TG:* ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n` +
               `🔗 [Xem lịch sử chat](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/history?session=${config.sessionId})`;

  // Cơ chế Retry: Thử tối đa 2 lần
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.chatId,
          text: text,
          parse_mode: 'Markdown'
        })
      });

      const data = await res.json();

      if (res.ok) {
        if (supabaseAdmin) {
          await supabaseAdmin.from('leads').update({ 
            telegram_status: 'success',
            telegram_sent_at: new Date().toISOString()
          }).eq('id', config.leadId);
        }
        return; // Thành công thì thoát
      } else {
        throw new Error(data.description || 'Unknown error');
      }
    } catch (error: any) {
      if (attempt === 2 && supabaseAdmin) {
        // Lần thử cuối vẫn fail thì mới ghi log lỗi
        await supabaseAdmin.from('leads').update({ 
          telegram_status: 'failed', 
          telegram_error: error.message 
        }).eq('id', config.leadId);
      } else {
        // Đợi 2 giây trước khi thử lại lần 2
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
}

export async function detectAndSaveLead(
  message: string,
  shopId: string,
  sessionId: string,
  shopConfig: any
) {
  try {
    const cleanPhone = extractPhone(message);
    if (!cleanPhone) return null;

    if (!supabaseAdmin) return null;

    // 1. Kiểm tra trùng trong 24h
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const { data: existingLead } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('shop_id', shopId)
      .eq('phone', cleanPhone)
      .gte('created_at', oneDayAgo.toISOString())
      .single();

    if (existingLead) {
      // 🔥 Thêm Case Duplicate: Vẫn lưu tin nhắn mới nhưng ghi chú là trùng
      await supabaseAdmin.from('leads').insert({
        shop_id: shopId,
        session_id: sessionId,
        phone: cleanPhone,
        first_message: `[TRÙNG] ${message}`,
        status: 'new',
        telegram_status: 'duplicate'
      });
      return null;
    }

    // 2. Lưu mới (Pending)
    const { data: newLead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        shop_id: shopId,
        session_id: sessionId,
        phone: cleanPhone,
        first_message: message,
        status: 'new',
        telegram_status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Gửi Notify (Có retry bên trong)
    if (shopConfig?.telegram_chat_id) {
       sendTelegramNotification({
         botToken: shopConfig.telegram_bot_token,
         chatId: shopConfig.telegram_chat_id,
         phone: cleanPhone,
         message: message,
         shopName: shopConfig.shop_name || 'Cửa hàng',
         sessionId: sessionId,
         leadId: newLead.id
       });
    }

    return newLead;
  } catch (error) {
    console.error('Core Lead Error:', error);
    return null;
  }
}
