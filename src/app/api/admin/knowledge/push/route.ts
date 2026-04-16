import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { codes, data, templateIds, voice, requesterId } = await req.json();

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

    const shopIds = targetShops.map((s: any) => s.id);

    // 2. Cập nhật chatbot_configs (Tri thức thuần văn bản + cấu hình giọng văn)
    const updates = shopIds.map(id => ({
      shop_id: id,
      product_info: data.product_info,
      faq: data.faq, // Vẫn giữ bản text để AI fallback khi cần
      customer_insights: data.insights,
      brand_voice: voice,
      updated_at: new Date().toISOString()
    }));

    const { error: updateError } = await supabaseAdmin
      .from('chatbot_configs')
      .upsert(updates, { onConflict: 'shop_id' });

    if (updateError) throw updateError;

    // 3. LIÊN KẾT VECTOR SEARCH (Bảng shop_templates)
    // Giúp hệ thống biết shop nào được dùng gói tri thức nào để tìm kiếm Vector
    if (templateIds && Array.isArray(templateIds)) {
        const mappingRows: any[] = [];
        shopIds.forEach(shopId => {
            templateIds.forEach(tId => {
                mappingRows.push({ shop_id: shopId, template_id: tId });
            });
        });

        // Xóa mapping cũ để nạp mới (hoặc dùng upsert nếu không muốn xóa)
        await supabaseAdmin.from('shop_templates').delete().in('shop_id', shopIds);
        await supabaseAdmin.from('shop_templates').insert(mappingRows);
    }

    return NextResponse.json({ success: true, count: targetShops.length });

  } catch (error: any) {
    console.error('Push Knowledge Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
