import { NextResponse } from 'next/server';
import {
  getAllObservations,
  getLatestSuccessfulSyncTime,
} from '@/lib/database';
import {
  isWeatherObservationStale,
  WEATHER_STALE_AFTER_MINUTES,
} from '@/lib/weather-freshness';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [data, syncedAt] = await Promise.all([
      getAllObservations(),
      getLatestSuccessfulSyncTime(),
    ]);
    const observationTime = data.reduce<string | null>((latest, record) => {
      if (!latest) return record.observation_time;
      return Date.parse(record.observation_time) > Date.parse(latest)
        ? record.observation_time
        : latest;
    }, null);

    return NextResponse.json({
      success: true,
      count: data.length,
      observation_time: observationTime,
      synced_at: syncedAt,
      is_stale: isWeatherObservationStale(observationTime),
      stale_after_minutes: WEATHER_STALE_AFTER_MINUTES,
      data,
    });
  } catch (error) {
    console.error('Weather database query failed', {
      error: error instanceof Error ? error.message : 'unknown',
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'DATABASE_UNAVAILABLE',
          message: '目前無法讀取氣象資料，請稍後再試',
        },
      },
      { status: 503 }
    );
  }
}
