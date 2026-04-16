'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// Ép trang luôn là động để tránh lỗi Build trên Vercel
export const dynamic = 'force-dynamic';

function LoginForm() {
  const [mounted, setMounted] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [shopCode, setShopCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null); // Hiện thông báo đăng ký thành công
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
    const mode = searchParams.get('mode');
    if (mode === 'register') {
      setIsLogin(false);
    }
  }, [searchParams]);

  if (!mounted) return null;

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isLogin) {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        router.push('/dashboard');
        // CALL API ĐĂNG KÝ BẢO MẬT (Chống Spam IP & Tự động gán shop)
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, shopCode })
        });
        
        const result = await res.json();
        
        if (!res.ok) {
          throw new Error(result.error || 'Đăng ký thất bại');
        }
        
        if (result.generatedCode) {
          // Đăng ký dùng thử → hiện thông báo đẹp
          setSuccessCode(result.generatedCode);
        } else {
          alert('Đăng ký thành công! Bạn có thể đăng nhập ngay.');
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Nếu đăng ký thành công → hiện trang thông báo mã cửa hàng
  if (successCode) {
    return (
      <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl border border-slate-200 text-center" style={{ fontFamily: 'Arial, sans-serif' }}>
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-2xl font-black text-slate-900 mb-3">Đăng Ký Thành Công!</h1>
        <p className="text-sm text-slate-500 font-medium mb-6">Hệ thống đã tạo cho bạn mã cửa hàng dùng thử <strong className="text-blue-600">1 ngày</strong>.</p>
        
        <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6 mb-6">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mã cửa hàng của bạn</p>
          <p className="text-4xl font-black text-blue-600 tracking-[0.3em]">{successCode}</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-left">
          <p className="text-xs font-bold text-amber-700">⚠️ Quan trọng:</p>
          <p className="text-xs text-amber-600 mt-1 font-medium">Bạn cần ghi nhớ mã <strong>{successCode}</strong> này để đăng nhập lần sau. Thời hạn dùng thử: <strong>1 ngày</strong>.</p>
        </div>

        <button 
          onClick={() => { setSuccessCode(null); setIsLogin(true); }}
          className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest"
        >
          ĐÃ GHI NHỚ → ĐĂNG NHẬP
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white p-10 rounded-3xl shadow-2xl border border-slate-200" style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 className="text-3xl font-black mb-6 text-center text-slate-900 uppercase tracking-tighter">
        {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
      </h1>

      {error && <div className="mb-4 p-3 bg-red-100 text-red-700 text-xs font-bold rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <input 
            type="text" placeholder="Mã cửa hàng (để trống nếu đăng ký dùng thử)" value={shopCode} onChange={e => setShopCode(e.target.value)}
            className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none font-bold"
          />
        )}
        <input 
          type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
          className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none font-bold"
        />
        <input 
          type="password" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required
          className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none font-bold"
        />
        {!isLogin && (
          <input 
            type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
            className="w-full border-2 border-slate-100 p-4 rounded-2xl focus:border-blue-500 outline-none font-bold"
          />
        )}
        <button 
          disabled={loading}
          className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-widest"
        >
          {loading ? 'Đang tải...' : (isLogin ? 'Vào hệ thống' : 'Tạo tài khoản / Dùng thử')}
        </button>
      </form>

      <div className="mt-8 text-center space-y-4">
        <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-bold text-blue-600 hover:underline">
          {isLogin ? 'Chưa có tài khoản? Đăng ký / Dùng thử miễn phí' : 'Đã có tài khoản? Đăng nhập'}
        </button>
        <div className="block pt-4 border-t border-slate-100">
          <Link href="/" className="text-xs font-bold text-slate-400 hover:text-slate-600">
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <Suspense fallback={<div className="font-bold text-slate-400">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
