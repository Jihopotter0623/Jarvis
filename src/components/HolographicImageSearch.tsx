import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Search, RefreshCw, Maximize2, X, Download, ExternalLink, 
  Satellite, Image as ImageIcon, Sparkles, Cpu, Layers, AlertCircle, Eye, Check
} from "lucide-react";

interface HolographicImageSearchProps {
  initialQuery?: string;
  onAskJarvis?: (promptText: string) => void;
  onAttachImage?: (imageBase64OrUrl: string) => void;
  status: "idle" | "listening" | "thinking" | "speaking";
  onClose?: () => void;
  isFloating?: boolean;
}

interface SearchImage {
  id: string;
  url: string;
  title: string;
  width?: number;
  height?: number;
  source: "unsplash" | "wikimedia";
}

export default function HolographicImageSearch({ 
  initialQuery = "", 
  onAskJarvis, 
  onAttachImage,
  status,
  onClose,
  isFloating = false
}: HolographicImageSearchProps) {
  const [query, setQuery] = useState(initialQuery || "Tony Stark");
  const [images, setImages] = useState<SearchImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<SearchImage | null>(null);
  const [hasAttached, setHasAttached] = useState<string | null>(null);
  const [telemetryLogs, setTelemetryLogs] = useState<string[]>([]);

  // Stark HUD system parameters (calculated on image selection)
  const [hudSpecs, setHudSpecs] = useState({
    resolution: "1920x1080",
    colorDepth: "32-bit sRGB",
    spectralIntensity: "89.4%",
    sector: "MALIBU-CO-PRO",
    ping: "45ms"
  });

  const addTelemetry = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setTelemetryLogs(prev => [`[HUD ${timestamp}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const fetchImages = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setError(null);
    addTelemetry(`Initializing satellite downlink for query: "${searchTerm}"`);
    
    try {
      const res = await fetch(`/api/image-search?q=${encodeURIComponent(searchTerm)}`);
      if (!res.ok) {
        throw new Error(`Satellite communication returned code: ${res.status}`);
      }
      const data = await res.json();
      
      if (data.images && data.images.length > 0) {
        setImages(data.images);
        addTelemetry(`Downlink synchronized. Loaded ${data.images.length} high-fidelity optical layers.`);
      } else {
        setImages([]);
        setError("No visual matches found on current frequency scan.");
        addTelemetry("WARNING: Optical arrays returned null matches.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to download visual matrix array.");
      addTelemetry(`CRITICAL: Handshake failure on downlink. ${err.message || ""}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      fetchImages(initialQuery);
    } else {
      fetchImages("Tony Stark");
    }
  }, [initialQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchImages(query);
  };

  const handleSelectImage = (img: SearchImage) => {
    setSelectedImage(img);
    addTelemetry(`Focusing optical target ID: ${img.id.slice(0, 8)}...`);
    
    // Generate some randomized high-tech J.A.R.V.I.S. specs for fun
    const resW = img.width || Math.floor(Math.random() * 2000) + 1200;
    const resH = img.height || Math.floor(Math.random() * 1500) + 800;
    const spectCount = (Math.random() * 20 + 80).toFixed(1);
    const sectors = ["MALIBU-VIRTUAL", "SATELLITE-GRID-A", "STARK-MAIN-CORE", "AVENGERS-UP-LINK"];
    const activeSector = sectors[Math.floor(Math.random() * sectors.length)];
    const activePing = `${Math.floor(Math.random() * 80) + 20}ms`;

    setHudSpecs({
      resolution: `${resW}x${resH}`,
      colorDepth: "32-bit Dynamic Range",
      spectralIntensity: `${spectCount}%`,
      sector: activeSector,
      ping: activePing
    });
  };

  const handleAttachImageToJarvis = async (img: SearchImage) => {
    if (!onAttachImage) return;
    
    addTelemetry("Transferring visual optical buffer to main cognitive engine...");
    setHasAttached(img.id);
    
    try {
      // Pass the image URL directly
      onAttachImage(img.url);
      addTelemetry("Image buffer securely attached to main scanner console.");
      
      // Prompt JARVIS to speak about this image
      if (onAskJarvis) {
        onAskJarvis(`방금 찾아준 이 이미지(${img.title || "사진"})에 대해 설명해 주거나 느낌을 말해줘.`);
      }
    } catch (err) {
      addTelemetry("ERROR: Failed to inject optical asset into system registries.");
    } finally {
      setTimeout(() => setHasAttached(null), 3000);
    }
  };

  // Pre-configured high tech keywords matching Stark aesthetic
  const presets = [
    { label: "아크 리액터", value: "Arc Reactor" },
    { label: "아이언맨 슈트", value: "Iron Man Armor" },
    { label: "말리부 저택", value: "Stark Malibu Mansion" },
    { label: "우주 성운", value: "Cosmic Nebula" },
    { label: "홀로그램 테크", value: "Holographic interface technology" },
    { label: "양자 터널", value: "Quantum realm physics" }
  ];

  return (
    <div className={`stark-cyber-panel stark-cyber-bottom-decor flex-1 flex flex-col p-4 relative overflow-hidden ${isFloating ? "h-[540px] max-h-[85vh]" : "h-[508px]"}`}>
      {/* Decorative top scanline */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent animate-pulse" />
      
      {/* Header with holographic status indicator */}
      <div className="flex items-center justify-between border-b border-cyan-500/15 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold font-mono text-cyan-200 tracking-wider">
              OPTICAL DATA GRID
            </h3>
            <p className="text-[9px] text-cyan-500/60 font-mono uppercase tracking-tight">
              Satellite Image Search Uplink
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-400/20 px-2 py-0.5 rounded-full">
            <Satellite className="w-3 h-3 text-cyan-400 animate-pulse" />
            <span className="text-[9px] text-cyan-300 font-mono uppercase tracking-widest text-right">SAT-GRID-09</span>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1 bg-slate-950 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer flex items-center justify-center"
              title="Close panel"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Manual query submission form */}
      <form onSubmit={handleSearchSubmit} className="flex gap-1.5 mb-2.5">
        <div className="relative flex-1 flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search Stark visual archives..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/40 rounded-xl px-3 py-1.5 pl-9 text-cyan-100 font-mono text-[11px] outline-none transition-all"
          />
          <Search className="absolute left-3 w-3.5 h-3.5 text-slate-500" />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-3 bg-cyan-950/80 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400 text-cyan-300 rounded-xl font-mono text-[10px] font-bold tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
        >
          {loading ? (
            <RefreshCw className="w-3 h-3 animate-spin" />
          ) : (
            <>
              <Search className="w-3 h-3" />
              <span>SCAN</span>
            </>
          )}
        </button>
      </form>

      {/* Preset hotkeys */}
      <div className="flex flex-wrap gap-1 mb-3">
        {presets.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => {
              setQuery(preset.value);
              fetchImages(preset.value);
            }}
            className={`px-2 py-0.5 rounded-md border font-mono text-[8px] uppercase tracking-wide transition-all cursor-pointer ${
              query === preset.value
                ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                : "bg-slate-950/40 border-slate-900 text-slate-500 hover:border-cyan-500/20 hover:text-cyan-400"
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Image Grid Content Area */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/10 scrollbar-track-transparent pr-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex flex-col items-center justify-center space-y-3 bg-slate-950/35"
            >
              {/* Glowing holographic radar loader */}
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-cyan-500/10" />
                <div className="absolute inset-0 rounded-full border-2 border-t-cyan-400 animate-spin" />
                <Cpu className="w-6 h-6 text-cyan-400/60 animate-pulse" />
              </div>
              <div className="text-center font-mono space-y-0.5">
                <span className="text-[9px] text-cyan-400/80 tracking-widest uppercase animate-pulse">DOWNLINK ACTIVE</span>
                <p className="text-[8px] text-slate-500">Retrieving security image packets...</p>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-rose-500/15 bg-rose-950/5 rounded-2xl"
            >
              <AlertCircle className="w-5 h-5 text-rose-400 mb-1.5 animate-bounce" />
              <p className="text-[10px] font-mono text-rose-300/80 font-bold uppercase leading-relaxed">
                Downlink Handshake Interrupted
              </p>
              <span className="text-[9px] font-sans text-slate-500 mt-0.5 leading-snug">
                {error}
              </span>
            </motion.div>
          ) : images.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800 rounded-2xl py-12"
            >
              <ImageIcon className="w-6 h-6 text-slate-600 mb-1.5" />
              <p className="text-[10px] font-mono text-slate-400 leading-normal font-bold">
                AWAITING COORDINATES
              </p>
              <span className="text-[9px] text-slate-500/85 mt-1 block">
                Type a query above or click a fast preset tag to load.
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-2 gap-2 p-0.5"
            >
              {images.map((img) => (
                <motion.div
                  key={img.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelectImage(img)}
                  className="group relative h-24 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden cursor-pointer hover:border-cyan-500/40 hover:shadow-[0_0_12px_rgba(6,182,212,0.1)] transition-all"
                >
                  <img
                    src={img.url}
                    alt={img.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover opacity-75 group-hover:opacity-95 transition-opacity"
                  />
                  {/* High-tech border glow overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                  
                  {/* Tiny info overlay on bottom of card */}
                  <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-end justify-between">
                    <span className="text-[7.5px] font-mono text-cyan-300 font-bold truncate max-w-[85%] uppercase">
                      {img.title || "Optical Frame"}
                    </span>
                    <Maximize2 className="w-2.5 h-2.5 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* High-tech telemetry scrolling terminal logs at footer */}
      <div className="mt-3 pt-2.5 border-t border-cyan-500/10 font-mono text-[7px] text-cyan-400/50 flex flex-col space-y-0.5 h-12 overflow-hidden select-none">
        {telemetryLogs.length === 0 ? (
          <span className="text-slate-600 italic block text-center mt-2.5">Optical Downlink Diagnostic Standby.</span>
        ) : (
          telemetryLogs.slice(0, 3).map((log, idx) => (
            <span key={idx} className="block leading-tight break-all uppercase">
              {log}
            </span>
          ))
        )}
      </div>

      {/* Lightbox / High-tech HUD Inspection Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-950/95 backdrop-blur-sm p-4 flex flex-col justify-between"
          >
            {/* Top Close bar */}
            <div className="flex justify-between items-center border-b border-cyan-500/20 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span className="text-[10px] font-bold font-mono text-cyan-200 uppercase tracking-widest">
                  HUD OPTICAL SCANNER
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImage(null)}
                className="p-1 bg-slate-900 border border-slate-800 hover:border-red-500/30 text-slate-400 hover:text-red-400 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Image viewport with radar grid effect */}
            <div className="flex-1 flex items-center justify-center relative my-3 overflow-hidden rounded-xl border border-cyan-500/10 bg-slate-950/40">
              {/* Target bracket decorators */}
              <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
              
              <img
                src={selectedImage.url}
                alt={selectedImage.title}
                referrerPolicy="no-referrer"
                className="max-h-[220px] max-w-full object-contain rounded-lg z-10 p-2 shadow-[0_0_20px_rgba(34,211,238,0.15)]"
              />
            </div>

            {/* HUD Metadata Parameters Overlay & Actions */}
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2 bg-slate-900/60 border border-cyan-500/10 p-2 rounded-xl font-mono text-[8px] text-slate-400 leading-normal">
                <div className="flex justify-between border-b border-cyan-500/5 pb-0.5">
                  <span>RESOLVED SIZE:</span>
                  <span className="text-cyan-300 font-bold">{hudSpecs.resolution}</span>
                </div>
                <div className="flex justify-between border-b border-cyan-500/5 pb-0.5">
                  <span>SPECTRAL:</span>
                  <span className="text-cyan-300 font-bold">{hudSpecs.spectralIntensity}</span>
                </div>
                <div className="flex justify-between">
                  <span>LATENCY:</span>
                  <span className="text-cyan-300 font-bold">{hudSpecs.ping}</span>
                </div>
                <div className="flex justify-between">
                  <span>DOWNLINK SECTOR:</span>
                  <span className="text-cyan-300 font-bold uppercase truncate max-w-[55%]">{hudSpecs.sector}</span>
                </div>
              </div>

              {/* Control Action Buttons */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleAttachImageToJarvis(selectedImage)}
                  className="flex-1 py-1.5 bg-cyan-950/80 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:text-cyan-100 rounded-lg text-[9px] font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {hasAttached === selectedImage.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">SCAN ATTACHED</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>ASK JARVIS ABOUT IMAGE</span>
                    </>
                  )}
                </button>

                <a
                  href={selectedImage.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 bg-slate-900 border border-slate-800 hover:border-cyan-500/25 hover:text-cyan-400 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                  title="Open source link"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
