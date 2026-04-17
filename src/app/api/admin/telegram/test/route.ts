import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/leads'; // Sử dụng lại logic từ leads lib

export async function POST(req: Request) {
    try {
        const { chatId, botToken, shopName } = await req.json();

        // 1. Tìm token để dùng (Shop hoặc System Fallback)
        let token = botToken;
        if (!token) {
            const { data: sysSetting } = await supabaseAdmin
                .from('system_settings')
                .select('value')
                .eq('key', 'system_telegram_bot_token')
                .single();
            token = sysSetting?.value;
        }

        if (!token) {
            return NextResponse.json({ error: 'Không tìm thấy Bot Token (Shop hoặc Hệ thống)' }, { status: 400 });
        }

        // 2. Gửi tin nhắn test
        const text = `🚀 *TEST KẾT NỐI THÀNH CÔNG*\n\n` +
                     `Cửa hàng: *${shopName}*\n` +
                     `Trạng thái: ✅ Hoạt động tốt\n` +
                     `Thời gian: ${new Date().toLocaleString('vi-VN')}\n\n` +
                     `Shop của bạn đã sẵn sàng nhận thông báo Lead!`;

        const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        const data = await res.json();

        if (res.ok) {
            return NextResponse.json({ success: true });
        } else {
            return NextResponse.json({ error: data.description }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
