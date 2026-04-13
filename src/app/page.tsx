'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Bot, Sparkles, ChevronRight, CheckCircle2, Clock, Settings2, Globe2, Zap, Gift, Crown, X, Play } from 'lucide-react';

export default function LandingPage() {
  const [showDemo, setShowDemo] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const features = [
    {
      icon: <Clock size={26} />,
      title: 'Tự Động 24/7',
      desc: 'Không bao giờ bỏ lỡ tin nhắn khách hàng — AI trả lời thay bạn mọi lúc mọi nơi.',
      bg: 'bg-orange-50',
      color: 'text-orange-500',
      border: 'border-orange-100',
    },
    {
      icon: <Settings2 size={26} />,
      title: 'Dễ Cấu Hình',
      desc: 'Chỉ mất 5 phút để huấn luyện AI của bạn với thông tin sản phẩm và FAQ.',
      bg: 'bg-blue-50',
      color: 'text-blue-600',
      border: 'border-blue-100',
    },
    {
      icon: <Globe2 size={26} />,
      title: 'Đa Nền Tảng',
      desc: 'Dễ dàng nhúng vào Website, Blogspot — sắp ra mắt tích hợp FB, Zalo.',
      bg: 'bg-purple-50',
      color: 'text-purple-600',
      border: 'border-purple-100',
    },
  ];

  if (!mounted) return null;

  return (
    <div className="min-h-screen selection:bg-blue-100 flex flex-col items-center" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      
      {/* ===== CSS OVERRIDE TO FORCE ARIAL EVERYWHERE ===== */}
      <style dangerouslySetInnerHTML={{ __html: `
        * { font-family: Arial, Helvetica, sans-serif !important; }
        h1, h2, h3, h4, span, div, p, button, a { font-family: Arial, Helvetica, sans-serif !important; }
      `}} />

      {/* ===== DEMO MODAL ===== */}
      {showDemo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowDemo(false)}
        >
          <div
            className="relative bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-indigo-600">
              <div className="flex items-center gap-3 text-white">
                <Bot size={22} />
                <span className="font-black text-lg">Demo AI Chatbot Bán Hàng</span>
                <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full text-white">LIVE</span>
              </div>
              <button
                onClick={() => setShowDemo(false)}
                className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-xl transition-all"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex flex-col md:flex-row">
              {/* Left: Giải thích */}
              <div className="md:w-2/5 p-8 bg-slate-50 border-r border-slate-100 space-y-5">
                <h3 className="text-xl font-black text-slate-900">Thử ngay — không cần đăng ký</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Chat thử với AI bán hàng của chúng tôi. Hỏi về sản phẩm, giá, chính sách vận chuyển...
                </p>
                <ul className="space-y-3">
                  {[
                    { color: 'text-green-500', text: 'Trả lời nhanh, chính xác' },
                    { color: 'text-blue-500',  text: 'Được huấn luyện theo thông tin shop' },
                    { color: 'text-purple-500', text: 'Tích hợp vào web chỉ 1 dòng code' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <CheckCircle2 size={16} className={item.color} />
                      {item.text}
                    </li>
                  ))}
                </ul>
                <div className="pt-4">
                  <Link
                    href="/login"
                    onClick={() => setShowDemo(false)}
                    className="block text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-2xl font-bold text-sm shadow-xl"
                  >
                    Tạo Chatbot Của Riêng Bạn →
                  </Link>
                </div>
              </div>

              {/* Right: Chatbot iframe */}
              <div className="md:w-3/5 bg-slate-100 flex items-center justify-center p-4" style={{ minHeight: '480px' }}>
                <iframe
                  src="https://chatbott-blond.vercel.app/widget/68XCS"
                  style={{
                    width: '100%',
                    height: '460px',
                    border: 'none',
                    borderRadius: '16px',
                  }}
                  title="Demo Chatbot AI"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 blur-[120px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="w-full max-w-7xl px-8 py-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Bot size={24} />
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">AI Chat</span>
        </Link>
        <div className="flex items-center gap-8">
          <Link href="#features" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Tính năng</Link>
          <Link href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Bảng giá</Link>
          <button onClick={() => setShowDemo(true)} className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Demo</button>
          <Link href="/login" className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all">
            Đăng nhập
          </Link>
        </div>
      </nav>

      <main className="w-full max-w-6xl px-8 pt-24 pb-32 text-center space-y-12">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest animate-bounce">
          <Sparkles size={14} />
          AI Đã Sẵn Sàng Bán Hàng Cho Bạn
        </div>

        {/* Hero Title - Font Arial, FIX 2 DÒNG TUYỆT ĐỐI */}
        <div className="max-w-5xl mx-auto flex flex-col items-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight uppercase">
            <span className="whitespace-nowrap">BIẾN KHÁCH TRUY CẬP THÀNH</span>
            <br />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 whitespace-nowrap">
              ĐƠN HÀNG THỰC TẾ
            </span>
          </h1>
        </div>

        <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
          Nền tảng AI Chatbot thông minh giúp bạn tư vấn khách hàng 24/7, tự động chốt đơn và tăng doanh thu vượt trội cho doanh nghiệp vừa và nhỏ.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/login?mode=register" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-10 py-5 rounded-[2rem] text-lg flex items-center gap-2 group shadow-2xl shadow-blue-200 font-bold transition-all active:scale-95">
            <Zap size={20} className="text-yellow-300" />
            Dùng Thử Miễn Phí
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>

          <button
            onClick={() => setShowDemo(true)}
            className="bg-white border-2 border-slate-200 text-slate-900 px-10 py-5 rounded-[2rem] text-lg font-bold hover:bg-slate-50 hover:border-blue-300 transition-all shadow-md flex items-center gap-2 group"
          >
            <Play size={20} className="text-blue-500 group-hover:scale-110 transition-transform" />
            Xem Demo
          </button>
        </div>

        {/* Feature Cards */}
        <div id="features" className="pt-20">
          <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Tính Năng Nổi Bật</h2>
          <p className="text-slate-500 mb-10 font-medium font-arial">Mọi thứ bạn cần để bán hàng tự động hiệu quả</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className={`bg-white/50 backdrop-blur-md p-8 rounded-[2.5rem] text-left space-y-4 hover:scale-[1.02] transition-transform border ${f.border} shadow-lg`}>
                <div className={`w-14 h-14 ${f.bg} ${f.color} rounded-2xl flex items-center justify-center shadow-sm`}>
                  {f.icon}
                </div>
                <h3 className={`text-xl font-black tracking-tight ${f.color}`}>{f.title}</h3>
                <p className="text-slate-600 font-medium leading-relaxed text-sm">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div id="pricing" className="pt-32 pb-20 max-w-4xl mx-auto">
          <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Gói Dịch Vụ</h2>
          <p className="text-slate-500 mb-12 font-medium">Bắt đầu miễn phí — nâng cấp khi bạn phát triển.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Free */}
            <div className="bg-white p-10 rounded-[3rem] text-left border-2 border-slate-100 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={22} className="text-green-500" />
                <h3 className="text-xl font-black uppercase text-slate-800">Gói Miễn Phí</h3>
              </div>
              <p className="text-4xl font-black my-4 text-slate-900">0đ<span className="text-sm font-medium text-slate-500">/tháng</span></p>
              <ul className="space-y-3 mb-8">
                {['50 tin nhắn AI mỗi ngày', '1 Chatbot cơ bản'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <CheckCircle2 size={17} className="text-green-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block w-full text-center py-3 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                Bắt đầu ngay
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-white p-10 rounded-[3rem] text-left border-4 border-blue-500 shadow-2xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-1.5 text-xs font-black uppercase rounded-full shadow-lg tracking-widest whitespace-nowrap">
                ⭐ Khuyên Dùng
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={22} className="text-blue-500" />
                <h3 className="text-xl font-black uppercase text-blue-700">Gói Pro</h3>
              </div>
              <p className="text-4xl font-black my-4 text-blue-700">299k<span className="text-sm font-medium text-slate-500">/tháng</span></p>
              <ul className="space-y-3 mb-8">
                {['Tin nhắn AI không giới hạn', 'Tích hợp Webhook', 'Hỗ trợ ưu tiên 24/7'].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                    <CheckCircle2 size={17} className="text-blue-500 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="block w-full text-center py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700">
                Nâng cấp liền 🚀
              </Link>
            </div>

          </div>
        </div>
      </main>

      <footer className="w-full border-t border-slate-100 py-12 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-blue-600">
          <Bot size={18} />
          <span className="font-black text-sm">AI Chat Bán Hàng</span>
          <span className="text-slate-400 font-semibold">•</span>
          <span className="font-bold text-sm text-slate-700">LH: 0905550738</span>
        </div>
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest font-arial">© 2026 • Premium SaaS Solution</p>
      </footer>
    </div>
  );
}
