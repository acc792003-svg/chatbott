import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        if (!supabaseAdmin) throw new Error('Missing Supabase Admin');

        // 1. Lấy dữ liệu từ Database (Nguồn sự thật duy nhất)
        const { data: keys, error } = await supabaseAdmin
            .from('system_settings')
            .select('*')
            .in('key', [
                'gemini_api_key_1', 'gemini_api_key_2', 'gemini_api_key_pro',
                'deepseek_api_key_free1', 'deepseek_api_key_free2', 'deepseek_api_key_pro'
            ]);

        if (error) throw error;

        const now = new Date();
        const stats = (keys || []).map(k => {
            // Định dạng tên hiển thị thân thiện
            let friendlyName = k.key.replace('gemini_api_key_', 'Gemini ').replace('deepseek_api_key_', 'DeepSeek ');
            if (friendlyName.includes('free')) friendlyName = friendlyName.replace('free', 'Free ');
            if (friendlyName.includes('pro')) friendlyName = friendlyName.replace('pro', 'PRO');
            
            // Xử lý Provider
            const provider = k.key.includes('gemini') ? 'gemini' : 'deepseek';

            // Xử lý Status thực tế
            let currentStatus = k.status || 'active';
            const isCooldown = k.cooldown_until && new Date(k.cooldown_until) > now;
            
            if (currentStatus !== 'disabled' && isCooldown) {
                currentStatus = 'cooldown';
            } else if (currentStatus === 'error' && !isCooldown) {
                currentStatus = 'probing';
            }

            return {
                db_id: k.id,
                name: friendlyName,
                provider: provider,
                status: currentStatus,
                usage_count: k.usage_count || 0,
                error_count: k.error_count || 0,
                fail_count: k.fail_count || 0,
                avg_latency: k.avg_latency || 0,
                last_used_at: k.last_used_at,
                cooldown_until: k.cooldown_until,
                last_error: k.last_error
            };
        });

        // 2. Thống kê Cache trong 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: messages } = await supabaseAdmin
            .from('messages')
            .select('metadata')
            .gt('created_at', yesterday);
        
        const total = messages?.length || 0;
        const cacheHits = messages?.filter((m: any) => m.metadata?.source?.includes('cache') || m.metadata?.source === 'faq').length || 0;
        
        const fallbackRate = total > 0 ? ((total - cacheHits) / total * 100).toFixed(1) : 0;

        return NextResponse.json({
            success: true,
            keys: stats.sort((a, b) => a.name.localeCompare(b.name)),
            metrics: {
                total_messages_24h: total,
                cache_hit_rate: total > 0 ? (cacheHits / total * 100).toFixed(1) : 0,
                fallback_rate: fallbackRate
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
