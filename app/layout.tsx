import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BOLA TECH — حلول رقمية تبني المستقبل",
  description: "منتجات رقمية وأنظمة أعمال ومواقع احترافية من BOLA TECH.",
  applicationName: "BOLA TECH",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}