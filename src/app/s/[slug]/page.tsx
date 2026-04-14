import ShopClientPage from './ShopClientPage';
import { Metadata } from 'next';

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const slug = resolvedParams.slug;
  
  return {
    title: `Chatbot ${slug}`,
    description: `Tư vấn AI cho ${slug}`,
    manifest: `/api/manifest/${slug}`,
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: `Chatbot ${slug}`,
    },
  };
}

export default function Page({ params }: Props) {
  return <ShopClientPage params={params} />;
}
