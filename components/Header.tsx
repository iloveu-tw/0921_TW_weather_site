'use client';

import React from 'react';
import { RefreshCw, MapPin, Database, Sparkles } from 'lucide-react';

interface HeaderProps {
  lastUpdated: string;
  stationCount: number;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function Header({
  lastUpdated,
  stationCount,
  isRefreshing,
  onRefresh,
}: HeaderProps) {
  // 格式化觀測時間顯示
  const formattedTime = lastUpdated
    ? new Date(lastUpdated).toLocaleString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '讀取中...';

  return (
    <header className="app-header" id="main-header">
      <div className="header-brand">
        <div className="brand-logo-glow">
          <div className="brand-logo-icon">
            <MapPin className="logo-pin" />
          </div>
        </div>
        <div className="brand-text">
          <div className="brand-badge">
            <span className="badge-pulse"></span>
            <span>CWA Open Data 即時連線</span>
            <span className="badge-pill">Phase 3 Web GIS</span>
          </div>
          <h1 className="brand-title">台灣即時氣象 GIS 觀測圖台</h1>
          <p className="brand-subtitle">
            AIoT DIC-2 專案 — 空間氣象監測與全台測站大數據視覺化
          </p>
        </div>
      </div>

      <div className="header-actions">
        <div className="header-meta">
          <div className="meta-item">
            <Database className="meta-icon" />
            <span className="meta-label">資料來源:</span>
            <span className="meta-value">Neon PostgreSQL</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">最後觀測時間:</span>
            <span className="meta-value highlight">{formattedTime}</span>
          </div>
        </div>

        <button
          id="btn-refresh-weather"
          className={`btn-refresh ${isRefreshing ? 'loading' : ''}`}
          onClick={onRefresh}
          disabled={isRefreshing}
          title="從中央氣象署即時同步最新氣象資料"
        >
          <RefreshCw className={`btn-icon ${isRefreshing ? 'spin' : ''}`} />
          <span>{isRefreshing ? '正在同步 CWA 資料庫...' : '即時同步氣象資料'}</span>
        </button>
      </div>
    </header>
  );
}
