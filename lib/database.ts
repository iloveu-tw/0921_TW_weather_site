import { neon } from '@neondatabase/serverless';
import { WeatherObservation } from '@/types/weather';

/**
 * 取得 Neon PostgreSQL 連線字串
 */
function getDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  return databaseUrl;
}

/**
 * 從 Neon PostgreSQL 查詢所有即時氣象觀測資料
 */
async function getPostgresObservations(): Promise<WeatherObservation[]> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    SELECT
      id,
      station_id,
      station_name,
      latitude,
      longitude,
      temperature,
      humidity,
      rainfall,
      wind_speed,
      to_char(
        observation_time AT TIME ZONE 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      ) AS observation_time
    FROM weather_observations
    ORDER BY id ASC
  `;

  return rows as unknown as WeatherObservation[];
}

/**
 * 從 Neon PostgreSQL 查詢所有即時氣象觀測資料
 */
export async function getAllObservations(): Promise<WeatherObservation[]> {
  return getPostgresObservations();
}
