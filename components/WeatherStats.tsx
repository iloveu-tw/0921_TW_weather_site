'use client';

import React from 'react';
import { WeatherObservation } from '@/types/weather';
import { Thermometer, CloudRain, Droplets, Radio } from 'lucide-react';

interface WeatherStatsProps {
  data: WeatherObservation[];
}

export default function WeatherStats({ data }: WeatherStatsProps) {
  // 計算統計指標
  const validTemp = data.filter((d) => d.temperature !== null && d.temperature > -50);
  const validRain = data.filter((d) => d.rainfall !== null && d.rainfall >= 0);
  const validHumid = data.filter((d) => d.humidity !== null && d.humidity >= 0);

  const maxTempStation = validTemp.reduce(
    (max, cur) => ((cur.temperature ?? -999) > (max?.temperature ?? -999) ? cur : max),
    validTemp[0] || null
  );

  const minTempStation = validTemp.reduce(
    (min, cur) => ((cur.temperature ?? 999) < (min?.temperature ?? 999) ? cur : min),
    validTemp[0] || null
  );

  const maxRainStation = validRain.reduce(
    (max, cur) => ((cur.rainfall ?? -1) > (max?.rainfall ?? -1) ? cur : max),
    validRain[0] || null
  );

  const avgHumidity =
    validHumid.length > 0
      ? (validHumid.reduce((acc, c) => acc + (c.humidity ?? 0), 0) / validHumid.length).toFixed(0)
      : '--';

  return (
    <div className="stats-grid" id="weather-stats-overview">
      {/* 測站總數 */}
      <div className="stat-card">
        <div className="stat-icon-wrapper blue">
          <Radio className="stat-icon" />
        </div>
        <div className="stat-info">
          <span className="stat-label">在線觀測站</span>
          <div className="stat-value-group">
            <span className="stat-value">{data.length}</span>
            <span className="stat-unit">站</span>
          </div>
          <span className="stat-subtext">全台自動與人工測站</span>
        </div>
      </div>

      {/* 全台最高溫 */}
      <div className="stat-card">
        <div className="stat-icon-wrapper red">
          <Thermometer className="stat-icon" />
        </div>
        <div className="stat-info">
          <span className="stat-label">全台最高溫</span>
          <div className="stat-value-group">
            <span className="stat-value hot">
              {maxTempStation?.temperature !== undefined && maxTempStation?.temperature !== null
                ? maxTempStation.temperature.toFixed(1)
                : '--'}
            </span>
            <span className="stat-unit">°C</span>
          </div>
          <span className="stat-subtext">{maxTempStation ? `${maxTempStation.station_name} 測站` : '--'}</span>
        </div>
      </div>

      {/* 全台最低溫 */}
      <div className="stat-card">
        <div className="stat-icon-wrapper cyan">
          <Thermometer className="stat-icon" />
        </div>
        <div className="stat-info">
          <span className="stat-label">全台最低溫</span>
          <div className="stat-value-group">
            <span className="stat-value cold">
              {minTempStation?.temperature !== undefined && minTempStation?.temperature !== null
                ? minTempStation.temperature.toFixed(1)
                : '--'}
            </span>
            <span className="stat-unit">°C</span>
          </div>
          <span className="stat-subtext">{minTempStation ? `${minTempStation.station_name} 測站` : '--'}</span>
        </div>
      </div>

      {/* 全台最大累積雨量 */}
      <div className="stat-card">
        <div className="stat-icon-wrapper amber">
          <CloudRain className="stat-icon" />
        </div>
        <div className="stat-info">
          <span className="stat-label">即時最大雨量</span>
          <div className="stat-value-group">
            <span className="stat-value rain">
              {maxRainStation?.rainfall !== undefined && maxRainStation?.rainfall !== null
                ? maxRainStation.rainfall.toFixed(1)
                : '0.0'}
            </span>
            <span className="stat-unit">mm</span>
          </div>
          <span className="stat-subtext">{maxRainStation ? `${maxRainStation.station_name} 測站` : '--'}</span>
        </div>
      </div>

      {/* 平均相對濕度 */}
      <div className="stat-card">
        <div className="stat-icon-wrapper emerald">
          <Droplets className="stat-icon" />
        </div>
        <div className="stat-info">
          <span className="stat-label">全台平均濕度</span>
          <div className="stat-value-group">
            <span className="stat-value">{avgHumidity}</span>
            <span className="stat-unit">%</span>
          </div>
          <span className="stat-subtext">空氣相對濕度</span>
        </div>
      </div>
    </div>
  );
}
