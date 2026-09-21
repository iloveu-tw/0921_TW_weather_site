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

CREATE TABLE IF NOT EXISTS weather_sync_runs (
    run_id UUID PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    status TEXT NOT NULL CHECK (status IN ('running', 'success', 'failed')),
    record_count INTEGER,
    error_code TEXT
);

CREATE INDEX IF NOT EXISTS weather_sync_runs_started_at_idx
    ON weather_sync_runs (started_at DESC);
