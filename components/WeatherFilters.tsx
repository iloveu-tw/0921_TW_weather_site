'use client';

import React from 'react';
import { Filter, Search, X } from 'lucide-react';

interface WeatherFiltersProps {
  counties: string[];
  searchTerm: string;
  selectedCounty: string;
  visibleCount: number;
  totalCount: number;
  onSearchTermChange: (value: string) => void;
  onCountyChange: (value: string) => void;
  onClear: () => void;
}

export default function WeatherFilters({
  counties,
  searchTerm,
  selectedCounty,
  visibleCount,
  totalCount,
  onSearchTermChange,
  onCountyChange,
  onClear,
}: WeatherFiltersProps) {
  const hasActiveFilters = searchTerm.trim() !== '' || selectedCounty !== 'all';

  return (
    <section className="gis-query-toolbar" aria-label="GIS 測站搜尋與篩選">
      <div className="search-bar">
        <Search className="search-icon" />
        <input
          id="input-search-station"
          type="search"
          className="search-input"
          aria-label="搜尋氣象測站名稱或站號"
          placeholder="搜尋測站名稱或站號（例如：臺中、467490）..."
          value={searchTerm}
          onChange={(event) => onSearchTermChange(event.target.value)}
        />
      </div>

      <div className="filter-group">
        <div className="select-wrapper">
          <Filter className="select-icon" />
          <select
            id="select-county-filter"
            className="county-select"
            aria-label="依縣市篩選氣象測站"
            value={selectedCounty}
            onChange={(event) => onCountyChange(event.target.value)}
          >
            <option value="all">全台灣所有地區</option>
            {counties.map((county) => (
              <option key={county} value={county}>
                {county}
              </option>
            ))}
          </select>
        </div>

        <span className="results-count" aria-live="polite">
          地圖與清單：{visibleCount} / {totalCount} 站
        </span>

        {hasActiveFilters && (
          <button type="button" className="btn-clear-filters" onClick={onClear}>
            <X className="btn-icon" />
            <span>清除條件</span>
          </button>
        )}
      </div>
    </section>
  );
}
