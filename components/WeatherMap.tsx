'use client';

import React, { useEffect, useRef, useState } from 'react';
import { WeatherObservation } from '@/types/weather';
import { Layers, Eye, Compass, CloudRain, Sun } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface WeatherMapProps {
  stations: WeatherObservation[];
  selectedStation: WeatherObservation | null;
  onSelectStation: (station: WeatherObservation) => void;
}

export default function WeatherMap({
  stations,
  selectedStation,
  onSelectStation,
}: WeatherMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const countyLayerRef = useRef<L.GeoJSON | null>(null);

  const [metricMode, setMetricMode] = useState<'temp' | 'rain'>('temp');
  const [showCounties, setShowCounties] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // 取得氣溫對應顏色
  const getTempColor = (temp: number | null): string => {
    if (temp === null) return '#64748b'; // 灰色缺測
    if (temp >= 35) return '#ef4444';    // 極高溫 (深紅)
    if (temp >= 30) return '#f97316';    // 高溫 (橘紅)
    if (temp >= 25) return '#eab308';    // 溫暖 (金黃)
    if (temp >= 20) return '#10b981';    // 舒適 (翠綠)
    if (temp >= 15) return '#06b6d4';    // 涼爽 (青藍)
    return '#3b82f6';                    // 寒冷 (湛藍)
  };

  // 取得雨量對應顏色
  const getRainColor = (rain: number | null): string => {
    if (rain === null || rain < 0) return '#64748b';
    if (rain === 0) return '#334155';     // 無雨
    if (rain < 2) return '#38bdf8';       // 微雨
    if (rain < 10) return '#0284c7';      // 小雨
    if (rain < 30) return '#2563eb';      // 中雨
    if (rain < 50) return '#f59e0b';      // 大雨
    return '#dc2626';                     // 豪大雨 (紅紫)
  };

  // 1. 初始化地圖
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;
    if ((mapContainerRef.current as any)._leaflet_id) return;

    let isCancelled = false;

    // 動態載入 Leaflet
    import('leaflet').then((L) => {
      if (isCancelled || !mapContainerRef.current) return;
      if (mapInstanceRef.current || (mapContainerRef.current as any)._leaflet_id) return;

      // 台灣地理中心與縮放等級 (中央約 23.7, 120.95)
      const map = L.map(mapContainerRef.current, {
        center: [23.7, 120.95],
        zoom: 7.5,
        minZoom: 6,
        maxZoom: 18,
        zoomControl: false,
      });

      // 新增縮放控制項到右下角
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // 高質感 CartoDB 深色底圖
      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        {
          attribution:
            '&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }
      ).addTo(map);

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // 載入台灣縣市邊界 GeoJSON
      fetch('/geo/taiwan-counties.geojson')
        .then((res) => res.json())
        .then((geoData) => {
          if (isCancelled || !mapInstanceRef.current) return;
          const countyLayer = L.geoJSON(geoData, {
            style: {
              color: '#38bdf8',
              weight: 1.2,
              opacity: 0.5,
              fillColor: '#0284c7',
              fillOpacity: 0.04,
              dashArray: '3, 4',
            },
            onEachFeature: (feature, layer) => {
              const countyName =
                feature.properties?.COUNTYNAME ||
                feature.properties?.name ||
                '縣市';
              layer.bindTooltip(countyName, {
                sticky: true,
                className: 'county-tooltip',
              });
              layer.on({
                mouseover: (e) => {
                  const target = e.target;
                  target.setStyle({
                    weight: 2.2,
                    color: '#67e8f9',
                    opacity: 0.9,
                    fillOpacity: 0.15,
                  });
                },
                mouseout: (e) => {
                  countyLayer.resetStyle(e.target);
                },
              });
            },
          }).addTo(map);

          countyLayerRef.current = countyLayer;
        })
        .catch((err) => console.warn('載入縣市 GeoJSON 失敗:', err));
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 2. 切換縣市邊界圖層顯示
  useEffect(() => {
    if (!mapInstanceRef.current || !countyLayerRef.current) return;
    if (showCounties) {
      if (!mapInstanceRef.current.hasLayer(countyLayerRef.current)) {
        countyLayerRef.current.addTo(mapInstanceRef.current);
      }
    } else {
      if (mapInstanceRef.current.hasLayer(countyLayerRef.current)) {
        mapInstanceRef.current.removeLayer(countyLayerRef.current);
      }
    }
  }, [showCounties]);

  // 3. 繪製氣象測站 Marker
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;

    import('leaflet').then((L) => {
      const map = mapInstanceRef.current!;

      // 清除舊 Markers
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current.clear();

      if (!showStations) return;

      stations.forEach((station) => {
        if (!station.latitude || !station.longitude) return;

        const color =
          metricMode === 'temp'
            ? getTempColor(station.temperature)
            : getRainColor(station.rainfall);

        const tempText =
          station.temperature !== null
            ? `${station.temperature.toFixed(1)}°`
            : 'N/A';
        const rainText =
          station.rainfall !== null ? `${station.rainfall.toFixed(1)} mm` : '--';
        const humidText =
          station.humidity !== null ? `${station.humidity}%` : '--';
        const windText =
          station.wind_speed !== null
            ? `${station.wind_speed.toFixed(1)} m/s`
            : '--';

        const marker = L.circleMarker([station.latitude, station.longitude], {
          radius: 7,
          fillColor: color,
          color: '#ffffff',
          weight: 1.5,
          opacity: 0.9,
          fillOpacity: 0.85,
        });

        // 彈跳視窗內容
        const popupContent = `
          <div class="custom-popup-card">
            <div class="popup-header">
              <div class="popup-title-group">
                <span class="popup-station-badge">${station.station_id}</span>
                <h4 class="popup-station-name">${station.station_name}</h4>
              </div>
              <span class="popup-temp-badge" style="background: ${color}20; color: ${color}; border-color: ${color}50;">
                ${tempText}
              </span>
            </div>
            
            <div class="popup-body">
              <div class="popup-metric">
                <span class="metric-name">即時氣溫</span>
                <span class="metric-val highlight">${tempText}</span>
              </div>
              <div class="popup-metric">
                <span class="metric-name">當前累積雨量</span>
                <span class="metric-val">${rainText}</span>
              </div>
              <div class="popup-metric">
                <span class="metric-name">相對濕度</span>
                <span class="metric-val">${humidText}</span>
              </div>
              <div class="popup-metric">
                <span class="metric-name">觀測風速</span>
                <span class="metric-val">${windText}</span>
              </div>
            </div>

            <div class="popup-footer">
              <span>座標: ${station.latitude.toFixed(2)}°N, ${station.longitude.toFixed(2)}°E</span>
              <span>${station.observation_time ? station.observation_time.replace('T', ' ').substring(0, 19) : ''}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          className: 'glass-popup',
          closeButton: true,
          offset: [0, -6],
        });

        marker.on('click', () => {
          onSelectStation(station);
        });

        marker.addTo(map);
        markersRef.current.set(station.station_id, marker);
      });
    });
  }, [stations, metricMode, showStations, mapLoaded, onSelectStation]);

  // 4. 當選中測站時平移並彈出 Popup
  useEffect(() => {
    if (!selectedStation || !mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const marker = markersRef.current.get(selectedStation.station_id);

    if (marker) {
      map.flyTo([selectedStation.latitude, selectedStation.longitude], 12, {
        duration: 1.2,
      });
      setTimeout(() => {
        marker.openPopup();
      }, 800);
    }
  }, [selectedStation]);

  // 重置台灣視角
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([23.7, 120.95], 7.5, { duration: 1 });
    }
  };

  return (
    <div className="map-wrapper" id="web-gis-map-container">
      {/* 地圖容器 */}
      <div ref={mapContainerRef} className="map-view" />

      {/* 地圖上層浮動控制欄 (Glassmorphism Toolbar) */}
      <div className="map-toolbar">
        <div className="toolbar-group">
          {/* 指標切換 */}
          <div className="toolbar-metric-switch">
            <button
              id="btn-metric-temp"
              className={`metric-btn ${metricMode === 'temp' ? 'active' : ''}`}
              onClick={() => setMetricMode('temp')}
              title="以氣溫著色"
            >
              <Sun className="btn-icon" />
              <span>氣溫分布</span>
            </button>
            <button
              id="btn-metric-rain"
              className={`metric-btn ${metricMode === 'rain' ? 'active' : ''}`}
              onClick={() => setMetricMode('rain')}
              title="以雨量著色"
            >
              <CloudRain className="btn-icon" />
              <span>雨量分布</span>
            </button>
          </div>

          {/* 圖層開關 */}
          <div className="toolbar-layer-toggles">
            <button
              id="btn-toggle-counties"
              className={`layer-toggle-btn ${showCounties ? 'active' : ''}`}
              onClick={() => setShowCounties(!showCounties)}
              title="切換顯示台灣縣市邊界圖層"
            >
              <Layers className="btn-icon" />
              <span>縣市邊界</span>
            </button>

            <button
              id="btn-toggle-stations"
              className={`layer-toggle-btn ${showStations ? 'active' : ''}`}
              onClick={() => setShowStations(!showStations)}
              title="切換顯示氣象站點"
            >
              <Eye className="btn-icon" />
              <span>測站標記</span>
            </button>
          </div>
        </div>

        {/* 台灣全貌復位按鈕 */}
        <button
          id="btn-reset-taiwan-view"
          className="btn-reset-view"
          onClick={handleResetView}
          title="回歸台灣全島視角"
        >
          <Compass className="btn-icon" />
          <span>全島視角</span>
        </button>
      </div>

      {/* 色階圖例 (Legend) */}
      <div className="map-legend">
        <span className="legend-title">
          {metricMode === 'temp' ? '氣溫階層 (°C)' : '即時累積降雨 (mm)'}
        </span>
        <div className="legend-items">
          {metricMode === 'temp' ? (
            <>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#ef4444' }}></span>≥35°</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#f97316' }}></span>30~35°</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#eab308' }}></span>25~30°</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#10b981' }}></span>20~25°</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#06b6d4' }}></span>15~20°</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#3b82f6' }}></span>&lt;15°</div>
            </>
          ) : (
            <>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#dc2626' }}></span>≥50mm</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#f59e0b' }}></span>30~50mm</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#2563eb' }}></span>10~30mm</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#38bdf8' }}></span>微雨</div>
              <div className="legend-item"><span className="legend-dot" style={{ background: '#334155' }}></span>無雨</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
