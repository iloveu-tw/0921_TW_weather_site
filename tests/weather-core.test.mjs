import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCwaPayload,
  validateWeatherSnapshot,
  WeatherSyncError,
} from '../lib/weather-validation.ts';
import { isWeatherObservationStale } from '../lib/weather-freshness.ts';
import {
  filterSortAndPaginateWeather,
  summarizeWeather,
} from '../lib/weather-view.ts';

const NOW = Date.parse('2026-09-22T02:00:00.000Z');

function observation(index, overrides = {}) {
  return {
    id: index + 1,
    station_id: `C${String(index).padStart(5, '0')}`,
    station_name: `測站 ${index}`,
    county: index % 2 === 0 ? '臺北市' : '新北市',
    town: '測試區',
    latitude: 23.5,
    longitude: 121,
    temperature: 20 + index,
    humidity: 60,
    rainfall: 0,
    wind_speed: 2,
    observation_time: '2026-09-22T01:00:00.000Z',
    ...overrides,
  };
}

function validSnapshot() {
  return Array.from({ length: 500 }, (_, index) => observation(index));
}

test('CWA 正規化會轉換缺測值並保留縣市與鄉鎮', () => {
  const records = normalizeCwaPayload({
    success: 'true',
    records: {
      Station: [{
        StationId: 'A001',
        StationName: '測試站',
        ObsTime: { DateTime: '2026-09-22T01:00:00.000Z' },
        GeoInfo: {
          CountyName: '臺中市',
          TownName: '西屯區',
          Coordinates: [{
            CoordinateName: 'WGS84',
            StationLatitude: '24.18',
            StationLongitude: '120.64',
          }],
        },
        WeatherElement: {
          AirTemperature: '-99',
          RelativeHumidity: '65',
          WindSpeed: '-999',
          Now: { Precipitation: '1.5' },
        },
      }],
    },
  });

  assert.equal(records[0].temperature, null);
  assert.equal(records[0].wind_speed, null);
  assert.equal(records[0].rainfall, 1.5);
  assert.equal(records[0].county, '臺中市');
  assert.equal(records[0].town, '西屯區');
});

test('空回應與低筆數快照會在寫入前遭拒絕', () => {
  assert.throws(
    () => normalizeCwaPayload({ success: 'true', records: {} }),
    (error) => error instanceof WeatherSyncError && error.code === 'CWA_SCHEMA_INVALID'
  );
  assert.throws(
    () => validateWeatherSnapshot([], 876, NOW),
    (error) => error instanceof WeatherSyncError && error.code === 'STATION_COUNT_TOO_LOW'
  );
});

test('重複站號、異常座標與過期時間會遭拒絕', () => {
  const duplicate = validSnapshot();
  duplicate[499] = observation(499, { station_id: duplicate[0].station_id });
  assert.throws(
    () => validateWeatherSnapshot(duplicate, 500, NOW),
    (error) => error instanceof WeatherSyncError && error.code === 'DUPLICATE_STATION_ID'
  );

  const invalidCoordinate = validSnapshot();
  invalidCoordinate[20] = observation(20, { latitude: 99 });
  assert.throws(
    () => validateWeatherSnapshot(invalidCoordinate, 500, NOW),
    (error) => error instanceof WeatherSyncError && error.code === 'COORDINATE_INVALID'
  );

  const stale = validSnapshot();
  stale[10] = observation(10, { observation_time: '2026-09-20T01:00:00.000Z' });
  assert.throws(
    () => validateWeatherSnapshot(stale, 500, NOW),
    (error) => error instanceof WeatherSyncError && error.code === 'OBSERVATION_TIME_STALE'
  );
});

test('有效快照及 120 分鐘新鮮度邊界通過', () => {
  assert.doesNotThrow(() => validateWeatherSnapshot(validSnapshot(), 500, NOW));
  assert.equal(
    isWeatherObservationStale('2026-09-22T00:00:00.000Z', NOW),
    false
  );
  assert.equal(
    isWeatherObservationStale('2026-09-21T23:59:59.999Z', NOW),
    true
  );
});

test('統計摘要忽略缺測值並正確計算極值與平均', () => {
  const summary = summarizeWeather([
    observation(1, { station_name: '甲', temperature: 10, rainfall: null, humidity: 50 }),
    observation(2, { station_name: '乙', temperature: 35, rainfall: 8, humidity: 70 }),
    observation(3, { station_name: '丙', temperature: null, rainfall: 2, humidity: null }),
  ]);

  assert.equal(summary.maxTempStation.station_name, '乙');
  assert.equal(summary.minTempStation.station_name, '甲');
  assert.equal(summary.maxRainStation.station_name, '乙');
  assert.equal(summary.averageHumidity, 60);
});

test('搜尋、縣市精確篩選、排序與分頁可重複驗證', () => {
  const stations = [
    observation(1, { station_id: 'A01', station_name: '臺北', county: '臺北市', temperature: 25 }),
    observation(2, { station_id: 'A02', station_name: '淡水', county: '新北市', temperature: null }),
    observation(3, { station_id: 'B01', station_name: '板橋', county: '新北市', temperature: 31 }),
  ];
  const result = filterSortAndPaginateWeather(stations, {
    searchTerm: 'B',
    county: '新北市',
    sortField: 'temperature',
    sortOrder: 'desc',
    page: 1,
    pageSize: 1,
  });

  assert.deepEqual(result.filteredAndSorted.map((item) => item.station_id), ['B01']);
  assert.equal(result.pageItems.length, 1);
  assert.equal(result.totalPages, 1);

  const paged = filterSortAndPaginateWeather(stations, {
    searchTerm: '',
    county: 'all',
    sortField: 'temperature',
    sortOrder: 'desc',
    page: 2,
    pageSize: 2,
  });
  assert.deepEqual(paged.filteredAndSorted.map((item) => item.station_id), ['B01', 'A01', 'A02']);
  assert.deepEqual(paged.pageItems.map((item) => item.station_id), ['A02']);
});
