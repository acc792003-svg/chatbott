import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const keyId = searchParams.get('id');

        if (!keyId) return NextResponse.json({ error: 'Missing Key ID' }, { status: 400 });

        const { data: logs, error } = await supabaseAdmin
            .from('api_key_logs')
            .select('*')
            .eq('key_id', keyId)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) throw error;

        return NextResponse.json({ success: true, logs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
