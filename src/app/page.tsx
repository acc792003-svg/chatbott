'use client';

import Link from 'next/link';
import { Bot, Sparkles, ChevronRight, CheckCircle2, Clock, Settings2, Globe2, Zap, Gift, Crown } from 'lucide-react';

export default function LandingPage() {
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

  return (
    <div className="min-h-screen selection:bg-blue-100 flex flex-col items-center">
      {/* Background Decor */}
      <div className="fixed top-0 left-0 w-full h-full -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-400/20 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-400/20 blur-[120px] rounded-full"></div>
      </div>

      {/* Navbar */}
      <nav className="w-full max-w-7xl px-8 py-6 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg">
            <Bot size={24} />
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">AI Chat</span>
        </div>
        <div className="flex items-center gap-8">
          <Link href="#features" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Tính năng</Link>
          <Link href="#pricing" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Bảng giá</Link>
          <Link href="/login" className="bg-slate-900 text-white px-6 py-2.5 rounded-2xl text-sm font-bold shadow-xl hover:bg-slate-800 active:scale-95 transition-all">
            Đăng nhập
          </Link>
        </div>
      </nav>

      <main className="w-full max-w-5xl px-8 pt-24 pb-32 text-center space-y-12">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest animate-bounce">
          <Sparkles size={14} />
          AI Đã Sẵn Sàng Bán Hàng Cho Bạn
        </div>

        {/* Hero Title — đã sửa lỗi chính tả */}
        <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[1.1] uppercase">
          BIẾN KHÁCH TRUY CẬP THÀNH{' '}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
            ĐƠN HÀNG THỰC TẾ
          </span>
        </h1>

        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium leading-relaxed">
          Nền tảng AI Chatbot thông minh giúp bạn tư vấn khách hàng 24/7, tự động chốt đơn và tăng doanh thu vượt trội cho doanh nghiệp vừa và nhỏ.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 pt-4">
          <Link href="/login" className="btn-gradient px-10 py-5 rounded-[2rem] text-lg flex items-center gap-2 group shadow-2xl shadow-blue-200">
            <Zap size={20} className="text-yellow-300" />
            Dùng Thử Miễn Phí
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </Link>
          <button className="bg-white border border-slate-200 text-slate-900 px-10 py-5 rounded-[2rem] text-lg font-bold hover:bg-slate-50 transition-all shadow-md">
            Xem Demo
          </button>
        </div>

        {/* Feature Cards */}
        <div id="features" className="pt-20">
          <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">Tính Năng Nổi Bật</h2>
          <p className="text-slate-500 mb-10 font-medium">Mọi thứ bạn cần để bán hàng tự động hiệu quả</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((f, i) => (
              <div key={i} className={`glass p-8 rounded-[2.5rem] text-left space-y-4 hover:scale-[1.02] transition-transform border ${f.border}`}>
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
            <div className="glass p-10 rounded-[3rem] text-left border border-slate-200">
              <div className="flex items-center gap-2 mb-2">
                <Gift size={22} className="text-green-500" />
                <h3 className="text-xl font-black uppercase text-slate-800">Gói Miễn Phí</h3>
              </div>
              <p className="text-4xl font-black my-4 text-slate-900">0đ<span className="text-sm font-medium text-slate-500">/tháng</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <CheckCircle2 size={17} className="text-green-500 shrink-0" />
                  50 tin nhắn AI mỗi ngày
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <CheckCircle2 size={17} className="text-green-500 shrink-0" />
                  1 Chatbot cơ bản
                </li>
              </ul>
              <Link href="/login" className="block w-full text-center py-3 bg-slate-100 text-slate-900 rounded-2xl font-bold hover:bg-slate-200 transition-colors">
                Bắt đầu ngay
              </Link>
            </div>

            {/* Pro */}
            <div className="glass p-10 rounded-[3rem] text-left ring-4 ring-blue-500 shadow-2xl shadow-blue-100 relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-1.5 text-xs font-black uppercase rounded-full shadow-lg tracking-widest whitespace-nowrap">
                ⭐ Khuyên Dùng
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Crown size={22} className="text-blue-500" />
                <h3 className="text-xl font-black uppercase text-blue-700">Gói Pro</h3>
              </div>
              <p className="text-4xl font-black my-4 text-blue-700">299k<span className="text-sm font-medium text-slate-500">/tháng</span></p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <CheckCircle2 size={17} className="text-blue-500 shrink-0" />
                  Tin nhắn AI không giới hạn
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <CheckCircle2 size={17} className="text-blue-500 shrink-0" />
                  Tích hợp Webhook
                </li>
                <li className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                  <CheckCircle2 size={17} className="text-blue-500 shrink-0" />
                  Hỗ trợ ưu tiên 24/7
                </li>
              </ul>
              <Link href="/login" className="block w-full text-center py-3 btn-gradient rounded-2xl font-bold shadow-lg shadow-blue-200">
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
        <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">© 2026 • Premium SaaS Solution</p>
      </footer>
    </div>
  );
}
