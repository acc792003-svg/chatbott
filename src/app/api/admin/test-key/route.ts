import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { keyStr } = await req.json(); // e.g., 'gemini_api_key_1'

    let apiKey = '';
    let isGemini = keyStr.includes('gemini') || keyStr.includes('Ge');

    // Fetch from DB first
    const { data: dbKey } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', keyStr)
        .single();

    if (dbKey?.value && dbKey.value.trim() !== '' && dbKey.value !== 'DeepSeek free') {
        apiKey = dbKey.value;
    } else {
        // Fallback to .env
        if (keyStr === 'gemini_api_key_1') apiKey = process.env.GEMINI_API_KEY_1 || '';
        else if (keyStr === 'gemini_api_key_2') apiKey = process.env.GEMINI_API_KEY_2 || '';
        else if (keyStr === 'gemini_api_key_pro') apiKey = process.env.GEMINI_API_KEY_PRO || '';
        else if (keyStr === 'deepseek_env_key') apiKey = process.env.DEEPSEEK_ENV_KEY || process.env.DEEPSEEK_API_KEY || '';
        else if (keyStr === 'gemini_embedding_key_1') apiKey = process.env.GEMINI_EMBEDDING_KEY_1 || '';
        else if (keyStr === 'gemini_embedding_key_2') apiKey = process.env.GEMINI_EMBEDDING_KEY_2 || '';
        else if (keyStr === 'deepseek_api_key_free1') apiKey = process.env.DEEPSEEK_API_KEY_FREE1 || '';
        else if (keyStr === 'deepseek_api_key_free2') apiKey = process.env.DEEPSEEK_API_KEY_FREE2 || '';
        else if (keyStr === 'deepseek_api_key_pro') apiKey = process.env.DEEPSEEK_API_KEY_PRO || '';
    }

    if (!apiKey) {
        await supabaseAdmin.from('error_logs').insert({
            shop_id: 'system',
            error_type: `KEY_MISSING: ${keyStr}`,
            error_message: 'Không tìm thấy API Key trong Database hoặc .env',
            severity: 'warning'
        });
        return NextResponse.json({ status: 'error', latency: null, error: 'Key missing' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout

    const start = performance.now();
    let isSuccess = false;
    let errorDetail = '';

    try {
        if (isGemini) {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: "Say ok" }] }],
                    generationConfig: { maxOutputTokens: 5 }
                }),
                signal: controller.signal
            });
            isSuccess = res.ok;
            if (!isSuccess) errorDetail = await res.text();
        } else {
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [{ role: 'user', content: 'Say ok' }],
                    max_tokens: 5
                }),
                signal: controller.signal
            });
            isSuccess = res.ok;
            if (!isSuccess) errorDetail = await res.text();
        }
    } catch (err: any) {
        isSuccess = false;
        errorDetail = err.message || 'Fetch failed or Timeout';
    }

    clearTimeout(timeout);
    const latency = Math.round(performance.now() - start);

    if (!isSuccess) {
        await supabaseAdmin.from('error_logs').insert({
            shop_id: 'system',
            error_type: `API_TEST_FAILED: ${keyStr}`,
            error_message: `Test Key thất bại: ${errorDetail.substring(0, 250)}...`,
            severity: 'critical'
        });
        return NextResponse.json({ status: 'error', latency, error: errorDetail });
    }

    const status = latency < 2000 ? 'active' : latency < 5000 ? 'slow' : 'error';

    return NextResponse.json({ status, latency });

  } catch (e: any) {
    return NextResponse.json({ status: 'error', latency: null });
  }
}
