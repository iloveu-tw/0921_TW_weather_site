import nextEnv from '@next/env';
import { neon } from '@neondatabase/serverless';
import Database from 'better-sqlite3';
import path from 'node:path';

const projectDir = process.cwd();
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectDir);

const databaseUrl = process.env.DATABASE_URL?.trim();
if (!databaseUrl) {
  throw new Error('缺少 DATABASE_URL，請先設定 Neon Development Database 連線字串。');
}

const sqlitePath = path.join(projectDir, 'data', 'weather.db');
const sqlite = new Database(sqlitePath, { readonly: true });

const records = sqlite.prepare(`
  SELECT
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
`).all();

sqlite.close();

if (records.length === 0) {
  throw new Error('SQLite 沒有可遷移的氣象資料。');
}

const uniqueStationIds = new Set(records.map((record) => record.station_id));
if (uniqueStationIds.size !== records.length) {
  throw new Error('SQLite station_id 存在重複值，已取消遷移。');
}

const invalidRecord = records.find(
  (record) =>
    !record.station_id ||
    !record.station_name ||
    record.latitude === null ||
    record.longitude === null ||
    !record.observation_time
);

if (invalidRecord) {
  throw new Error('SQLite 存在缺少必要欄位的資料，已取消遷移。');
}

const sql = neon(databaseUrl);

const insertQueries = records.map((record) => sql`
  INSERT INTO weather_observations (
    station_id,
    station_name,
    latitude,
    longitude,
    temperature,
    humidity,
    rainfall,
    wind_speed,
    observation_time
  ) VALUES (
    ${record.station_id},
    ${record.station_name},
    ${record.latitude},
    ${record.longitude},
    ${record.temperature},
    ${record.humidity},
    ${record.rainfall},
    ${record.wind_speed},
    ${record.observation_time}
  )
`);

await sql.transaction([
  sql`
    CREATE TABLE IF NOT EXISTS weather_observations (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      station_id TEXT NOT NULL UNIQUE,
      station_name TEXT NOT NULL,
      latitude DOUBLE PRECISION NOT NULL,
      longitude DOUBLE PRECISION NOT NULL,
      temperature DOUBLE PRECISION,
      humidity DOUBLE PRECISION,
      rainfall DOUBLE PRECISION,
      wind_speed DOUBLE PRECISION,
      observation_time TIMESTAMPTZ NOT NULL
    )
  `,
  sql`
    CREATE INDEX IF NOT EXISTS weather_observations_observation_time_idx
      ON weather_observations (observation_time DESC)
  `,
  sql`TRUNCATE TABLE weather_observations RESTART IDENTITY`,
  ...insertQueries,
]);

const [verification] = await sql`
  SELECT
    COUNT(*)::integer AS row_count,
    COUNT(DISTINCT station_id)::integer AS unique_station_count
  FROM weather_observations
`;

if (
  verification.row_count !== records.length ||
  verification.unique_station_count !== records.length
) {
  throw new Error(
    `遷移驗證失敗：來源 ${records.length} 筆，目標 ${verification.row_count} 筆，唯一站號 ${verification.unique_station_count} 筆。`
  );
}

console.log(`PostgreSQL migration verified: ${verification.row_count} rows, ${verification.unique_station_count} unique stations.`);
