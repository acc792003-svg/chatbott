
import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: shopId } = await context.params;

    // 1. Kiểm tra quyền Admin (Token từ Authorization header)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabaseAdmin.from('users').select('role').eq('id', user.id).single();
    if (userData?.role !== 'super_admin') {
        return NextResponse.json({ error: 'Chỉ Super Admin mới có quyền xóa Shop' }, { status: 403 });
    }

    // 2. Thực hiện xóa Shop
    // Lưu ý: Tên cột field trong bảng users là shop_id. Cần xóa user trước để tránh lỗi FK.
    
    // Xóa users thuộc shop này
    const { error: usersDeleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('shop_id', shopId);

    if (usersDeleteError) {
        console.error('Error deleting users:', usersDeleteError);
        throw new Error('Không thể xóa người dùng thuộc shop: ' + usersDeleteError.message);
    }

    // Xóa Shop (Supabase sẽ tự động xóa các bảng khác nếu có ON DELETE CASCADE)
    const { error: deleteError } = await supabaseAdmin
      .from('shops')
      .delete()
      .eq('id', shopId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Shop Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
