import React from "react";
import { motion, useDragControls } from "motion/react";
import { 
  X, 
  Minus, 
  Maximize2, 
  Music, 
  Tv, 
  Youtube, 
  Radio, 
  Volume2, 
  VolumeX,
  ExternalLink,
  AlertCircle,
  GripHorizontal,
  Pin
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
  const [audioOnly, setAudioOnly] = React.useState<boolean>(true);
  
  const [isFloating, setIsFloating] = React.useState<boolean>(() => {
    const saved = localStorage.getItem("jarvis_yt_floating");
    return saved !== "false"; // Default to true (Floating)
  });

  const [autoNewWindow, setAutoNewWindow] = React.useState<boolean>(() => {
    const saved = localStorage.getItem("jarvis_yt_auto_new_window");
    return saved !== "false"; // Default to true
  });

  React.useEffect(() => {
    localStorage.setItem("jarvis_yt_floating", isFloating.toString());
  }, [isFloating]);

  React.useEffect(() => {
    localStorage.setItem("jarvis_yt_auto_new_window", autoNewWindow.toString());
  }, [autoNewWindow]);

  const dragControls = useDragControls();
  const openedVideoIdRef = React.useRef<string | null>(null);

  // Auto-trigger window.open on YouTube when video is resolved
  React.useEffect(() => {
    if (resolvedVideoId && autoNewWindow && openedVideoIdRef.current !== resolvedVideoId) {
      openedVideoIdRef.current = resolvedVideoId;
      console.log(`[Holographic HUD] Auto-launching YouTube watch session in new window for ID: ${resolvedVideoId}`);
      try {
        const url = `https://www.youtube.com/watch?v=${resolvedVideoId}`;
        window.open(url, "_blank");
      } catch (e) {
        console.warn("Auto new window blocked by sandboxed frame security or browser settings:", e);
      }
    }
  }, [resolvedVideoId, autoNewWindow]);

  // Reset tracking ref when query changes
  React.useEffect(() => {
    openedVideoIdRef.current = null;
  }, [query]);

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

  const containerClass = isFloating
    ? "fixed z-50 w-[calc(100%-1.5rem)] md:w-[380px] bg-slate-950/95 border border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(6,182,212,0.3)] flex flex-col bottom-24 right-3 md:bottom-auto md:top-[120px]"
    : "relative w-full bg-slate-950/90 border border-cyan-500/40 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.15)] flex flex-col";

  return (
    <motion.div
      drag={isFloating}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      dragElastic={0.15}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.3 }}
      className={containerClass}
    >
      {/* Laser line scanning effect */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/70 to-transparent animate-pulse" />

      {/* Header bar - Also acts as drag handle in floating mode */}
      <div 
        onPointerDown={(e) => isFloating && dragControls.start(e)}
        className={`flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-cyan-500/20 text-xs font-mono select-none ${
          isFloating ? "cursor-grab active:cursor-grabbing" : ""
        }`}
      >
        <div className="flex items-center gap-2 text-cyan-400 font-bold tracking-wider uppercase">
          {isFloating ? (
            <GripHorizontal className="w-4 h-4 text-cyan-400/80 animate-pulse shrink-0" />
          ) : type === "song" ? (
            <Music className="w-4 h-4 text-cyan-400 animate-pulse" />
          ) : (
            <Tv className="w-4 h-4 text-cyan-400 animate-pulse" />
          )}
          <span className="text-[9.5px] truncate max-w-[120px] md:max-w-none">
            {isFloating ? "🛸 JARVIS FLOATING ACTIVE" : "JARVIS MEDIA STREAM"}
          </span>
        </div>
        
        {/* Connection status telemetry */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-slate-500 animate-pulse hidden xs:inline">
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
            {/* Float/Pin Toggle Switch */}
            <button
              type="button"
              onClick={() => setIsFloating(!isFloating)}
              className={`p-1 rounded transition-all flex items-center justify-center ${
                isFloating 
                  ? "bg-cyan-500/25 text-cyan-300 hover:bg-cyan-500/40" 
                  : "hover:bg-cyan-500/15 text-slate-400 hover:text-cyan-300"
              }`}
              title={isFloating ? "고정형 모드로 변경 (Pin Inline)" : "창 이동(드래그) 모드로 전환 (Float & Drag)"}
            >
              <Pin className={`w-3.5 h-3.5 transition-transform ${isFloating ? "rotate-45 text-cyan-300" : ""}`} />
            </button>

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

      {/* Play Mode Selector Bar */}
      <div className="flex flex-col xs:flex-row xs:items-center justify-between px-4 py-2 bg-slate-950/70 border-b border-cyan-500/10 text-[9px] md:text-[10px] font-mono gap-1.5">
        <div className="flex flex-col text-left">
          <span className="text-slate-400">PLAYBACK SPECTRUM: <strong className="text-cyan-400">{audioOnly ? "🎵 오디오 전용 (노래만)" : "🎥 비디오 수신 모드"}</strong></span>
          {isFloating && (
            <span className="text-[7.5px] text-cyan-500/80 mt-0.5 animate-pulse">
              🛸 상단 헤더(GRIP BAR)를 누르고 드래그하여 화면 어디든 이동 가능합니다.
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 bg-slate-900 border border-cyan-500/15 rounded p-0.5 self-end xs:self-auto">
          <button
            type="button"
            onClick={() => setAudioOnly(true)}
            className={`px-2 py-0.5 rounded text-[8.5px] transition-all flex items-center gap-1 font-bold ${
              audioOnly ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/20" : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
          >
            <Music className="w-3 h-3 text-cyan-400" />
            <span>오디오 전용 (노래만)</span>
          </button>
          <button
            type="button"
            onClick={() => setAudioOnly(false)}
            className={`px-2 py-0.5 rounded text-[8.5px] transition-all flex items-center gap-1 font-bold ${
              !audioOnly ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/20" : "text-slate-500 hover:text-slate-300 border border-transparent"
            }`}
          >
            <Tv className="w-3 h-3 text-cyan-400" />
            <span>동영상 보기</span>
          </button>
        </div>
      </div>

      {/* Auto Open Control Bar */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950/40 border-b border-cyan-500/10 text-[9px] font-mono">
        <span className="text-slate-400 flex items-center gap-1 leading-none select-none">
          <Youtube className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
          <span>노래 재생 시 새 창(유튜브)에서 즉시 실행:</span>
          <strong className={autoNewWindow ? "text-emerald-400" : "text-slate-500"}>
            {autoNewWindow ? "ON" : "OFF"}
          </strong>
        </span>
        <button
          type="button"
          onClick={() => setAutoNewWindow(!autoNewWindow)}
          className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all border ${
            autoNewWindow 
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/20" 
              : "bg-slate-900 text-slate-500 border-slate-800 hover:text-slate-300"
          }`}
          title={autoNewWindow ? "노래 자동 새창 열기 끄기" : "노래 자동 새창 열기 켜기"}
        >
          {autoNewWindow ? "CURRENTLY ACTIVE" : "ACTIVATE"}
        </button>
      </div>

      {/* Main player viewport container */}
      <div className="p-3 bg-slate-950/40 relative space-y-2.5">
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
            <>
              {audioOnly && (
                <div className="w-full h-full min-h-[180px] bg-gradient-to-b from-slate-950 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden group select-none">
                  {/* Outer rotating holographic grids */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-[0.06] pointer-events-none">
                    <div className="w-[300px] h-[300px] rounded-full border-2 border-dashed border-cyan-500 animate-spin" style={{ animationDuration: "30s" }} />
                    <div className="w-[200px] h-[200px] rounded-full border border-cyan-400 absolute animate-pulse" />
                  </div>

                  {/* Pulsing Concentric Sound Core */}
                  <div className="relative w-14 h-14 rounded-full bg-slate-950/80 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.1)] mb-3">
                    <span className="absolute animate-ping inline-flex h-10 w-10 rounded-full bg-cyan-400/15 opacity-75" />
                    <Music className="w-5 h-5 text-cyan-400 animate-pulse" />
                    
                    {/* Tiny orbit bead */}
                    <div className="absolute w-1.5 h-1.5 rounded-full bg-cyan-400 animate-spin origin-[28px_28px]" style={{ animationDuration: "4s" }} />
                  </div>

                  {/* Audio Mode HUD Telemetry */}
                  <div className="text-center font-mono space-y-1 z-10 mb-2">
                    <div className="text-[10px] md:text-[11px] text-cyan-200 font-bold uppercase tracking-wide truncate max-w-[280px]">
                      {query}
                    </div>
                    <div className="text-[7.5px] text-emerald-400 font-semibold tracking-widest flex items-center justify-center gap-1.5 leading-none">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                      JARVIS ACTIVE AUDIO PROTOCOL
                    </div>
                  </div>

                  {/* Holographic Equalizer spectrum bars */}
                  <div className="flex items-end justify-center gap-1 h-12 w-full max-w-[260px] border-t border-cyan-500/10 pt-2 shrink-0">
                    {[12, 28, 48, 16, 32, 60, 42, 20, 36, 12, 48, 22, 54, 40, 18, 30].map((baseHeight, idx) => (
                      <motion.div
                        key={idx}
                        animate={{
                          height: [
                            "10%",
                            `${baseHeight}%`,
                            "15%",
                            `${Math.max(5, baseHeight - 15)}%`,
                            `${Math.min(95, baseHeight + 35)}%`,
                            "10%"
                          ]
                        }}
                        transition={{
                          repeat: Infinity,
                          duration: 1.0 + idx * 0.08,
                          ease: "easeInOut",
                        }}
                        className="w-1.5 rounded-t bg-gradient-to-t from-cyan-600/80 to-cyan-400 shadow-[0_0_6px_rgba(6,182,212,0.2)]"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube embed is kept alive but shrunk to prevent display when audioOnly is true */}
              <div className={audioOnly ? "absolute w-[1px] h-[1px] opacity-0 pointer-events-none" : "w-full h-full"}>
                <iframe
                  src={`https://www.youtube.com/embed/${resolvedVideoId}?autoplay=1&enablejsapi=1`}
                  title={`Holographic YouTube Media Link Source: ${query}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  className="w-full h-full border-0"
                />
              </div>
            </>
          )}
        </div>

        {/* Dynamic Troubleshooting Helper for Iframe Restrictions */}
        {!isLoading && resolvedVideoId && (
          <div className="p-2.5 rounded-xl border border-amber-500/20 bg-amber-950/5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-2.5 font-mono">
            <div className="flex items-start gap-2 max-w-full md:max-w-[65%]">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-left">
                <div className="text-[9.5px] font-bold text-amber-300 uppercase tracking-wide">
                  IFRAME EMBED SECURITY HELP (오류 153 해결)
                </div>
                <p className="text-[8.5px] text-slate-400 leading-normal mt-0.5">
                  구글 AI 스튜디오 보안 샌드박스로 인해 유튜브 임베드 재생이 종종 차단됩니다. 
                  우측의 <strong>[앱 새 창에서 열기]</strong> 버튼을 누르면 완전히 해결됩니다!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 shrink-0 justify-end">
              <a
                href={`https://www.youtube.com/watch?v=${resolvedVideoId}`}
                target="_blank"
                rel="noreferrer"
                className="px-2.5 py-1 text-[8.5px] font-bold bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 text-rose-300 rounded flex items-center gap-1 transition-all cursor-pointer select-none"
              >
                <Youtube className="w-3.5 h-3.5 text-rose-400" />
                <span>유튜브에서 시청 ↗</span>
              </a>
              <button
                onClick={() => {
                  window.open(window.location.href, "_blank");
                }}
                className="px-2.5 py-1 text-[8.5px] font-bold bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-300 rounded inline-flex items-center gap-1 transition-all cursor-pointer select-none"
              >
                <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
                <span>앱 새 창에서 열기 ↗</span>
              </button>
            </div>
          </div>
        )}
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
