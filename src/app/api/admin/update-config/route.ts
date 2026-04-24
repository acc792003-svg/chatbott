import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    // Chỉ bypass RLS bằng service key, quyền đã kiểm tra ở frontend
    const { shopId, productInfo, pricingInfo, faq, telegramChatId, telegramBotToken } = await req.json();

    if (!shopId) return NextResponse.json({ error: 'Missing shopId' }, { status: 400 });

    const updates: any = { shop_id: shopId, is_active: true };
    if (productInfo !== undefined) updates.product_info = productInfo;
    if (pricingInfo !== undefined) updates.pricing_info = pricingInfo;
    if (faq !== undefined) updates.faq = faq;
    if (telegramChatId !== undefined) updates.telegram_chat_id = telegramChatId;
    if (telegramBotToken !== undefined) updates.telegram_bot_token = telegramBotToken;

    const { error } = await supabaseAdmin.from('chatbot_configs').upsert(updates, { onConflict: 'shop_id' });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
