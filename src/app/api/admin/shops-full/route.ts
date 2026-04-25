import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        if (!supabaseAdmin) throw new Error('Missing Supabase Admin');

        // 1. Lấy danh sách shop (Limit 50 để tối ưu)
        const { data: shopsData, error: shopsErr } = await supabaseAdmin
            .from('shops')
            .select('*, users(email, id)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (shopsErr) throw shopsErr;

        if (!shopsData || shopsData.length === 0) {
            return NextResponse.json({ success: true, shops: [], activeIcons: {}, shopConfigs: {}, shopPackages: {} });
        }

        const shopIds = shopsData.map((s: any) => s.id);

        // 2. Lấy config cho các shop này
        const { data: configs } = await supabaseAdmin
            .from('chatbot_configs')
            .select('*')
            .in('shop_id', shopIds);

        // 3. Lấy mappings gói tri thức
        const { data: mappings } = await supabaseAdmin
            .from('shop_templates')
            .select('shop_id, template_id')
            .in('shop_id', shopIds);

        // Lấy thông tin các gói tri thức đang được dùng
        const templateIds = Array.from(new Set(mappings?.map((m: any) => m.template_id) || []));
        let templates = [];
        if (templateIds.length > 0) {
            const { data: t } = await supabaseAdmin
                .from('knowledge_templates')
                .select('id, package_name')
                .in('id', templateIds);
            templates = t || [];
        }

        // Map dữ liệu
        const iconMap: Record<string, string> = {};
        const configMap: Record<string, any> = {};
        configs?.forEach((c: any) => {
            iconMap[c.shop_id] = c.head_icon;
            configMap[c.shop_id] = c;
        });

        const templateLookup = new Map(
            templates?.map((t: any) => [t.id, { id: t.id, name: t.package_name }]) || []
        );

        const shopToTemplates: Record<string, any[]> = {};
        mappings?.forEach((m: any) => {
            const t = templateLookup.get(m.template_id);
            if (t) {
                if (!shopToTemplates[m.shop_id]) {
                    shopToTemplates[m.shop_id] = [t];
                } else {
                    shopToTemplates[m.shop_id].push(t);
                }
            }
        });

        const finalShops = shopsData.map((s: any) => ({ 
            ...s, 
            packages: shopToTemplates[s.id] || [] 
        }));

        return NextResponse.json({
            success: true,
            shops: finalShops,
            activeIcons: iconMap,
            shopConfigs: configMap,
            shopPackages: shopToTemplates
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
