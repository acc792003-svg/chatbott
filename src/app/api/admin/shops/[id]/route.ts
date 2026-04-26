
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

    // 2. Thực hiện xóa sạch dữ liệu liên quan (Manual Cascade để đảm bảo tuyệt đối)
    
    // Xóa users thuộc shop này
    await supabaseAdmin.from('users').delete().eq('shop_id', shopId);

    // Xóa cấu hình kênh (FB, Telegram) - Cực kỳ quan trọng để giải phóng Page ID
    await supabaseAdmin.from('channel_configs').delete().eq('shop_id', shopId);

    // Xóa cấu hình chatbot
    await supabaseAdmin.from('chatbot_configs').delete().eq('shop_id', shopId);

    // Xóa liên kết gói tri thức
    await supabaseAdmin.from('shop_templates').delete().eq('shop_id', shopId);

    // Xóa FAQ riêng của shop
    await supabaseAdmin.from('faqs').delete().eq('shop_id', shopId);

    // Xóa nhật ký chat
    await supabaseAdmin.from('chat_logs').delete().eq('shop_id', shopId);
    await supabaseAdmin.from('messages').delete().eq('shop_id', shopId);

    // Xóa Shop chính
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
