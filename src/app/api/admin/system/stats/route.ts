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
            'openrouter_api_key_1', 'openrouter_api_key_2', 'openrouter_api_key_pro',
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
            
            // Logic kiểm tra giá trị (Database OR .env Fallback)
            let hasValue = !!(k?.value && k.value.trim() !== '' && k.value !== 'DeepSeek free');
            let friendlyName = tk;

            // Kiểm tra từng Key cụ thể để mapping tên và check .env
            if (tk === 'gemini_api_key_1') {
                friendlyName = 'Ge Free 1';
                if (!hasValue) hasValue = !!process.env.GEMINI_API_KEY_1;
            }
            else if (tk === 'gemini_api_key_2') {
                friendlyName = 'Ge Free 2';
                if (!hasValue) hasValue = !!process.env.GEMINI_API_KEY_2;
            }
            else if (tk === 'gemini_api_key_pro') {
                friendlyName = 'Ge Pro';
                if (!hasValue) hasValue = !!process.env.GEMINI_API_KEY_PRO;
            }
            else if (tk === 'deepseek_api_key_free1') {
                friendlyName = 'Ds Free 1';
            }
            else if (tk === 'deepseek_api_key_free2') {
                friendlyName = 'Ds Free 2';
            }
            else if (tk === 'deepseek_api_key_pro') {
                friendlyName = 'Ds Pro';
            }
            else if (tk === 'openrouter_api_key_1') {
                friendlyName = 'OR Free 1';
                if (!hasValue) hasValue = !!process.env.OPENROUTER_API_KEY_1;
            }
            else if (tk === 'openrouter_api_key_2') {
                friendlyName = 'OR Free 2';
                if (!hasValue) hasValue = !!process.env.OPENROUTER_API_KEY_2;
            }
            else if (tk === 'openrouter_api_key_pro') {
                friendlyName = 'OR Pro';
                if (!hasValue) hasValue = !!process.env.OPENROUTER_API_KEY_PRO;
            }
            else if (tk === 'gemini_embedding_key_1') {
                friendlyName = 'Ge Env 1';
                hasValue = !!process.env.GEMINI_EMBEDDING_KEY_1;
            }
            else if (tk === 'gemini_embedding_key_2') {
                friendlyName = 'Ge Env 2';
                hasValue = !!process.env.GEMINI_EMBEDDING_KEY_2;
            }
            else if (tk === 'deepseek_env_key') {
                friendlyName = 'Ds Env';
                hasValue = !!process.env.DEEPSEEK_ENV_KEY || !!process.env.DEEPSEEK_API_KEY || !!process.env.GEMINI_API_KEY; 
            }

            let currentStatus = k?.status;
            
            // Logic Trạng thái chuẩn mực (Không tự đoán)
            if (!k && hasValue) {
                currentStatus = 'active'; // Lấy từ .ENV -> Luôn active
            } else if (!hasValue) {
                currentStatus = 'disabled'; // Không có dữ liệu
            } else {
                const isCooldown = k?.cooldown_until && new Date(k.cooldown_until) > now;
                if (currentStatus !== 'disabled' && isCooldown) {
                    currentStatus = 'cooldown';
                } else if (!currentStatus) {
                    currentStatus = 'disabled'; // Khắt khe: NULL trong DB -> Hiển thị Disabled
                }
            }

            return {
                id: k?.id || tk,
                key: tk,
                name: friendlyName,
                status: currentStatus,
                usage_count: k?.usage_count || 0,
                error_count: k?.error_count || 0,
                fail_count: k?.fail_count || 0,
                avg_latency: k?.avg_latency || 0,
                last_used_at: k?.last_used_at,
                last_error: k?.last_error,
                last_error_type: k?.last_error_type,
                cooldown_until: k?.cooldown_until,
                is_env: tk.includes('embedding') || tk.includes('env') || (!k?.value && hasValue)
            };
        });

        // 4. Thống kê Cache trong 24h (Tối ưu hóa Pro Level: 1 RPC = 1 Roundtrip)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        
        let totalCount = 0;
        let cacheHitCount = 0;

        try {
            // Gọi RPC để lấy thống kê tập trung (Nhanh nhất)
            const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc('get_system_stats', { 
                _since: yesterday 
            });

            if (!rpcErr && rpcData && rpcData.length > 0) {
                totalCount = rpcData[0].total_count || 0;
                cacheHitCount = rpcData[0].cache_hits || 0;
            } else {
                // Fallback nếu chưa tạo RPC: Dùng count planned để tránh scan toàn bộ bảng
                const { count: total } = await supabaseAdmin
                    .from('messages')
                    .select('*', { count: 'planned', head: true })
                    .gt('created_at', yesterday);
                
                const { count: cacheHits } = await supabaseAdmin
                    .from('messages')
                    .select('*', { count: 'planned', head: true })
                    .gt('created_at', yesterday)
                    .or('metadata->>source.eq.cache,metadata->>source.eq.faq');
                
                totalCount = total || 0;
                cacheHitCount = cacheHits || 0;
            }
        } catch (err) {
            console.error('RPC Stats Error, using fallback:', err);
        }

        return NextResponse.json({
            success: true,
            keys: stats,
            metrics: {
                total_messages_24h: totalCount,
                cache_hit_rate: totalCount > 0 ? (cacheHitCount / totalCount * 100).toFixed(1) : 0
            }
        });

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
