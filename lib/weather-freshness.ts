export const WEATHER_STALE_AFTER_MINUTES = 120;

export function isWeatherObservationStale(
  observationTime: string | null,
  now = Date.now()
): boolean {
  if (!observationTime) return true;

  const observedAt = Date.parse(observationTime);
  if (!Number.isFinite(observedAt)) return true;

  return now - observedAt > WEATHER_STALE_AFTER_MINUTES * 60 * 1000;
}
