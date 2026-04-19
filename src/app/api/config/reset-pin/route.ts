import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { shopId, newPin, requesterId } = await req.json();
    if (!shopId) return NextResponse.json({ error: 'Missing shopId' }, { status: 400 });

    // Validate requester is superadmin
    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (userData?.role !== 'super_admin' && userData?.role !== 'staff_admin') {
       return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const key = `shop_config_pin_${shopId}`;
    let res;
    if (!newPin) {
       // Xoá PIN
       res = await supabaseAdmin.from('system_settings').delete().eq('key', key);
    } else {
       // Cập nhật/Tạo PIN
       res = await supabaseAdmin.from('system_settings').upsert({ key, value: newPin.trim() }, { onConflict: 'key' });
    }

    if (res.error) throw res.error;

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Lỗi hệ thống' }, { status: 500 });
  }
}
