ALTER TABLE weather_observations
    ADD COLUMN IF NOT EXISTS county TEXT;

ALTER TABLE weather_observations
    ADD COLUMN IF NOT EXISTS town TEXT;
