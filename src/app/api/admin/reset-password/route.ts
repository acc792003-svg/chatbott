import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { shopId, newPassword, requesterId } = await req.json();

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });

    // 1. Kiểm tra quyền Super Admin của người yêu cầu
    const { data: requester } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', requesterId)
      .single();

    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Bạn không có quyền thực hiện thao tác này!' }, { status: 403 });
    }

    // 2. Tìm user_id của chủ shop
    const { data: shop } = await supabaseAdmin
      .from('shops')
      .select('user_id')
      .eq('id', shopId)
      .single();

    if (!shop || !shop.user_id) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản chủ shop!' }, { status: 404 });
    }

    // 3. Cập nhật mật khẩu bằng Admin Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      shop.user_id,
      { password: newPassword }
    );

    if (authError) throw authError;

    return NextResponse.json({ success: true, message: 'Đã đổi mật khẩu thành công!' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
