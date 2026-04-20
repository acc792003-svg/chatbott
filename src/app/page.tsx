'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Bot, 
  Sparkles, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Settings2, 
  Globe2, 
  Zap, 
  Gift, 
  Crown, 
  X, 
  Play,
  ArrowRight,
  ShieldCheck,
  MessageCircle,
  BellRing,
  Smartphone
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const features = [
    {
      icon: <Clock size={28} />,
      title: 'Trực Shop 24/7',
      desc: 'Phản hồi khách hàng ngay lập tức kể cả lúc nửa đêm, không để khách phải chờ đợi.',
      color: 'blue',
    },
    {
      icon: <BellRing size={28} />,
      title: 'Báo Khách Tức Thì',
      desc: 'Tự động gửi thông báo tên và SĐT khách hàng về Telegram của bạn ngay khi có khách mới.',
      color: 'indigo',
    },
    {
      icon: <Smartphone size={28} />,
      title: 'Tự Động Lấy Số',
      desc: 'Thông minh nhận diện và thu thập thông tin khách hàng tiềm năng để bạn tư vấn chốt đơn.',
      color: 'emerald',
    },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden">
      
      {/* ===== HEADER / NAVBAR ===== */}
      <nav className={cn(
        "fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 py-4",
        scrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-100 py-3 shadow-sm" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Bot size={24} />
            </div>
            <span className="font-black text-2xl text-slate-900 tracking-tighter">ChatBot <span className="text-blue-600">Pro</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            <Link href="#features" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Tính năng</Link>
            <Link href="#pricing" className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Bảng giá</Link>
            <button onClick={() => setShowDemo(true)} className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Xem thử</button>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Đăng nhập</Link>
            <Link href="/login?mode=register" className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-black shadow-xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-100 active:scale-95 transition-all">
              Bắt đầu miễn phí
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-40 pb-32 px-6 overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
          <div className="absolute top-20 left-10 w-96 h-96 bg-blue-400/20 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-indigo-400/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest animate-in fade-in slide-in-from-bottom-4 duration-1000">
            <Sparkles size={14} className="text-blue-500" />
            Trợ lý ảo thông minh cho shop của bạn
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-slate-900 tracking-tighter leading-[1.1] max-w-4xl mx-auto uppercase">
            BÁN HÀNG TỰ ĐỘNG <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              TĂNG VỌT DOANH THU
            </span>
          </h1>

          <p className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto font-medium leading-relaxed">
            Nền tảng AI Chatbot giúp shop của bạn phản hồi khách hàng 24/7, tự động thu thập SĐT và báo ngay về điện thoại để bạn chốt đơn nhanh chóng.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-8">
            <Link href="/login?mode=register" className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-[2rem] text-lg font-black flex items-center justify-center gap-3 shadow-2xl shadow-slate-300 hover:bg-blue-600 hover:shadow-blue-200 transition-all active:scale-95 group">
              Dùng thử miễn phí ngay
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <button 
              onClick={() => setShowDemo(true)}
              className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-900 px-10 py-5 rounded-[2rem] text-lg font-black flex items-center justify-center gap-3 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm group"
            >
              <Play size={20} fill="currentColor" className="text-blue-600 group-hover:scale-110 transition-transform" />
              Xem Demo Chat
            </button>
          </div>

          {/* Spacing adjustments */}
          <div className="pt-8"></div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="py-32 px-6 bg-slate-50/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Tính Năng Tuyệt Vời</h2>
            <p className="text-slate-500 font-medium text-lg max-w-2xl mx-auto leading-relaxed">
              Vượt xa một khung chat thông thường, đây là trợ lý bán hàng thực thụ chuyên nghiệp.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className="group bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm hover:shadow-2xl hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity scale-[3] -mr-10 -mt-10">
                   {f.icon}
                </div>
                <div className={cn(
                  "w-16 h-16 rounded-2xl flex items-center justify-center mb-8 shadow-inner ring-1 ring-white/50",
                  f.color === 'blue' ? "bg-blue-50 text-blue-600" : 
                  f.color === 'indigo' ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                )}>
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{f.title}</h3>
                <p className="text-slate-500 font-medium leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">Gói Dịch Vụ Hợp Lý</h2>
            <p className="text-slate-500 font-medium text-lg">Phí duy trì cực thấp cho lợi nhuận cực cao.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* Free Tier */}
            <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-xl flex flex-col hover:scale-[1.01] transition-all">
              <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center">
                    <Gift size={20} />
                 </div>
                 <h3 className="text-xl font-black text-slate-900 uppercase">Khởi Đầu</h3>
              </div>
              <div className="mb-10 text-center md:text-left">
                <div className="flex items-baseline gap-1">
                   <span className="text-5xl font-black text-slate-900">0đ</span>
                   <span className="text-slate-400 font-bold">/tháng</span>
                </div>
                <p className="text-slate-500 font-medium mt-4">Phù hợp cho cá nhân mới bán hàng.</p>
              </div>
              <ul className="space-y-4 mb-12 flex-1">
                {[
                  'Bản trả lời cơ bản',
                  'Giới hạn 30 tin nhắn mỗi ngày',
                  'Lưu lịch sử chat 3 ngày',
                  'Giao diện mặc định',
                  'Hỗ trợ qua cộng đồng'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-600">
                    <CheckCircle2 size={18} className="text-slate-300" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login?mode=register" className="w-full py-5 rounded-[1.5rem] bg-slate-100 text-slate-900 font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-all text-center">
                Bắt đầu ngay
              </Link>
            </div>

            {/* Pro Tier */}
            <div className="bg-white p-1 rounded-[3.5rem] bg-gradient-to-b from-blue-500 to-indigo-600 shadow-2xl scale-105 relative z-10 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-1000">
              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-white text-blue-600 px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl ring-4 ring-blue-50 dark:ring-blue-900/10">
                ⭐ Được 90% các shop lựa chọn
              </div>
              
              <div className="bg-white rounded-[3.4rem] p-10 h-full flex flex-col">
                <div className="flex items-center gap-3 mb-4">
                   <div className="w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-blue-100">
                      <Zap size={20} fill="currentColor" />
                   </div>
                   <h3 className="text-xl font-black text-slate-900 uppercase">Chuyên Nghiệp</h3>
                </div>
                <div className="mb-10 text-center md:text-left">
                  <div className="flex items-baseline gap-1">
                     <span className="text-5xl font-black text-blue-600 tracking-tighter">149.000đ</span>
                     <span className="text-slate-400 font-bold">/tháng</span>
                  </div>
                  <p className="text-slate-500 font-medium mt-4">Giải pháp toàn diện để phát triển đột phá.</p>
                </div>
                <ul className="space-y-4 mb-12 flex-1">
                  {[
                    'Trợ lý ảo thông minh 24/7',
                    'Luyện tri thức riêng cho shop',
                    'Tự động lấy SĐT khách hàng',
                    'Báo khách mới về Telegram',
                    'Xóa bỏ dòng chữ thương hiệu',
                    'Ưu tiên hỗ trợ 1-1'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3 group">
                      <div className="mt-1 w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                         <CheckCircle2 size={14} strokeWidth={3} />
                      </div>
                      <span className="text-sm font-bold text-slate-700">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/login?mode=register" className="w-full py-5 rounded-[1.5rem] bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-100 hover:shadow-blue-200 hover:scale-[1.02] active:scale-[0.98] transition-all text-center">
                  Nâng cấp Pro ngay
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-20 px-6 border-t border-slate-100 bg-slate-50/30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col items-center md:items-start gap-4">
             <Link href="/" className="flex items-center gap-2.5">
               <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
                 <Bot size={20} />
               </div>
               <span className="font-extrabold text-xl text-slate-900">ChatBot Pro</span>
             </Link>
             <p className="text-sm text-slate-400 font-medium text-center md:text-left max-w-xs">Giải pháp AI bán hàng thông minh giúp doanh nghiệp vừa và nhỏ bứt phá doanh số.</p>
          </div>
          
          <div className="flex flex-col items-center md:items-end gap-3 text-right">
             <div className="flex items-center gap-4 text-slate-400">
                <Link href="#" className="hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors">Facebook</Link>
                <Link href="#" className="hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors">Youtube</Link>
                <Link href="#" className="hover:text-blue-600 font-bold text-xs uppercase tracking-widest transition-colors">Zalo</Link>
             </div>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-4">© 2026 • CHATBOT PRO GLOBAL LTD.</p>
          </div>
        </div>
      </footer>

      {/* ===== MODAL DEMO ===== */}
      {showDemo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-md px-4" onClick={() => setShowDemo(false)}>
           <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[80vh] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white"><Bot size={24}/></div>
                    <div>
                       <p className="text-sm font-black text-slate-900">Trải Nghiệm Live Chatbot</p>
                       <p className="text-[10px] text-emerald-500 font-black uppercase tracking-wider">● Đang hoạt động</p>
                    </div>
                 </div>
                 <button onClick={() => setShowDemo(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm transition-all"><X size={20}/></button>
              </div>
              <div className="flex-1 bg-slate-100">
                 <iframe 
                   src="/widget/70WPN" 
                   className="w-full h-full border-none"
                   title="Live Demo"
                 />
              </div>
           </div>
        </div>
      )}

    </div>
  );
}
