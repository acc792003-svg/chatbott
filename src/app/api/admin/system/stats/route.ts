import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { keyStatsMap, getDetailedApiKeys, getDeepSeekApiKeys } from '@/lib/gemini';

export async function GET() {
    try {
        // 1. Lấy danh sách định danh của các Key
        const proKeys = await getDetailedApiKeys(true);
        const freeKeys = await getDetailedApiKeys(false);
        const dsProKeys = await getDeepSeekApiKeys(true);
        const dsFreeKeys = await getDeepSeekApiKeys(false);
        const allKeys = [...proKeys, ...freeKeys, ...dsProKeys, ...dsFreeKeys];

        const now = Date.now();
        const keyNames = ['Key 1', 'Key 2', 'Key PRO', 'DS Free 1', 'DS Free 2', 'DS PRO'];
        const stats = keyNames.map(name => {
            const k = allKeys.find(ak => ak.name === name);
            if (!k) return { name, usage: 0, error: 0, status: 'missing', lastUsed: 0 };

            const s = keyStatsMap.get(k.value) || { 
                usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 
            };

            // Ưu tiên trạng thái từ DB nếu có
            let currentStatus = s.isDisabled ? 'disabled' : (now - s.lastUsedTime < 2000 ? 'cooldown' : 'healthy');
            
            // Nếu Key có trong DB và đang bị cooldown thực sự (fail_count cao hoặc cooldown_until chưa tới)
            if ((k as any).id) {
               const dbKey = k as any;
               if (dbKey.fail_count >= 5) currentStatus = 'error';
               if (dbKey.cooldown_until && new Date(dbKey.cooldown_until).getTime() > now) currentStatus = 'cooldown';
            }

            return {
                name: k.name,
                usage: s.usageCount,
                error: (k as any).fail_count || s.errorCount,
                status: currentStatus,
                lastUsed: s.lastUsedTime,
                lastError: (k as any).last_error
            };
        });

        // Thêm key .env nếu có
        const envKey = allKeys.find(ak => ak.name === 'Key .ENV');
        if (envKey) {
            const es = keyStatsMap.get(envKey.value) || { usageCount: 0, lastUsedTime: 0, errorCount: 0, isDisabled: false, lastErrorTime: 0 };
            stats.push({
                name: envKey.name,
                usage: es.usageCount,
                error: es.errorCount,
                status: es.isDisabled ? 'disabled' : (now - es.lastUsedTime < 2000 ? 'cooldown' : 'healthy'),
                lastUsed: es.lastUsedTime
            });
        }

        // 2. Thống kê thêm từ Database về hiệu quả Cache (trong 24h qua)
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { data: messages } = await supabaseAdmin
            .from('messages')
            .select('metadata')
            .gt('created_at', yesterday);
        
        const total = messages?.length || 0;
        const cacheHits = messages?.filter((m: any) => m.metadata?.source?.includes('cache') || m.metadata?.source === 'faq').length || 0;
        const aiCalls = total - cacheHits;

        return NextResponse.json({
            keys: stats,
            performance: {
                totalRequests: total,
                cacheRatio: total > 0 ? (cacheHits / total * 100).toFixed(1) : 0,
                aiRatio: total > 0 ? (aiCalls / total * 100).toFixed(1) : 0
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
