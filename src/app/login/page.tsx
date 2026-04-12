'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bot, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!isLogin && password !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp!');
      setLoading(false);
      return;
    }

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
          // Verify code and logic
          if (shopCode) {
             const { data: existingShop } = await supabase.from('shops').select('id').eq('code', shopCode).single();
             if (existingShop) {
                await supabase.from('users').insert([
                  { id: authData.user.id, email: email, shop_id: existingShop.id, role: 'admin' }
                ]);
             } else {
                 throw new Error("Mã cửa hàng không hợp lệ!");
             }
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
               <label className="block text-xs font-black text-slate-500 uppercase px-1 mb-1">Mã cửa hàng (Do Super Admin cấp)</label>
               <input 
                 type="text" 
                 value={shopCode}
                 onChange={e => setShopCode(e.target.value)}
                 required
                 placeholder="Ví dụ: 89ABC" 
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
             <div className="relative">
               <input 
                 type={showPassword ? "text" : "password"} 
                 value={password}
                 onChange={e => setPassword(e.target.value)}
                 required
                 placeholder="••••••••" 
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 pr-10 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
               />
               <button 
                 type="button" 
                 onClick={() => setShowPassword(!showPassword)}
                 className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors"
               >
                 {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
               </button>
             </div>
          </div>
          
          {!isLogin && (
            <div>
               <label className="block text-xs font-black text-slate-500 uppercase px-1 mb-1">Nhập lại Mật khẩu</label>
               <input 
                 type={showPassword ? "text" : "password"} 
                 value={confirmPassword}
                 onChange={e => setConfirmPassword(e.target.value)}
                 required
                 placeholder="••••••••" 
                 className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none"
               />
            </div>
          )}

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
