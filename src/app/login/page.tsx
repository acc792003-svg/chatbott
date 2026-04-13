'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Bot, ArrowRight, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function LoginFormContent() {
  const [mounted, setMounted] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  // Đảm bảo không có hydration mismatch
  useEffect(() => {
    setMounted(true);
    const mode = searchParams.get('mode');
    if (mode === 'register') {
      setIsLogin(false);
    }
  }, [searchParams]);

  if (!mounted) return null;

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
        if (loginError) throw loginError;
        router.push('/dashboard');
      } else {
        if (password !== confirmPassword) {
          setError('Mật khẩu nhập lại không khớp!');
          setLoading(false);
          return;
        }

        const { data: authData, error: authErr } = await supabase.auth.signUp({ email, password });
        if (authErr) throw authErr;
        
        if (authData.user && shopCode) {
          const { data: existingShop } = await supabase.from('shops').select('id').eq('code', shopCode).single();
          if (existingShop) {
            const { error: insertError } = await supabase.from('users').insert([
              { id: authData.user.id, email: email, shop_id: existingShop.id, role: 'admin' }
            ]);
            if (insertError) throw new Error("Lưu thông tin thất bại: " + insertError.message);
          } else {
            throw new Error("Mã cửa hàng không hợp lệ!");
          }
        }
        alert('Đăng ký thành công! Vui lòng đăng nhập.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="w-full max-w-md bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-200"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      <div className="flex flex-col items-center mb-6 text-center">
        <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white mb-4">
          <Bot size={28} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          {isLogin ? 'Đăng Nhập' : 'Tạo Tài Khoản'}
        </h1>
        <p className="text-slate-500 text-sm mt-2">
          {isLogin ? 'Vào bảng điều khiển của bạn' : 'Đăng ký cửa hàng mới'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleAuth} className="space-y-4">
        {!isLogin && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã cửa hàng</label>
            <input 
              type="text" 
              value={shopCode}
              onChange={e => setShopCode(e.target.value)}
              required
              placeholder="Nhập mã" 
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
          <input 
            type="email" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="email@example.com" 
            className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mật khẩu</label>
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••" 
              className="w-full border border-slate-200 rounded-xl p-3 pr-10 text-sm focus:border-blue-500 outline-none"
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        
        {!isLogin && (
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nhập lại Mật khẩu</label>
            <input 
              type={showPassword ? "text" : "password"} 
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••" 
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:border-blue-500 outline-none"
            />
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-4 hover:bg-blue-700 transition-colors disabled:opacity-50 shadow-lg shadow-blue-100"
        >
          {loading ? 'Đang xử lý...' : (isLogin ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ')}
          {!loading && <ArrowRight size={18} />}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button 
          onClick={() => { setIsLogin(!isLogin); setError(null); }}
          className="text-sm font-bold text-blue-600 hover:underline"
        >
          {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
        </button>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-xs text-slate-400 hover:text-slate-600 underline">
          Quay lại trang chủ
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Suspense fallback={<div className="font-bold text-slate-400">Đang tải...</div>}>
        <LoginFormContent />
      </Suspense>
    </div>
  );
}
