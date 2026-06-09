import { WeatherAlert } from "../types";

// Convert Celsius to Fahrenheit
export function celsiusToFahrenheit(c: number): number {
  return (c * 9) / 5 + 32;
}

// Format Temperature based on preference
export function formatTemp(tempC: number, unit: "metric" | "imperial"): string {
  if (unit === "imperial") {
    return `${Math.round(celsiusToFahrenheit(tempC))}°F`;
  }
  return `${Math.round(tempC)}°C`;
}

// Convert Wind Speed based on preference
export function formatWindSpeed(speedMs: number, unit: "metric" | "imperial"): string {
  if (unit === "imperial") {
    // m/s to mph is speed * 2.237
    return `${Math.round(speedMs * 2.23694)} mph`;
  }
  return `${Math.round(speedMs * 3.6)} km/h`; // m/s to km/h
}

// Convert visibility to beautiful readout
export function formatVisibility(meters: number, unit: "metric" | "imperial"): string {
  if (unit === "imperial") {
    // meters to miles is meters / 1609.34
    const miles = meters / 1609.34;
    return `${miles.toFixed(1)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
}

// Format pressure representation
export function formatPressure(hPa: number): string {
  return `${hPa} hPa`;
}

// Create a human readable hour/time from a unix timestamp
export function unixToHour(timestamp: number, timezoneOffset: number = 0): string {
  const date = new Date((timestamp + timezoneOffset) * 1000);
  const hours = date.getUTCHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedHour = hours % 12 || 12;
  return `${formattedHour} ${ampm}`;
}

// Create custom date readouts
export function unixToDayName(timestamp: number): string {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const date = new Date(timestamp * 1000);
  return days[date.getDay()];
}

export function unixToShortMonthDay(timestamp: number): string {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const date = new Date(timestamp * 1000);
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// Air Quality Index (AQI) description and colors
export interface AQIInfo {
  label: string;
  color: string;
  bg: string;
  border: string;
  description: string;
}

export function getAQIDetails(aqi: number): AQIInfo {
  switch (aqi) {
    case 1:
      return {
        label: "Good",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        description: "Excellent air quality; minimal risk.",
      };
    case 2:
      return {
        label: "Fair",
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/20",
        description: "Acceptable quality; very few moderate risks.",
      };
    case 3:
      return {
        label: "Moderate",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        description: "Sensitive groups may experience health effects.",
      };
    case 4:
      return {
        label: "Poor",
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/20",
        description: "Unhealthy for general population; limit exposure.",
      };
    case 5:
      return {
        label: "Very Poor",
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        description: "Health alert. Active people should stay indoors.",
      };
    default:
      return {
        label: "Unknown",
        color: "text-gray-400",
        bg: "bg-gray-500/10",
        border: "border-gray-500/20",
        description: "Air quality telemetry unavailable.",
      };
  }
}

// Generate warnings contextually based on criteria
export function generateContextualAlerts(
  tempC: number,
  windSpeedMs: number,
  humidity: number,
  weatherDesc: string
): WeatherAlert[] {
  const alerts: WeatherAlert[] = [];

  const lowerDesc = weatherDesc.toLowerCase();

  if (tempC >= 38) {
    alerts.push({
      id: "alert-extreme-heat",
      event: "Extreme Heat Advisory",
      senderName: "Meteorological Service",
      description: `Extreme high temperatures of ${tempC}°C detected. Risk of thermal stress. Limit strenuous outdoor work. Drink plenty of water and stay indoors where possible.`,
      severity: "severe",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 6) / 1000,
    });
  } else if (tempC >= 33) {
    alerts.push({
      id: "alert-heat",
      event: "Heat Advisory",
      senderName: "Meteorological Service",
      description: `Elevated heat index values reaching ${tempC}°C. Stay hydrated and avoid prolonged outdoor tasks during peak solar heating.`,
      severity: "moderate",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 4) / 1000,
    });
  }

  if (tempC <= -10) {
    alerts.push({
      id: "alert-freeze",
      event: "Extreme Winter Warning",
      senderName: "Meteorological Service",
      description: `Dangerously cold temperatures (${tempC}°C). Frostbite can occur in minutes. Wrap up in warm windproof layers.`,
      severity: "extreme",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 12) / 1000,
    });
  } else if (tempC <= 0) {
    alerts.push({
      id: "alert-freeze-warning",
      event: "Frost Advisory",
      senderName: "Meteorological Service",
      description: `Temperatures dipping below freezing point (${tempC}°C). Risk of slippery ice patches and crop frost.`,
      severity: "moderate",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 8) / 1000,
    });
  }

  if (windSpeedMs >= 17) {
    alerts.push({
      id: "alert-high-wind",
      event: "Gale Danger Alert",
      senderName: "Wind Warning Center",
      description: `Severe high winds reaching ${Math.round(windSpeedMs * 3.6)} km/h. Secure light lightweight outdoor objects. Avoid high structures.`,
      severity: "severe",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 6) / 1000,
    });
  } else if (windSpeedMs >= 12) {
    alerts.push({
      id: "alert-wind-advisory",
      event: "Brisk Wind Advisory",
      senderName: "Wind Warning Center",
      description: `Moderate gusting winds up to ${Math.round(windSpeedMs * 3.6)} km/h. Use caution while traveling in high-profile trailers or cycles.`,
      severity: "info",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 3) / 1000,
    });
  }

  if (lowerDesc.includes("thunderstorm")) {
    alerts.push({
      id: "alert-thunderstorm",
      event: "Severe Thunderstorm Warning",
      senderName: "Storm Forecast Laboratory",
      description: "Severe thunderstorms with lightning strikes, roaring thunder and gusty squalls. Stay indoors; disconnect delicate electrical systems.",
      severity: "severe",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 2) / 1000,
    });
  }

  if (lowerDesc.includes("heavy intensity rain") || lowerDesc.includes("extreme rain") || lowerDesc.includes("heavy rain")) {
    alerts.push({
      id: "alert-flood",
      event: "Flash Flood Advisory",
      senderName: "Hydrology Division",
      description: "Torrential downpours are currently taking place. Risk of flash flooding in lowland sectors, streets and underground utilities. Do not drive through flooded paths.",
      severity: "severe",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 4) / 1000,
    });
  }

  if (lowerDesc.includes("snow") && lowerDesc.includes("heavy")) {
    alerts.push({
      id: "alert-snow",
      event: "Heavy Snowfall Warning",
      senderName: "Winter Weather Division",
      description: "Heavy snow accumulations creating significant road blockages. Postpone non-urgent travel. Clear accumulation pathways.",
      severity: "severe",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 10) / 1000,
    });
  }

  // Fallback default warning if everything is calm but there's a minor check
  if (alerts.length === 0 && (lowerDesc.includes("tornado") || lowerDesc.includes("squall") || lowerDesc.includes("ash"))) {
    alerts.push({
      id: "alert-unusual-meteo",
      event: "Adverse Weather Alert",
      senderName: "National Disaster Management",
      description: `Uncommon event (${weatherDesc}) detected. Exercise close vigilance over regional updates.`,
      severity: "extreme",
      start: Date.now() / 1000,
      end: (Date.now() + 3600 * 4) / 1000,
    });
  }

  return alerts;
}
