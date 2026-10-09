import type { CountyForecast, ForecastPeriod } from '@/types/forecast';

type CwaTime = {
  startTime?: string;
  endTime?: string;
  parameter?: { parameterName?: string };
};

type CwaElement = {
  elementName?: string;
  time?: CwaTime[];
};

type CwaLocation = {
  locationName?: string;
  weatherElement?: CwaElement[];
};

function numberOrNull(value: string | undefined): number | null {
  if (!value || value === '-') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function valueAt(
  elements: Map<string, CwaTime[]>,
  name: string,
  startTime: string,
  endTime: string
): string | undefined {
  return elements
    .get(name)
    ?.find((time) => time.startTime === startTime && time.endTime === endTime)
    ?.parameter?.parameterName;
}

export function parseCwaForecast(payload: unknown): CountyForecast[] {
  if (!payload || typeof payload !== 'object') return [];
  const response = payload as {
    success?: boolean | string;
    records?: { location?: CwaLocation[] };
  };
  if (response.success !== true && response.success !== 'true') return [];
  if (!Array.isArray(response.records?.location)) return [];

  return response.records.location.flatMap((location) => {
    if (!location.locationName || !Array.isArray(location.weatherElement)) return [];
    const elements = new Map(
      location.weatherElement.map((element) => [
        element.elementName ?? '',
        Array.isArray(element.time) ? element.time : [],
      ])
    );
    const periods: ForecastPeriod[] = (elements.get('Wx') ?? [])
      .filter((time) => time.startTime && time.endTime)
      .slice(0, 3)
      .map((time) => {
        const start = time.startTime!;
        const end = time.endTime!;
        return {
          start_time: start,
          end_time: end,
          weather: time.parameter?.parameterName ?? '未提供',
          min_temp: numberOrNull(valueAt(elements, 'MinT', start, end)),
          max_temp: numberOrNull(valueAt(elements, 'MaxT', start, end)),
          rain_probability: numberOrNull(valueAt(elements, 'PoP', start, end)),
        };
      });

    return periods.length
      ? [{ county: location.locationName.replace(/台/g, '臺'), periods }]
      : [];
  });
}
