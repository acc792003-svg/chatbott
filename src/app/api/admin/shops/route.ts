
import { NextResponse, NextRequest } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    // 1. KIỂM TRA ĐĂNG NHẬP (Lấy user từ JWT trong Authorization header)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    let user;
    if (token) {
        // Nếu có token gửi kèm
        const { data } = await supabase.auth.getUser(token);
        user = data.user;
    } else {
        // Fallback: Kiểm tra session từ cookie nếu chạy trên cùng domain
        const { data } = await supabase.auth.getUser();
        user = data.user;
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized - Vui lòng đăng nhập' }, { status: 401 });
    }

    // 2. KIỂM TRA QUYỀN (ROLE CHECK)
    // Truy vấn bảng users để kiểm tra role thực tế của người dùng này
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData || (userData.role !== 'super_admin' && userData.role !== 'staff_admin')) {
      return NextResponse.json({ error: 'Forbidden - Bạn không có quyền truy cập' }, { status: 403 });
    }

    // 3. TRUY VẤN DỮ LIỆU (Với quyền Admin)
    const { data: shops, error } = await supabaseAdmin
      .from('shops')
      .select(`
        id, 
        name, 
        code, 
        plan, 
        plan_expiry_date, 
        created_at, 
        slug,
        manychat_api_key,
        users (email, id)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // 4. BỔ SUNG GÓI TRI THỨC VÀ CẤU HÌNH LIÊN QUAN
    const shopIds = shops.map((s: any) => s.id);
    const { data: mappings } = await supabaseAdmin.from('shop_templates').select('shop_id, template_id').in('shop_id', shopIds);
    const { data: templates } = await supabaseAdmin.from('knowledge_templates').select('id, package_name');
    const { data: fbConfigs } = await supabaseAdmin.from('channel_configs').select('shop_id, provider_id, access_token').eq('channel_type', 'facebook').in('shop_id', shopIds);
    const { data: sysSettings } = await supabaseAdmin.from('system_settings').select('key, value').like('key', 'shop_config_pin_%');
    
    const enrichedShops = shops.map((shop: any) => {
        const pkgs = mappings?.filter((m: any) => m.shop_id === shop.id).map((m: any) => {
            const template = templates?.find((t: any) => t.id === m.template_id);
            return template ? { id: template.id, name: template.package_name } : null;
        }).filter(Boolean) || [];

        const fbConf = fbConfigs?.find((fc: any) => fc.shop_id === shop.id);
        const pinConf = sysSettings?.find((sys: any) => sys.key === `shop_config_pin_${shop.id}`);

        return { 
            ...shop, 
            packages: pkgs,
            fb_page_id: fbConf ? fbConf.provider_id : null,
            fb_page_token: fbConf ? fbConf.access_token : null,
            pin_hash: pinConf ? pinConf.value : null
        };
    });

    return NextResponse.json(enrichedShops);
  } catch (error: any) {
    console.error('Secure Fetch Shops API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
