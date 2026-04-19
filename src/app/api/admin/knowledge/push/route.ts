import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  let body: any = {};
  try {
    body = await req.json();
    const { codes, templateIds, voice, requesterId } = body;

    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });

    // 1. Kiểm tra quyền Super Admin
    const { data: requester } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ error: 'Vui lòng cung cấp ít nhất một mã shop.' }, { status: 400 });
    }

    // 2. Tìm IDs của các shops
    const { data: targetShops, error: shopError } = await supabaseAdmin
      .from('shops')
      .select('id, code')
      .in('code', codes);

    if (shopError) throw shopError;
    if (!targetShops || targetShops.length === 0) {
        return NextResponse.json({ error: 'Không tìm thấy shop nào.' }, { status: 404 });
    }

    const shopIds = targetShops.map((s: any) => s.id);

    // 3. THIẾT LẬP "LIÊN KẾT KÝ ỨC" (Bảng shop_templates)
    // Chỉ cập nhật bảng này để Shop được quyền truy cập các Vector tri thức chung
    if (templateIds && Array.isArray(templateIds)) {
        // Bỏ logic xóa cũ. Cập nhật logic: Fetch hiện tại và chỉ thêm những gì chưa có
        const { data: existingMappings } = await supabaseAdmin.from('shop_templates').select('shop_id, template_id').in('shop_id', shopIds);
        
        const existingSet = new Set(existingMappings?.map((m: any) => `${m.shop_id}_${m.template_id}`) || []);
        
        const newMappingRows: any[] = [];
        shopIds.forEach((shopId: any) => {
            templateIds.forEach((tId: any) => {
                if (!existingSet.has(`${shopId}_${tId}`)) {
                    newMappingRows.push({ shop_id: shopId, template_id: tId });
                }
            });
        });

        if (newMappingRows.length > 0) {
            const { error: insErr } = await supabaseAdmin.from('shop_templates').insert(newMappingRows);
            if (insErr) throw new Error('Insert new mapping error: ' + insErr.message);
        }
    }

    // 4. CẬP NHẬT NHẸ CẤU HÌNH (Chỉ cập nhật Brand Voice nếu có yêu cầu)
    // Tuyệt đối không chạm vào product_info và faq riêng của shop
    if (voice) {
        const voiceUpdates = shopIds.map((id: any) => ({
            shop_id: id,
            brand_voice: voice,
            updated_at: new Date().toISOString()
        }));
        await supabaseAdmin.from('chatbot_configs').upsert(voiceUpdates, { onConflict: 'shop_id' });
    }

    return NextResponse.json({ success: true, count: targetShops.length });

  } catch (error: any) {
    console.error('Push Knowledge Error:', error);
    
    // 🔥 BÁO CÁO RADAR CẤP ĐỘ HỆ THỐNG
    if (supabaseAdmin) {
      supabaseAdmin.from('system_errors').insert({
        error_type: 'KNOWLEDGE_PUSH_FAILED',
        error_message: error.message,
        file_source: 'api/admin/knowledge/push/route.ts',
        metadata: { targetCodes: body?.codes, error: error.stack }
      }).then(({error}: any) => { if(error) console.error('Radar report failed:', error.message) });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
