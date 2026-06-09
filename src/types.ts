export type UnitPreference = "metric" | "imperial";

export type WeatherLayerType = "temp_new" | "wind_new" | "clouds_new" | "precipitation_new" | "pressure_new";

export interface GeoLocation {
  lat: number;
  lon: number;
  name: string;
  country: string;
  state?: string;
}

export interface CurrentWeather {
  name: string;
  country: string;
  temp: number;
  feelsLike: number;
  tempMin: number;
  tempMax: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDeg: number;
  visibility: number;
  description: string;
  icon: string;
  sunrise: number;
  sunset: number;
  lat: number;
  lon: number;
  dt: number;
}

export interface HourlyForecast {
  time: string; // e.g., "14:00"
  temp: number;
  icon: string;
  description: string;
  pop: number; // probability of precipitation (0.0 to 1.0)
  humidity: number;
  windSpeed: number;
  dt: number;
}

export interface DailyForecast {
  day: string; // e.g., "Monday"
  date: string; // e.g., "June 3"
  tempMax: number;
  tempMin: number;
  icon: string;
  description: string;
  pop: number; // probability of precipitation (0-1)
  humidity: number;
  pressure: number;
  windSpeed: number;
}

export interface WeatherAlert {
  id: string;
  event: string;
  senderName: string;
  description: string;
  severity: "info" | "moderate" | "severe" | "extreme";
  start: number;
  end: number;
}

export interface AISummary {
  summary: string;
  apparelRecommendation: string;
  outdoorActivitySuitability: string;
  travelAdvice: string;
}

export interface FavoriteCity {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
}
