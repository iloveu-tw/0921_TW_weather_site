import type { Metadata, Viewport } from 'next';
import './globals.css';

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
    <html lang="zh-TW">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Outfit:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
