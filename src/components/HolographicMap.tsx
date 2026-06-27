import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import { 
  X, 
  Minus, 
  MapPin, 
  Map as MapIcon, 
  Compass, 
  Layers, 
  Navigation,
  Globe,
  Plus,
  Minus as ZoomOutIcon
} from "lucide-react";
import { 
  APIProvider, 
  Map, 
  AdvancedMarker, 
  Pin, 
  useMap, 
  useMapsLibrary,
  useAdvancedMarkerRef,
  InfoWindow
} from "@vis.gl/react-google-maps";

const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  "";

const hasValidKey = Boolean(API_KEY) && API_KEY !== "YOUR_API_KEY" && API_KEY !== "";

interface HolographicMapProps {
  query: string;
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

// Subcomponent to trigger and center the Places API search
function ActivePlaceLocator({ 
  query, 
  onLoaded 
}: { 
  query: string; 
  onLoaded: (places: google.maps.places.Place[]) => void; 
}) {
  const map = useMap();
  const placesLib = useMapsLibrary("places");
  const [places, setPlaces] = useState<google.maps.places.Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<google.maps.places.Place | null>(null);
  const [markerRef, marker] = useAdvancedMarkerRef();

  useEffect(() => {
    if (!placesLib || !query || !map) return;

    console.log(`[SATLINK KEYSTROKE] Tracking telemetry for: "${query}"`);
    placesLib.Place.searchByText({
      textQuery: query,
      fields: ["displayName", "location", "formattedAddress", "id"],
      maxResultCount: 5,
    })
      .then(({ places }) => {
        setPlaces(places || []);
        onLoaded(places || []);
        
        if (places && places.length > 0) {
          const first = places[0];
          if (first.location) {
            map.setCenter(first.location);
            map.setZoom(15);
            setSelectedPlace(first);
          }
        }
      })
      .catch((err) => {
        console.error("[SATLINK ERROR] Target triangulation failure:", err);
      });
  }, [placesLib, query, map]);

  return (
    <>
      {places.map((place, index) => {
        if (!place.location) return null;
        const isPrimary = index === 0;
        return (
          <React.Fragment key={place.id || index}>
            <AdvancedMarker
              ref={isPrimary ? markerRef : undefined}
              position={place.location}
              title={place.displayName || ""}
              onClick={() => setSelectedPlace(place)}
            >
              <Pin 
                background={isPrimary ? "#06b6d4" : "#0f172a"} 
                borderColor={isPrimary ? "#22d3ee" : "#3b82f6"} 
                glyphColor="#fff"
                scale={isPrimary ? 1.1 : 0.9}
              />
            </AdvancedMarker>
            
            {selectedPlace && selectedPlace.id === place.id && (
              <InfoWindow
                anchor={isPrimary ? marker : null}
                position={place.location}
                onCloseClick={() => setSelectedPlace(null)}
              >
                <div className="text-slate-900 font-mono text-xs p-1">
                  <h4 className="font-bold border-b border-slate-200 pb-1 mb-1 text-cyan-700">
                    {place.displayName}
                  </h4>
                  <p className="text-[10px] text-slate-600 max-w-[200px] leading-relaxed">
                    {place.formattedAddress}
                  </p>
                  <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-slate-100 text-[8px] text-slate-400">
                    <span>LAT: {place.location.lat().toFixed(4)}</span>
                    <span>LNG: {place.location.lng().toFixed(4)}</span>
                  </div>
                </div>
              </InfoWindow>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
}

export default function HolographicMap({
  query,
  isMinimized,
  onClose,
  onToggleMinimize,
}: HolographicMapProps) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid" | "terrain">("hybrid");
  const [foundPlaces, setFoundPlaces] = useState<google.maps.places.Place[]>([]);
  const [isTriangulating, setIsTriangulating] = useState<boolean>(true);

  useEffect(() => {
    setIsTriangulating(true);
  }, [query]);

  const handlePlacesLoaded = (places: google.maps.places.Place[]) => {
    setFoundPlaces(places);
    setIsTriangulating(false);
  };

  if (isMinimized) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={onToggleMinimize}
        className="fixed bottom-24 left-8 z-50 flex items-center gap-2 bg-slate-950/95 border border-cyan-500/40 px-3.5 py-2.5 rounded-full cursor-pointer hover:border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] md:absolute md:bottom-20 md:left-4 group"
      >
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
          <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-cyan-400/35 opacity-75" />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
            className="w-full h-full border border-dashed border-cyan-400/60 rounded-full flex items-center justify-center"
          >
            <Compass className="w-2.5 h-2.5 text-cyan-400" />
          </motion.div>
        </div>

        <div className="flex flex-col text-left">
          <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-widest leading-none">
            {isTriangulating ? "TRIANGULATING..." : "MAPS LOCK"}
          </span>
          <span className="text-[10px] font-mono text-cyan-200 font-medium truncate max-w-[120px] leading-tight group-hover:text-cyan-300">
            {query}
          </span>
        </div>
        
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded-full transition-all ml-1.5"
          title="Disengage Core"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.3 }}
      className="bg-slate-950/90 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.15)] w-full flex flex-col relative"
    >
      {/* Laser line scanning effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent animate-pulse z-10" />

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/95 border-b border-cyan-500/20 text-xs font-mono z-10">
        <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider uppercase">
          <MapIcon className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-[10px]">JARVIS ORBITAL CARTOGRAPHY</span>
        </div>
        
        {/* Connection status telemetry */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-slate-500 animate-pulse hidden sm:inline">
            {isTriangulating ? "CALIBRATING DISH ARRAY..." : "SATLINK CARRIER: LOCK"}
          </span>
          <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded text-[8px] text-cyan-200">
            <span className={`w-1.5 h-1.5 rounded-full ${isTriangulating ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-ping"}`} />
            <span className="font-semibold uppercase tracking-widest text-[8px]">
              {isTriangulating ? "TRIANGULATING" : "COORDS SAFE"}
            </span>
          </div>

          {/* Window operations */}
          <div className="flex items-center gap-1 ml-1.5 border-l border-cyan-500/20 pl-2">
            <button
              type="button"
              onClick={onToggleMinimize}
              className="p-1 hover:bg-cyan-500/15 text-slate-400 hover:text-cyan-300 rounded transition-all"
              title="Minimize map to orbital locator"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-all"
              title="Close orbital feed"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main viewport area */}
      <div className="p-3 bg-slate-950/40 relative">
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-cyan-500/10 bg-black shadow-inner flex items-center justify-center min-h-[300px]">
          
          {!hasValidKey ? (
            // Constitution Rule 1 Splash/Diagnostics overlay
            <div className="flex flex-col items-center justify-center p-6 text-center text-slate-300 font-mono max-w-md mx-auto space-y-4">
              <div className="w-12 h-12 rounded-full bg-cyan-950/85 border border-cyan-500/30 flex items-center justify-center text-cyan-400 animate-pulse">
                <Globe className="w-6 h-6 animate-spin" style={{ animationDuration: "12s" }} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-1">
                  Google Maps API Key Needed
                </h3>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Our advanced J.A.R.V.I.S. orbital imagery system requires a valid secret key. Follow these instructions to activate immediately:
                </p>
              </div>
              <ol className="text-left text-[9px] space-y-1.5 bg-slate-950/80 border border-cyan-500/10 p-3 rounded-lg text-slate-400 w-full">
                <li>
                  1. <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Get an API Key here</a>
                </li>
                <li>
                  2. Open <strong>Settings (⚙️ gear icon, top-right)</strong>
                </li>
                <li>
                  3. Select <strong>Secrets</strong>
                </li>
                <li>
                  4. Add secret name: <code className="text-cyan-300">GOOGLE_MAPS_PLATFORM_KEY</code>
                </li>
                <li>
                  5. Paste your key and press Enter
                </li>
              </ol>
              <p className="text-[8px] text-cyan-500/50 uppercase select-none">
                BUILD SYSTEM REBUILDS WITH ZERO PAGE REFRESH OR RELOAD REQUIRED.
              </p>
            </div>
          ) : (
            // Fully functional Google Map
            <APIProvider apiKey={API_KEY} version="weekly">
              <div className="w-full h-full absolute inset-0">
                <Map
                  defaultCenter={{ lat: 37.5665, lng: 126.9780 }} // Center on Seoul as fallback init
                  defaultZoom={12}
                  mapId="DEMO_MAP_ID"
                  mapTypeId={mapType}
                  disableDefaultUI={true}
                  internalUsageAttributionIds={["gmp_mcp_codeassist_v1_aistudio"]}
                  style={{ width: "100%", height: "100%" }}
                >
                  <ActivePlaceLocator query={query} onLoaded={handlePlacesLoaded} />
                </Map>
              </div>

              {/* Map controls panel overlay */}
              <div className="absolute bottom-3 right-3 flex flex-col gap-1 z-20 font-mono text-[9px]">
                {/* Map Type selectors */}
                <div className="flex flex-col rounded border border-cyan-500/30 bg-slate-950/95 shadow-lg overflow-hidden text-cyan-400 font-bold">
                  <button
                    onClick={() => setMapType("hybrid")}
                    className={`px-2.5 py-1 text-center hover:bg-cyan-500/10 transition-all ${mapType === "hybrid" ? "bg-cyan-500/20 text-cyan-200 border-b border-cyan-500/20" : "border-b border-cyan-500/20"}`}
                  >
                    HYBRID
                  </button>
                  <button
                    onClick={() => setMapType("roadmap")}
                    className={`px-2.5 py-1 text-center hover:bg-cyan-500/10 transition-all ${mapType === "roadmap" ? "bg-cyan-500/20 text-cyan-200 border-b border-cyan-500/20" : "border-b border-cyan-500/20"}`}
                  >
                    VECTOR
                  </button>
                  <button
                    onClick={() => setMapType("terrain")}
                    className={`px-2.5 py-1 text-center hover:bg-cyan-500/10 transition-all ${mapType === "terrain" ? "bg-cyan-500/20 text-cyan-200" : ""}`}
                  >
                    TERRAIN
                  </button>
                </div>
              </div>
            </APIProvider>
          )}
        </div>
      </div>

      {/* Footer metadata tracker */}
      <div className="px-4 py-2 bg-slate-900/60 border-t border-cyan-500/10 flex items-center justify-between text-[10px] font-mono z-10">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-500 font-bold uppercase truncate">LOCATOR QUERY:</span>
          <span className="text-cyan-100 font-semibold truncate hover:text-cyan-300">
            {query || "Pending satellite assignment"}
          </span>
        </div>
        <span className="text-cyan-500/50 text-[9px] select-none text-right shrink-0 uppercase tracking-widest pl-2">
          {foundPlaces.length > 0 
            ? `RESOLVED INDICES: ${foundPlaces.length}` 
            : isTriangulating 
              ? "INTERPOLATING SIGNAL..." 
              : "READY"}
        </span>
      </div>
    </motion.div>
  );
}
