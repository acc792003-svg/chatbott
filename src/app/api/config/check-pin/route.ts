import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { shopId, pin } = await req.json();
    if (!shopId) return NextResponse.json({ error: 'Missing shopId' }, { status: 400 });

    const key = `shop_config_pin_${shopId}`;
    const { data } = await supabaseAdmin.from('system_settings').select('value').eq('key', key).single();

    // Nếu shop không có cấu hình mã PIN nào, cho phép vào thẳng
    if (!data || !data.value) {
        return NextResponse.json({ success: true, requiresPin: false });
    }

    // Nếu có PIN, phải so khớp
    if (data.value === pin) {
        return NextResponse.json({ success: true });
    } else {
        return NextResponse.json({ success: false, error: 'Mật khẩu cấu hình không đúng' });
    }

  } catch (error) {
    return NextResponse.json({ error: 'Máy chủ gặp lỗi' }, { status: 500 });
  }
}
