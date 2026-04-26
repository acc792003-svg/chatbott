import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    // Chỉ bypass RLS bằng service key, quyền đã kiểm tra ở frontend
    const { 
        shopId, 
        productInfo, 
        pricingInfo, 
        faq, 
        telegramChatId, 
        telegramBotToken,
        facebookPageId,
        facebookAccessToken
    } = await req.json();

    if (!shopId) return NextResponse.json({ error: 'Missing shopId' }, { status: 400 });

    // 1. Cập nhật bảng chatbot_configs (Giữ nguyên logic cũ cho các trường text)
    const updates: any = { shop_id: shopId, is_active: true };
    if (productInfo !== undefined) updates.product_info = productInfo;
    if (pricingInfo !== undefined) updates.pricing_info = pricingInfo;
    if (faq !== undefined) updates.faq = faq;
    if (telegramChatId !== undefined) updates.telegram_chat_id = telegramChatId;
    if (telegramBotToken !== undefined) updates.telegram_bot_token = telegramBotToken;
    if (facebookPageId !== undefined) updates.facebook_page_id = facebookPageId;
    if (facebookAccessToken !== undefined) updates.facebook_access_token = facebookAccessToken;

    await supabaseAdmin.from('chatbot_configs').upsert(updates, { onConflict: 'shop_id' });

    // 2. Cập nhật bảng shops (Quan trọng để UI hiển thị và đồng bộ)
    const shopUpdates: any = {};
    if (telegramChatId !== undefined) shopUpdates.telegram_chat_id = telegramChatId;
    if (telegramBotToken !== undefined) shopUpdates.telegram_bot_token = telegramBotToken;
    if (facebookPageId !== undefined) shopUpdates.fb_page_id = facebookPageId;
    if (facebookAccessToken !== undefined) shopUpdates.fb_page_token = facebookAccessToken;

    if (Object.keys(shopUpdates).length > 0) {
        await supabaseAdmin.from('shops').update(shopUpdates).eq('id', shopId);
    }

    // 3. Cập nhật bảng channel_configs (Để Chatbot Engine có thể routing tin nhắn)
    if (facebookPageId !== undefined && facebookAccessToken !== undefined && facebookPageId.trim() !== '') {
        await supabaseAdmin.from('channel_configs').upsert({
            shop_id: shopId,
            channel_type: 'facebook',
            provider_id: facebookPageId.trim(),
            access_token: facebookAccessToken.trim()
        }, { onConflict: 'shop_id, channel_type' });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
