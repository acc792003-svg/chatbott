'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bot, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [shopName, setShopName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        // Đăng nhập
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
      } else {
        // Đăng ký
        const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
        if (authErr) throw authErr;
        
        if (authData.user) {
          // Lưu thông tin shop vào database
          const { data: shopData, error: shopErr } = await supabase.from('shops').insert([
            { name: shopName }
          ]).select().single();
          
          if (!shopErr && shopData) {
            await supabase.from('users').insert([
              { id: authData.user.id, email: email, shop_id: shopData.id, role: 'admin' }
            ]);
            await supabase.from('chatbot_configs').insert([
              { shop_id: shopData.id, shop_name: shopName }
            ]);
          }
        }
        alert('Đăng ký thành công! Vui lòng đăng nhập lại.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md glass p-8 rounded-[2.5rem] shadow-2xl animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg mb-4">
            <Bot size={32} />
          </div>
          <h1 className="text-2xl font-black text-slate-900">{isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}</h1>
          <p className="text-slate-500 text-sm font-medium mt-2">
            {isLogin ? 'Đăng nhập để vào bảng điều khiển Chatbot' : 'Khởi tạo trợ lý AI bán hàng cho cửa hàng của bạn'}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm font-bold rounded-xl border border-red-100 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && (
             <div>
               <label className="block text-xs font-black text-slate-500 uppercase px-1 mb-1">Tên cửa hàng/Shop</label>
               <input 
                 type="text" 
                 value={shopName}
                 onChange={e => setShopName(e.target.value)}
                 required
                 placeholder="Ví dụ: Cửa hàng Yến Sào" 
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
               />
             </div>
          )}
          <div>
             <label className="block text-xs font-black text-slate-500 uppercase px-1 mb-1">Email</label>
             <input 
               type="email" 
               value={email}
               onChange={e => setEmail(e.target.value)}
               required
               placeholder="admin@shop.com" 
               className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
             />
          </div>
          <div>
             <label className="block text-xs font-black text-slate-500 uppercase px-1 mb-1">Mật khẩu</label>
             <input 
               type="password" 
               value={password}
               onChange={e => setPassword(e.target.value)}
               required
               placeholder="••••••••" 
               className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
             />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full btn-gradient py-4 rounded-2xl flex items-center justify-center gap-2 mt-4 text-sm tracking-widest uppercase disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : (isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ')}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
          >
            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
        
        <div className="mt-6 text-center">
          <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-600 underline">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
