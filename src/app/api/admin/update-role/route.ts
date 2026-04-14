import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    
    const { userId, role, requesterId } = await req.json();

    // Verification - Only Super Admin can change roles
    const { data: requester } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ role })
      .eq('id', userId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
