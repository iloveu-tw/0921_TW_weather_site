'use client';

import { useEffect, useState } from 'react';
import { Cloud, CloudRain, CloudSun, Sun } from 'lucide-react';
import type { ForecastApiResponse, ForecastPeriod } from '@/types/forecast';

interface WeatherForecastProps {
  county: string;
}

function formatTime(value: string): string {
  const iso = value.replace(' ', 'T');
  const timestamp = /(?:Z|[+-]\d{2}:\d{2})$/i.test(iso)
    ? iso
    : `${iso}+08:00`;
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString('zh-TW', {
        timeZone: 'Asia/Taipei',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
}

function WeatherIcon({ weather }: { weather: string }) {
  if (weather.includes('雨') || weather.includes('雷')) return <CloudRain aria-hidden="true" />;
  if (weather.includes('晴') && weather.includes('雲')) return <CloudSun aria-hidden="true" />;
  if (weather.includes('晴')) return <Sun aria-hidden="true" />;
  return <Cloud aria-hidden="true" />;
}

function ForecastCard({ period }: { period: ForecastPeriod }) {
  const temperature =
    period.min_temp === null || period.max_temp === null
      ? '氣溫未提供'
      : `${period.min_temp}–${period.max_temp}°C`;

  return (
    <div className="forecast-period">
      <span className="forecast-time">
        {formatTime(period.start_time)}–{formatTime(period.end_time)}
      </span>
      <div className="forecast-weather">
        <WeatherIcon weather={period.weather} />
        <span>{period.weather}</span>
      </div>
      <strong>{temperature}</strong>
      <span className="forecast-rain">
        降雨機率：{period.rain_probability === null ? '未提供' : `${period.rain_probability}%`}
      </span>
    </div>
  );
}

export default function WeatherForecast({ county }: WeatherForecastProps) {
  const [result, setResult] = useState<ForecastApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void fetch('/api/forecast', { signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as ForecastApiResponse;
        if (!response.ok || !body.success) {
          throw new Error(body.success ? '預報暫時無法讀取' : body.error.message);
        }
        setResult(body);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setResult({
          success: false,
          error: {
            message: error instanceof Error ? error.message : '預報暫時無法讀取',
          },
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [retryCount]);

  const normalizedCounty = county.replace(/台/g, '臺');
  const forecast = result?.success
    ? result.data.find((item) => item.county === normalizedCounty)
    : null;

  return (
    <section className="forecast-panel" aria-label="縣市未來 36 小時天氣預報">
      <div className="forecast-heading">
        <div>
          <span className="forecast-kicker">縣市預報 · 非測站觀測值</span>
          <h3>{county === 'all' ? '未來 36 小時天氣' : `${county} · 未來 36 小時`}</h3>
        </div>
        <CloudSun aria-hidden="true" />
      </div>

      {county === 'all' ? (
        <p className="forecast-message">請選擇縣市，查看該地區的天氣預報。</p>
      ) : loading ? (
        <p className="forecast-message" role="status">正在讀取縣市預報…</p>
      ) : result && !result.success ? (
        <div className="forecast-message" role="alert">
          {result.error.message}
          <button type="button" onClick={() => { setLoading(true); setRetryCount((count) => count + 1); }}>
            重新讀取
          </button>
        </div>
      ) : forecast ? (
        <div className="forecast-periods">
          {forecast.periods.map((period) => (
            <ForecastCard key={period.start_time} period={period} />
          ))}
        </div>
      ) : (
        <p className="forecast-message">目前沒有此縣市的預報資料。</p>
      )}

      <div className="forecast-footer">
        <span>{result?.success ? `資料取得：${formatTime(result.fetched_at)}` : '預報與觀測時間分開顯示'}</span>
        <a href="https://opendata.cwa.gov.tw/dataset/forecast/F-C0032-001" target="_blank" rel="noopener noreferrer">
          資料來源：中央氣象署
        </a>
      </div>
    </section>
  );
}
