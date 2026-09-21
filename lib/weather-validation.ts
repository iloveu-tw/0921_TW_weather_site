import type { WeatherObservation } from '../types/weather';

const MINIMUM_STATION_COUNT = 500;
const MINIMUM_EXISTING_RATIO = 0.8;
const MAX_DATA_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_OFFSET_MS = 60 * 60 * 1000;
const MISSING_VALUES = new Set([-99, -999, -9999]);

export type WeatherObservationInput = Omit<WeatherObservation, 'id'>;

export class WeatherSyncError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'WeatherSyncError';
    this.code = code;
  }
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseMetric(
  value: unknown,
  minimum: number,
  maximum: number
): number | null {
  if (value === null || value === undefined || value === '') return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || MISSING_VALUES.has(parsed)) return null;
  return parsed >= minimum && parsed <= maximum ? parsed : null;
}

function normalizeStation(value: unknown): WeatherObservationInput {
  const station = asObject(value);
  const obsTime = asObject(station.ObsTime);
  const geoInfo = asObject(station.GeoInfo);
  const weather = asObject(station.WeatherElement);
  const nowWeather = asObject(weather.Now);
  const coordinates = Array.isArray(geoInfo.Coordinates)
    ? geoInfo.Coordinates.map(asObject)
    : [];
  const coordinate =
    coordinates.find((item) => item.CoordinateName === 'WGS84') ??
    coordinates[0] ??
    {};

  return {
    station_id: asString(station.StationId),
    station_name: asString(station.StationName),
    county: asString(geoInfo.CountyName),
    town: asString(geoInfo.TownName),
    latitude: Number(coordinate.StationLatitude),
    longitude: Number(coordinate.StationLongitude),
    temperature: parseMetric(weather.AirTemperature, -50, 60),
    humidity: parseMetric(weather.RelativeHumidity, 0, 100),
    rainfall: parseMetric(
      nowWeather.Precipitation ?? weather.Precipitation,
      0,
      2_000
    ),
    wind_speed: parseMetric(weather.WindSpeed, 0, 150),
    observation_time: asString(obsTime.DateTime),
  };
}

export function normalizeCwaPayload(payload: unknown): WeatherObservationInput[] {
  const root = asObject(payload);
  const records = asObject(root.records);

  if (root.success !== 'true' && root.success !== true) {
    throw new WeatherSyncError('CWA_RESPONSE_FAILED', 'CWA 回傳失敗狀態');
  }

  if (!Array.isArray(records.Station)) {
    throw new WeatherSyncError('CWA_SCHEMA_INVALID', 'CWA 測站陣列不存在');
  }

  return records.Station.map(normalizeStation);
}

export function validateWeatherSnapshot(
  records: WeatherObservationInput[],
  existingCount: number,
  now = Date.now()
): void {
  const minimumCount = Math.max(
    MINIMUM_STATION_COUNT,
    Math.floor(existingCount * MINIMUM_EXISTING_RATIO)
  );

  if (records.length < minimumCount) {
    throw new WeatherSyncError(
      'STATION_COUNT_TOO_LOW',
      `測站數 ${records.length} 低於安全門檻 ${minimumCount}`
    );
  }

  const stationIds = new Set<string>();

  for (const record of records) {
    if (
      !record.station_id ||
      !record.station_name ||
      !record.county ||
      !record.town
    ) {
      throw new WeatherSyncError('REQUIRED_FIELD_MISSING', '測站必要欄位缺失');
    }

    if (stationIds.has(record.station_id)) {
      throw new WeatherSyncError('DUPLICATE_STATION_ID', '測站代碼重複');
    }
    stationIds.add(record.station_id);

    if (
      !Number.isFinite(record.latitude) ||
      !Number.isFinite(record.longitude) ||
      record.latitude < 10 ||
      record.latitude > 27.5 ||
      record.longitude < 114 ||
      record.longitude > 123.5
    ) {
      throw new WeatherSyncError('COORDINATE_INVALID', '測站座標超出合理範圍');
    }

    const observationTime = Date.parse(record.observation_time);
    if (!Number.isFinite(observationTime)) {
      throw new WeatherSyncError('OBSERVATION_TIME_INVALID', '觀測時間格式錯誤');
    }

    if (
      observationTime < now - MAX_DATA_AGE_MS ||
      observationTime > now + MAX_FUTURE_OFFSET_MS
    ) {
      throw new WeatherSyncError('OBSERVATION_TIME_STALE', '觀測資料時間異常');
    }
  }
}
