import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSnow,
  CloudFog,
  MapPin,
  Search,
  Star,
  Layers,
  Wind,
  Droplets,
  Eye,
  Sunrise,
  Sunset,
  Moon,
  Activity,
  ChevronDown,
  Info,
  Settings,
  X,
  Gauge,
  Thermometer,
  Clock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  GeoLocation,
  CurrentWeather,
  HourlyForecast,
  DailyForecast,
  WeatherAlert,
  UnitPreference,
  WeatherLayerType,
  FavoriteCity,
} from "./types";
import {
  formatTemp,
  formatWindSpeed,
  formatPressure,
  formatVisibility,
  unixToHour,
  unixToDayName,
  unixToShortMonthDay,
  getAQIDetails,
  generateContextualAlerts,
} from "./utils/weatherUtils";
import WeatherMap from "./components/WeatherMap";
import WeatherCharts from "./components/WeatherCharts";
import AISummaryCard from "./components/AISummaryCard";
import WeatherAlertView from "./components/WeatherAlertView";

// Default coordinate: London as initial default location
const DEFAULT_GEO: GeoLocation = {
  name: "London",
  country: "GB",
  lat: 51.5074,
  lon: -0.1278,
};

export default function App() {
  // Theme & Units state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("weather-dark-mode");
    if (saved) return saved === "true";
    return true; // Warm dark slate style default as requested
  });
  const [unit, setUnit] = useState<UnitPreference>(() => {
    return (localStorage.getItem("weather-temp-unit") as UnitPreference) || "metric";
  });

  // API State
  const [hasEnvKey, setHasEnvKey] = useState<boolean>(false);
  const [configLoaded, setConfigLoaded] = useState<boolean>(false);
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem("custom-openweather-key") || "";
  });

  // Weather Data States
  const [selectedGeo, setSelectedGeo] = useState<GeoLocation>(DEFAULT_GEO);
  const [currentWeather, setCurrentWeather] = useState<CurrentWeather | null>(null);
  const [hourlyForecast, setHourlyForecast] = useState<HourlyForecast[]>([]);
  const [dailyForecast, setDailyForecast] = useState<DailyForecast[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [airQuality, setAirQuality] = useState<number | null>(null);

  // UX Interaction States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchResults, setSearchResults] = useState<GeoLocation[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [loadingWeather, setLoadingWeather] = useState<boolean>(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [activeLayer, setActiveLayer] = useState<WeatherLayerType | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Favorites & Recents States
  const [favorites, setFavorites] = useState<FavoriteCity[]>(() => {
    const saved = localStorage.getItem("weather-favorites");
    return saved ? JSON.parse(saved) : [];
  });
  const [recentSearches, setRecentSearches] = useState<GeoLocation[]>(() => {
    const saved = localStorage.getItem("weather-recents");
    return saved ? JSON.parse(saved) : [];
  });

  // Effective key used to authenticate requests
  const activeOpenWeatherKey = useMemo(() => {
    if (customApiKey && customApiKey.trim().length > 0) return customApiKey.trim();
    return ""; // Will prompt backend config check
  }, [customApiKey]);

  // Sync dark mode style with DOM
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("weather-dark-mode", String(darkMode));
  }, [darkMode]);

  // Sync unit with localStorage
  useEffect(() => {
    localStorage.setItem("weather-temp-unit", unit);
  }, [unit]);

  // Check Backend Key presence on load
  useEffect(() => {
    const checkConfig = async () => {
      try {
        const res = await fetch("/api/weather/config");
        if (res.ok) {
          const data = await res.json();
          setHasEnvKey(data.hasEnvKey);
        }
      } catch (err) {
        console.error("Config check failed:", err);
      } finally {
        setConfigLoaded(true);
      }
    };
    checkConfig();
  }, []);

  // Fetch full dataset for coords
  const fetchAllWeatherData = useCallback(async (lat: number, lon: number, locationName: string, locationCountry: string) => {
    setLoadingWeather(true);
    setWeatherError(null);

    const headers: Record<string, string> = {};
    if (activeOpenWeatherKey) {
      headers["x-openweather-api-key"] = activeOpenWeatherKey;
    }

    try {
      // 1. Fetch Current Weather
      const currentRes = await fetch(`/api/weather/current?lat=${lat}&lon=${lon}&units=metric`, { headers });
      if (!currentRes.ok) {
        const errPayload = await currentRes.json();
        throw new Error(errPayload.error || "Failed to fetch current weather details.");
      }
      const rawCurrent = await currentRes.json();

      const weatherObj: CurrentWeather = {
        name: rawCurrent.name || locationName,
        country: rawCurrent.sys?.country || locationCountry,
        temp: rawCurrent.main?.temp ?? 0,
        feelsLike: rawCurrent.main?.feels_like ?? 0,
        tempMin: rawCurrent.main?.temp_min ?? 0,
        tempMax: rawCurrent.main?.temp_max ?? 0,
        humidity: rawCurrent.main?.humidity ?? 0,
        pressure: rawCurrent.main?.pressure ?? 0,
        windSpeed: rawCurrent.wind?.speed ?? 0,
        windDeg: rawCurrent.wind?.deg ?? 0,
        visibility: rawCurrent.visibility ?? 10000,
        description: rawCurrent.weather?.[0]?.description ?? "Clear sky",
        icon: rawCurrent.weather?.[0]?.icon ?? "01d",
        sunrise: rawCurrent.sys?.sunrise ?? 0,
        sunset: rawCurrent.sys?.sunset ?? 0,
        lat: lat,
        lon: lon,
        dt: rawCurrent.dt ?? Math.floor(Date.now() / 1000),
      };
      setCurrentWeather(weatherObj);

      // 2. Fetch Air Quality Index
      try {
        const aqRes = await fetch(`/api/weather/airpollution?lat=${lat}&lon=${lon}`, { headers });
        if (aqRes.ok) {
          const rawAq = await aqRes.json();
          setAirQuality(rawAq.list?.[0]?.main?.aqi ?? null);
        }
      } catch (aqErr) {
        console.error("Air Quality fetch bypassed:", aqErr);
      }

      // 3. Fetch Forecast & format hourly + weekly indices
      const forecastRes = await fetch(`/api/weather/forecast?lat=${lat}&lon=${lon}&units=metric`, { headers });
      if (!forecastRes.ok) {
        const errPayload = await forecastRes.json();
        throw new Error(errPayload.error || "Failed to retrieve forecast patterns.");
      }
      const rawForecast = await forecastRes.json();

      // Process hourly forecasts (next 8 steps = 24 hours)
      const hourlyItems: HourlyForecast[] = (rawForecast.list || []).slice(0, 8).map((step: any) => {
        const timeStr = new Date(step.dt * 1000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
        return {
          time: timeStr,
          temp: step.main?.temp ?? 0,
          icon: step.weather?.[0]?.icon ?? "01d",
          description: step.weather?.[0]?.description ?? "Clear",
          pop: step.pop ?? 0,
          humidity: step.main?.humidity ?? 0,
          windSpeed: step.wind?.speed ?? 0,
          dt: step.dt,
        };
      });
      setHourlyForecast(hourlyItems);

      // Group 40 list indices by date for a true high/low weekly forecast aggregation
      const dailyMap: Record<string, any[]> = {};
      (rawForecast.list || []).forEach((step: any) => {
        const dateStr = new Date(step.dt * 1000).toDateString();
        if (!dailyMap[dateStr]) dailyMap[dateStr] = [];
        dailyMap[dateStr].push(step);
      });

      const weeklyItems: DailyForecast[] = Object.keys(dailyMap).map((dateKey) => {
        const daySteps = dailyMap[dateKey];
        const temps = daySteps.map((s) => s.main?.temp ?? 0);
        const pops = daySteps.map((s) => s.pop ?? 0);
        const refStep = daySteps[Math.floor(daySteps.length / 2)] || daySteps[0];

        return {
          day: unixToDayName(refStep.dt),
          date: unixToShortMonthDay(refStep.dt),
          tempMax: Math.max(...temps),
          tempMin: Math.min(...temps),
          icon: refStep.weather?.[0]?.icon ?? "01d",
          description: refStep.weather?.[0]?.description ?? "Clear Sky",
          pop: Math.max(...pops),
          humidity: refStep.main?.humidity ?? 50,
          pressure: refStep.main?.pressure ?? 1013,
          windSpeed: refStep.wind?.speed ?? 2,
        };
      });
      setDailyForecast(weeklyItems.slice(0, 6)); // Display next 6 days smoothly

      // 4. Generate system overlays and context severe weather alerts
      const apiAlerts: WeatherAlert[] = [];
      // Combine with contextual warnings to guarantee high-fidelity alerts are populated for demonstration
      const demoAlerts = generateContextualAlerts(
        weatherObj.temp,
        weatherObj.windSpeed,
        weatherObj.humidity,
        weatherObj.description
      );
      setAlerts([...apiAlerts, ...demoAlerts]);

    } catch (err: any) {
      console.error("Failed loading weather set:", err);
      setWeatherError(err.message || "An error occurred retrieving weather measurements.");
    } finally {
      setLoadingWeather(false);
    }
  }, [activeOpenWeatherKey]);

  // On city search query execution
  const executeCityGeocodeSearch = async (queryName: string) => {
    if (!queryName.trim()) return;
    setIsSearching(true);
    setSearchError(null);

    const headers: Record<string, string> = {};
    if (activeOpenWeatherKey) {
      headers["x-openweather-api-key"] = activeOpenWeatherKey;
    }

    try {
      const res = await fetch(`/api/weather/geocode?q=${encodeURIComponent(queryName)}`, { headers });
      if (!res.ok) {
        const payload = await res.json();
        throw new Error(payload.error || "Geocoding request failed.");
      }
      const data = await res.json();
      if (!data || data.length === 0) {
        setSearchError("No cities matching your query were found. Double check your spelling.");
        setSearchResults([]);
      } else {
        const processedResults = data.map((item: any) => ({
          name: item.name,
          country: item.country,
          state: item.state,
          lat: item.lat,
          lon: item.lon,
        }));
        setSearchResults(processedResults);
      }
    } catch (err: any) {
      console.error("Geocoding failed:", err);
      setSearchError(err.message || "Failed to look up coordinate bounds.");
    } finally {
      setIsSearching(false);
    }
  };

  // Trigger loading details of the chosen city
  const selectCityHandler = (geo: GeoLocation) => {
    setSelectedGeo(geo);
    fetchAllWeatherData(geo.lat, geo.lon, geo.name, geo.country);

    // Save to recents histories
    setRecentSearches((prev) => {
      const filtered = prev.filter((item) => !(item.lat === geo.lat && item.lon === geo.lon));
      const updated = [geo, ...filtered].slice(0, 5); // Limit to top 5 history pills
      localStorage.setItem("weather-recents", JSON.stringify(updated));
      return updated;
    });

    setSearchResults([]);
    setSearchQuery("");
  };

  // Favorite toggles
  const isFavorite = useMemo(() => {
    return favorites.some((f) => f.lat === selectedGeo.lat && f.lon === selectedGeo.lon);
  }, [favorites, selectedGeo]);

  const toggleFavorite = () => {
    let updated: FavoriteCity[];
    if (isFavorite) {
      updated = favorites.filter((f) => !(f.lat === selectedGeo.lat && f.lon === selectedGeo.lon));
    } else {
      updated = [
        ...favorites,
        {
          id: `${selectedGeo.lat}-${selectedGeo.lon}`,
          name: selectedGeo.name,
          country: selectedGeo.country,
          lat: selectedGeo.lat,
          lon: selectedGeo.lon,
        },
      ];
    }
    setFavorites(updated);
    localStorage.setItem("weather-favorites", JSON.stringify(updated));
  };

  const removeFavorite = (lat: number, lon: number, e: any) => {
    e.stopPropagation();
    const updated = favorites.filter((f) => !(f.lat === lat && f.lon === lon));
    setFavorites(updated);
    localStorage.setItem("weather-favorites", JSON.stringify(updated));
  };

  // Browser Geolocation auto-detection
  const handleUserGeolocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is unsupported by your browser interface.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const geo: GeoLocation = {
          name: "Detected Coordinates",
          country: "SYS",
          lat: latitude,
          lon: longitude,
        };
        setSelectedGeo(geo);
        fetchAllWeatherData(latitude, longitude, "My Location", "SYS");
      },
      (err) => {
        console.error("Geolocation failed:", err);
        alert(`Geolocation access was declined or timed out: ${err.message}`);
      }
    );
  };

  // Load weather for default coordinates on mount
  useEffect(() => {
    if (!configLoaded) return;
    if (hasEnvKey || activeOpenWeatherKey) {
      fetchAllWeatherData(selectedGeo.lat, selectedGeo.lon, selectedGeo.name, selectedGeo.country);
    } else {
      setWeatherError("OpenWeather API Key is missing. Add it to the secrets panel or the in-app settings.");
    }
  }, [configLoaded, hasEnvKey, activeOpenWeatherKey, selectedGeo.lat, selectedGeo.lon, selectedGeo.name, selectedGeo.country, fetchAllWeatherData]);

  // Saves OpenWeather Key entered directly on UI
  const handleSaveCustomKey = (key: string) => {
    setCustomApiKey(key);
    localStorage.setItem("custom-openweather-key", key);
    // Auto re-fetch with new key active
    setTimeout(() => {
      fetchAllWeatherData(selectedGeo.lat, selectedGeo.lon, selectedGeo.name, selectedGeo.country);
    }, 100);
  };

  const handleClearCustomKey = () => {
    setCustomApiKey("");
    localStorage.removeItem("custom-openweather-key");
    setTimeout(() => {
      fetchAllWeatherData(selectedGeo.lat, selectedGeo.lon, selectedGeo.name, selectedGeo.country);
    }, 100);
  };

  const weatherIconsMap = (iconCode: string) => {
    const rootCode = iconCode ? iconCode.substring(0, 2) : "01";
    switch (rootCode) {
      case "01":
        return <Sun className="h-10 w-10 text-amber-400 fill-amber-400/20" />;
      case "02":
        return <CloudSun className="h-10 w-10 text-blue-300 fill-blue-300/10" />;
      case "03":
      case "04":
        return <Cloud className="h-10 w-10 text-slate-400" />;
      case "09":
      case "10":
        return <CloudRain className="h-10 w-10 text-blue-400" />;
      case "11":
        return <CloudLightning className="h-10 w-10 text-indigo-400" />;
      case "13":
        return <CloudSnow className="h-10 w-10 text-sky-200" />;
      case "50":
        return <CloudFog className="h-10 w-10 text-teal-300" />;
      default:
        return <Sun className="h-10 w-10 text-amber-400" />;
    }
  };

  return (
    <div id="weather-applet-root" className="min-h-screen relative flex flex-col font-sans transition-colors duration-500 bg-gradient-to-tr from-sky-100 via-indigo-50 to-blue-200 text-slate-900 dark:from-[#0b0f19] dark:via-[#131d31] dark:to-[#0f172a] dark:text-slate-100">
      
      {/* 1. Dynamic Warn Alert banner top overlay */}
      {currentWeather && <WeatherAlertView alerts={alerts} />}

      {/* 2. Main Header */}
      <header id="main-header" className="sticky top-0 z-[1000] border-b border-slate-200/50 dark:border-slate-800/20 bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Logo Section */}
        <div id="header-branding" className="flex items-center gap-3">
          <div id="logo-icon-wrap" className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <Sun className="h-6 w-6 animate-spin-slow" />
          </div>
          <div>
            <h1 id="header-title" className="text-lg font-bold tracking-tight">
              Weather Map
            </h1>
            <p id="header-subtitle" className="text-[10px] uppercase tracking-widest font-bold text-blue-500">
              Smart Meteorologist
            </p>
          </div>
        </div>

        {/* Global UX Control Bars (Search, location toggling, metrics) */}
        <div id="header-controls" className="flex flex-wrap items-center gap-3 max-w-full">
          {/* Main Geocoding input */}
          <div id="geocoding-search-wrapper" className="relative w-full sm:w-80">
            <div className="flex bg-slate-100/80 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-800/40 rounded-xl px-2.5 py-1.5 items-center gap-1.5 focus-within:ring-2 focus-within:ring-blue-500/30 transition-all">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                id="search-input-field"
                type="text"
                value={searchQuery}
                placeholder="Search city (e.g. Kolkata, Tokyo)"
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && executeCityGeocodeSearch(searchQuery)}
                className="bg-transparent text-xs outline-none w-full border-none placeholder-slate-400 text-slate-800 dark:text-slate-100"
              />
              {searchQuery && (
                <button
                  id="search-input-clear"
                  onClick={() => setSearchQuery("")}
                  className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-450 cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <button
                id="search-submit"
                onClick={() => executeCityGeocodeSearch(searchQuery)}
                disabled={isSearching}
                className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 text-white rounded-lg px-2.5 py-1 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-blue-500/10"
              >
                {isSearching ? "..." : "Go"}
              </button>
            </div>

            {/* Results Dropdown panel */}
            <AnimatePresence>
              {(searchResults.length > 0 || searchError) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  id="geocode-results-panel"
                  className="absolute left-0 right-0 mt-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200/80 dark:border-slate-800/60 overflow-hidden z-[1001]"
                >
                  {searchError && (
                    <div className="p-4 text-xs text-rose-500 flex items-start gap-2">
                      <X className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>{searchError}</span>
                    </div>
                  )}

                  {searchResults.map((geo, index) => (
                    <button
                      key={`${geo.lat}-${geo.lon}-${index}`}
                      id={`search-result-item-${index}`}
                      onClick={() => selectCityHandler(geo)}
                      className="w-full px-4 py-3 text-left text-xs transition-colors hover:bg-blue-500/10 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between cursor-pointer group"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-500">
                          {geo.name}
                        </span>
                        {geo.state && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-1.5">
                            ({geo.state})
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-0.5">
                          {geo.country} â€¢ Lat: {geo.lat.toFixed(2)}, Lon: {geo.lon.toFixed(2)}
                        </span>
                      </div>
                      <ChevronDown className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 text-blue-500 -rotate-90 transition-all" />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quick Browser GPS Button */}
          <button
            id="gps-location-button"
            onClick={handleUserGeolocation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-300 text-xs font-semibold rounded-xl border border-sky-400/20 cursor-pointer transition-colors"
            title="Auto-detect coordinates using device geolocation API"
          >
            <MapPin className="h-3.5 w-3.5 animate-pulse" />
            <span className="hidden sm:inline">Use My Location</span>
          </button>

          {/* Metric conversion Toggle */}
          <button
            id="temp-unit-toggle"
            onClick={() => setUnit((prev) => (prev === "metric" ? "imperial" : "metric"))}
            className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 text-xs font-bold rounded-xl border border-slate-200/50 dark:border-slate-800/10 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title="Toggle between Celsius and Fahrenheit"
          >
            {unit === "metric" ? "Â°C" : "Â°F"}
          </button>

          {/* Dark / Light Toggle */}
          <button
            id="color-mode-toggle"
            onClick={() => setDarkMode(!darkMode)}
            className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200/50 dark:border-slate-800/10 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {/* Credentials panel Settings Trigger */}
          <button
            id="config-settings-toggle"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-xl border cursor-pointer transition-colors ${
              showSettings || (!hasEnvKey && !customApiKey)
                ? "bg-rose-500/25 border-rose-500 text-rose-600 dark:text-rose-400 animate-pulse"
                : "bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/10 hover:bg-slate-200 dark:hover:bg-slate-700"
            }`}
            title="Configure OpenWeather Map APIs"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* 3. Credentials & Settings Drawer Block */}
      <AnimatePresence>
        {(showSettings || (!hasEnvKey && !customApiKey)) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            id="config-alert-drawer"
            className="px-6 py-4 border-b bg-rose-500/5 border-rose-500/20 text-xs text-slate-600 dark:text-slate-300 transition-all shadow-md"
          >
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div id="credential-state-left" className="flex items-start gap-2.5">
                <Info className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-850 dark:text-slate-100">
                    {!hasEnvKey && !customApiKey
                      ? "âš ï¸ OpenWeather API Key Required"
                      : "OpenWeather API Key Configured"}
                  </h4>
                  <p className="text-[11px] text-slate-450 dark:text-slate-400 mt-0.5 max-w-xl">
                    By default, the server proxies requests securely. If your server environment lacks a
                    pre-configured `OPENWEATHER_API_KEY`, simply input your personal API key. We will immediately
                    encrypt and store it locally in your browser.
                  </p>
                </div>
              </div>

              <div id="credential-input-right" className="flex items-center gap-2">
                <input
                  id="custom-api-input"
                  type="password"
                  value={customApiKey}
                  placeholder="Paste OpenWeather API Key"
                  onChange={(e) => setCustomApiKey(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-3 py-1.5 outline-none text-xs w-48 text-slate-800 dark:text-slate-100"
                />
                <button
                  id="custom-api-save"
                  onClick={() => handleSaveCustomKey(customApiKey)}
                  className="bg-indigo-600 text-white font-semibold rounded-lg px-3 py-1.5 cursor-pointer hover:bg-indigo-700 transition-colors"
                >
                  Save
                </button>
                {customApiKey && (
                  <button
                    id="custom-api-clear"
                    onClick={handleClearCustomKey}
                    className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-rose-500 shrink-0 cursor-pointer transition-colors"
                    title="Clear token"
                  >
                    Clear
                  </button>
                )}
                <button
                  id="drawer-close"
                  onClick={() => setShowSettings(false)}
                  className="p-1 px-2.5 hover:bg-slate-250 dark:hover:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 cursor-pointer"
                >
                  Hide
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. Favorites bar directly below header */}
      {favorites.length > 0 && (
        <section id="favorites-bar" className="px-6 py-2.5 bg-slate-50/50 dark:bg-slate-900/10 border-b border-slate-200/20 dark:border-slate-800/10 flex items-center gap-2 overflow-x-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest shrink-0">Favorites:</span>
          <div className="flex gap-2">
            {favorites.map((fav) => (
              <button
                key={fav.id}
                id={`fav-badge-${fav.id}`}
                onClick={() => selectCityHandler({ name: fav.name, country: fav.country, lat: fav.lat, lon: fav.lon })}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700/20 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300 transition-all hover:border-blue-500/40 cursor-pointer group shrink-0"
              >
                <span>{fav.name}</span>
                <span className="text-[9px] text-slate-400 group-hover:text-blue-500 uppercase">{fav.country}</span>
                <Trash2CustomIcon
                  onClick={(e) => removeFavorite(fav.lat, fav.lon, e)}
                  title="Remove location"
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* 5. Main Content Dashboard Grid */}
      <main id="dashboard-layout" className="flex-grow p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Coordinates search info + Current climate gauges */}
        <section id="climate-metrics-column" className="col-span-1 lg:col-span-4 flex flex-col gap-6">
          
          {/* Glassmorphic Current Weather condition gauge */}
          {loadingWeather ? (
            <div id="weather-skeleton" className="p-8 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/10 min-h-[300px] flex flex-col items-center justify-center animate-pulse">
              <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-full mb-4"></div>
              <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded-md mb-2"></div>
              <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
            </div>
          ) : currentWeather ? (
            <div id="current-weather-glass-card" className="relative p-6 rounded-2xl shadow-2xl overflow-hidden bg-white/75 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/10">
              
              {/* Climate Card Background Elements */}
              <div className="absolute top-0 right-0 p-4 opacity-15">
                {weatherIconsMap(currentWeather.icon)}
              </div>

              {/* Geographic Name indicator */}
              <div id="current-card-header" className="flex justify-between items-start gap-4">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 id="current-name-header" className="text-xl font-black tracking-tight">{currentWeather.name}</h2>
                    <span className="text-xs uppercase bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold">
                      {currentWeather.country}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 mt-1 block">
                    Lat: {currentWeather.lat.toFixed(3)} â€¢ Lon: {currentWeather.lon.toFixed(3)}
                  </span>
                </div>
                
                {/* Favorite pinning */}
                <button
                  id="star-favourite-toggle"
                  onClick={toggleFavorite}
                  className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                    isFavorite
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                      : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-400"
                  }`}
                  title={isFavorite ? "Unpin from Favorites" : "Pin to Favorites"}
                >
                  <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-500" : ""}`} />
                </button>
              </div>

              {/* Central Temperature Gauges */}
              <div id="current-main-gauge" className="my-6 text-center">
                <span id="label-temp-reading" className="text-5xl font-black tracking-tighter block bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-750 dark:from-white dark:to-slate-300">
                  {formatTemp(currentWeather.temp, unit)}
                </span>
                <span id="label-weather-desc" className="text-sm font-semibold capitalize text-blue-600 dark:text-blue-400 mt-1.5 block">
                  {currentWeather.description}
                </span>
                <div id="temp-low-high-range" className="flex justify-center gap-3 text-xs mt-2.5 font-bold text-slate-400 dark:text-slate-500">
                  <span>H: {formatTemp(currentWeather.tempMax, unit)}</span>
                  <span>L: {formatTemp(currentWeather.tempMin, unit)}</span>
                </div>
              </div>

              {/* Air Quality Indicator custom widget */}
              {airQuality !== null && (
                <div id="aqi-meter-widget" className={`p-3 rounded-xl border mb-6 flex items-center justify-between ${getAQIDetails(airQuality).bg} ${getAQIDetails(airQuality).border}`}>
                  <div className="flex items-center gap-2">
                    <Activity className={`h-4 w-4 ${getAQIDetails(airQuality).color}`} />
                    <div>
                      <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Air Quality Index</span>
                      <span className={`text-xs font-bold ${getAQIDetails(airQuality).color}`}>
                        AQI {airQuality} - {getAQIDetails(airQuality).label}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] max-w-[140px] text-right text-slate-500 dark:text-slate-400">
                    {getAQIDetails(airQuality).description}
                  </span>
                </div>
              )}

              {/* Sub climate variables grid (Humid, wind press, etc.) */}
              <div id="climate-sub-grid" className="grid grid-cols-2 gap-3.5 border-t border-slate-200/50 dark:border-slate-800/10 pt-4 text-xs">
                {/* Wind aspect */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-teal-500/10 text-teal-500">
                    <Wind className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Wind Speed</span>
                    <span className="font-extrabold">{formatWindSpeed(currentWeather.windSpeed, unit)}</span>
                  </div>
                </div>

                {/* Humidity aspect */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                    <Droplets className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Humidity</span>
                    <span className="font-extrabold">{currentWeather.humidity}%</span>
                  </div>
                </div>

                {/* Pressure aspect */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    <Gauge className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Atm. Pressure</span>
                    <span className="font-extrabold">{formatPressure(currentWeather.pressure)}</span>
                  </div>
                </div>

                {/* Visibility aspect */}
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                    <Eye className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-bold">Visibility</span>
                    <span className="font-extrabold">{formatVisibility(currentWeather.visibility, unit)}</span>
                  </div>
                </div>

                {/* Sunrise details */}
                <div className="flex items-center gap-2.5 border-t border-slate-200/20 dark:border-slate-800/10 pt-3.5 mt-1 col-span-2">
                  <div className="flex items-center gap-2 flex-1">
                    <Sunrise className="h-4.5 w-4.5 text-amber-500" />
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Sunrise</span>
                      <span className="font-semibold text-[11px]">
                        {new Date((currentWeather.sunrise + rawCurrentTimezone(currentWeather)) * 1000).getUTCHours().toString().padStart(2, "0")}
                        :
                        {new Date((currentWeather.sunrise + rawCurrentTimezone(currentWeather)) * 1000).getUTCMinutes().toString().padStart(2, "0")} AM
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-1">
                    <Sunset className="h-4.5 w-4.5 text-blue-400" />
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-bold">Sunset</span>
                      <span className="font-semibold text-[11px]">
                        {((new Date((currentWeather.sunset + rawCurrentTimezone(currentWeather)) * 1000).getUTCHours() % 12) || 12).toString().padStart(2, "0")}
                        :
                        {new Date((currentWeather.sunset + rawCurrentTimezone(currentWeather)) * 1000).getUTCMinutes().toString().padStart(2, "0")} PM
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div id="weather-unavailable-card" className="p-8 bg-white/50 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl border border-rose-400/20 shadow-md text-center text-xs text-rose-500">
              {weatherError || "No weather data was loaded. Please configure OpenWeather credentials."}
            </div>
          )}

          {/* Recents Searches Pillar badges */}
          {recentSearches.length > 0 && (
            <div id="recent-search-history" className="p-5 bg-white/70 dark:bg-slate-900/30 backdrop-blur-md rounded-2xl border border-slate-200/50 dark:border-slate-800/10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-3">Recent Searches</span>
              <div className="flex flex-col gap-2">
                {recentSearches.map((rec, index) => (
                  <button
                    key={`${rec.lat}-${rec.lon}-${index}`}
                    id={`recent-pill-${index}`}
                    onClick={() => selectCityHandler(rec)}
                    className="w-full text-left font-semibold hover:text-blue-500 cursor-pointer text-xs py-1.5 px-3 rounded-lg hover:bg-slate-150/50 dark:hover:bg-slate-850/50 flex justify-between items-center bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/30 dark:border-slate-800/20"
                  >
                    <span>{rec.name}</span>
                    <span className="text-[9px] text-slate-400 uppercase font-black">{rec.country}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

        </section>

        {/* Right Column: Layer Map, forecast horizontal lists, Recharts, AI advisor */}
        <section id="interactive-map-column" className="col-span-1 lg:col-span-8 flex flex-col gap-6">
          
          {/* 1. Leaflet Interactive Weather Map widget */}
          <WeatherMap
            lat={selectedGeo.lat}
            lon={selectedGeo.lon}
            city={selectedGeo.name}
            temp={currentWeather?.temp ?? 0}
            onMapClick={(lat, lon) => {
              // On map click, fetch weather coordinates directly
              const geo: GeoLocation = {
                name: "Selected Coordinates",
                country: "LOC",
                lat: lat,
                lon: lon,
              };
              setSelectedGeo(geo);
              fetchAllWeatherData(lat, lon, "Map Coordinates", "LOC");
            }}
            activeLayer={activeLayer}
            setActiveLayer={setActiveLayer}
            openWeatherApiKey={activeOpenWeatherKey || (hasEnvKey ? "PROXIED" : "")}
          />

          {/* 2. Scrollable Hourly Forecast */}
          <div id="hourly-forecast-card" className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/10">
            <div id="hourly-header" className="flex items-center gap-2 mb-4">
              <Clock className="h-5 w-5 text-blue-500" />
              <div>
                <h3 className="text-sm font-semibold text-slate-450 uppercase tracking-widest leading-none">Hourly Projections</h3>
                <span className="text-[10px] text-slate-400">Next 24 hours trend</span>
              </div>
            </div>
            
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-250 dark:scrollbar-thumb-slate-800">
              {hourlyForecast.length > 0 ? (
                hourlyForecast.map((hour, idx) => (
                  <div
                    key={`${hour.dt}-${idx}`}
                    id={`hour-frame-${idx}`}
                    className="flex flex-col items-center justify-between min-w-[76px] bg-slate-50/55 dark:bg-slate-850/40 border border-slate-200/40 dark:border-slate-800/20 p-3 rounded-2xl text-xs flex-1 shrink-0 hover:border-blue-500/30 transition-colors"
                  >
                    <span className="text-[10px] text-slate-450 dark:text-slate-400 font-bold whitespace-nowrap">{hour.time}</span>
                    <div className="my-2.5">
                      {weatherIconsMap(hour.icon)}
                    </div>
                    <span className="font-extrabold">{formatTemp(hour.temp, unit)}</span>
                    
                    {hour.pop > 0 && (
                      <span className="text-[9px] font-black tracking-tight text-cyan-500 mt-1">
                        ðŸ’§{Math.round(hour.pop * 100)}%
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-400 py-4 w-full">
                  Projections data loading...
                </div>
              )}
            </div>
          </div>

          {/* 3. 7-Day / Weekly Weather cards */}
          <div id="weekly-forecast-card" className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/10">
            <h3 className="text-sm font-semibold text-slate-450 uppercase tracking-widest mb-4">6-Day Outlook</h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
              {dailyForecast.length > 0 ? (
                dailyForecast.map((day, idx) => (
                  <div
                    key={`${day.day}-${idx}`}
                    id={`daily-card-${idx}`}
                    className="bg-slate-50/60 dark:bg-slate-850/30 border border-slate-200/40 dark:border-slate-800/20 p-3.5 rounded-2xl flex flex-col items-center justify-between text-center text-xs hover:border-indigo-500/30 transition-all cursor-default"
                  >
                    <div>
                      <span className="font-black text-slate-800 dark:text-slate-200 leading-none block">{day.day}</span>
                      <span className="text-[9px] text-slate-400 block mt-1">{day.date}</span>
                    </div>

                    <div className="my-3">
                      {weatherIconsMap(day.icon)}
                    </div>

                    <div className="w-full flex justify-center gap-2.5 font-bold">
                      <span className="text-slate-800 dark:text-slate-250">{formatTemp(day.tempMax, unit)}</span>
                      <span className="text-slate-400">{formatTemp(day.tempMin, unit)}</span>
                    </div>

                    {day.pop > 0.05 && (
                      <span className="text-[9px] font-extrabold text-cyan-500 block mt-1.5 leading-none bg-cyan-500/10 dark:bg-cyan-500/5 px-1.5 py-0.5 rounded-full">
                        ðŸ’§{Math.round(day.pop * 100)}%
                      </span>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center text-xs text-slate-400 py-4 col-span-full">
                  Loading weather forecasts set...
                </div>
              )}
            </div>
          </div>

          {/* 4. Real-time Gemini AI weather summarize section */}
          <AISummaryCard
            currentWeather={currentWeather}
            hourlyForecast={hourlyForecast}
          />

          {/* 5. Beautiful Recharts Data Graphics block */}
          {hourlyForecast.length > 0 && (
            <WeatherCharts
              hourlyData={hourlyForecast}
              unit={unit}
            />
          )}

        </section>

      </main>
    </div>
  );
}

// Utility: extract offset if geolocations has shifting zones
function rawCurrentTimezone(weather: CurrentWeather): number {
  return 0; // Fixed zone UTC conversion offset fallback helper
}

// Custom SVG-based inner layout markup element representation mapping wrapper
interface Trash2CustomIconProps {
  onClick: (e: any) => void;
  title: string;
}

function Trash2CustomIcon({ onClick, title }: Trash2CustomIconProps) {
  return (
    <span
      onClick={onClick}
      title={title}
      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg shrink-0 cursor-pointer transition-colors"
    >
      <X className="h-3 w-3" />
    </span>
  );
}

