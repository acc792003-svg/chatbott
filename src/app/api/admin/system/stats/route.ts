import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { keyStatsMap, getDetailedApiKeys } from '@/lib/gemini';

export async function GET() {
    try {
        // 1. Lấy danh sách định danh của các Key
        const proKeys = await getDetailedApiKeys(true);
        const freeKeys = await getDetailedApiKeys(false);
        const allKeys = [...proKeys, ...freeKeys];

        const now = Date.now();
        const stats = allKeys.map(k => {
            const s = keyStatsMap.get(k.value) || { 
                usageCount: 0, 
                lastUsedTime: 0, 
                errorCount: 0, 
                isDisabled: false, 
                lastErrorTime: 0 
            };

            return {
                name: k.name,
                usage: s.usageCount,
                error: s.errorCount,
                status: s.isDisabled ? 'disabled' : (now - s.lastUsedTime < 2000 ? 'cooldown' : 'healthy'),
                lastUsed: s.lastUsedTime
            };
        });

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
