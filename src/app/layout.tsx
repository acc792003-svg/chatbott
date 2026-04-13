import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Chat Bán Hàng - Tự Động Chốt Đơn 24/7",
  description: "Nền tảng AI Chatbot thông minh giúp tư vấn khách hàng 24/7, tự động chốt đơn và tăng doanh thu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className="h-full antialiased scroll-smooth"
    >
      <body style={{ fontFamily: 'Arial, Helvetica, sans-serif' }} className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
