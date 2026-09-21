ALTER TABLE weather_observations
    ALTER COLUMN county SET NOT NULL;

ALTER TABLE weather_observations
    ALTER COLUMN town SET NOT NULL;
