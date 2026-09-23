'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { WeatherObservation } from '@/types/weather';
import {
  filterSortAndPaginateWeather,
  type WeatherSortField,
  type WeatherSortOrder,
} from '@/lib/weather-view';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MapPin,
  X,
} from 'lucide-react';

interface WeatherTableProps {
  stations: WeatherObservation[];
  selectedStation: WeatherObservation | null;
  onSelectStation: (station: WeatherObservation) => void;
  filterKey: string;
  onClearFilters: () => void;
}

export default function WeatherTable({
  stations,
  selectedStation,
  onSelectStation,
  filterKey,
  onClearFilters,
}: WeatherTableProps) {
  const [sortField, setSortField] = useState<WeatherSortField>('temperature');
  const [sortOrder, setSortOrder] = useState<WeatherSortOrder>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const lastLocatedStationIdRef = useRef<string | null>(null);
  const pendingScrollStationIdRef = useRef<string | null>(null);
  const pageSize = 15;

  const { filteredAndSorted: sortedStations, pageItems: paginatedStations, totalPages } =
    useMemo(
      () =>
        filterSortAndPaginateWeather(stations, {
          searchTerm: '',
          county: 'all',
          sortField,
          sortOrder,
          page: currentPage,
          pageSize,
        }),
      [stations, sortField, sortOrder, currentPage]
    );

  // 切換排序
  const handleSort = (field: WeatherSortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setCurrentPage(1));
    return () => window.cancelAnimationFrame(frame);
  }, [filterKey]);

  const getAriaSort = (
    field: WeatherSortField
  ): React.AriaAttributes['aria-sort'] => {
    if (sortField !== field) return 'none';
    return sortOrder === 'asc' ? 'ascending' : 'descending';
  };

  const renderSortIcon = (field: WeatherSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="sort-icon" aria-hidden="true" />;
    }

    return sortOrder === 'asc' ? (
      <ArrowUp className="sort-icon active" aria-hidden="true" />
    ) : (
      <ArrowDown className="sort-icon active" aria-hidden="true" />
    );
  };

  useEffect(() => {
    if (!selectedStation) {
      lastLocatedStationIdRef.current = null;
      pendingScrollStationIdRef.current = null;
      return;
    }

    if (lastLocatedStationIdRef.current === selectedStation.station_id) return;

    lastLocatedStationIdRef.current = selectedStation.station_id;
    pendingScrollStationIdRef.current = selectedStation.station_id;

    const selectedIndex = sortedStations.findIndex(
      (station) => station.station_id === selectedStation.station_id
    );

    if (selectedIndex === -1) return;

    const selectedPage = Math.floor(selectedIndex / pageSize) + 1;
    if (currentPage === selectedPage) return;

    const frame = window.requestAnimationFrame(() => {
      setCurrentPage(selectedPage);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentPage, selectedStation, sortedStations]);

  useEffect(() => {
    const pendingStationId = pendingScrollStationIdRef.current;
    if (!pendingStationId) return;

    const frame = window.requestAnimationFrame(() => {
      const row = rowRefs.current.get(pendingStationId);
      if (!row) return;
      const scrollContainer = row.closest<HTMLElement>('.table-scroll-container');
      if (!scrollContainer) return;

      const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

      const rowRect = row.getBoundingClientRect();
      const containerRect = scrollContainer.getBoundingClientRect();
      const centeredScrollTop =
        scrollContainer.scrollTop +
        rowRect.top -
        containerRect.top -
        (scrollContainer.clientHeight - rowRect.height) / 2;
      scrollContainer.scrollTo({
        top: Math.max(0, centeredScrollTop),
        behavior: reduceMotion ? 'auto' : 'smooth',
      });
      pendingScrollStationIdRef.current = null;
    });

    return () => window.cancelAnimationFrame(frame);
  }, [currentPage, paginatedStations, selectedStation]);

  return (
    <div className="table-card" id="weather-table-container">
      {/* 資料表格 */}
      <div className="table-scroll-container">
        <table className="weather-data-table">
          <caption className="sr-only">全台氣象測站即時觀測資料</caption>
          <thead>
            <tr>
              <th className="sortable" aria-sort={getAriaSort('station_name')}>
                <button className="th-sort-button" onClick={() => handleSort('station_name')}>
                  <span>測站資訊</span>
                  {renderSortIcon('station_name')}
                </button>
              </th>
              <th className="sortable text-right" aria-sort={getAriaSort('temperature')}>
                <button className="th-sort-button right" onClick={() => handleSort('temperature')}>
                  <span>氣溫 (°C)</span>
                  {renderSortIcon('temperature')}
                </button>
              </th>
              <th className="sortable text-right" aria-sort={getAriaSort('rainfall')}>
                <button className="th-sort-button right" onClick={() => handleSort('rainfall')}>
                  <span>降雨量 (mm)</span>
                  {renderSortIcon('rainfall')}
                </button>
              </th>
              <th className="sortable text-right" aria-sort={getAriaSort('humidity')}>
                <button className="th-sort-button right" onClick={() => handleSort('humidity')}>
                  <span>濕度 (%)</span>
                  {renderSortIcon('humidity')}
                </button>
              </th>
              <th className="sortable text-right" aria-sort={getAriaSort('wind_speed')}>
                <button className="th-sort-button right" onClick={() => handleSort('wind_speed')}>
                  <span>風速 (m/s)</span>
                  {renderSortIcon('wind_speed')}
                </button>
              </th>
              <th className="text-center">地圖定位</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStations.length === 0 ? (
              <tr>
                <td colSpan={6} className="table-empty">
                  <span>找不到符合目前條件的測站</span>
                  <button type="button" className="btn-empty-clear" onClick={onClearFilters}>
                    <X className="btn-icon" />
                    <span>清除搜尋與縣市條件</span>
                  </button>
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
                    ref={(row) => {
                      if (row) rowRefs.current.set(station.station_id, row);
                      else rowRefs.current.delete(station.station_id);
                    }}
                    className={`table-row ${isSelected ? 'row-selected' : ''}`}
                    aria-selected={isSelected}
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
                        aria-label={`在地圖上定位 ${station.station_name} 測站`}
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
            id="btn-first-page"
            className="btn-page"
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1}
            aria-label="前往第一頁"
          >
            <ChevronsLeft className="page-icon" aria-hidden="true" />
            <span>第一頁</span>
          </button>
          <button
            id="btn-prev-page"
            className="btn-page"
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            aria-label="前往上一頁"
          >
            <ChevronLeft className="page-icon" aria-hidden="true" />
            <span>上一頁</span>
          </button>
          <button
            id="btn-next-page"
            className="btn-page"
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            aria-label="前往下一頁"
          >
            <span>下一頁</span>
            <ChevronRight className="page-icon" aria-hidden="true" />
          </button>
          <button
            id="btn-last-page"
            className="btn-page"
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages}
            aria-label="前往最後一頁"
          >
            <span>最後一頁</span>
            <ChevronsRight className="page-icon" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
