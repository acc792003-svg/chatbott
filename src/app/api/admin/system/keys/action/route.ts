import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
        // 1. KIỂM TRA ĐĂNG NHẬP (Lấy user từ JWT)
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];
        
        let user;
        if (token) {
            const { data } = await supabase.auth.getUser(token);
            user = data.user;
        } else {
            const { data } = await supabase.auth.getUser();
            user = data.user;
        }

        if (!user) {
          return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // 2. KIỂM TRA QUYỀN SUPER ADMIN
        const { data: userData, error: roleError } = await supabaseAdmin
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (roleError || !userData || userData.role !== 'super_admin') {
          return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { id, action } = await req.json();
        
        if (!id) {
            return NextResponse.json({ success: false, error: 'Thiếu ID Key' });
        }

        // Nếu ID là chuỗi (chưa được lưu trong DB), không thể thao tác
        if (typeof id === 'string' && (id.includes('embedding') || id.includes('env'))) {
            return NextResponse.json({ success: false, error: 'Không thể chỉnh sửa Key trong file .env từ Dashboard' });
        }

        if (action === 'reset') {
            await supabaseAdmin.from('system_settings').update({
                status: 'active',
                error_count: 0,
                fail_count: 0,
                cooldown_until: null,
                last_error: null
            }).eq('id', id);
        } else if (action === 'toggle') {
            // Lấy trạng thái hiện tại
            const { data } = await supabaseAdmin.from('system_settings').select('status').eq('id', id).single();
            if (data) {
                const newStatus = data.status === 'disabled' ? 'active' : 'disabled';
                await supabaseAdmin.from('system_settings').update({ status: newStatus }).eq('id', id);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message });
    }
}
