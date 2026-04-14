import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Error' }, { status: 500 });
    
    const { shopId, days, requesterId } = await req.json();

    // Check Super Admin
    const { data: requester } = await supabaseAdmin.from('users').select('role').eq('id', requesterId).single();
    if (requester?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + parseInt(days));

    const { error } = await supabaseAdmin
      .from('shops')
      .update({
        plan: 'pro',
        plan_expiry_date: expiryDate.toISOString()
      })
      .eq('id', shopId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
