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
    <div className="relative w-screen h-screen overflow-hidden bg-slate-50">
      {/* Background decoration or instruction */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20">
         <Bot size={120} className="text-slate-400" />
         <h2 className="text-3xl font-black text-slate-400 mt-4 uppercase tracking-[0.2em]">{shop.name}</h2>
         <p className="text-slate-400 font-medium">Bấm vào robot để bắt đầu trò chuyện</p>
      </div>

      {/* DRAGGABLE ROBOT ICON */}
      <motion.div
        drag
        dragMomentum={false}
        initial={{ x: 20, y: 20 }}
        style={{ position: 'fixed', zIndex: 9999, right: 20, bottom: 20 }}
        className="cursor-move group"
      >
        <div className="relative flex flex-col items-center">
           {/* Small Badge text requested by user */}
           <div className="absolute -top-6 bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg opacity-90 group-hover:scale-110 transition-transform whitespace-nowrap">
              {shop.slug}
           </div>

           <button 
             onClick={() => setIsOpen(!isOpen)}
             className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl flex items-center justify-center text-white border-2 border-white/20 active:scale-95 transition-transform"
           >
             {isOpen ? <X size={32} /> : <Bot size={32} />}
           </button>
        </div>
      </motion.div>

      {/* CHAT WINDOW */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="fixed inset-0 sm:inset-auto sm:right-6 sm:bottom-24 sm:w-[400px] sm:h-[600px] z-[9998] shadow-2xl overflow-hidden sm:rounded-[2rem] border border-white/40 bg-white"
        >
          <iframe 
            src={`/widget/${shop.code}`} 
            className="w-full h-full border-none"
            title="Chatbot"
          />
        </motion.div>
      )}

      {/* Optional: Add a "How to install" hint for mobile users */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-[10px] text-slate-400 font-medium pointer-events-none">
        Mẹo: Chọn "Thêm vào màn hình chính" để truy cập nhanh hơn
      </div>
    </div>
  );
}
