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

    // 2. Tìm user_id của chủ shop từ bảng users
    const { data: shopOwner } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .eq('shop_id', shopId)
      .limit(1);

    if (!shopOwner || shopOwner.length === 0) {
      return NextResponse.json({ error: 'Không tìm thấy tài khoản chủ shop!' }, { status: 404 });
    }

    const targetUserId = shopOwner[0].id;

    // 3. Cập nhật mật khẩu bằng Admin Auth
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    );

    if (authError) throw authError;

    return NextResponse.json({ success: true, message: 'Đã đổi mật khẩu thành công!' });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
