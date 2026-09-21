'use client';

import React, { useState, useMemo } from 'react';
import { WeatherObservation } from '@/types/weather';
import { Search, ArrowUpDown, ChevronLeft, ChevronRight, MapPin, Filter } from 'lucide-react';

interface WeatherTableProps {
  stations: WeatherObservation[];
  selectedStation: WeatherObservation | null;
  onSelectStation: (station: WeatherObservation) => void;
}

type SortField = 'station_name' | 'temperature' | 'rainfall' | 'humidity' | 'wind_speed';
type SortOrder = 'asc' | 'desc';

export default function WeatherTable({
  stations,
  selectedStation,
  onSelectStation,
}: WeatherTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCounty, setSelectedCounty] = useState('all');
  const [sortField, setSortField] = useState<SortField>('temperature');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 台灣常見縣市清單供快速篩選
  const counties = [
    '基隆市', '臺北市', '新北市', '桃園市', '新竹市', '新竹縣', '苗栗縣',
    '臺中市', '彰化縣', '南投縣', '雲林縣', '嘉義市', '嘉義縣', '臺南市',
    '高雄市', '屏東縣', '宜蘭縣', '花蓮縣', '臺東縣', '澎湖縣', '金門縣', '連江縣'
  ];

  // 篩選測站
  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
      // 關鍵字搜尋 (測站名稱或 ID)
      const matchesSearch =
        searchTerm === '' ||
        station.station_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.station_id.toLowerCase().includes(searchTerm.toLowerCase());

      // 縣市篩選 (若測站名稱包含縣市簡寫或全稱)
      const matchesCounty =
        selectedCounty === 'all' ||
        station.station_name.includes(selectedCounty.replace('市', '').replace('縣', '')) ||
        (station.county && station.county.includes(selectedCounty));

      return matchesSearch && matchesCounty;
    });
  }, [stations, searchTerm, selectedCounty]);

  // 排序
  const sortedStations = useMemo(() => {
    return [...filteredStations].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB, 'zh-Hant')
          : valB.localeCompare(valA, 'zh-Hant');
      }

      return sortOrder === 'asc'
        ? (valA as number) - (valB as number)
        : (valB as number) - (valA as number);
    });
  }, [filteredStations, sortField, sortOrder]);

  // 分頁計算
  const totalPages = Math.ceil(sortedStations.length / pageSize) || 1;
  const paginatedStations = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStations.slice(start, start + pageSize);
  }, [sortedStations, currentPage, pageSize]);

  // 切換排序
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  return (
    <div className="table-card" id="weather-table-container">
      {/* 搜尋與篩選列 */}
      <div className="table-controls">
        <div className="search-bar">
          <Search className="search-icon" />
          <input
            id="input-search-station"
            type="text"
            className="search-input"
            placeholder="搜尋測站名稱或站號（例如：臺中、467490）..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="filter-group">
          <div className="select-wrapper">
            <Filter className="select-icon" />
            <select
              id="select-county-filter"
              className="county-select"
              value={selectedCounty}
              onChange={(e) => {
                setSelectedCounty(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">全台灣所有地區</option>
              {counties.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <span className="results-count">
            共 {sortedStations.length} 站
          </span>
        </div>
      </div>

      {/* 資料表格 */}
      <div className="table-scroll-container">
        <table className="weather-data-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('station_name')} className="sortable">
                <div className="th-content">
                  <span>測站資訊</span>
                  <ArrowUpDown className="sort-icon" />
                </div>
              </th>
              <th onClick={() => handleSort('temperature')} className="sortable text-right">
                <div className="th-content right">
                  <span>氣溫 (°C)</span>
                  <ArrowUpDown className="sort-icon" />
                </div>
              </th>
              <th onClick={() => handleSort('rainfall')} className="sortable text-right">
                <div className="th-content right">
                  <span>降雨量 (mm)</span>
                  <ArrowUpDown className="sort-icon" />
                </div>
              </th>
              <th onClick={() => handleSort('humidity')} className="sortable text-right">
                <div className="th-content right">
                  <span>濕度 (%)</span>
                  <ArrowUpDown className="sort-icon" />
                </div>
              </th>
              <th onClick={() => handleSort('wind_speed')} className="sortable text-right">
                <div className="th-content right">
                  <span>風速 (m/s)</span>
                  <ArrowUpDown className="sort-icon" />
                </div>
              </th>
              <th className="text-center">地圖定位</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStations.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty">
                  查無符合條件的氣象觀測站
                </td>
              </tr>
            ) : (
              paginatedStations.map((station) => {
                const isSelected = selectedStation?.station_id === station.station_id;
                const tempClass =
                  station.temperature === null
                    ? ''
                    : station.temperature >= 30
                    ? 'temp-hot'
                    : station.temperature <= 20
                    ? 'temp-cold'
                    : 'temp-normal';

                return (
                  <tr
                    key={station.station_id}
                    className={`table-row ${isSelected ? 'row-selected' : ''}`}
                    onClick={() => onSelectStation(station)}
                  >
                    <td>
                      <div className="td-station">
                        <span className="td-station-name">{station.station_name}</span>
                        <span className="td-station-id">{station.station_id}</span>
                      </div>
                    </td>
                    <td className={`text-right td-temp ${tempClass}`}>
                      {station.temperature !== null ? `${station.temperature.toFixed(1)}°` : '--'}
                    </td>
                    <td className="text-right td-rain">
                      {station.rainfall !== null && station.rainfall > 0 ? (
                        <span className="rain-badge">{station.rainfall.toFixed(1)}</span>
                      ) : (
                        <span className="rain-zero">0.0</span>
                      )}
                    </td>
                    <td className="text-right td-humid">
                      {station.humidity !== null ? `${station.humidity}%` : '--'}
                    </td>
                    <td className="text-right td-wind">
                      {station.wind_speed !== null ? station.wind_speed.toFixed(1) : '--'}
                    </td>
                    <td className="text-center">
                      <button
                        className="btn-locate"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectStation(station);
                        }}
                        title={`在地圖上定位 ${station.station_name} 測站`}
                      >
                        <MapPin className="locate-icon" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分頁控制 */}
      <div className="table-pagination">
        <span className="pagination-info">
          第 {currentPage} 頁 / 共 {totalPages} 頁 (每頁 {pageSize} 筆)
        </span>
        <div className="pagination-buttons">
          <button
            id="btn-prev-page"
            className="btn-page"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="page-icon" />
            <span>上一頁</span>
          </button>
          <button
            id="btn-next-page"
            className="btn-page"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            <span>下一頁</span>
            <ChevronRight className="page-icon" />
          </button>
        </div>
      </div>
    </div>
  );
}
