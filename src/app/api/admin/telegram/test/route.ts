import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        const { chatId, botToken, shopName } = await req.json();

        // 0. BẢO MẬT: Kiểm tra quyền Super Admin
        const authHeader = req.headers.get('Authorization');
        const tokenStr = authHeader?.split(' ')[1];
        if (!tokenStr) return NextResponse.json({ error: 'Phiên đăng nhập hết hạn, vui lòng F5!' }, { status: 401 });

        const { data: { user } } = await supabaseAdmin.auth.getUser(tokenStr);
        if (!user) return NextResponse.json({ error: 'Lỗi xác thực người dùng' }, { status: 401 });
        
        const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
        if (userData?.role !== 'super_admin') {
            return NextResponse.json({ error: 'Quyền truy cập bị từ chối: Chỉ Super Admin mới được dùng' }, { status: 403 });
        }

        // 1. Tìm token để dùng
        const leadsLib = await import('@/lib/leads');
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
            const errorMsg = leadsLib.translateTelegramError(data.description);
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
