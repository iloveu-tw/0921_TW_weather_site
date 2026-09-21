'use client';

import React from 'react';
import { MapPin, Database } from 'lucide-react';

interface HeaderProps {
  observationTime: string;
  syncedAt: string;
  isStale: boolean;
}

function formatTime(value: string): string {
  return value
    ? new Date(value).toLocaleString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    : '讀取中...';
}

export default function Header({
  observationTime,
  syncedAt,
  isStale,
}: HeaderProps) {
  const formattedObservationTime = formatTime(observationTime);
  const formattedSyncTime = formatTime(syncedAt);

  return (
    <header className="app-header" id="main-header">
      <div className="header-brand">
        <div className="brand-logo-glow">
          <div className="brand-logo-icon">
            <MapPin className="logo-pin" />
          </div>
        </div>
        <div className="brand-text">
          <div className={`brand-badge ${isStale ? 'stale' : ''}`}>
            <span className="badge-pulse"></span>
            <span>{isStale ? 'CWA 資料已過期' : 'CWA 資料為最新狀態'}</span>
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
            <span className="meta-label">CWA 觀測時間:</span>
            <span className="meta-value highlight">{formattedObservationTime}</span>
          </div>
          <div className="meta-item">
            <span className="meta-label">Neon 同步時間:</span>
            <span className="meta-value">{formattedSyncTime}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
