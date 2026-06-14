import React from "react";
import { motion } from "motion/react";
import { 
  X, 
  Minus, 
  Maximize2, 
  Music, 
  Tv, 
  Youtube, 
  Radio, 
  Volume2, 
  VolumeX 
} from "lucide-react";

interface HolographicYoutubePlayerProps {
  query: string;
  type: "song" | "channel";
  isMinimized: boolean;
  onClose: () => void;
  onToggleMinimize: () => void;
}

export default function HolographicYoutubePlayer({
  query,
  type,
  isMinimized,
  onClose,
  onToggleMinimize,
}: HolographicYoutubePlayerProps) {
  
  const [resolvedVideoId, setResolvedVideoId] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    const cleanQuery = type === "channel" ? `${query} channel` : query;
    setIsLoading(true);
    setErrorMsg(null);

    console.log(`[Holographic HUD] Initiating dynamic wave capture for: "${cleanQuery}"`);
    fetch(`/api/youtube-search?q=${encodeURIComponent(cleanQuery)}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("Frequency carrier modulation failure.");
        }
        return res.json();
      })
      .then((data) => {
        if (active) {
          if (data.videoId) {
            console.log(`[Holographic HUD] Frequency locked. VideoId:`, data.videoId);
            setResolvedVideoId(data.videoId);
          } else {
            console.warn(`[Holographic HUD] Frequency lost. Initiating backup loop.`);
            setResolvedVideoId("jfKfPfyJRdk"); // Safe backup lofi live loop video
          }
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          console.error(`[Holographic HUD] Signal lock failure:`, err);
          setResolvedVideoId("jfKfPfyJRdk"); // Secure backup stream injection
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [query, type]);

  if (isMinimized) {
    // Holographic tiny rotating radar orb on the corner of the HUD
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        onClick={onToggleMinimize}
        className="fixed bottom-24 right-8 z-50 flex items-center gap-2 bg-slate-950/90 border border-cyan-400/40 px-3.5 py-2.5 rounded-full cursor-pointer hover:border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] md:absolute md:bottom-20 md:right-4 group"
      >
        {/* Rotating Radar Rings */}
        <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
          <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-cyan-400/35 opacity-75" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
            className="w-full h-full border border-dashed border-cyan-400/60 rounded-full flex items-center justify-center"
          >
            <Radio className="w-2.5 h-2.5 text-cyan-400" />
          </motion.div>
        </div>

        <div className="flex flex-col text-left">
          <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-widest leading-none">
            {isLoading ? "CAPTURING..." : "STREAM ACTIVE"}
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
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent animate-pulse" />

      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider uppercase">
          {type === "song" ? (
            <Music className="w-4 h-4 text-cyan-400 animate-pulse" />
          ) : (
            <Tv className="w-4 h-4 text-cyan-400 animate-pulse" />
          )}
          <span className="text-[10px]">JARVIS MEDIA STREAM ENGAGED</span>
        </div>
        
        {/* Connection status telemetry */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-slate-500 animate-pulse">
            {isLoading ? "CALIBRATING DISH ARRAY..." : "AUDIO DECODING BUFFER: 100%"}
          </span>
          <div className="flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded text-[8px] text-cyan-200">
            <span className={`w-1.5 h-1.5 rounded-full ${isLoading ? "bg-amber-400 animate-pulse" : "bg-emerald-500 animate-ping"}`} />
            <span className="font-semibold uppercase tracking-widest text-[8px]">
              {isLoading ? "SYNCING" : "LIVE LINK"}
            </span>
          </div>

          {/* Window operations */}
          <div className="flex items-center gap-1 ml-1.5 border-l border-cyan-500/20 pl-2">
            <button
              type="button"
              onClick={onToggleMinimize}
              className="p-1 hover:bg-cyan-500/15 text-slate-400 hover:text-cyan-300 rounded transition-all"
              title="Minimize stream to radar array"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded transition-all"
              title="Terminate link signal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main player viewport container */}
      <div className="p-3 bg-slate-950/40 relative">
        <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-cyan-500/10 bg-black shadow-inner flex items-center justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center p-6 space-y-3 font-mono text-center">
              <div className="relative w-12 h-12 flex items-center justify-center">
                <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-cyan-400/20 opacity-75" />
                <div className="w-10 h-10 border-2 border-dashed border-cyan-500/80 rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-[10px] text-cyan-300 tracking-widest uppercase font-bold animate-pulse">
                  LOCATING ORBITAL SATELLITE FEED...
                </p>
                <p className="text-[8px] text-slate-500 uppercase mt-1">
                  TARGET WAVE: {query}
                </p>
              </div>
            </div>
          ) : (
            <iframe
              src={`https://www.youtube.com/embed/${resolvedVideoId}?autoplay=1&enablejsapi=1&origin=${window.location.origin}`}
              title={`Holographic YouTube Media Link Source: ${query}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="no-referrer"
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>

      {/* Footer statistics metadata tracker */}
      <div className="px-4 py-2 bg-slate-900/60 border-t border-cyan-500/10 flex items-center justify-between text-[10px] font-mono">
        <div className="flex items-center gap-1.5 min-w-0">
          <Youtube className="w-4 h-4 text-rose-500 shrink-0" />
          <span className="text-slate-500 font-bold uppercase truncate">FEED TARGET:</span>
          <span className="text-cyan-100 font-semibold truncate hover:text-cyan-300">
            {query}
          </span>
        </div>
        <span className="text-cyan-500/50 text-[9px] select-none text-right shrink-0 uppercase tracking-widest pl-2">
          {type === "song" ? "CHORD SYMPHONIZER" : "BROADCAST RECEIVER"}
        </span>
      </div>
    </motion.div>
  );
}
