import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
    try {
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
