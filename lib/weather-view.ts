import type { WeatherObservation } from '@/types/weather';

export type WeatherSortField =
  | 'station_name'
  | 'temperature'
  | 'rainfall'
  | 'humidity'
  | 'wind_speed';
export type WeatherSortOrder = 'asc' | 'desc';

export function summarizeWeather(data: WeatherObservation[]) {
  const validTemp = data.filter((item) => item.temperature !== null);
  const validRain = data.filter((item) => item.rainfall !== null);
  const validHumidity = data.filter((item) => item.humidity !== null);

  return {
    maxTempStation: validTemp.reduce<WeatherObservation | null>(
      (max, item) =>
        !max || (item.temperature ?? -Infinity) > (max.temperature ?? -Infinity)
          ? item
          : max,
      null
    ),
    minTempStation: validTemp.reduce<WeatherObservation | null>(
      (min, item) =>
        !min || (item.temperature ?? Infinity) < (min.temperature ?? Infinity)
          ? item
          : min,
      null
    ),
    maxRainStation: validRain.reduce<WeatherObservation | null>(
      (max, item) =>
        !max || (item.rainfall ?? -Infinity) > (max.rainfall ?? -Infinity)
          ? item
          : max,
      null
    ),
    averageHumidity:
      validHumidity.length === 0
        ? null
        : validHumidity.reduce(
            (total, item) => total + (item.humidity ?? 0),
            0
          ) / validHumidity.length,
  };
}

export function filterSortAndPaginateWeather(
  stations: WeatherObservation[],
  options: {
    searchTerm: string;
    county: string;
    sortField: WeatherSortField;
    sortOrder: WeatherSortOrder;
    page: number;
    pageSize: number;
  }
) {
  const normalizedSearch = options.searchTerm.trim().toLocaleLowerCase('zh-Hant');
  const filtered = stations.filter((station) => {
    const matchesSearch =
      normalizedSearch === '' ||
      station.station_name.toLocaleLowerCase('zh-Hant').includes(normalizedSearch) ||
      station.station_id.toLocaleLowerCase('zh-Hant').includes(normalizedSearch);
    const matchesCounty =
      options.county === 'all' || station.county === options.county;
    return matchesSearch && matchesCounty;
  });

  const sorted = [...filtered].sort((left, right) => {
    const leftValue = left[options.sortField];
    const rightValue = right[options.sortField];

    if (leftValue === null || leftValue === undefined) return 1;
    if (rightValue === null || rightValue === undefined) return -1;

    const comparison =
      typeof leftValue === 'string' && typeof rightValue === 'string'
        ? leftValue.localeCompare(rightValue, 'zh-Hant')
        : (leftValue as number) - (rightValue as number);
    return options.sortOrder === 'asc' ? comparison : -comparison;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / options.pageSize));
  const page = Math.min(Math.max(1, options.page), totalPages);
  const start = (page - 1) * options.pageSize;

  return {
    filteredAndSorted: sorted,
    pageItems: sorted.slice(start, start + options.pageSize),
    page,
    totalPages,
  };
}
