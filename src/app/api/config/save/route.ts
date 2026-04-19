import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { 
        shopId, shopName, productInfo, pricingInfo, customerInsights, 
        brandVoice, faq, telegramChatId, telegramBotToken, 
        fbPageId, fbAccessToken 
    } = await req.json();

    if (!shopId) return NextResponse.json({ error: 'Missing shopId' }, { status: 400 });

    // 1. Luôn Update/Insert chatbot_configs
    const { error: configsErr } = await supabaseAdmin.from('chatbot_configs').upsert({
        shop_id: shopId,
        shop_name: shopName,
        product_info: productInfo,
        pricing_info: pricingInfo,
        customer_insights: customerInsights,
        brand_voice: brandVoice,
        faq: faq,
        is_active: true,
        telegram_chat_id: telegramChatId,
        telegram_bot_token: telegramBotToken
    }, { onConflict: 'shop_id' });

    if (configsErr) throw new Error('Lỗi cấu hình cơ bản: ' + configsErr.message);

    // 2. Update/Insert channel_configs (Facebook)
    if (fbPageId || fbAccessToken) {
        const { error: fbErr } = await supabaseAdmin.from('channel_configs').upsert({
            shop_id: shopId,
            channel_type: 'facebook',
            provider_id: fbPageId,
            access_token: fbAccessToken
        }, { onConflict: 'channel_type, provider_id' });

        if (fbErr) throw new Error('Lỗi cấu hình Facebook: ' + fbErr.message);
        
        // Update both fb_page_id/token onto shops for fast fallback
        await supabaseAdmin.from('shops').update({ fb_page_id: fbPageId, fb_page_token: fbAccessToken }).eq('id', shopId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
