import { useEffect, useRef } from "react";
import L from "leaflet";
import { WeatherLayerType } from "../types";

interface WeatherMapProps {
  lat: number;
  lon: number;
  city: string;
  temp: number;
  onMapClick: (lat: number, lon: number) => void;
  activeLayer: WeatherLayerType | null;
  setActiveLayer: (layer: WeatherLayerType | null) => void;
  openWeatherApiKey: string;
}

export default function WeatherMap({
  lat,
  lon,
  city,
  temp,
  onMapClick,
  activeLayer,
  setActiveLayer,
  openWeatherApiKey,
}: WeatherMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current) return;

    // Create the Leaflet map model
    const mapInstance = L.map(containerRef.current, {
      center: [lat, lon],
      zoom: 6,
      zoomControl: false,
    });

    // Layer 1: Dark Mode / Light Mode theme base tiles
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      maxZoom: 19,
    }).addTo(mapInstance);

    // Zoom Controls at top-right
    L.control
      .zoom({
        position: "topright",
      })
      .addTo(mapInstance);

    // Register Click Event
    mapInstance.on("click", (e: L.LeafletMouseEvent) => {
      onMapClick(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = mapInstance;

    return () => {
      mapInstance.off();
      mapInstance.remove();
      mapRef.current = null;
    };
  }, []);

  // Update center when lat/lon props alter
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView([lat, lon], mapRef.current.getZoom());
    }
  }, [lat, lon]);

  // Adjust marker whenever city/lon/temp changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Delete existing marker
    if (markerRef.current) {
      markerRef.current.remove();
    }

    // Create custom styled glowing ripple marker
    const customIcon = L.divIcon({
      html: `
        <div id="map-glow-pin" class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-blue-400 opacity-60"></span>
          <div class="relative flex flex-col items-center bg-slate-900/90 text-white border border-blue-400/40 px-2 py-1 rounded shadow-lg backdrop-blur-sm">
            <span class="text-[10px] font-bold uppercase tracking-wider text-blue-300">${city}</span>
            <span class="text-xs font-black">${Math.round(temp)}°C</span>
          </div>
          <div class="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5 border border-white"></div>
        </div>
      `,
      className: "custom-div-icon",
      iconSize: [80, 50],
      iconAnchor: [40, 25],
    });

    const marker = L.marker([lat, lon], { icon: customIcon }).addTo(map);
    markerRef.current = marker;
  }, [lat, lon, city, temp]);

  // Handle weather tile overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Flush active overlay layer
    if (layerRef.current) {
      layerRef.current.remove();
      layerRef.current = null;
    }

    if (!activeLayer || !openWeatherApiKey) return;

    // Append OpenWeather Tile Layer
    const layerUrl = `https://tile.openweathermap.org/map/${activeLayer}/{z}/{x}/{y}.png?appid=${openWeatherApiKey}`;

    const tileOverlay = L.tileLayer(layerUrl, {
      opacity: 0.65,
      maxZoom: 18,
    });

    tileOverlay.addTo(map);
    layerRef.current = tileOverlay;
  }, [activeLayer, openWeatherApiKey]);

  // Quick preset handlers
  const layers: { label: string; value: WeatherLayerType | null }[] = [
    { label: "📍 Default", value: null },
    { label: "🌡️ Temp", value: "temp_new" },
    { label: "💨 Wind", value: "wind_new" },
    { label: "☁️ Clouds", value: "clouds_new" },
    { label: "🌧️ Rain", value: "precipitation_new" },
    { label: "🎈 Pressure", value: "pressure_new" },
  ];

  return (
    <div id="weather-map-wrapper" className="relative w-full h-[450px] rounded-2xl overflow-hidden shadow-2xl border border-slate-200/50 dark:border-slate-800/40">
      {/* Leaflet container ref */}
      <div
        id="leaflet-map-element"
        ref={containerRef}
        className="w-full h-full z-0"
      />

      {/* Dynamic Tile legend & selector overlays */}
      <div id="map-legend-pills" className="absolute bottom-5 left-5 z-[500] flex flex-wrap gap-1.5 max-w-[calc(100%-40px)] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-slate-200/50 dark:border-slate-800/20">
        {layers.map((layer) => (
          <button
            key={layer.label}
            id={`btn-layer-${layer.value || "default"}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveLayer(layer.value);
            }}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeLayer === layer.value
                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md shadow-blue-500/15"
                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            {layer.label}
          </button>
        ))}
      </div>

      {activeLayer && !openWeatherApiKey && (
        <div id="tile-warning" className="absolute top-4 left-4 z-[500] bg-rose-500/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md animate-fade-in">
          ⚠️ Expose OpenWeather API Key to load visual layers
        </div>
      )}
    </div>
  );
}
