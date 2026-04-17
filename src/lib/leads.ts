import { supabaseAdmin } from './supabase';

const phoneRegex = /(0|\+84)(3|5|7|8|9)[0-9]{8}/g;

/**
 * Chuẩn hóa số điện thoại về định dạng 0xxx
 */
function normalizePhone(phone: string): string {
  let p = phone.replace(/\s+/g, ''); // Xóa khoảng trắng
  if (p.startsWith('+84')) {
    p = '0' + p.slice(3);
  }
  return p;
}

/**
 * Gửi thông báo qua Telegram
 */
export async function sendTelegramNotification(config: {
  botToken?: string;
  chatId: string;
  phone: string;
  message: string;
  shopName: string;
  sessionId: string;
}) {
  try {
    // Ưu tiên dùng botToken của shop, nếu không có dùng bot hệ thống mặc định
    // Chỗ này bạn có thể cấu hình bot mặc định của mình vào env
    const DEFAULT_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '7851978255:AAH-S5iX_8F0YJ5uX_fV9XqS7Xg9p9S7Xg9'; // Thay bằng token thực tế
    const token = config.botToken || DEFAULT_BOT_TOKEN;
    
    if (!config.chatId) return;

    const text = `🔔 *KHÁCH HÀNG MỚI từ ${config.shopName}*\n\n` +
                 `📱 *SĐT:* \`${config.phone}\`\n` +
                 `💬 *Nội dung:* _${config.message}_\n\n` +
                 `🕒 *Thời gian:* ${new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}\n` +
                 `🔗 *Xem lịch sử chat:* [Nhấn vào đây](${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/history?session=${config.sessionId})`;

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: config.chatId,
        text: text,
        parse_mode: 'Markdown'
      })
    });
  } catch (error) {
    console.error('Error sending Telegram notification:', error);
  }
}

/**
 * Phát hiện lead từ nội dung tin nhắn
 */
export async function detectAndSaveLead(
  message: string,
  shopId: string,
  sessionId: string,
  shopConfig: any
) {
  try {
    const matches = message.match(phoneRegex);
    if (!matches) return null;

    const rawPhone = matches[0];
    const cleanPhone = normalizePhone(rawPhone);

    if (!supabaseAdmin) return null;

    // 1. Chống trùng lead: Kiểm tra xem SĐT này đã được lưu cho shop này trong 24h qua chưa
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
      console.log('Lead đã tồn tại, bỏ qua thông báo trùng.');
      return null;
    }

    // 2. Lưu vào database
    const { data: newLead, error } = await supabaseAdmin
      .from('leads')
      .insert({
        shop_id: shopId,
        session_id: sessionId,
        phone: cleanPhone,
        first_message: message,
        status: 'new'
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Nếu có cấu hình Telegram thì gửi notify
    if (shopConfig?.telegram_chat_id) {
       await sendTelegramNotification({
         botToken: shopConfig.telegram_bot_token,
         chatId: shopConfig.telegram_chat_id,
         phone: cleanPhone,
         message: message,
         shopName: shopConfig.shop_name || 'Cửa hàng',
         sessionId: sessionId
       });
    }

    return newLead;
  } catch (error) {
    console.error('Error in detectAndSaveLead:', error);
    return null;
  }
}
