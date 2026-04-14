import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { userId, password, requesterId } = await req.json();

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase Admin Client not initialized' }, { status: 500 });
    }

    // Verify requester is super_admin
    const { data: requester } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updates: any = {};
    if (password) updates.password = password;

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: data.user });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
