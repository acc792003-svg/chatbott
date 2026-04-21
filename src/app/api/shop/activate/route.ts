import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { shopId, activationCode } = await req.json();

    if (!shopId || !activationCode) {
      return NextResponse.json({ error: 'Thiếu thông tin kích hoạt' }, { status: 400 });
    }

    // 1. Kiểm tra mã kích hoạt từ system_settings
    // Bạn có thể mở rộng logic này để kiểm tra bảng mã code riêng lẻ (đã dùng/chưa dùng)
    const { data: setting } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', 'pro_activation_code')
      .single();

    const masterCode = setting?.value || 'CB-PRO-2026';

    if (activationCode !== masterCode) {
      // Bonus: Check if the code is actually a special shop-specific PIN if needed, 
      // but the user said "super admin cấp mã".
      return NextResponse.json({ error: 'Mã kích hoạt không chính xác hoặc đã hết hạn!' }, { status: 403 });
    }

    // 2. Nâng cấp shop lên Pro (Mặc định 30 ngày hoặc tùy chỉnh)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);

    const { error: updateError } = await supabaseAdmin
      .from('shops')
      .update({
        plan: 'pro',
        plan_expiry_date: expiryDate.toISOString()
      })
      .eq('id', shopId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, message: 'Nâng cấp Pro thành công!' });

  } catch (error: any) {
    console.error('Activation Error:', error);
    return NextResponse.json({ error: 'Lỗi hệ thống khi kích hoạt' }, { status: 500 });
  }
}
