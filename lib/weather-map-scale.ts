export interface WeatherScaleBand {
  key: string;
  label: string;
  color: string;
  min?: number;
}

export const TEMPERATURE_SCALE: readonly WeatherScaleBand[] = [
  { key: 'temp-35-up', label: '≥ 35°', color: '#ef4444', min: 35 },
  { key: 'temp-30-35', label: '30–<35°', color: '#f97316', min: 30 },
  { key: 'temp-25-30', label: '25–<30°', color: '#eab308', min: 25 },
  { key: 'temp-20-25', label: '20–<25°', color: '#10b981', min: 20 },
  { key: 'temp-15-20', label: '15–<20°', color: '#06b6d4', min: 15 },
  { key: 'temp-under-15', label: '< 15°', color: '#3b82f6' },
];

export const RAINFALL_SCALE: readonly WeatherScaleBand[] = [
  { key: 'rain-50-up', label: '≥ 50', color: '#dc2626', min: 50 },
  { key: 'rain-30-50', label: '30–<50', color: '#f59e0b', min: 30 },
  { key: 'rain-10-30', label: '10–<30', color: '#2563eb', min: 10 },
  { key: 'rain-2-10', label: '2–<10', color: '#0284c7', min: 2 },
  { key: 'rain-under-2', label: '> 0–<2', color: '#38bdf8', min: 0 },
];

export const NO_RAIN_BAND: WeatherScaleBand = {
  key: 'rain-zero',
  label: '0',
  color: '#334155',
};

export const NO_DATA_BAND: WeatherScaleBand = {
  key: 'no-data',
  label: '無資料',
  color: '#64748b',
};

export function getTemperatureBand(
  temperature: number | null
): WeatherScaleBand {
  if (temperature === null) return NO_DATA_BAND;

  return (
    TEMPERATURE_SCALE.find(
      (band) => band.min === undefined || temperature >= band.min
    ) ?? NO_DATA_BAND
  );
}

export function getRainfallBand(rainfall: number | null): WeatherScaleBand {
  if (rainfall === null || rainfall < 0) return NO_DATA_BAND;
  if (rainfall === 0) return NO_RAIN_BAND;

  return (
    RAINFALL_SCALE.find(
      (band) => band.min !== undefined && rainfall >= band.min
    ) ?? NO_DATA_BAND
  );
}
