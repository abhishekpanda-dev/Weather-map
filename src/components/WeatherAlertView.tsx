import { useState } from "react";
import { WeatherAlert } from "../types";
import { AlertTriangle, AlertOctagon, Info, X, ChevronRight, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface WeatherAlertViewProps {
  alerts: WeatherAlert[];
}

export default function WeatherAlertView({ alerts }: WeatherAlertViewProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});

  const activeAlerts = alerts.filter((alert) => !dismissed[alert.id]);

  if (activeAlerts.length === 0) return null;

  const currentAlert = activeAlerts[activeIndex];

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case "extreme":
        return {
          bannerBg: "bg-red-500/15 border-red-500 text-red-800 dark:text-red-300",
          badgeBg: "bg-red-500 text-white animate-pulse",
          icon: <AlertOctagon className="h-5 w-5 text-red-500" />,
        };
      case "severe":
        return {
          bannerBg: "bg-rose-500/10 border-rose-500 text-rose-800 dark:text-rose-300",
          badgeBg: "bg-rose-500 text-white",
          icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
        };
      case "moderate":
        return {
          bannerBg: "bg-amber-500/10 border-amber-500 text-amber-800 dark:text-amber-300",
          badgeBg: "bg-amber-500 text-slate-900 font-bold",
          icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
        };
      case "info":
      default:
        return {
          bannerBg: "bg-sky-500/10 border-sky-500 text-sky-800 dark:text-sky-300",
          badgeBg: "bg-sky-500 text-white",
          icon: <Info className="h-5 w-5 text-sky-500" />,
        };
    }
  };

  const style = getSeverityStyle(currentAlert.severity);

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % activeAlerts.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + activeAlerts.length) % activeAlerts.length);
  };

  const handleDismiss = (id: string) => {
    setDismissed((prev) => ({ ...prev, [id]: true }));
    // Adjust active index if it overflows
    if (activeIndex >= activeAlerts.length - 1 && activeIndex > 0) {
      setActiveIndex((prev) => prev - 1);
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentAlert.id}
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        id="top-alert-banner"
        className={`w-full border-b backdrop-blur-md px-6 py-3.5 flex items-center justify-between gap-4 transition-all ${style.bannerBg}`}
      >
        <div id="alert-card-info" className="flex items-center gap-3">
          <div id="alert-urgency-logo">{style.icon}</div>
          <div id="alert-details-block" className="flex-1">
            <div id="alert-header-row" className="flex flex-wrap items-center gap-2">
              <span id="alert-pill-badge" className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${style.badgeBg}`}>
                {currentAlert.severity} Advisory
              </span>
              <h4 id="alert-title-main" className="text-sm font-bold tracking-tight">
                {currentAlert.event}
              </h4>
              <span id="alert-originator" className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                by {currentAlert.senderName}
              </span>
            </div>
            <p id="alert-body-text" className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed line-clamp-2 md:line-clamp-none">
              {currentAlert.description}
            </p>
          </div>
        </div>

        <div id="banner-action-buttons" className="flex items-center gap-2 shrink-0">
          {activeAlerts.length > 1 && (
            <div id="alert-pagination" className="flex items-center gap-1">
              <button
                id="alert-pg-prev"
                onClick={handlePrev}
                className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg text-slate-500 cursor-pointer transition-colors"
                title="Previous warning"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span id="alert-pagination-text" className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                {activeIndex + 1} / {activeAlerts.length}
              </span>
              <button
                id="alert-pg-next"
                onClick={handleNext}
                className="p-1 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg text-slate-500 cursor-pointer transition-colors"
                title="Next warning"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            id={`btn-dismiss-${currentAlert.id}`}
            onClick={() => handleDismiss(currentAlert.id)}
            className="p-1.5 hover:bg-slate-200/50 dark:hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors ml-1"
            title="Dismiss notification"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
