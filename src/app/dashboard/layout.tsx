'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '@/components/layout/sidebar';
import { User, Bell, Search, Loader2, Menu } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('Admin Shop');
  const [shopCode, setShopCode] = useState('');
  const [shopPlan, setShopPlan] = useState<'free' | 'pro'>('free');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        const { data: userRecord } = await supabase
          .from('users')
          .select('full_name, email, shop_id, shops(code, plan)')
          .eq('id', session.user.id)
          .single();
        if (userRecord) {
          setUserName(userRecord.full_name || userRecord.email?.split('@')[0] || 'Admin Shop');
          if (userRecord.shops) {
            setShopCode((userRecord.shops as any).code || '');
            setShopPlan((userRecord.shops as any).plan || 'free');
          }
        }
        setLoading(false);
      }
    };
    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
         <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="flex bg-slate-50 min-h-screen relative overflow-x-hidden">
      {/* Overlay cho mobile */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[55] lg:hidden"
          />
        )}
      </AnimatePresence>

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      
      <main className="flex-1 lg:ml-64 p-4 md:p-8 w-full max-w-full overflow-hidden transition-all duration-300">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-10">
          <div className="flex items-center gap-3 w-full md:w-auto">
             {/* Nút Hamburger cho mobile */}
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="lg:hidden p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 shadow-sm"
             >
               <Menu size={20} />
             </button>

             <div className="relative flex-1 md:w-96 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                <input 
                  type="text" 
                  placeholder="Tìm kiếm..." 
                  className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
             </div>
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all cursor-pointer">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500 overflow-hidden">
                <User size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                   <p className="text-[11px] font-black text-slate-900 leading-none">{userName}</p>
                   {shopCode && <span className="text-[9px] bg-slate-100 px-1 py-0.5 rounded font-bold text-slate-500">#{shopCode}</span>}
                </div>
                <div className="flex items-center gap-1">
                   <div className={`w-1.5 h-1.5 rounded-full ${shopPlan === 'pro' ? 'bg-amber-400' : 'bg-slate-300'}`}></div>
                   <p className={`text-[9px] font-black uppercase tracking-wider ${shopPlan === 'pro' ? 'text-amber-600' : 'text-slate-400'}`}>
                      Plan: {shopPlan}
                   </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
