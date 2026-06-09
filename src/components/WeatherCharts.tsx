import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { HourlyForecast } from "../types";
import { Thermometer, Droplets, Wind } from "lucide-react";

interface WeatherChartsProps {
  hourlyData: HourlyForecast[];
  unit: "metric" | "imperial";
}

type TabType = "temp" | "humidity" | "wind";

export default function WeatherCharts({ hourlyData, unit }: WeatherChartsProps) {
  const [activeTab, setActiveTab] = useState<TabType>("temp");

  // Format dataset specifically with display labels
  const data = hourlyData.slice(0, 12).map((item) => ({
    time: item.time,
    temperature: unit === "imperial" ? Math.round((item.temp * 9) / 5 + 32) : Math.round(item.temp),
    humidity: item.humidity,
    windSpeed: Math.round(unit === "imperial" ? item.windSpeed * 2.23694 : item.windSpeed * 3.6),
  }));

  const renderChart = () => {
    switch (activeTab) {
      case "temp":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="tempGlow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800/60" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} unit={unit === "imperial" ? "°F" : "°C"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(30, 41, 59, 0.9)",
                  borderRadius: "12px",
                  borderColor: "rgba(148, 163, 184, 0.2)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                name="Temperature"
                stroke="url(#tempGlow)"
                strokeWidth={3}
                dot={{ r: 4, stroke: "#3b82f6", strokeWidth: 2, fill: "#fff" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );

      case "humidity":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800/60" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(30, 41, 59, 0.9)",
                  borderRadius: "12px",
                  borderColor: "rgba(148, 163, 184, 0.2)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="humidity" name="Humidity" fill="#22c55e" radius={[4, 4, 0, 0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        );

      case "wind":
        return (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 5 }}>
              <defs>
                <linearGradient id="windAreaGlow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800/60" vertical={false} />
              <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} unit={unit === "imperial" ? " mph" : " kmh"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(30, 41, 59, 0.9)",
                  borderRadius: "12px",
                  borderColor: "rgba(148, 163, 184, 0.2)",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="windSpeed"
                name="Wind Speed"
                stroke="#06b6d4"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#windAreaGlow)"
              />
            </AreaChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <div id="weather-charts-card" className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md p-6 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800/10">
      <div id="chart-controls-header" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 id="insights-heading" className="text-sm font-semibold text-slate-400 uppercase tracking-widest">
            Hourly Trends
          </h3>
          <p id="insights-desc" className="text-xs text-slate-500 dark:text-slate-400">
            Aesthetic projection charts over the next 12 hours
          </p>
        </div>

        {/* Chart View selector buttons */}
        <div id="chart-nav-pills" className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl space-x-1">
          <button
            id="tab-temp-trend"
            onClick={() => setActiveTab("temp")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "temp"
                ? "bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Thermometer className="h-3.5 w-3.5" />
            Temp
          </button>
          <button
            id="tab-humidity-trend"
            onClick={() => setActiveTab("humidity")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "humidity"
                ? "bg-white dark:bg-slate-900 shadow-sm text-green-600 dark:text-green-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Droplets className="h-3.5 w-3.5" />
            Humidity
          </button>
          <button
            id="tab-wind-trend"
            onClick={() => setActiveTab("wind")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "wind"
                ? "bg-white dark:bg-slate-900 shadow-sm text-cyan-500 dark:text-cyan-400"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Wind className="h-3.5 w-3.5" />
            Wind
          </button>
        </div>
      </div>

      <div id="active-chart-rendered" className="w-full">
        {renderChart()}
      </div>
    </div>
  );
}
