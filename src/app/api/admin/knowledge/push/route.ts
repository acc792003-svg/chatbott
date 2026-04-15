import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { codes, data, voice, requesterId } = await req.json();

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });

    // Kiểm tra quyền Super Admin
    const { data: requester } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ error: 'Vui lòng cung cấp ít nhất một mã shop.' }, { status: 400 });
    }

    // 1. Tìm IDs của các shops dựa trên codes
    const { data: targetShops, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, code')
      .in('code', codes);

    if (shopError) throw shopError;
    if (!targetShops || targetShops.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy shop nào khớp với các mã đã nhập.' }, { status: 404 });
    }

    const shopIds = targetShops.map(s => s.id);

    // 2. Cập nhật chatbot_configs cho tất cả shop này
    const updates = shopIds.map(id => ({
      shop_id: id,
      product_info: data.product_info,
      faq: data.faq,
      customer_insights: data.insights,
      brand_voice: voice,
      updated_at: new Date().toISOString()
    }));

    // Sử dụng upsert để cập nhật nếu đã có, hoặc tạo mới nếu chưa có cấu hình
    const { error: updateError } = await supabaseAdmin
      .from('chatbot_configs')
      .upsert(updates, { onConflict: 'shop_id' });

    if (updateError) throw updateError;

    // 3. Lưu log nạp tri thức
    await supabaseAdmin.from('knowledge_logs').insert({
        shop_codes: codes.join(' '),
        raw_content: 'Cập nhật từ Xưởng Tri Thức',
        processed_result: data
    });

    return NextResponse.json({ success: true, count: targetShops.length });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
