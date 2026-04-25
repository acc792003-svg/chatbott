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

    const { keyStr, status, latency } = await req.json();

    if (!keyStr) {
      return NextResponse.json({ success: false, error: 'Missing key string' });
    }

    // Only update if it exists in DB. .env keys won't be updated (unless they have an entry)
    // Actually, we can upsert if we want, but it's safer to just update.
    const { error } = await supabaseAdmin
      .from('system_settings')
      .upsert({
        key: keyStr,
        status,
        avg_latency: latency || 0,
        last_used_at: new Date().toISOString()
      }, { onConflict: 'key' });

    if (error) {
      // If error, maybe the key isn't in DB yet (for .env keys)
      // This is fine, we just ignore it.
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
