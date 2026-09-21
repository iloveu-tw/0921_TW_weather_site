import {
  getWeatherObservationCount,
  replaceWeatherObservations,
} from '@/lib/database';
import {
  normalizeCwaPayload,
  validateWeatherSnapshot,
  WeatherSyncError,
} from '@/lib/weather-validation';
export { WeatherSyncError } from '@/lib/weather-validation';

const CWA_DATASET_ID = 'O-A0001-001';
const CWA_API_URL = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/${CWA_DATASET_ID}`;
const FETCH_TIMEOUT_MS = 45_000;
async function fetchCwaPayload(): Promise<unknown> {
  const apiKey = process.env.CWA_API_KEY?.trim();
  if (!apiKey) {
    throw new WeatherSyncError('CWA_API_KEY_MISSING', 'CWA_API_KEY 未設定');
  }

  const url = new URL(CWA_API_URL);
  url.searchParams.set('Authorization', apiKey);
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { 'User-Agent': 'taiwan-weather-site/1.0' },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      cache: 'no-store',
    });
  } catch (error) {
    const code =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'CWA_TIMEOUT'
        : 'CWA_NETWORK_ERROR';
    throw new WeatherSyncError(code, '無法取得 CWA 資料');
  }

  if (!response.ok) {
    throw new WeatherSyncError(
      'CWA_HTTP_ERROR',
      `CWA HTTP 狀態 ${response.status}`
    );
  }

  try {
    return await response.json();
  } catch {
    throw new WeatherSyncError('CWA_RESPONSE_INVALID', 'CWA 回應格式錯誤');
  }
}

export async function synchronizeWeatherFromCwa(runId: string) {
  const [payload, existingCount] = await Promise.all([
    fetchCwaPayload(),
    getWeatherObservationCount(),
  ]);
  const records = normalizeCwaPayload(payload);
  validateWeatherSnapshot(records, existingCount);
  await replaceWeatherObservations(records, runId);

  const updatedAt = records.reduce((latest, record) => {
    return Date.parse(record.observation_time) > Date.parse(latest)
      ? record.observation_time
      : latest;
  }, records[0].observation_time);

  return {
    count: records.length,
    updatedAt,
  };
}
