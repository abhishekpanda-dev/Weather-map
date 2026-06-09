import { useState, useEffect } from "react";
import { AISummary, CurrentWeather, HourlyForecast } from "../types";
import { Sparkles, Shirt, Activity, MapPin, AlertCircle, RefreshCw } from "lucide-react";

interface AISummaryCardProps {
  currentWeather: CurrentWeather | null;
  hourlyForecast: HourlyForecast[];
}

export default function AISummaryCard({
  currentWeather,
  hourlyForecast,
}: AISummaryCardProps) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummary = async () => {
    if (!currentWeather) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weatherData: {
            location: `${currentWeather.name}, ${currentWeather.country}`,
            temp: currentWeather.temp,
            feelsLike: currentWeather.feelsLike,
            tempMax: currentWeather.tempMax,
            tempMin: currentWeather.tempMin,
            description: currentWeather.description,
            humidity: currentWeather.humidity,
            windSpeed: currentWeather.windSpeed,
            visibility: currentWeather.visibility,
            hourlyTrend: hourlyForecast.slice(0, 6).map((h) => ({
              time: h.time,
              temp: h.temp,
              description: h.description,
            })),
          },
        }),
      });

      if (!response.ok) {
        const payload = await response.json();
        const message = payload.error || "Failed to generate AI Weather Intelligence summary.";
        if (message.includes("Gemini API Key is not configured")) {
          setSummary(null);
          return;
        }
        throw new Error(message);
      }

      const data = await response.json();
      setSummary(data);
    } catch (err: any) {
      console.error("AI Generation Error:", err);
      setError(err.message || "An issue occurred contacting the AI model.");
    } finally {
      setLoading(false);
    }
  };

  const currentWeatherName = currentWeather?.name;
  const currentWeatherTemp = currentWeather?.temp;

  useEffect(() => {
    if (currentWeatherName) {
      fetchSummary();
    } else {
      setSummary(null);
      setError(null);
    }
  }, [currentWeatherName, currentWeatherTemp]);

  if (loading) {
    return (
      <div id="gemini-loading" className="p-8 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/10 rounded-2xl shadow-xl min-h-[250px] flex flex-col items-center justify-center text-center">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-4" />
        <h4 id="gemini-loading-header" className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-widest animate-pulse">
          Consulting AI Meteorologist...
        </h4>
        <p id="gemini-loading-subtext" className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          Analyzing air pressures, wind indices, and local forecasts to compute custom suggestions
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div id="gemini-error" className="p-6 bg-rose-500/10 border border-rose-500/20 backdrop-blur-md rounded-2xl shadow-xl text-center">
        <AlertCircle className="mx-auto h-8 w-8 text-rose-500 mb-2" />
        <h3 id="gemini-error-header" className="text-sm font-bold text-rose-700 dark:text-rose-400">
          Smart Summary Unavailable
        </h3>
        <p id="gemini-error-desc" className="text-xs text-rose-600 dark:text-rose-300 max-w-xs mx-auto mt-2">
          {error}
        </p>
        <button
          onClick={fetchSummary}
          className="mt-4 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition cursor-pointer"
        >
          Retry Summary Consultation
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div id="gemini-insights-grid" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {/* 1. Natural language meteorology summary */}
      <div id="ai-tab-summary" className="col-span-1 md:col-span-2 bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border border-indigo-500/20 dark:border-indigo-500/10 backdrop-blur-xl p-5 rounded-2xl shadow-xl flex flex-col justify-between">
        <div id="ai-tab-summary-content">
          <div id="ai-title-1" className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-indigo-400 fill-indigo-400/20 animate-pulse" />
            <h4 id="ai-summary-heading" className="text-xs font-bold text-indigo-400 uppercase tracking-widest">
              AI Forecast Outlook
            </h4>
          </div>
          <p id="ai-summary-text" className="text-sm font-medium leading-relaxed text-slate-700 dark:text-slate-200">
            {summary.summary}
          </p>
        </div>
        <div id="ai-summary-footer" className="text-[10px] font-mono text-slate-400 mt-4 border-t border-slate-200/40 dark:border-slate-800/20 pt-2 text-right">
          Powered by Gemini 3.5 Flash
        </div>
      </div>

      {/* 2. Apparel advisory list */}
      <div id="ai-tab-apparel" className="bg-white/50 dark:bg-slate-900/30 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/10 flex flex-col justify-between">
        <div id="ai-tab-apparel-content">
          <div id="ai-title-2" className="flex items-center gap-2 mb-3">
            <Shirt className="h-5 w-5 text-emerald-400" />
            <h4 id="ai-apparel-heading" className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
              Apparel Advisory
            </h4>
          </div>
          <p id="ai-apparel-text" className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {summary.apparelRecommendation}
          </p>
        </div>
      </div>

      {/* 3. Sport & activity suitability */}
      <div id="ai-tab-suitability" className="bg-white/50 dark:bg-slate-900/30 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/10 flex flex-col justify-between">
        <div id="ai-tab-suitability-content">
          <div id="ai-title-3" className="flex items-center gap-2 mb-3">
            <Activity className="h-5 w-5 text-amber-400" />
            <h4 id="ai-suitability-heading" className="text-xs font-bold text-amber-400 uppercase tracking-widest">
              Outdoor Suitability
            </h4>
          </div>
          <p id="ai-suitability-text" className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            {summary.outdoorActivitySuitability}
          </p>
        </div>
      </div>

      {/* 4. Travel and commuter warnings */}
      <div id="ai-tab-travel" className="bg-white/50 dark:bg-slate-900/30 backdrop-blur-md p-5 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/10 flex flex-col justify-between">
        <div id="ai-tab-travel-content">
          <div id="ai-title-4" className="flex items-center gap-2 mb-3">
            <MapPin className="h-5 w-5 text-pink-400" />
            <h4 id="ai-travel-heading" className="text-xs font-bold text-pink-400 uppercase tracking-widest">
              Commuter Counsel
            </h4>
          </div>
          <p id="ai-travel-text" className="text-xs leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
            {summary.travelAdvice}
          </p>
        </div>
      </div>
    </div>
  );
}
