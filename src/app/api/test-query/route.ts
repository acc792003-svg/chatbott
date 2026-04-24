import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  const { data } = await supabaseAdmin.from('chatbot_configs').select('*').eq('shop_id', '1075624b-8941-418e-a0e9-ca8344379cc1');
  return NextResponse.json(data);
}
