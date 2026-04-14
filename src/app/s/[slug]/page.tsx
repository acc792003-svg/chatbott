'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, useDragControls } from 'framer-motion';
import { Bot, X, Maximize2, Minimize2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ShopSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetchShop();
  }, [slug]);

  const fetchShop = async () => {
    const { data, error } = await supabase
      .from('shops')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      setLoading(false);
      return;
    }

    setShop(data);
    setLoading(false);
  };

  if (loading) return <div className="flex items-center justify-center h-screen font-bold">Đang tải...</div>;

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <Bot size={64} className="text-slate-300 mb-4" />
        <h1 className="text-2xl font-black text-slate-800">Không tìm thấy cửa hàng</h1>
        <p className="text-slate-500 mt-2">Đường dẫn này không tồn tại hoặc đã bị thay đổi.</p>
        <button onClick={() => router.push('/')} className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold">Về trang chủ</button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#fafafa]">
      {/* Background - Very subtle text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
         <p className="text-slate-300 font-bold text-sm tracking-widest uppercase opacity-40">
           Chatbot xin nghe bạn trò chuyện
         </p>
      </div>

      {/* DRAGGABLE ROBOT ICON */}
      <motion.div
        drag
        dragMomentum={false}
        initial={{ x: 20, y: 20 }}
        style={{ position: 'fixed', zIndex: 9999, right: 30, bottom: 40 }}
        className="cursor-move"
      >
        <div className="relative flex flex-col items-center">
           {/* Yellow X - Close button (Top) */}
           {isOpen && (
             <button 
                onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                className="absolute -top-12 bg-amber-400 text-amber-900 w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white font-black z-[10000] hover:scale-110 active:scale-90 transition-transform"
             >
                <X size={14} strokeWidth={4} />
             </button>
           )}

           {/* Small Badge text */}
           <div className="absolute -top-5 bg-indigo-600/90 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md whitespace-nowrap backdrop-blur-sm z-[9999]">
              {shop.slug}
           </div>

           {/* Robot Button */}
           <button 
             onClick={() => setIsOpen(!isOpen)}
             className={`w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[1.2rem] shadow-2xl flex items-center justify-center text-white border-2 border-white/20 active:scale-95 transition-all duration-300 ${isOpen ? 'ring-4 ring-amber-400/50' : ''}`}
           >
             <Bot size={28} />
           </button>
        </div>
      </motion.div>

      {/* CHAT WINDOW */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="fixed inset-0 sm:inset-auto sm:right-6 sm:bottom-24 sm:w-[380px] sm:h-[600px] z-[9998] shadow-2xl overflow-hidden sm:rounded-[2.5rem] border border-white/40 bg-white"
        >
          <iframe 
            src={`/widget/${shop.code}`} 
            className="w-full h-full border-none"
            title="Chatbot"
          />
        </motion.div>
      )}

      {/* Footer Hint */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-[9px] text-slate-300 font-bold tracking-tighter pointer-events-none opacity-50">
        THEO DẠI DEEPLINK • {shop.slug?.toUpperCase()}
      </div>
    </div>
  );
}
