import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { email, password, shopCode } = await req.json();
    const headerList = await headers();
    
    // Lấy IP của người dùng (Xử lý các trường hợp proxy/Vercel)
    const forwarded = headerList.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

    if (!supabaseAdmin) {
      console.error('SUPABASE_SERVICE_ROLE_KEY is missing');
      return NextResponse.json({ error: 'Hệ thống đang bảo trì, vui lòng thử lại sau!' }, { status: 500 });
    }

    // 1. KIỂM TRA SPAM IP (Giới hạn 3 lần/ngày)
    const { data: recentLogs, error: logFetchError } = await supabaseAdmin
      .from('registration_logs')
      .select('id')
      .eq('ip_address', ip)
      .gt('created_at', new Date(Date.now() - 24*60*60*1000).toISOString());

    if (logFetchError) {
      console.error('Error fetching logs:', logFetchError);
    }

    if ((recentLogs?.length || 0) >= 3) {
      return NextResponse.json({ 
        error: "Bạn đã tạo quá nhiều shop hôm nay. Vui lòng quay lại sau 24h để đảm bảo bảo mật hệ thống!" 
      }, { status: 429 });
    }

    // 2. TẠO USER TRONG AUTH (Sử dụng Admin để kiểm soát)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true 
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // 3. LOGIC TẠO SHOP & CLONE CẤU HÌNH
    let generatedCode = '';
    let targetShopId = '';

    if (shopCode) {
        // Gán vào shop đã có sẵn
        const { data: shop } = await supabaseAdmin.from('shops').select('id').eq('code', shopCode).single();
        if (!shop) {
          // Xóa user vừa tạo nếu không tìm thấy shop để tránh rác AUTH
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          throw new Error('Mã shop không tồn tại hoặc đã hết hạn!');
        }
        targetShopId = shop.id;
    } else {
        // Tạo shop dùng thử mới
        const nums = '0123456789'; const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        generatedCode = `${nums[Math.floor(Math.random() * nums.length)]}${nums[Math.floor(Math.random() * nums.length)]}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}${letters[Math.floor(Math.random() * letters.length)]}`;
        
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 1);

        const { data: newShop, error: shopErr } = await supabaseAdmin.from('shops').insert([{
            name: 'Shop Dùng Thử',
            code: generatedCode,
            plan: 'free',
            plan_expiry_date: expiryDate.toISOString()
        }]).select().single();
        
        if (shopErr) throw shopErr;
        targetShopId = newShop.id;

        // Clone tri thức từ shop mẫu
        const { data: setting } = await supabaseAdmin.from('system_settings').select('value').eq('key', 'trial_template_shop_code').single();
        const templateCode = setting?.value || '70WPN';

        const { data: sourceShop } = await supabaseAdmin.from('shops').select('id').eq('code', templateCode).single();
        if (sourceShop) {
            const { data: config } = await supabaseAdmin.from('chatbot_configs').select('*').eq('shop_id', sourceShop.id).single();
            if (config) {
                const { id, updated_at, ...cloned } = config;
                await supabaseAdmin.from('chatbot_configs').insert({ 
                  ...cloned, 
                  shop_id: targetShopId, 
                  shop_name: 'Shop Dùng Thử',
                  is_active: true
                });
            }
        }
    }

    // 4. GÁN USER VÀO SHOP & LƯU LOG IP
    await supabaseAdmin.from('users').insert({ 
      id: authData.user.id, 
      email, 
      shop_id: targetShopId, 
      role: 'user' 
    });
    
    await supabaseAdmin.from('registration_logs').insert({ ip_address: ip });

    return NextResponse.json({ success: true, generatedCode });

  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
