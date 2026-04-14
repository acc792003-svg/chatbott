import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// GET: Lấy danh sách settings
export async function GET() {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    
    const { data } = await supabaseAdmin.from('system_settings').select('key, value');
    const settings: Record<string, string> = {};
    data?.forEach((s: any) => { settings[s.key] = s.value; });
    
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Cập nhật settings (chỉ Super Admin)
export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    
    const { key, value, keys, requesterId } = await req.json();

    // Kiểm tra quyền Super Admin
    const { data: requester } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (keys && Array.isArray(keys)) {
      // Cập nhật hàng loạt
      const updates = keys.map((k: any) => ({
        key: k.key,
        value: k.value,
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await supabaseAdmin.from('system_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
    } else if (key) {
      // Cập nhật một key đơn lẻ
      const { error } = await supabaseAdmin.from('system_settings').upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
