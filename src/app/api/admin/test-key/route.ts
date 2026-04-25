import { NextResponse } from 'next/server';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { decrypt } from '@/lib/encryption';

export async function POST(req: Request) {
  try {
    // 1. KIỂM TRA ĐĂNG NHẬP (Lấy user từ JWT)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.split(' ')[1];
    
    let user;
    if (token) {
        const { data } = await supabase.auth.getUser(token);
        user = data.user;
    } else {
        const { data } = await supabase.auth.getUser();
        user = data.user;
    }

    if (!user) {
      return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
    }

    // 2. KIỂM TRA QUYỀN SUPER ADMIN
    const { data: userData, error: roleError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !userData || userData.role !== 'super_admin') {
      return NextResponse.json({ status: 'error', error: 'Forbidden' }, { status: 403 });
    }

    const { keyStr } = await req.json(); // e.g., 'gemini_api_key_1'

    let apiKey = '';
    let isGemini = keyStr.includes('gemini') || keyStr.includes('Ge');
    let isOpenRouter = keyStr.includes('openrouter') || keyStr.includes('OR');

    // Fetch from DB first
    const { data: dbKey } = await supabaseAdmin
        .from('system_settings')
        .select('value')
        .eq('key', keyStr)
        .single();

    if (dbKey?.value && dbKey.value.trim() !== '' && dbKey.value !== 'DeepSeek free') {
        apiKey = decrypt(dbKey.value);
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
        else if (keyStr === 'openrouter_api_key_1') apiKey = process.env.OPENROUTER_API_KEY_1 || '';
        else if (keyStr === 'openrouter_api_key_2') apiKey = process.env.OPENROUTER_API_KEY_2 || '';
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
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${apiKey}`, {
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
        } else if (isOpenRouter) {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://q-chatbot.vercel.app',
                    'X-Title': 'Q-Chatbot Test'
                },
                body: JSON.stringify({
                    model: 'deepseek/deepseek-chat',
                    messages: [{ role: 'user', content: 'Say ok' }],
                    max_tokens: 5
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
