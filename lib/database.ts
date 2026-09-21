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

/**
 * 取得氣象同步租約鎖，避免多個 Serverless 實例同時更新資料。
 */
export async function acquireWeatherSyncLock(runId: string): Promise<boolean> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`
    INSERT INTO weather_sync_locks (lock_name, run_id, started_at, locked_until)
    VALUES ('cwa_weather_refresh', ${runId}, NOW(), NOW() + INTERVAL '5 minutes')
    ON CONFLICT (lock_name) DO UPDATE
    SET
      run_id = EXCLUDED.run_id,
      started_at = EXCLUDED.started_at,
      locked_until = EXCLUDED.locked_until
    WHERE weather_sync_locks.locked_until < NOW()
    RETURNING run_id
  `;

  return rows.length === 1;
}

/**
 * 僅允許目前持有者釋放同步租約鎖。
 */
export async function releaseWeatherSyncLock(runId: string): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    DELETE FROM weather_sync_locks
    WHERE lock_name = 'cwa_weather_refresh' AND run_id = ${runId}
  `;
}
