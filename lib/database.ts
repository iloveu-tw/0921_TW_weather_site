import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';
import path from 'path';
import { WeatherObservation } from '@/types/weather';

const DB_PATH = path.join(process.cwd(), 'data', 'weather.db');

/**
 * 取得本地 SQLite 資料庫連線（開發環境回退，唯讀模式）
 */
function getSqliteDb() {
  return new Database(DB_PATH, { readonly: true });
}

/**
 * 從 Neon PostgreSQL 查詢所有即時氣象觀測資料
 */
async function getPostgresObservations(databaseUrl: string): Promise<WeatherObservation[]> {
  const sql = neon(databaseUrl);
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
 * 從本地 SQLite 查詢所有即時氣象觀測資料
 */
function getSqliteObservations(): WeatherObservation[] {
  try {
    const db = getSqliteDb();
    const stmt = db.prepare(`
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
        observation_time
      FROM weather_observations
      ORDER BY id ASC
    `);
    const rows = stmt.all() as WeatherObservation[];
    db.close();
    return rows;
  } catch (error) {
    console.error('Database query error:', error);
    return [];
  }
}

/**
 * 正式環境設定 DATABASE_URL 時使用 Neon PostgreSQL；
 * 未設定時保留本地 SQLite，供遷移期間與離線開發使用。
 */
export async function getAllObservations(): Promise<WeatherObservation[]> {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (databaseUrl) {
    return getPostgresObservations(databaseUrl);
  }

  return getSqliteObservations();
}
