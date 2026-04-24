import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        if (!supabaseAdmin) throw new Error('Missing Supabase Admin');

        // 1. Danh sách tất cả các Key cần theo dõi
        const targetKeys = [
            'gemini_api_key_1', 'gemini_api_key_2', 'gemini_api_key_pro',
            'deepseek_api_key_free1', 'deepseek_api_key_free2', 'deepseek_api_key_pro',
            'gemini_embedding_key_1', 'gemini_embedding_key_2', 'deepseek_env_key'
        ];

        // 2. Lấy dữ liệu từ Database
        const { data: dbKeys, error } = await supabaseAdmin
            .from('system_settings')
            .select('*')
            .in('key', targetKeys);

        if (error) throw error;

        const now = new Date();
        
        // 3. Map dữ liệu, đảm bảo luôn trả về đủ 9 key kể cả khi chưa có trong DB
        const stats = targetKeys.map((tk: any) => {
            const k = (dbKeys || []).find((dk: any) => dk.key === tk);
            
            // Tên hiển thị thân thiện
            let friendlyName = tk;
            if (tk === 'gemini_api_key_1') friendlyName = 'Ge Free 1';
            else if (tk === 'gemini_api_key_2') friendlyName = 'Ge Free 2';
            else if (tk === 'gemini_api_key_pro') friendlyName = 'Ge Pro';
            else if (tk === 'deepseek_api_key_free1') friendlyName = 'Ds Free 1';
            else if (tk === 'deepseek_api_key_free2') friendlyName = 'Ds Free 2';
            else if (tk === 'deepseek_api_key_pro') friendlyName = 'Ds Pro';
            else if (tk === 'gemini_embedding_key_1') friendlyName = 'Ge Embed 1';
            else if (tk === 'gemini_embedding_key_2') friendlyName = 'Ge Embed 2';
            else if (tk === 'deepseek_env_key') friendlyName = 'Ds Env';

            // Kiểm tra xem đã điền giá trị chưa
            const hasValue = k?.value && k.value.trim() !== '' && k.value !== 'DeepSeek free';
            
            let currentStatus = k?.status || 'active';
            
            // Logic Trạng thái thông minh
            if (!hasValue) {
                currentStatus = 'disabled'; // Chưa điền key -> Màu xám
            } else {
                const isCooldown = k?.cooldown_until && new Date(k.cooldown_until) > now;
                if (currentStatus !== 'disabled' && isCooldown) {
                    currentStatus = 'cooldown';
                } else if (currentStatus === 'error' && !isCooldown) {
                    currentStatus = 'probing';
                }
            }

            return {
                id: k?.id || tk,
                name: friendlyName,
                status: currentStatus,
                usage_count: k?.usage_count || 0,
                error_count: k?.error_count || 0,
                fail_count: k?.fail_count || 0,
                avg_latency: k?.avg_latency || 0,
                last_used_at: k?.last_used_at,
                last_error: k?.last_error
            };
        });

        // 4. Thống kê Cache trong 24h
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: messages } = await supabaseAdmin
            .from('messages')
            .select('metadata')
            .gt('created_at', yesterday);
        
        const total = messages?.length || 0;
        const cacheHits = messages?.filter((m: any) => m.metadata?.source?.includes('cache') || m.metadata?.source === 'faq').length || 0;

        return NextResponse.json({
            success: true,
            keys: stats,
            metrics: {
                total_messages_24h: total,
                cache_hit_rate: total > 0 ? (cacheHits / total * 100).toFixed(1) : 0
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
