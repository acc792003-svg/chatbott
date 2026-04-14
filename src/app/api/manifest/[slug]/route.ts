import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

  // Lấy giới tính robot từ database
  const { data: shop } = await supabase
    .from('shops')
    .select('bot_gender')
    .eq('slug', slug)
    .single();

  const iconSrc = shop?.bot_gender === 'female' ? '/robot_female.png' : '/robot_male.png';

  const manifest = {
    name: `Chatbot ${slug}`,
    short_name: slug,
    description: `AI Chatbot cho ${slug}`,
    start_url: `/s/${slug}`,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6366f1",
    icons: [
      {
        "src": iconSrc,
        "sizes": "512x512",
        "type": "image/png"
      },
      {
        "src": iconSrc,
        "sizes": "192x192",
        "type": "image/png"
      }
    ]
  };

  return NextResponse.json(manifest);
}
