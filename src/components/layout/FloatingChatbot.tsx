'use client';

import { useState, useEffect } from 'react';
import { Bot, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function FloatingChatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const shopCode = 'CB-C8LUZ8';

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đừng hiển thị chatbot nếu đang ở trong trang widget, dashboard, login hoặc link trực tiếp của shop (/s/)
  const isHiddenPath = pathname.startsWith('/widget') || 
                       pathname.startsWith('/dashboard') || 
                       pathname.startsWith('/login') ||
                       pathname.startsWith('/s/');
                       
  if (!mounted || isHiddenPath) return null;

  return (
    <motion.div 
      drag
      dragConstraints={{ left: -window?.innerWidth + 100, right: 0, top: -window?.innerHeight + 200, bottom: 0 }}
      dragElastic={0.1}
      dragMomentum={false}
      className="fixed bottom-6 right-6 z-[150] flex flex-col items-end gap-4 cursor-move"
      style={{ touchAction: 'none' }} // Ngăn cuộn trang khi kéo trên mobile
    >
      {/* Chat Window */}
      {isOpen && (
        <div 
          className="w-[380px] h-[600px] max-h-[80vh] bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 animate-in slide-in-from-bottom-10 fade-in duration-300 flex flex-col cursor-default"
          onPointerDown={(e) => e.stopPropagation()} // Ngăn kéo khi đang click trong cửa sổ chat
        >
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 text-white flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-md">
                <Bot size={22} />
              </div>
              <div>
                <p className="font-black text-sm leading-tight">Hỗ Trợ Trực Tuyến</p>
                <p className="text-[10px] text-blue-100 opacity-80 uppercase tracking-widest font-bold">● Đang hoạt động</p>
              </div>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 bg-slate-50 relative">
            <iframe 
              src={`/widget/${shopCode}`}
              className="w-full h-full border-none"
              title="Chatbot Support"
            />
          </div>
        </div>
      )}

      {/* Toggle Button (Robot Icon) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onPointerDown={(e) => e.stopPropagation()} // Đảm bảo bấm vào là mở, không bị hiểu nhầm là bắt đầu kéo ngay lập tức nếu bấm nhanh
        className={cn(
          "w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 active:scale-95 group relative border-4 border-white",
          isOpen 
            ? "bg-white text-slate-800" 
            : "bg-gradient-to-tr from-blue-600 to-indigo-600 text-white hover:scale-110"
        )}
      >
        {isOpen ? (
          <X size={28} />
        ) : (
          <>
            <Bot size={32} />
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 border-4 border-white rounded-full"></div>
            {/* Tooltip nhỏ */}
            <div className="absolute right-20 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Kéo tôi đi bất cứ đâu! 🤖
            </div>
          </>
        )}
      </button>
    </motion.div>
  );
}
