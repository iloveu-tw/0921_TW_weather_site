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
);

CREATE INDEX IF NOT EXISTS weather_observations_observation_time_idx
    ON weather_observations (observation_time DESC);

CREATE TABLE IF NOT EXISTS weather_sync_locks (
    lock_name TEXT PRIMARY KEY,
    run_id UUID NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    locked_until TIMESTAMPTZ NOT NULL
);
