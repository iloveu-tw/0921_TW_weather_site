/**
 * AIoT DIC-2 — CWA Weather GIS
 * 氣象觀測資料型態定義
 */

export interface WeatherObservation {
  id: number;
  station_id: string;
  station_name: string;
  latitude: number;
  longitude: number;
  temperature: number | null;
  humidity: number | null;
  rainfall: number | null;
  wind_speed: number | null;
  observation_time: string;
  county?: string;
}

export interface WeatherApiSuccessResponse {
  success: true;
  count: number;
  updated_at: string | null;
  data: WeatherObservation[];
}

export interface WeatherApiErrorResponse {
  success: false;
  error: {
    code: 'DATABASE_UNAVAILABLE' | 'INTERNAL_ERROR';
    message: string;
  };
}

export type WeatherApiResponse =
  | WeatherApiSuccessResponse
  | WeatherApiErrorResponse;

export interface WeatherStatsSummary {
  totalStations: number;
  maxTemp: { station: string; value: number } | null;
  minTemp: { station: string; value: number } | null;
  maxRain: { station: string; value: number } | null;
  avgHumidity: number | null;
  lastUpdated: string;
}
