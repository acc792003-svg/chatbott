'use client';

import { useState, useEffect } from 'react';
import { Bot, X, MessageSquare, Hand } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

export default function FloatingChatbot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const shopCode = 'CB-C8LUZ8';

  useEffect(() => {
    setMounted(true);
  }, []);

  const isIframe = typeof window !== 'undefined' && (window.self !== window.top);
  
  const isHiddenPath = !pathname || 
                       pathname.startsWith('/widget') || 
                       pathname.startsWith('/dashboard') || 
                       pathname.startsWith('/login') ||
                       pathname.startsWith('/s/') ||
                       pathname.includes('widget');
                       
  if (!mounted || isHiddenPath || isIframe) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-[9999] flex flex-col items-end gap-4 pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8, y: 100, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, scale: 0.8, y: 100, filter: 'blur(10px)' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "pointer-events-auto",
              "w-[calc(100vw-32px)] sm:w-[400px] h-[75vh] sm:h-[650px] max-h-[800px]",
              "bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.2)] overflow-hidden border border-slate-100 flex flex-col relative"
            )}
          >
             {/* Header Overlay (optional close) */}
             <div className="absolute top-4 right-4 z-20">
                <button 
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X size={18} />
                </button>
             </div>

             <div className="flex-1 bg-slate-50">
               <iframe 
                 src={`/widget/${shopCode}`}
                 className="w-full h-full border-none"
                 title="Chatbot Support"
               />
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.div
        layout
        className="pointer-events-auto relative group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence>
          {isHovered && !isOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="absolute right-20 top-1/2 -translate-y-1/2 bg-slate-900 text-white text-[11px] font-black px-4 py-2 rounded-2xl whitespace-nowrap shadow-xl"
            >
              Chat với trợ lý AI ngay! ✨
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-16 h-16 md:w-20 md:h-20 rounded-[2rem] shadow-2xl flex items-center justify-center transition-all duration-500 group relative border-4 border-white overflow-hidden",
            isOpen 
              ? "bg-white text-slate-800 rotate-90" 
              : "bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 text-white hover:scale-110 active:scale-95"
          )}
        >
          {isOpen ? (
            <X size={32} strokeWidth={3} />
          ) : (
            <div className="relative">
              <Bot size={36} strokeWidth={2.5} className="group-hover:animate-bounce" />
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }} 
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"
              ></motion.div>
            </div>
          )}
          
          {/* Animated background shine */}
          {!isOpen && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
          )}
        </button>
      </motion.div>
    </div>
  );
}
