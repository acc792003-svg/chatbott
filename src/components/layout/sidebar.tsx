'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Settings, 
  History, 
  CreditCard,
  Bot,
  LogOut,
  ShieldAlert,
  Users,
  CalendarDays
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const menuItems = [
  { name: 'Tổng quan', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Khách hàng', href: '/dashboard/leads', icon: Users },
  { name: 'Lịch & Ưu Đãi', href: '/dashboard/booking', icon: CalendarDays },
  { name: 'Cấu hình AI', href: '/dashboard/config', icon: Settings },
  { name: 'Lịch sử Chat', href: '/dashboard/history', icon: History },
  { name: 'Chat Demo', href: '/dashboard/chat', icon: MessageSquare },
  { name: 'Gói dịch vụ', href: '/dashboard/pricing', icon: CreditCard },
];

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [authorPhone, setAuthorPhone] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data } = await supabase.from('users').select('role, shop_id').eq('id', session.user.id).single();
      if (data) {
        setRole(data.role);
        if (data.shop_id) {
          const { data: shopData } = await supabase.from('shops').select('phone_number').eq('id', data.shop_id).single();
          if (shopData && shopData.phone_number) {
            setAuthorPhone(shopData.phone_number);
          }
        }
      }
    };
    fetchRole();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <aside className={cn(
      "w-64 h-screen glass border-r border-white/20 fixed left-0 top-0 z-[60] flex flex-col p-4 transition-transform duration-300 lg:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Nút đóng cho mobile */}
      <button 
        onClick={() => setIsOpen(false)}
        className="lg:hidden absolute -right-12 top-4 w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-600 shadow-lg"
      >
        <X size={20} />
      </button>

      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg">
          <Bot size={24} />
        </div>
        <span className="font-extrabold text-xl bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-700 tracking-tight">
          AI Chat
        </span>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
              pathname === item.href 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-200" 
                : "text-slate-600 hover:bg-white/60 hover:text-blue-600"
            )}
          >
            <item.icon size={20} className={cn(
              "transition-colors",
              pathname === item.href ? "text-white" : "text-slate-400 group-hover:text-blue-600"
            )} />
            <span className="font-semibold text-sm">{item.name}</span>
          </Link>
        ))}

        {role === 'super_admin' && (
          <Link
            href="/dashboard/superadmin"
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group mt-4 border border-red-200",
              pathname === '/dashboard/superadmin' 
                ? "bg-red-600 text-white shadow-lg shadow-red-200" 
                : "bg-red-50 text-red-600 hover:bg-red-100"
            )}
          >
            <ShieldAlert size={20} className={pathname === '/dashboard/superadmin' ? "text-white" : "text-red-600"} />
            <span className="font-bold text-sm">Super Admin</span>
          </Link>
        )}
      </nav>

      <div className="mt-auto border-t border-white/20 pt-4">
        <button 
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-500 hover:bg-red-50 transition-all font-semibold text-sm mb-2"
        >
          <LogOut size={20} />
          <span>Đăng xuất</span>
        </button>
        {authorPhone && (
          <div className="text-[11px] text-center text-slate-500 font-medium">
            SĐT liên hệ tác giả: {authorPhone}
          </div>
        )}
      </div>
    </aside>
  );
}
