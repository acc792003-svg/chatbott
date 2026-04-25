import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { keyStr, status, latency } = await req.json();

    if (!keyStr) {
      return NextResponse.json({ success: false, error: 'Missing key string' });
    }

    // Only update if it exists in DB. .env keys won't be updated (unless they have an entry)
    // Actually, we can upsert if we want, but it's safer to just update.
    const { error } = await supabaseAdmin
      .from('system_settings')
      .update({
        status,
        avg_latency: latency || 0,
        last_used_at: new Date().toISOString()
      })
      .eq('key', keyStr);

    if (error) {
      // If error, maybe the key isn't in DB yet (for .env keys)
      // This is fine, we just ignore it.
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message });
  }
}
