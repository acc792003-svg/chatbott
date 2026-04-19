import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { shopId } = await req.json();

    if (!shopId) {
      return NextResponse.json({ error: 'Missing shopId' }, { status: 400 });
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'DB Connection Error' }, { status: 500 });
    }

    // Lấy mapping
    const { data: mappings } = await supabaseAdmin.from('shop_templates').select('template_id').eq('shop_id', shopId);
    
    if (mappings && mappings.length > 0) {
      const templateIds = mappings.map((m: any) => m.template_id);
      const { data: pkgs } = await supabaseAdmin.from('knowledge_templates').select('id, package_name, industry_name, faq_json').in('id', templateIds);
      return NextResponse.json({ packages: pkgs || [] });
    }

    return NextResponse.json({ packages: [] });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
