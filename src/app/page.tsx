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
  Smartphone,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.9]);

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
    <div className="min-h-screen bg-white selection:bg-blue-100 selection:text-blue-900 overflow-x-hidden font-sans">
      
      {/* ===== HEADER / NAVBAR ===== */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className={cn(
          "fixed top-0 left-0 right-0 z-[100] transition-all duration-500 px-6 py-4",
          scrolled ? "bg-white/80 backdrop-blur-xl border-b border-slate-100 py-3 shadow-sm" : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300">
              <Bot size={24} />
            </div>
            <span className="font-black text-2xl text-slate-900 tracking-tighter">ChatBot <span className="text-blue-600">Pro</span></span>
          </Link>

          <div className="hidden md:flex items-center gap-10">
            {['Tính năng', 'Bảng giá', 'Tài liệu'].map((item) => (
              <Link 
                key={item} 
                href={`/#${item === 'Tính năng' ? 'features' : item === 'Bảng giá' ? 'pricing' : ''}`} 
                className="text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-600 transition-all group-hover:w-full"></span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" className="hidden sm:block text-sm font-bold text-slate-600 hover:text-blue-600 transition-colors">Đăng nhập</Link>
            <Link href="/login?mode=register" className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-black shadow-xl shadow-slate-200 hover:bg-blue-600 hover:shadow-blue-100 active:scale-95 transition-all">
              Dùng thử free
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative pt-40 pb-24 px-6 overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full -z-10">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 50, 0],
              y: [0, 30, 0]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-20 left-10 w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px]"
          ></motion.div>
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              x: [0, -50, 0],
              y: [0, -40, 0]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-10 right-10 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[120px]"
          ></motion.div>
        </div>

        <motion.div 
          style={{ opacity, scale }}
          className="max-w-7xl mx-auto text-center space-y-10"
        >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 text-blue-600 px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm"
          >
            <div className="flex -space-x-2">
               {[1,2,3].map(i => <div key={i} className="w-5 h-5 rounded-full border-2 border-white bg-slate-200 overflow-hidden"><img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" /></div>)}
            </div>
            <span className="pl-2">+1,200 shop đã tham gia</span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tighter leading-[0.95] max-w-5xl mx-auto uppercase italic"
          >
            BÁN HÀNG <span className="text-blue-600">THÔNG MINH</span> <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600">
              BỨT PHÁ DOANH THU
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto font-bold leading-relaxed opacity-80"
          >
            Nền tảng Chatbot AI đa năng giúp shop của bạn trực khách 24/7, tự động lấy SĐT và báo ngay về Telegram để chốt đơn thần tốc.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10"
          >
            <Link href="/login?mode=register" className="w-full sm:w-auto bg-slate-900 text-white px-12 py-6 rounded-3xl text-xl font-black flex items-center justify-center gap-4 shadow-2xl shadow-slate-300 hover:bg-blue-600 hover:shadow-blue-200 transition-all active:scale-95 group relative overflow-hidden">
              <span className="relative z-10 uppercase tracking-widest">Bắt đầu ngay</span>
              <ArrowRight size={24} className="relative z-10 group-hover:translate-x-2 transition-transform" />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 0.6 }}
            viewport={{ once: true }}
            className="pt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto grayscale opacity-50"
          >
             {['Shopee', 'Lazada', 'TikTok', 'Facebook'].map(p => (
               <div key={p} className="text-2xl font-black flex items-center justify-center tracking-tighter uppercase italic">{p} Shop</div>
             ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="feature" className="py-32 px-6 bg-[#F8FAFC] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center space-y-6 mb-24">
            <motion.div 
               initial={{ opacity: 0 }}
               whileInView={{ opacity: 1 }}
               className="text-blue-600 font-black uppercase tracking-[0.3em] text-xs"
            >
              Tại sao chọn chúng tôi?
            </motion.div>
            <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight uppercase italic leading-none">
               VƯỢT XA MỘT <br /> <span className="text-blue-600 underline decoration-blue-200 underline-offset-8">KHUNG CHAT</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {features.map((f, i) => (
              <motion.div 
                key={i} 
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group bg-white p-12 rounded-[4rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.08)] hover:-translate-y-4 transition-all duration-700 relative overflow-hidden"
              >
                <div className={cn(
                  "w-20 h-20 rounded-3xl flex items-center justify-center mb-10 shadow-lg group-hover:scale-110 transition-transform duration-500",
                  f.color === 'blue' ? "bg-blue-600 text-white" : 
                  f.color === 'indigo' ? "bg-indigo-600 text-white" : "bg-emerald-600 text-white"
                )}>
                  {f.icon}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-6 tracking-tight uppercase">{f.title}</h3>
                <p className="text-slate-500 font-bold leading-relaxed opacity-80">{f.desc}</p>
                
                {/* Decorative number */}
                <div className="absolute top-10 right-10 text-8xl font-black text-slate-50 group-hover:text-slate-100 transition-colors pointer-events-none -z-0">
                  0{i+1}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== UI SHOWCASE ===== */}
      <section className="py-40 px-6 relative overflow-hidden bg-white">
         <div className="max-w-7xl mx-auto flex flex-col items-center">
            <motion.div 
               initial={{ opacity: 0, rotateX: 45 }}
               whileInView={{ opacity: 1, rotateX: 0 }}
               className="w-full relative"
            >
               <div className="w-full max-w-5xl mx-auto bg-slate-900 rounded-[3rem] p-4 shadow-2xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-violet-600/20 mix-blend-overlay"></div>
                  <div className="bg-slate-800 rounded-[2.2rem] h-[500px] md:h-[650px] overflow-hidden relative">
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-500 rounded-full blur-[80px] animate-pulse"></div>
                     <div className="p-8 flex flex-col items-center justify-center h-full text-center space-y-6 relative z-10">
                        <Sparkles size={64} className="text-blue-400 animate-spin-slow" />
                        <h2 className="text-3xl md:text-5xl font-black text-white italic uppercase tracking-tighter">Giao diện Dashboard <br /> Cực xịn & Chuyên Nghiệp</h2>
                        <button className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-white hover:text-blue-600 transition-all">Xem Demo</button>
                     </div>
                  </div>
               </div>
            </motion.div>
         </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="py-32 px-6 bg-slate-50/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6 mb-24">
            <h2 className="text-4xl md:text-7xl font-black text-slate-900 tracking-tighter leading-none italic uppercase">
               ĐẦU TƯ <span className="text-blue-600">NHỎ</span> <br /> LỢI NHUẬN <span className="text-blue-600">LỚN</span>
            </h2>
            <p className="text-slate-500 font-bold text-xl uppercase tracking-widest opacity-60">Chọn gói phù hợp với quy mô của bạn</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Free Tier */}
            <motion.div 
               whileHover={{ y: -10 }}
               className="bg-white p-12 rounded-[5rem] border-2 border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.03)] flex flex-col"
            >
              <div className="flex items-center gap-4 mb-8">
                 <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center">
                    <Gift size={24} />
                 </div>
                 <h3 className="text-2xl font-black text-slate-900 uppercase italic">Cơ Bản</h3>
              </div>
              <div className="mb-12">
                <div className="flex items-baseline gap-2">
                   <span className="text-6xl font-black text-slate-900 tracking-tighter">Miễn phí</span>
                </div>
                <p className="text-slate-400 font-bold mt-6 uppercase tracking-widest text-xs">Cho shop mới tập tành</p>
              </div>
              <ul className="space-y-6 mb-16 flex-1">
                {[
                  'Bản trả lời cơ bản Standard',
                  'Giới hạn 30 tin nhắn/ngày',
                  'Lưu lịch sử chat 3 ngày',
                  'Giao diện Chatbot Pro mặc định'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-4 text-sm font-bold text-slate-600">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                       <CheckCircle2 size={14} className="text-slate-300" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login?mode=register" className="w-full py-6 rounded-3xl bg-slate-100 text-slate-900 font-black text-sm uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all text-center">
                Đăng ký ngay
              </Link>
            </motion.div>

            {/* Pro Tier */}
            <motion.div 
               whileHover={{ y: -10 }}
               className="bg-slate-900 p-1 rounded-[5rem] shadow-[0_40px_100px_rgba(59,130,246,0.2)] relative z-10 flex flex-col"
            >
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-8 py-3 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] shadow-2xl ring-8 ring-white">
                ✨ LỰA CHỌN TỐI ƯU ✨
              </div>
              
              <div className="bg-slate-900 rounded-[4.9rem] p-12 h-full flex flex-col text-white">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                      <Zap size={24} fill="white" />
                   </div>
                   <h3 className="text-2xl font-black uppercase italic">Professional</h3>
                </div>
                <div className="mb-12">
                  <div className="flex items-baseline gap-2">
                     <span className="text-7xl font-black text-blue-500 tracking-tighter italic">149K</span>
                     <span className="text-slate-500 font-black uppercase tracking-widest text-sm">/tháng</span>
                  </div>
                  <p className="text-slate-400 font-bold mt-6 uppercase tracking-widest text-xs">Phù hơp kinh doanh chuyên nghiệp</p>
                </div>
                <ul className="space-y-6 mb-16 flex-1">
                  {[
                    'AI Chatbot thông minh 24/7',
                    'Luyện tri thức riêng của Shop',
                    'Tự động thu thập SĐT khách',
                    'Báo khách tức thì về Telegram',
                    'Không hiển thị logo "ChatBot Pro"',
                    'Hỗ trợ kỹ thuật 1-1 riêng biệt'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-4 text-sm font-bold text-slate-100">
                      <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
                         <CheckCircle2 size={14} strokeWidth={3} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/login?mode=register" className="w-full py-6 rounded-3xl bg-blue-600 text-white font-black text-sm uppercase tracking-widest shadow-2xl shadow-blue-500/20 hover:bg-white hover:text-blue-600 transition-all text-center">
                  Nâng cấp Pro ngay
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== TESTIMONIALS ===== */}
      <section className="py-32 px-6">
         <div className="max-w-7xl mx-auto flex flex-col items-center">
            <div className="flex items-center gap-1 text-amber-400 mb-6">
               {[1,2,3,4,5].map(i => <Star key={i} size={20} fill="currentColor" />)}
            </div>
            <p className="text-2xl md:text-4xl font-black text-slate-900 text-center max-w-4xl italic leading-tight uppercase italic tracking-tighter">
              "KHOẢN ĐẦU TƯ ĐÁNG GIÁ NHẤT CHO SHOP. TỪ KHI CÓ CHATBOT PRO, TỶ LỆ CHỐT ĐƠN TĂNG 40% VÌ KHÁCH LUÔN ĐƯỢC CHĂM SÓC NGAY LẬP TỨC."
            </p>
            <div className="mt-10 flex items-center gap-4">
               <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden"><img src="https://i.pravatar.cc/100?img=33" alt="avatar" /></div>
               <div className="text-left">
                  <div className="font-black text-slate-900 uppercase">Trần Thu Hà</div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tiệm Vàng Kim Long</div>
               </div>
            </div>
         </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-24 px-6 border-t border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto flex flex-col gap-20">
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="space-y-6 max-w-xs">
              <Link href="/" className="flex items-center gap-2.5">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                  <Bot size={28} />
                </div>
                <span className="font-black text-3xl text-slate-900 tracking-tighter uppercase italic">ChatBot Pro</span>
              </Link>
              <p className="text-slate-400 font-bold leading-relaxed">Nâng tầm trải nghiệm khách hàng và tối ưu quy trình bán hàng bằng công nghệ AI đỉnh cao.</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-16 md:gap-24">
              <div className="space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Sản phẩm</h4>
                <ul className="space-y-3 font-bold text-slate-400 text-sm">
                  <li><Link href="/" className="hover:text-blue-600 transition-colors">Tính năng</Link></li>
                  <li><Link href="/" className="hover:text-blue-600 transition-colors">Bảng giá</Link></li>
                  <li><Link href="/" className="hover:text-blue-600 transition-colors">Tài liệu</Link></li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-black text-slate-900 uppercase tracking-widest text-xs">Liên hệ</h4>
                <ul className="space-y-3 font-bold text-slate-400 text-sm">
                  <li><Link href="/" className="hover:text-blue-600 transition-colors">Facebook</Link></li>
                  <li><Link href="/" className="hover:text-blue-600 transition-colors">Tiktok</Link></li>
                  <li><Link href="/" className="hover:text-blue-600 transition-colors">0905 550 738</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between gap-6">
             <p className="text-[11px] text-slate-300 font-black uppercase tracking-[0.4em]">@2026 CHATBOT PRO - ALL RIGHTS RESERVED</p>
             <div className="flex items-center gap-8 text-[11px] text-slate-300 font-black uppercase tracking-widest">
                <Link href="/" className="hover:text-slate-600 transition-colors">Privacy Policy</Link>
                <Link href="/" className="hover:text-slate-600 transition-colors">Terms of Service</Link>
             </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
