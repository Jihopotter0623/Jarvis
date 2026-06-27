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
        return 7;
      case "thinking":
        return 1.2;
      case "speaking":
        return 3.5;
      case "idle":
      default:
        return 18;
    }
  };

  const getCoreGlow = () => {
    switch (status) {
      case "listening":
        return "shadow-[0_0_40px_rgba(239,68,68,0.85)] border-red-500 bg-red-950/40"; // Red glow during listening
      case "thinking":
        return "shadow-[0_0_40px_rgba(245,158,11,0.85)] border-amber-500 bg-amber-950/40"; // Amber glow during math/reasoning index
      case "speaking":
        return "shadow-[0_0_50px_rgba(6,182,212,0.95)] border-cyan-400 bg-cyan-950/50"; // Electric cyan pulse during speak
      case "idle":
      default:
        return "shadow-[0_0_30px_rgba(6,182,212,0.5)] border-sky-500/50 bg-sky-950/10";
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
        return "text-cyan-500/70 stroke-cyan-500/70";
    }
  };

  // Pulse scale driven by speaking volume or idle status
  const pulseScale = status === "speaking" ? 1 + (volumeLevel / 130) : status === "listening" ? 1.07 : 1.0;

  return (
    <div id="jarvis-arc-reactor-container" className="relative flex items-center justify-center w-80 h-80 mx-auto">
      {/* Outer subtle radar glow ring */}
      <div className="absolute inset-0 rounded-full border border-cyan-500/5 animate-pulse pointer-events-none" />

      {/* Dynamic ambient energy pulse behind */}
      <motion.div
        animate={{
          scale: status === "listening" ? [1, 1.3, 1] : [1, 1.12, 1],
          opacity: status === "idle" ? 0.25 : [0.35, 0.65, 0.35],
        }}
        transition={{
          duration: status === "listening" ? 1.2 : 2.8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className={`absolute w-72 h-72 rounded-full filter blur-2xl transition-colors duration-500 ${
          status === "listening"
            ? "bg-red-500/15"
            : status === "thinking"
            ? "bg-amber-500/15"
            : "bg-cyan-500/15"
        }`}
      />

      {/* SVG Holographic Rings */}
      <svg
        id="jarvis-core-reactor-layout"
        viewBox="0 0 220 220"
        className="absolute w-full h-full select-none overflow-visible"
      >
        <defs>
          <radialGradient id="reactorGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity="0.25" />
            <stop offset="70%" stopColor="rgb(8, 47, 73)" stopOpacity="0.05" />
            <stop offset="100%" stopColor="rgb(2, 6, 23)" stopOpacity="0" />
          </radialGradient>
          
          <radialGradient id="redGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.2" />
            <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Shimmer background circle */}
        <circle cx="110" cy="110" r="95" fill={status === "listening" ? "url(#redGlow)" : "url(#reactorGlow)"} />

        {/* Outer-most HUD Grid Markings / Dashes */}
        <g className="text-cyan-500/15 stroke-cyan-500/10 pointer-events-none">
          <circle cx="110" cy="110" r="105" fill="none" strokeWidth="0.5" strokeDasharray="1 5" />
          <circle cx="110" cy="110" r="100" fill="none" strokeWidth="0.75" strokeDasharray="20 40 10 30" />
        </g>

        {/* Outer Tech Ring with spokes & tick marks - Rotates clockwise */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: getRotationDuration(), repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "110px 110px" }}
          className={getRingColor()}
        >
          {/* Outer dashed ring */}
          <circle
            cx="110"
            cy="110"
            r="94"
            strokeDasharray="4 8 12 8"
            strokeWidth="1"
            fill="none"
            className="opacity-40"
          />

          {/* Heavy Segment Locks */}
          <circle
            cx="110"
            cy="110"
            r="88"
            strokeDasharray="40 120 70 80"
            strokeWidth="2"
            fill="none"
            className="opacity-80"
          />

          {/* Micro dots on outer track */}
          <circle
            cx="110"
            cy="110"
            r="91"
            strokeDasharray="2 18"
            strokeWidth="1.5"
            fill="none"
            className="opacity-60"
          />
        </motion.g>

        {/* Counter Rotating Diagnostics Ring */}
        <motion.g
          animate={{ rotate: -360 }}
          transition={{ duration: getRotationDuration() * 1.6, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "110px 110px" }}
          className={getRingColor()}
        >
          <circle
            cx="110"
            cy="110"
            r="78"
            strokeDasharray="3 6 9 6"
            strokeWidth="1"
            fill="none"
            className="opacity-50"
          />
          
          {/* Main heavy segment slots */}
          <circle
            cx="110"
            cy="110"
            r="72"
            strokeDasharray="15 35 10 25"
            strokeWidth="1.5"
            fill="none"
            className="opacity-75"
          />

          {/* Sector dots representing diagnostics */}
          <circle
            cx="110"
            cy="110"
            r="66"
            strokeDasharray="1.5 18.5"
            strokeWidth="3.5"
            fill="none"
            className="opacity-90"
          />
        </motion.g>

        {/* Outer static cyber-sectors & Labels (representing JARVIS file nodes) */}
        <g className="text-[5.5px] font-mono fill-cyan-400/55 tracking-wider select-none opacity-80">
          <text x="110" y="27" textAnchor="middle">DEAD SPACE</text>
          <text x="110" y="200" textAnchor="middle">LIMBO</text>
          <text x="25" y="112" textAnchor="start">STARK EXPO</text>
          <text x="195" y="112" textAnchor="end">AIMP 2</text>
          
          <text x="50" y="60" textAnchor="middle" className="fill-amber-500/40">CPU: 0.14</text>
          <text x="170" y="60" textAnchor="middle" className="fill-cyan-400/40">RAM: 75%</text>
        </g>

        {/* Futuristic Red Danger Crescent / Alarm Sector Lock (Authentic to reference image) */}
        <motion.path
          d="M 65 65 A 64 64 0 0 1 110 46"
          fill="none"
          stroke={status === "listening" ? "rgba(220, 38, 38, 0.95)" : "rgba(239, 68, 68, 0.65)"}
          strokeWidth="3"
          strokeLinecap="round"
          animate={{
            strokeWidth: status === "listening" ? [3, 4.5, 3] : 3,
            opacity: status === "listening" ? [1, 0.6, 1] : 0.75,
          }}
          transition={{ duration: 1, repeat: Infinity }}
          className="shadow-[0_0_10px_rgba(239,68,68,0.5)]"
        />

        {/* Dynamic inner telemetry sweep lines */}
        <motion.g
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "110px 110px" }}
          className="opacity-30 text-cyan-400"
        >
          <line x1="110" y1="110" x2="110" y2="40" stroke="currentColor" strokeWidth="0.5" strokeDasharray="5 15" />
          <circle cx="110" cy="55" r="2" fill="currentColor" />
        </motion.g>

        {/* Inner Tech Concentric Grid */}
        <g className={getRingColor()}>
          <circle
            cx="110"
            cy="110"
            r="54"
            strokeWidth="0.5"
            strokeDasharray="2 3"
            fill="none"
            className="opacity-40"
          />
          <circle
            cx="110"
            cy="110"
            r="46"
            strokeWidth="1.25"
            strokeDasharray="18 4"
            fill="none"
            className="opacity-70"
          />
        </g>

        {/* Symmetric Triangle Nodes representing core power routing */}
        <motion.g
          animate={{ rotate: status === "thinking" ? 360 : 0 }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: "110px 110px" }}
          className={`${getRingColor()} opacity-90`}
        >
          {/* Triangular power blocks */}
          <line x1="110" y1="49" x2="110" y2="39" strokeWidth="2" />
          <line x1="57" y1="140" x2="49" y2="145" strokeWidth="2" />
          <line x1="163" y1="140" x2="171" y2="145" strokeWidth="2" />
        </motion.g>

        {/* Subtle decorative crosshair coordinates */}
        <g className="text-[4px] font-mono fill-cyan-400/20">
          <text x="110" y="11" textAnchor="middle">01:06:57</text>
          <text x="110" y="215" textAnchor="middle">91.219.164.5</text>
        </g>
      </svg>

      {/* Main core capsule buttons */}
      <motion.div
        animate={{
          scale: pulseScale,
        }}
        transition={{ duration: 0.1 }}
        className={`absolute w-34 h-34 rounded-full border-2 flex flex-col items-center justify-center transition-all duration-500 ${getCoreGlow()}`}
      >
        {/* Floating background circuit ripple effect inside core */}
        <div className="absolute inset-2 rounded-full border border-cyan-400/5 animate-pulse" />

        <span className="text-[10px] tracking-[0.25em] font-mono text-cyan-400/90 mb-0.5 font-bold drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]">
          J.A.R.V.I.S.
        </span>
        <div id="jarvis-core-pulse-dot" className={`w-3.5 h-3.5 rounded-full transition-all duration-500 ${
          status === "listening"
            ? "bg-red-500 shadow-[0_0_15px_#ef4444]"
            : status === "thinking"
            ? "bg-amber-500 shadow-[0_0_15px_#f59e0b]"
            : "bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
        }`} />
        <span className="text-[9px] tracking-widest font-mono text-cyan-300 mt-2.5 capitalize font-medium">
          {status === "idle" ? "ACTIVE" : status}
        </span>
      </motion.div>
    </div>
  );
}

