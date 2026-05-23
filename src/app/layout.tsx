import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bili Stats",
  description: "自用 Bilibili 观看记录统计仪表盘",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
