'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '@/components/Header';
import WeatherStats from '@/components/WeatherStats';
import WeatherTable from '@/components/WeatherTable';
import { WeatherObservation } from '@/types/weather';
import { Loader2 } from 'lucide-react';

// 動態載入 Leaflet 地圖
const WeatherMap = dynamic(() => import('@/components/WeatherMap'), {
  ssr: false,
});

export default function HomePage() {
  const [stations, setStations] = useState<WeatherObservation[]>([]);
  const [selectedStation, setSelectedStation] = useState<WeatherObservation | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState<boolean>(false);

  useEffect(() => {
    setIsMounted(true);
    loadWeatherData();
  }, []);

  // 取得最新氣象資料
  const loadWeatherData = async () => {
    try {
      setErrorMsg(null);
      const res = await fetch('/api/weather');
      const json = await res.json();
      if (json.success) {
        setStations(json.data);
        setLastUpdated(json.updated_at);
      } else {
        setErrorMsg('無法讀取資料庫觀測紀錄: ' + (json.error || '未知錯誤'));
      }
    } catch (err) {
      setErrorMsg('連線到氣象 API 失敗，請確認伺服器狀態');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 點擊重新向 CWA 抓取並更新資料庫
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/refresh', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setStations(json.data);
        setLastUpdated(json.updated_at);
      } else {
        setErrorMsg('同步氣象署最新資料失敗: ' + (json.error || '請重試'));
      }
    } catch (err) {
      setErrorMsg('發送同步請求失敗，請確認後端網路連線');
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="app-container">
      {/* 頂部標題列 */}
      <Header
        lastUpdated={lastUpdated}
        stationCount={stations.length}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />

      {/* 錯誤通知列 */}
      {errorMsg && (
        <div className="error-banner">
          <span>⚠️ {errorMsg}</span>
          <button className="btn-dismiss" onClick={() => setErrorMsg(null)}>
            關閉
          </button>
        </div>
      )}

      {/* 主要內容區 */}
      <main className="main-content">
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
              {isMounted ? (
                <WeatherMap
                  stations={stations}
                  selectedStation={selectedStation}
                  onSelectStation={setSelectedStation}
                />
              ) : (
                <div className="map-loading-container">
                  <Loader2 className="loading-spinner" />
                  <span>正在初始化台灣 GIS 地圖圖台與氣象測站圖層...</span>
                </div>
              )}
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
      </main>

      {/* 底部頁尾 */}
      <footer className="app-footer">
        <p>
          AIoT DIC-2 專案 — CWA Weather GIS ｜ 資料來源：交通部中央氣象署 (CWA) Open Data ｜ Neon PostgreSQL 雲端資料架構
        </p>
      </footer>
    </div>
  );
}
