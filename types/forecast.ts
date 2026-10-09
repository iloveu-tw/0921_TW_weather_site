export interface ForecastPeriod {
  start_time: string;
  end_time: string;
  weather: string;
  min_temp: number | null;
  max_temp: number | null;
  rain_probability: number | null;
}

export interface CountyForecast {
  county: string;
  periods: ForecastPeriod[];
}

export type ForecastApiResponse =
  | {
      success: true;
      fetched_at: string;
      data: CountyForecast[];
    }
  | {
      success: false;
      error: { message: string };
    };
