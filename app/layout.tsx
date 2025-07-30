import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import DevTools from "@/components/DevTools";
import { ThemeProvider } from "@/components/ThemeProvider";
import { HeaderProvider } from "@/components/HeaderProvider";
import DynamicHeader from "@/components/DynamicHeader";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "通过动画学习日语",
  description: "通过翻译动画字幕来学习日语",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <HeaderProvider>
            <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors">
              <DynamicHeader />
              
              {/* 主要内容 */}
              <main className="max-w-6xl mx-auto px-4 py-6">
                {children}
              </main>
              
              <DevTools />
            </div>
          </HeaderProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
