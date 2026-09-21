import { neon } from '@neondatabase/serverless';
import { WeatherObservation } from '@/types/weather';
import type { WeatherObservationInput } from '@/lib/weather-validation';

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
      county,
      town,
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

export async function getWeatherObservationCount(): Promise<number> {
  const sql = neon(getDatabaseUrl());
  const rows = await sql`SELECT COUNT(*)::int AS count FROM weather_observations`;
  return Number(rows[0]?.count ?? 0);
}

export async function createWeatherSyncRun(runId: string): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    INSERT INTO weather_sync_runs (run_id, started_at, status)
    VALUES (${runId}, NOW(), 'running')
  `;
}

export async function markWeatherSyncFailure(
  runId: string,
  errorCode: string
): Promise<void> {
  const sql = neon(getDatabaseUrl());
  await sql`
    UPDATE weather_sync_runs
    SET completed_at = NOW(), status = 'failed', error_code = ${errorCode}
    WHERE run_id = ${runId}
  `;
}

/**
 * 在同一個 PostgreSQL Transaction 中完整替換快照並記錄成功結果。
 */
export async function replaceWeatherObservations(
  records: WeatherObservationInput[],
  runId: string
): Promise<void> {
  const sql = neon(getDatabaseUrl());
  const payload = JSON.stringify(records);

  await sql.transaction([
    sql`DELETE FROM weather_observations`,
    sql`
      INSERT INTO weather_observations (
        station_id,
        station_name,
        county,
        town,
        latitude,
        longitude,
        temperature,
        humidity,
        rainfall,
        wind_speed,
        observation_time
      )
      SELECT
        station_id,
        station_name,
        county,
        town,
        latitude,
        longitude,
        temperature,
        humidity,
        rainfall,
        wind_speed,
        observation_time
      FROM jsonb_to_recordset(${payload}::jsonb) AS item(
        station_id TEXT,
        station_name TEXT,
        county TEXT,
        town TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        temperature DOUBLE PRECISION,
        humidity DOUBLE PRECISION,
        rainfall DOUBLE PRECISION,
        wind_speed DOUBLE PRECISION,
        observation_time TIMESTAMPTZ
      )
    `,
    sql`
      UPDATE weather_sync_runs
      SET
        completed_at = NOW(),
        status = 'success',
        record_count = ${records.length},
        error_code = NULL
      WHERE run_id = ${runId}
    `,
  ]);
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
