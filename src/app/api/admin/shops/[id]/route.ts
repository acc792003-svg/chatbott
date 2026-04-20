
import { NextResponse, NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shopId = params.id;

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

    // 2. Thực hiện xóa Shop (Supabase sẽ tự động xóa các bảng liên quan nhờ ON DELETE CASCADE)
    // Lưu ý: Một số bảng như 'users' có thể không cascade, cần kiểm tra
    
    // Xóa tất cả users thuộc shop này trước nếu cần (hoặc set shop_id = null)
    // Theo quy trình hiện tại, shop xóa thì data đi theo.
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
