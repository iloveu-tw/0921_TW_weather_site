import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  title: '台灣即時氣象 GIS 觀測圖台 | Taiwan Weather GIS (AIoT DIC-2)',
  description:
    '基於交通部中央氣象署 (CWA) Open Data 與 Neon PostgreSQL 打造的台灣空間氣象 GIS 觀測網，支援 800+ 氣象測站即時氣溫、累積雨量、相對濕度可視化與縣市邊界疊加。',
  keywords: ['台灣氣象', 'GIS', 'CWA Open Data', 'Leaflet', '氣象站', '氣溫', '雨量', 'AIoT DIC-2'],
  authors: [{ name: 'Summer' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" className={`${inter.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
