import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;

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
        "src": "/icon.png",
        "sizes": "512x512",
        "type": "image/png"
      },
      {
        "src": "/icon.png",
        "sizes": "192x192",
        "type": "image/png"
      }
    ]
  };

  return NextResponse.json(manifest);
}
