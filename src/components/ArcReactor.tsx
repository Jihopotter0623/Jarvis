import React from "react";
import { motion } from "motion/react";

interface ArcReactorProps {
  status: "idle" | "listening" | "thinking" | "speaking";
  volumeLevel?: number; // Optional frequency amplitude (0-100) for real-time reactive feedback
}

export default function ArcReactor({ status, volumeLevel = 0 }: ArcReactorProps) {
  // Determine ring animation settings based on Jarvis state
  const getRotationDuration = () => {
    switch (status) {
      case "listening":
        return 8;
      case "thinking":
        return 1.5;
      case "speaking":
        return 4;
      case "idle":
      default:
        return 15;
    }
  };

  const getCoreGlow = () => {
    switch (status) {
      case "listening":
        return "shadow-[0_0_35px_rgba(239,68,68,0.7)] border-red-500 bg-red-950/40"; // Red glow during listening
      case "thinking":
        return "shadow-[0_0_35px_rgba(245,158,11,0.7)] border-amber-500 bg-amber-950/40"; // Amber glow during math/reasoning index
      case "speaking":
        return "shadow-[0_0_40px_rgba(6,182,212,0.8)] border-cyan-400 bg-cyan-950/50"; // Electric cyan pulse during speak
      case "idle":
      default:
        return "shadow-[0_0_25px_rgba(6,182,212,0.4)] border-sky-500/50 bg-sky-950/10";
    }
  };

  const getRingColor = () => {
    switch (status) {
      case "listening":
        return "text-red-500 stroke-red-500";
      case "thinking":
        return "text-amber-500 stroke-amber-500";
      case "speaking":
        return "text-cyan-400 stroke-cyan-400";
      case "idle":
      default:
        return "text-sky-500/60 stroke-sky-500/60";
    }
  };

  // Pulse scale driven by speaking volume or idle status
  const pulseScale = status === "speaking" ? 1 + (volumeLevel / 150) : status === "listening" ? 1.05 : 1.0;

  return (
    <div id="jarvis-arc-reactor-container" className="relative flex items-center justify-center w-72 h-72 mx-auto">
      {/* Dynamic ambient energy pulse behind */}
      <motion.div
        animate={{
          scale: status === "listening" ? [1, 1.25, 1] : [1, 1.1, 1],
          opacity: status === "idle" ? 0.2 : [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: status === "listening" ? 1.5 : 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute w-64 h-64 rounded-full filter blur-xl transition-colors duration-500 ${
          status === "listening"
            ? "bg-red-500/20"
            : status === "thinking"
            ? "bg-amber-500/20"
            : "bg-cyan-500/20"
        }`}
      />

      {/* SVG Holographic Rings */}
      <svg
        id="jarvis-core-reactor-layout"
        viewBox="0 0 200 200"
        className="absolute w-full h-full select-none"
      >
        <defs>
          <radialGradient id="reactorGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(8, 47, 73)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Shimmer background circle */}
        <circle cx="100" cy="100" r="85" fill="url(#reactorGlow)" />

        {/* Outer Tech Ring with spokes & tick marks */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: getRotationDuration(), repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "100px 100px" }}
          className={getRingColor()}
        >
          {/* Outer dashed ring */}
          <circle
            cx="100"
            cy="100"
            r="82"
            strokeDasharray="4 8 12 8"
            strokeWidth="1"
            fill="none"
            className="opacity-40"
          />
          {/* Main heavy segment locks */}
          <circle
            cx="100"
            cy="100"
            r="76"
            strokeDasharray="45 15"
            strokeWidth="1.5"
            fill="none"
            className="opacity-70"
          />
        </motion.g>

        {/* Counter Rotating Diagnostics Ring */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: getRotationDuration() * 1.5, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "100px 100px" }}
          className={getRingColor()}
        >
          <circle
            cx="100"
            cy="100"
            r="68"
            strokeDasharray="2 4 8 4"
            strokeWidth="1"
            fill="none"
            className="opacity-60"
          />
          {/* Sector dots */}
          <circle
            cx="100"
            cy="100"
            r="60"
            strokeDasharray="1 19"
            strokeWidth="3"
            fill="none"
            className="opacity-85"
          />
        </motion.g>

        {/* Inner Tech Concentric Grid */}
        <g className={getRingColor()}>
          <circle
            cx="100"
            cy="100"
            r="50"
            strokeWidth="0.5"
            strokeDasharray="3 3"
            fill="none"
            className="opacity-40"
          />
          <circle
            cx="100"
            cy="100"
            r="42"
            strokeWidth="1"
            strokeDasharray="15 3"
            fill="none"
            className="opacity-65"
          />
        </g>

        {/* Symmetric Triangle Nodes representing JARVIS's core node connections */}
        <motion.g
          animate={{ rotate: status === "thinking" ? 360 : 0 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "100px 100px" }}
          className={`${getRingColor()} opacity-80`}
        >
          {/* Draw triangular visual crosshairs */}
          <line x1="100" y1="45" x2="100" y2="35" strokeWidth="1.5" />
          <line x1="52" y1="127" x2="44" y2="132" strokeWidth="1.5" />
          <line x1="148" y1="127" x2="156" y2="132" strokeWidth="1.5" />
        </motion.g>
      </svg>

      {/* Main core capsule buttons */}
      <motion.div
        animate={{
          scale: pulseScale,
        }}
        transition={{ duration: 0.1 }}
        className={`absolute w-32 h-32 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-500 ${getCoreGlow()}`}
      >
        <span className="text-[10px] tracking-[0.25em] font-mono text-cyan-400/80 mb-0.5">
          J.A.R.V.I.S.
        </span>
        <div id="jarvis-core-pulse-dot" className={`w-3 h-3 rounded-full transition-all duration-500 ${
          status === "listening"
            ? "bg-red-500 shadow-[0_0_12px_#ef4444]"
            : status === "thinking"
            ? "bg-amber-500 shadow-[0_0_12px_#f59e0b]"
            : "bg-cyan-400 shadow-[0_0_12px_#22d3ee]"
        }`} />
        <span className="text-[9px] tracking-wider font-mono text-cyan-200 mt-2 capitalize font-medium">
          {status === "idle" ? "READY" : status}
        </span>
      </motion.div>
    </div>
  );
}
