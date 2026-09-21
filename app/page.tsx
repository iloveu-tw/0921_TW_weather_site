'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import WeatherStats from '@/components/WeatherStats';
import WeatherTable from '@/components/WeatherTable';
import { WeatherApiResponse, WeatherObservation } from '@/types/weather';
import { Loader2 } from 'lucide-react';

// 動態載入 Leaflet 地圖
const WeatherMap = dynamic(() => import('@/components/WeatherMap'), {
  ssr: false,
  loading: () => (
    <div className="map-loading-container">
      <Loader2 className="loading-spinner" />
      <span>正在初始化台灣 GIS 地圖圖台與氣象測站圖層...</span>
    </div>
  ),
});

async function fetchWeatherSnapshot() {
  const response = await fetch('/api/weather', { cache: 'no-store' });
  const body = (await response.json()) as WeatherApiResponse;

  if (!response.ok || !body.success) {
    throw new Error(body.success ? '氣象資料讀取失敗' : body.error.message);
  }

  return body;
}

export default function HomePage() {
  const [stations, setStations] = useState<WeatherObservation[]>([]);
  const [selectedStation, setSelectedStation] = useState<WeatherObservation | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void fetchWeatherSnapshot()
      .then((result) => {
        if (!active) return;
        setStations(result.data);
        setLastUpdated(result.updated_at ?? '');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setErrorMsg(
          error instanceof Error
            ? error.message
            : '連線到氣象 API 失敗，請稍後再試'
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleRetry = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const result = await fetchWeatherSnapshot();
      setStations(result.data);
      setLastUpdated(result.updated_at ?? '');
    } catch (error) {
      setErrorMsg(
        error instanceof Error
          ? error.message
          : '連線到氣象 API 失敗，請稍後再試'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* 頂部標題列 */}
      <Header lastUpdated={lastUpdated} />

      {/* 載入與錯誤狀態 */}
      {isLoading && stations.length === 0 && (
        <div className="status-banner" role="status">
          <Loader2 className="status-icon loading-spinner" />
          <span>正在讀取最新氣象資料...</span>
        </div>
      )}

      {errorMsg && (
        <div className="error-banner" role="alert">
          <span>⚠️ {errorMsg}</span>
          <button className="btn-dismiss" onClick={handleRetry} disabled={isLoading}>
            {isLoading ? '重試中...' : '重新讀取'}
          </button>
        </div>
      )}

      {!isLoading && !errorMsg && stations.length === 0 && (
        <div className="status-banner empty" role="status">
          <span>目前沒有可顯示的氣象觀測資料。</span>
          <button className="btn-dismiss" onClick={handleRetry}>
            重新讀取
          </button>
        </div>
      )}

      {/* 主要內容區 */}
      {stations.length > 0 && <main className="main-content">
        {/* 關鍵氣象指標統計卡 */}
        <WeatherStats data={stations} />

        {/* GIS 地圖與氣象資料表分割視窗 */}
        <div className="gis-dashboard-layout">
          {/* 左側 / 上側：Web GIS 互動地圖 */}
          <section className="gis-map-section" aria-label="台灣 GIS 氣象地圖">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="section-indicator"></span>
                <h2 className="section-title">全台氣象測站空間分布圖</h2>
              </div>
              <span className="section-badge">即時空間圖層</span>
            </div>
            <div className="map-outer-card">
              <WeatherMap
                stations={stations}
                selectedStation={selectedStation}
                onSelectStation={setSelectedStation}
              />
            </div>
          </section>

          {/* 右側 / 下側：氣象站觀測數據清單 */}
          <section className="gis-table-section" aria-label="氣象站點觀測數據清單">
            <div className="section-header">
              <div className="section-title-wrap">
                <span className="section-indicator green"></span>
                <h2 className="section-title">即時測站詳細數據清單</h2>
              </div>
              <span className="section-badge alt">互動檢索</span>
            </div>
            <WeatherTable
              stations={stations}
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
            />
          </section>
        </div>
      </main>}

      {/* 底部頁尾 */}
      <footer className="app-footer">
        <p>
          AIoT DIC-2 專案 — CWA Weather GIS ｜ 資料來源：交通部中央氣象署 (CWA) Open Data ｜ Neon PostgreSQL 雲端資料架構
        </p>
      </footer>
    </div>
  );
}
