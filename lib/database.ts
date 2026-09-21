import Database from 'better-sqlite3';
import path from 'path';
import { WeatherObservation } from '@/types/weather';

const DB_PATH = path.join(process.cwd(), 'data', 'weather.db');

/**
 * 取得 SQLite 資料庫連線 (唯讀模式)
 */
export function getDb() {
  return new Database(DB_PATH, { readonly: true });
}

/**
 * 從 SQLite 資料庫查詢所有即時氣象觀測資料
 */
export function getAllObservations(): WeatherObservation[] {
  try {
    const db = getDb();
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
