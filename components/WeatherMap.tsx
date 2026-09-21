'use client';

import React, { useEffect, useRef, useState } from 'react';
import { WeatherObservation } from '@/types/weather';
import { Layers, Eye, Compass, CloudRain, Sun, Moon, Map as MapIcon, Globe } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface WeatherMapProps {
  stations: WeatherObservation[];
  selectedStation: WeatherObservation | null;
  onSelectStation: (station: WeatherObservation) => void;
}

type BaseMapType = 'esriDark' | 'osm' | 'satellite';
type LeafletContainer = HTMLDivElement & { _leaflet_id?: number };

function getTempColor(temp: number | null): string {
  if (temp === null) return '#64748b';
  if (temp >= 35) return '#ef4444';
  if (temp >= 30) return '#f97316';
  if (temp >= 25) return '#eab308';
  if (temp >= 20) return '#10b981';
  if (temp >= 15) return '#06b6d4';
  return '#3b82f6';
}

function getRainColor(rain: number | null): string {
  if (rain === null || rain < 0) return '#64748b';
  if (rain === 0) return '#334155';
  if (rain < 2) return '#38bdf8';
  if (rain < 10) return '#0284c7';
  if (rain < 30) return '#2563eb';
  if (rain < 50) return '#f59e0b';
  return '#dc2626';
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;',
    };
    return entities[character];
  });
}

export default function WeatherMap({
  stations,
  selectedStation,
  onSelectStation,
}: WeatherMapProps) {
  const mapContainerRef = useRef<LeafletContainer>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const baseTileGroupRef = useRef<L.LayerGroup | null>(null);
  const stationLayerRef = useRef<L.LayerGroup | null>(null);
  const markerRendererRef = useRef<L.Canvas | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const countyLayerRef = useRef<L.GeoJSON | null>(null);
  const showCountiesRef = useRef<boolean>(true);

  const [baseMap, setBaseMap] = useState<BaseMapType>('esriDark');
  const [metricMode, setMetricMode] = useState<'temp' | 'rain'>('temp');
  const [showCounties, setShowCounties] = useState<boolean>(true);
  const [showStations, setShowStations] = useState<boolean>(true);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  // 1. 初始化地圖
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;
    if (mapContainerRef.current._leaflet_id) return;

    let isCancelled = false;
    const markers = markersRef.current;

    // 動態載入 Leaflet
    import('leaflet').then((L) => {
      if (isCancelled || !mapContainerRef.current) return;
      if (mapInstanceRef.current || mapContainerRef.current._leaflet_id) return;

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

      // 建立底圖圖層群組
      const baseTileGroup = L.layerGroup().addTo(map);
      baseTileGroupRef.current = baseTileGroup;
      stationLayerRef.current = L.layerGroup().addTo(map);
      markerRendererRef.current = L.canvas({ padding: 0.5 });

      mapInstanceRef.current = map;
      setMapLoaded(true);

      // 載入台灣縣市邊界 GeoJSON
      fetch('/geo/taiwan-counties.geojson', { cache: 'force-cache' })
        .then((res) => {
          if (!res.ok) throw new Error(`GeoJSON HTTP ${res.status}`);
          return res.json();
        })
        .then((geoData) => {
          if (isCancelled || !mapInstanceRef.current) return;
          const countyLayer = L.geoJSON(geoData, {
            style: {
              color: '#38bdf8',
              weight: 1.2,
              opacity: 0.6,
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
                    weight: 2.4,
                    color: '#67e8f9',
                    opacity: 0.95,
                    fillOpacity: 0.18,
                  });
                },
                mouseout: (e) => {
                  countyLayer.resetStyle(e.target);
                },
              });
            },
          });

          if (showCountiesRef.current) countyLayer.addTo(map);

          countyLayerRef.current = countyLayer;
        })
        .catch((err) => console.warn('載入縣市 GeoJSON 失敗:', err));
    });

    return () => {
      isCancelled = true;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        baseTileGroupRef.current = null;
        stationLayerRef.current = null;
        markerRendererRef.current = null;
        markers.clear();
        countyLayerRef.current = null;
      }
    };
  }, []);

  // 2. 切換免 API Key 底圖 (Esri Dark Gray / OSM / Esri Satellite)
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !baseTileGroupRef.current) return;

    import('leaflet').then((L) => {
      const group = baseTileGroupRef.current!;
      group.clearLayers();

      if (baseMap === 'esriDark') {
        // 1. Esri World Dark Gray Canvas (完全免 Key、零浮水印)
        const darkBase = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
          {
            attribution:
              '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>, HERE, Garmin, &copy; OpenStreetMap',
            maxZoom: 16,
          }
        );
        const darkRef = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 16,
            opacity: 0.8,
          }
        );
        group.addLayer(darkBase);
        group.addLayer(darkRef);
      } else if (baseMap === 'osm') {
        // 2. OpenStreetMap 標準開放街道圖 (完全免 Key)
        const osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
          maxZoom: 19,
        });
        group.addLayer(osm);
      } else if (baseMap === 'satellite') {
        // 3. Esri World Imagery 衛星空照圖 (完全免 Key)
        const sat = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
          {
            attribution:
              '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a>, Maxar, Earthstar Geographics',
            maxZoom: 19,
          }
        );
        const boundaries = L.tileLayer(
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
          {
            maxZoom: 19,
            opacity: 0.7,
          }
        );
        group.addLayer(sat);
        group.addLayer(boundaries);
      }
    });
  }, [baseMap, mapLoaded]);

  // 3. 切換縣市邊界圖層顯示
  useEffect(() => {
    showCountiesRef.current = showCounties;
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

  // 4. 僅在資料更新時建立 Marker；指標切換只更新 Canvas 樣式。
  useEffect(() => {
    if (
      !mapLoaded ||
      !stationLayerRef.current ||
      !markerRendererRef.current
    ) return;

    import('leaflet').then((L) => {
      const stationLayer = stationLayerRef.current;
      const renderer = markerRendererRef.current;
      if (!stationLayer || !renderer) return;

      stationLayer.clearLayers();
      markersRef.current.clear();

      stations.forEach((station) => {
        if (!station.latitude || !station.longitude) return;

        const color = getTempColor(station.temperature);

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
          renderer,
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
                <span class="popup-station-badge">${escapeHtml(station.station_id)}</span>
                <h4 class="popup-station-name">${escapeHtml(station.station_name)}</h4>
              </div>
              <span class="popup-temp-badge" style="background: ${color}25; color: ${color}; border-color: ${color}50;">
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
              <span>${escapeHtml(station.observation_time ? station.observation_time.replace('T', ' ').substring(0, 19) : '')}</span>
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

        marker.addTo(stationLayer);
        markersRef.current.set(station.station_id, marker);
      });
    });
  }, [stations, mapLoaded, onSelectStation]);

  useEffect(() => {
    const stationById = new Map(
      stations.map((station) => [station.station_id, station])
    );

    markersRef.current.forEach((marker, stationId) => {
      const station = stationById.get(stationId);
      if (!station) return;

      marker.setStyle({
        fillColor:
          metricMode === 'temp'
            ? getTempColor(station.temperature)
            : getRainColor(station.rainfall),
      });
    });
  }, [stations, metricMode]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const stationLayer = stationLayerRef.current;
    if (!map || !stationLayer) return;

    if (showStations && !map.hasLayer(stationLayer)) {
      stationLayer.addTo(map);
    } else if (!showStations && map.hasLayer(stationLayer)) {
      map.removeLayer(stationLayer);
    }
  }, [showStations, mapLoaded]);

  // 5. 當選中測站時平移並彈出 Popup
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
      <div
        ref={mapContainerRef}
        className="map-view"
        role="region"
        aria-label="台灣氣象測站互動地圖"
      />

      {/* 地圖上層浮動控制欄 (Glassmorphism Toolbar) */}
      <div className="map-toolbar">
        <div className="toolbar-group">
          {/* 底圖圖資切換 */}
          <div className="toolbar-metric-switch">
            <button
              id="btn-basemap-dark"
              className={`metric-btn ${baseMap === 'esriDark' ? 'active' : ''}`}
              aria-pressed={baseMap === 'esriDark'}
              onClick={() => setBaseMap('esriDark')}
              title="切換為 Esri 深色極簡畫布（免 Key、無浮水印）"
            >
              <Moon className="btn-icon" />
              <span>深色畫布</span>
            </button>
            <button
              id="btn-basemap-osm"
              className={`metric-btn ${baseMap === 'osm' ? 'active' : ''}`}
              aria-pressed={baseMap === 'osm'}
              onClick={() => setBaseMap('osm')}
              title="切換為 OpenStreetMap 標準街道圖（免 Key）"
            >
              <MapIcon className="btn-icon" />
              <span>標準地圖</span>
            </button>
            <button
              id="btn-basemap-satellite"
              className={`metric-btn ${baseMap === 'satellite' ? 'active' : ''}`}
              aria-pressed={baseMap === 'satellite'}
              onClick={() => setBaseMap('satellite')}
              title="切換為 Esri 衛星空照圖（免 Key）"
            >
              <Globe className="btn-icon" />
              <span>衛星影像</span>
            </button>
          </div>

          {/* 指標切換 */}
          <div className="toolbar-metric-switch">
            <button
              id="btn-metric-temp"
              className={`metric-btn ${metricMode === 'temp' ? 'active' : ''}`}
              aria-pressed={metricMode === 'temp'}
              onClick={() => setMetricMode('temp')}
              title="以氣溫著色"
            >
              <Sun className="btn-icon" />
              <span>氣溫分布</span>
            </button>
            <button
              id="btn-metric-rain"
              className={`metric-btn ${metricMode === 'rain' ? 'active' : ''}`}
              aria-pressed={metricMode === 'rain'}
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
              aria-pressed={showCounties}
              onClick={() => setShowCounties(!showCounties)}
              title="切換顯示台灣縣市邊界圖層"
            >
              <Layers className="btn-icon" />
              <span>縣市邊界</span>
            </button>

            <button
              id="btn-toggle-stations"
              className={`layer-toggle-btn ${showStations ? 'active' : ''}`}
              aria-pressed={showStations}
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
