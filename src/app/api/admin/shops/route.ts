
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
        users (email, id)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json(shops);
  } catch (error: any) {
    console.error('Secure Fetch Shops API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
