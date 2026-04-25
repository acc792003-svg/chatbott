import { NextResponse } from 'next/server';
import { encrypt, decrypt } from '@/lib/encryption';

// GET: Lấy danh sách settings
export async function GET() {
  try {
    const { supabase, supabaseAdmin } = await import('@/lib/supabase');
    const client = supabaseAdmin || supabase;
    if (!client) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
    
    const { data } = await client.from('system_settings').select('key, value');
    const settings: Record<string, string> = {};
    data?.forEach((s: any) => { 
        settings[s.key] = decrypt(s.value); 
    });
    
    return NextResponse.json({ settings });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Cập nhật settings (chỉ Super Admin)
export async function POST(req: Request) {
  try {
    const { supabase, supabaseAdmin } = await import('@/lib/supabase');
    const client = supabaseAdmin || supabase;
    if (!client) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
    
    const { key, value, keys, requesterId } = await req.json();

    // Kiểm tra quyền Super Admin
    const { data: requester } = await client.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (keys && Array.isArray(keys)) {
      // Cập nhật hàng loạt
      const updates = keys.map((k: any) => ({
        key: k.key,
        value: encrypt(k.value),
        updated_at: new Date().toISOString()
      }));
      
      const { error } = await client.from('system_settings').upsert(updates, { onConflict: 'key' });
      if (error) throw error;
    } else if (key) {
      // Cập nhật một key đơn lẻ
      const { error } = await client.from('system_settings').upsert(
        { key, value: encrypt(value), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
