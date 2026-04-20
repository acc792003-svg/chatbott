'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { 
  Bot, 
  Store, 
  Mail, 
  Lock, 
  ArrowRight, 
  CheckCircle2, 
  Zap,
  ShieldCheck,
  ChevronLeft,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [successCode, setSuccessCode] = useState<string | null>(null);
  
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
        const { data: { user }, error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
        if (!user) throw new Error('Không thể xác thực người dùng');

        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('shop_id')
          .eq('id', user.id)
          .single();

        if (userFetchError || !userData?.shop_id) {
          await supabase.auth.signOut();
          throw new Error('Tài khoản này chưa được gán cho cửa hàng nào.');
        }

        const { data: shopData, error: shopFetchError } = await supabase
          .from('shops')
          .select('code')
          .eq('id', userData.shop_id)
          .single();

        if (shopFetchError || shopData?.code !== shopCode) {
          await supabase.auth.signOut();
          throw new Error('Mã cửa hàng không chính xác.');
        }

        router.push('/dashboard');
      } else {
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu nhập lại không khớp');
        }
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
          setSuccessCode(result.generatedCode);
        } else {
          setIsLogin(true);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (successCode) {
    return (
      <div className="w-full max-w-md animate-in zoom-in-95 duration-500">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl shadow-blue-100 border border-blue-50 text-center">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-50">
              <CheckCircle2 size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">XIN CHÚC MỪNG!</h1>
            <p className="text-sm text-slate-500 font-medium mb-8">Bạn vừa tạo thành công tài khoản Shop AI.</p>
            
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 mb-8 shadow-xl shadow-blue-200 relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <p className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mb-3">Mã cửa hàng của bạn</p>
              <p className="text-5xl font-black text-white tracking-[0.2em] drop-shadow-lg">{successCode}</p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8 text-left flex items-start gap-3">
               <ShieldCheck className="text-amber-600 shrink-0 mt-0.5" size={18} />
               <div>
                  <p className="text-[11px] font-black text-amber-800 uppercase tracking-wider mb-1">Quan trọng:</p>
                  <p className="text-[11px] text-amber-700 font-bold leading-relaxed">Ghi nhớ mã <strong>{successCode}</strong> để đăng nhập. Bạn có 24h dùng thử miễn phí tất cả tính năng Pro.</p>
               </div>
            </div>

            <button 
              onClick={() => { setSuccessCode(null); setIsLogin(true); }}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl hover:bg-blue-600 transition-all uppercase tracking-widest text-xs active:scale-95"
            >
              Ghi nhớ & Đăng nhập ngay
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="bg-white p-10 md:p-12 rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100">
        <div className="text-center mb-10">
           <div className="inline-flex items-center gap-2 mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100"><Bot size={28}/></div>
              <span className="font-black text-2xl text-slate-900 tracking-tighter">ChatBot <span className="text-blue-600">Pro</span></span>
           </div>
           <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter mb-2">
             {isLogin ? 'Chào mừng trở lại' : 'Bắt đầu dùng thử'}
           </h1>
           <p className="text-slate-400 text-sm font-bold">{isLogin ? 'Đăng nhập vào hệ thống quản lý AI' : 'Chỉ 30 giây để tạo trợ lý ảo của riêng bạn'}</p>
        </div>

        {error && <div className="mb-6 p-4 bg-red-50 text-red-600 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-2 animate-shake">
           <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse"></div>
           {error}
        </div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5 px-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mã cửa hàng</label>
             <div className="relative group">
                <Store className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Ví dụ: SHOP123" 
                  value={shopCode} 
                  onChange={e => setShopCode(e.target.value)} 
                  required
                  className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-2xl focus:border-blue-500/50 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                />
             </div>
          </div>

          <div className="space-y-1.5 px-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email đăng ký</label>
             <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required
                  className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-2xl focus:border-blue-500/50 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                />
             </div>
          </div>

          <div className="space-y-1.5 px-1">
             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mật khẩu</label>
             <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                  className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-2xl focus:border-blue-500/50 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                />
             </div>
          </div>

          {!isLogin && (
            <div className="space-y-1.5 px-1 animate-in slide-in-from-top-2 duration-300">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Xác nhận mật khẩu</label>
               <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="password" placeholder="••••••••" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required
                    className="w-full bg-slate-50 border-2 border-slate-50 p-4 pl-12 rounded-2xl focus:border-blue-500/50 focus:bg-white outline-none font-bold text-slate-900 transition-all"
                  />
               </div>
            </div>
          )}

          <div className="pt-4">
             <button 
              disabled={loading}
              className="w-full bg-slate-900 text-white font-black py-5 rounded-[1.5rem] shadow-xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-100 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2 group active:scale-[0.98]"
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : (isLogin ? 'Đăng nhập ngay' : 'Đăng ký dùng thử')}
              {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </form>

        <div className="mt-10 text-center space-y-6">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(null); }} 
            className={cn(
              "text-xs font-black uppercase tracking-widest transition-all",
              isLogin ? "text-blue-600 hover:text-blue-700" : "text-slate-500 hover:text-slate-900"
            )}
          >
            {isLogin ? 'Chưa có tài khoản? Tạo ngay →' : 'Đã có tài khoản? Quay lại đăng nhập'}
          </button>
          
          <div className="flex items-center gap-4 py-2">
             <div className="h-[1px] flex-1 bg-slate-100"></div>
             <Link href="/" className="text-[10px] font-black text-slate-400 hover:text-blue-600 flex items-center gap-1.5 transition-colors uppercase tracking-[0.2em]">
                <ChevronLeft size={14} /> Trang chủ
             </Link>
             <div className="h-[1px] flex-1 bg-slate-100"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row h-screen overflow-hidden">
      {/* Left Decoration - Desktop Only */}
      <div className="hidden md:flex md:w-1/2 bg-slate-900 relative items-center justify-center p-20 overflow-hidden">
         <div className="absolute top-0 left-0 w-full h-full opacity-30">
            <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600 blur-[150px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600 blur-[150px] rounded-full"></div>
         </div>
         
         <div className="relative z-10 space-y-12 max-w-lg">
            <div className="space-y-4">
               <div className="bg-blue-600/20 text-blue-400 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.3em] w-fit border border-blue-500/20">
                  Premium AI SaaS
               </div>
               <h2 className="text-5xl font-black text-white leading-tight tracking-tighter">
                  GIẢI PHÁP <span className="text-blue-500">CHỐT ĐƠN</span> <br />
                  TỰ ĐỘNG TOÀN DIỆN
               </h2>
               <p className="text-slate-400 font-medium text-lg leading-relaxed">
                  Gia nhập cộng đồng 100+ shop đang sử dụng AI để bứt phá doanh số và tối ưu vận hành.
               </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
               {[
                  { icon: <Zap size={20} className="text-yellow-400" />, title: '24/7 Support', text: 'Luôn sẵn sàng' },
                  { icon: <ShieldCheck size={20} className="text-emerald-400" />, title: 'Bảo mật', text: '100% An toàn' }
               ].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-5 rounded-3xl backdrop-blur-sm">
                     <div className="mb-3">{item.icon}</div>
                     <p className="text-sm font-black text-white">{item.title}</p>
                     <p className="text-xs text-slate-500 font-bold">{item.text}</p>
                  </div>
               ))}
            </div>
         </div>

         {/* Decorative Element */}
         <div className="absolute bottom-10 left-10 flex flex-col gap-2 opacity-20">
            <div className="w-40 h-2 bg-white rounded-full"></div>
            <div className="w-24 h-2 bg-white rounded-full"></div>
         </div>
      </div>

      {/* Right Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 overflow-y-auto">
        <Suspense fallback={<div className="font-black text-slate-300 animate-pulse uppercase tracking-[0.3em]">Đang khởi tạo hệ thống...</div>}>
          <LoginForm />
        </Suspense>
        
        {/* Footer info for mobile */}
        <p className="mt-10 md:hidden text-[10px] font-black text-slate-300 uppercase tracking-widest">© 2026 ChatBot Pro Global</p>
      </div>
    </div>
  );
}
