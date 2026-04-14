'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/sidebar';
import { User, Bell, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('Admin Shop');

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
      } else {
        const { data: userRecord } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', session.user.id)
          .single();
        if (userRecord) {
          setUserName(userRecord.full_name || userRecord.email || 'Admin Shop');
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
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-10">
          <div className="relative w-96 group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm thông tin..." 
              className="w-full bg-white/50 backdrop-blur-md border border-slate-200 rounded-2xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
            <button className="p-2.5 rounded-2xl bg-white border border-slate-200 text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm">
              <Bell size={20} />
            </button>
            <div className="flex items-center gap-3 bg-white p-1.5 pr-4 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-200 transition-all cursor-pointer">
              <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                <User size={20} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 leading-none">Chào {userName}!</p>
                <p className="text-[10px] text-slate-500 mt-1">Gói hoạt động</p>
              </div>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
