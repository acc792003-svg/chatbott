'use client';

import { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function ShopClientPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;
  const [shop, setShop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(true); // Open by default
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#F8FAFC]">
      <motion.div 
        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-16 h-16 bg-white rounded-2xl shadow-xl flex items-center justify-center text-blue-600 mb-4"
      >
        <Bot size={32} />
      </motion.div>
      <div className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Đang kết nối...</div>
    </div>
  );

  if (!shop) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center bg-white">
        <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-200 mb-6">
           <Bot size={48} />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">KHÔNG TÌM THẤY</h1>
        <p className="text-slate-500 mt-2 font-medium max-w-[280px]">Đường dẫn này không tồn tại hoặc đã bị thay đổi.</p>
        <button 
          onClick={() => router.push('/')} 
          className="mt-8 px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-slate-200"
        >
          Về trang chủ
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#F1F5F9]">
      
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05)_0%,transparent_50%)]"></div>

      {/* DRAGGABLE ROBOT ICON */}
      <motion.div
        drag
        dragMomentum={false}
        initial={{ x: 0, y: 0 }}
        style={{ position: 'fixed', zIndex: 9999, right: 24, bottom: 24 }}
        className="cursor-move pointer-events-auto"
      >
        <div className="relative flex flex-col items-center">
           {/* Yellow X - Close button */}
           <button 
              onClick={(e) => { 
                e.stopPropagation(); 
                setIsOpen(false);
                setTimeout(() => {
                   if (confirm("Bạn muốn đóng trang này?")) {
                      window.close();
                      window.location.href = "about:blank";
                   }
                }, 100);
              }}
              className="absolute -top-10 bg-amber-400 text-amber-900 w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 border-white font-black z-[10000] hover:scale-110 active:scale-90 transition-transform"
           >
              <X size={16} strokeWidth={3} />
           </button>

           {/* Robot Button */}
           <motion.button 
             whileHover={{ scale: 1.05 }}
             whileTap={{ scale: 0.95 }}
             onClick={() => setIsOpen(!isOpen)}
             className={cn(
               "w-16 h-16 md:w-20 md:h-20 bg-white rounded-[2rem] shadow-[0_10px_30px_rgba(0,0,0,0.1)] flex items-center justify-center overflow-hidden border-4 border-white transition-all duration-300",
               isOpen ? 'ring-4 ring-blue-500/20 scale-110' : 'hover:shadow-2xl'
             )}
           >
             <img 
               src={shop?.bot_gender === 'female' ? '/robot_female.png' : '/robot_male.png'} 
               alt="Robot"
               className="w-full h-full object-cover p-1.5"
             />
           </motion.button>

           <div className="absolute -bottom-8 bg-blue-600 text-white text-[9px] font-black px-3 py-1 rounded-full shadow-lg whitespace-nowrap uppercase tracking-widest">
              {shop.name}
           </div>
        </div>
      </motion.div>

      {/* CHAT WINDOW */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={cn(
              "fixed z-[9998] shadow-[0_30px_100px_rgba(0,0,0,0.15)] overflow-hidden bg-white border border-white/40",
              "inset-0 sm:inset-auto sm:right-6 sm:bottom-28 sm:w-[420px] sm:h-[75vh] sm:max-h-[750px] sm:rounded-[3rem]"
            )}
          >
            <iframe 
              src={`/widget/${shop.code}`} 
              className="w-full h-full border-none"
              title="Chatbot"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
