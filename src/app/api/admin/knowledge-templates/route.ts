import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    if (!supabaseAdmin) return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
    
    const { data } = await supabaseAdmin
      .from('knowledge_templates')
      .select('*')
      .order('industry_name', { ascending: true });
    
    return NextResponse.json({ templates: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
