import React from "react";
import { motion } from "motion/react";
// @ts-ignore
import orangeHologram from "../assets/images/orange_hologram_core_1782609565464.jpg";

interface ArcReactorProps {
  status: "idle" | "listening" | "thinking" | "speaking";
  volumeLevel?: number; // Real-time voice frequency volume (0-100)
  emotion?: "calm" | "happy" | "proud" | "concerned" | "excited" | "sarcastic" | "curious";
}

export default function ArcReactor({ status, volumeLevel = 0, emotion = "calm" }: ArcReactorProps) {
  // Get emotion color specifications and style modifications
  const getEmotionSpecs = () => {
    switch (emotion) {
      case "happy":
        return {
          color: "#06b6d4", // Cyan
          hueRotate: "165deg",
          saturation: "1.7",
          glow: "shadow-[0_0_80px_rgba(6,182,212,0.6)] border-cyan-500/80 bg-cyan-950/20",
          text: "text-cyan-400 fill-cyan-400",
          stroke: "stroke-cyan-500",
          glassTint: "bg-cyan-500/5",
        };
      case "proud":
        return {
          color: "#a855f7", // Violet/Purple
          hueRotate: "250deg",
          saturation: "1.8",
          glow: "shadow-[0_0_80px_rgba(168,85,247,0.6)] border-purple-500/80 bg-purple-950/20",
          text: "text-purple-400 fill-purple-400",
          stroke: "stroke-purple-500",
          glassTint: "bg-purple-500/5",
        };
      case "concerned":
        return {
          color: "#f43f5e", // Rose/Soft Red
          hueRotate: "310deg",
          saturation: "1.4",
          glow: "shadow-[0_0_80px_rgba(244,63,94,0.5)] border-rose-500/80 bg-rose-950/20",
          text: "text-rose-400 fill-rose-400",
          stroke: "stroke-rose-500",
          glassTint: "bg-rose-500/5",
        };
      case "excited":
        return {
          color: "#ef4444", // Scarlet Red
          hueRotate: "345deg",
          saturation: "2.1",
          glow: "shadow-[0_0_90px_rgba(239,68,68,0.7)] border-red-500/80 bg-red-950/20",
          text: "text-red-400 fill-red-400",
          stroke: "stroke-red-500",
          glassTint: "bg-red-500/5",
        };
      case "sarcastic":
        return {
          color: "#84cc16", // Lime Green
          hueRotate: "80deg",
          saturation: "1.7",
          glow: "shadow-[0_0_80px_rgba(132,204,22,0.6)] border-lime-500/80 bg-lime-950/20",
          text: "text-lime-400 fill-lime-400",
          stroke: "stroke-lime-500",
          glassTint: "bg-lime-500/5",
        };
      case "curious":
        return {
          color: "#3b82f6", // Electric Blue
          hueRotate: "195deg",
          saturation: "1.9",
          glow: "shadow-[0_0_80px_rgba(59,130,246,0.6)] border-blue-500/80 bg-blue-950/20",
          text: "text-blue-400 fill-blue-400",
          stroke: "stroke-blue-500",
          glassTint: "bg-blue-500/5",
        };
      case "calm":
      default:
        return null;
    }
  };

  const emotionSpecs = getEmotionSpecs();

  // Rotation speeds based on JARVIS state
  const getRotationDuration = () => {
    switch (status) {
      case "listening":
        return 6;
      case "thinking":
        return 1.5;
      case "speaking":
        return 3.5;
      case "idle":
      default:
        if (emotion === "excited") return 15;
        if (emotion === "sarcastic") return 20;
        return 30;
    }
  };

  // State-based glow color themes (Amber/Orange centric to match the new hologram core image)
  const getGlowColor = () => {
    if (emotionSpecs) {
      return emotionSpecs.color;
    }
    switch (status) {
      case "listening":
        return "#ea580c"; // Intense fiery orange-red
      case "thinking":
        return "#facc15"; // Cyber Gold / Bright Yellow
      case "speaking":
        return "#f97316"; // Bright Orange
      case "idle":
      default:
        return "#d97706"; // Warm Amber
    }
  };

  const getThemeClass = () => {
    if (emotionSpecs) {
      return {
        glow: emotionSpecs.glow,
        text: emotionSpecs.text,
        stroke: emotionSpecs.stroke,
        glassTint: emotionSpecs.glassTint,
      };
    }
    switch (status) {
      case "listening":
        return {
          glow: "shadow-[0_0_80px_rgba(234,88,12,0.6)] border-orange-600/80 bg-orange-950/20",
          text: "text-orange-400 fill-orange-400",
          stroke: "stroke-orange-500",
          glassTint: "bg-orange-500/5",
        };
      case "thinking":
        return {
          glow: "shadow-[0_0_80px_rgba(250,204,21,0.6)] border-yellow-500/80 bg-yellow-950/20",
          text: "text-yellow-400 fill-yellow-400",
          stroke: "stroke-yellow-500",
          glassTint: "bg-yellow-500/5",
        };
      case "speaking":
        return {
          glow: "shadow-[0_0_90px_rgba(249,115,22,0.8)] border-orange-500/80 bg-orange-950/30",
          text: "text-orange-400 fill-orange-400",
          stroke: "stroke-orange-400",
          glassTint: "bg-orange-500/5",
        };
      case "idle":
      default:
        return {
          glow: "shadow-[0_0_60px_rgba(217,119,6,0.4)] border-amber-500/30 bg-slate-950/80",
          text: "text-amber-500/80 fill-amber-500/80",
          stroke: "stroke-amber-500/50",
          glassTint: "bg-amber-500/2",
        };
    }
  };

  const theme = getThemeClass();
  const glowColor = getGlowColor();

  // Real-time voice animation scale factor
  const pulseScale = status === "speaking" ? 1 + (volumeLevel / 120) : status === "listening" ? 1.03 : 1.0;

  return (
    <div id="jarvis-arc-reactor-container" className="relative flex items-center justify-center w-[350px] h-[350px] mx-auto select-none">
      
      {/* 1. Deep Atmospheric Orange Plasma Background Glow */}
      <motion.div
        animate={{
          scale: status === "listening" ? [1, 1.15, 1] : [1, 1.06, 1],
          opacity: status === "idle" ? 0.25 : [0.35, 0.65, 0.35],
        }}
        transition={{
          duration: status === "listening" ? 1.2 : 3.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute w-80 h-80 rounded-full filter blur-3xl transition-colors duration-700 pointer-events-none"
        style={{
          backgroundColor: `${glowColor}1a`, // Subtle radial background glow
        }}
      />

      {/* 2. Outer Cybernetic HUD Rotating Rings */}
      <div className="absolute inset-2 rounded-full border pointer-events-none z-0" style={{ borderColor: `${glowColor}1a` }} />
      <motion.div
        className="absolute inset-6 rounded-full border border-dashed pointer-events-none z-0"
        style={{ borderColor: `${glowColor}33` }}
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      />
      <motion.div
        className="absolute inset-10 rounded-full border border-double pointer-events-none z-0"
        style={{ borderColor: `${glowColor}26` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      />

      {/* 3. Glass Reflection Glare Overlay */}
      <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none z-10 border border-white/5 opacity-40" />

      {/* 4. Central Orange Holographic Core Image Container */}
      <motion.div
        id="jarvis-hologram-image-wrapper"
        className="relative rounded-full overflow-hidden w-[250px] h-[250px] flex items-center justify-center z-1 bg-black/40 border shadow-inner"
        style={{
          borderColor: `${glowColor}4d`,
          boxShadow: `inset 0 0 40px ${glowColor}33, 0 0 50px ${glowColor}20`,
        }}
        animate={{
          scale: pulseScale,
        }}
        transition={{ duration: 0.08, ease: "easeOut" }}
      >
        {/* The rotating beautiful high-tech orange hologram image with dynamic emotional filter */}
        <motion.img
          src={orangeHologram}
          alt="Orange Holographic Core"
          referrerPolicy="no-referrer"
          className="w-[94%] h-[94%] rounded-full object-cover mix-blend-screen opacity-90"
          style={{
            filter: emotionSpecs ? `hue-rotate(${emotionSpecs.hueRotate}) saturate(${emotionSpecs.saturation})` : "none"
          }}
          animate={{
            rotate: 360,
          }}
          transition={{
            duration: getRotationDuration(),
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* High-Tech Vector HUD Overlay on top of the image to bind it into the UI */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none mix-blend-screen" viewBox="0 0 240 240">
          <defs>
            <filter id="hologramBloom" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Active Voice-Reactive Frequency Bars around the core rim */}
          {status === "speaking" && (
            <g opacity="0.9" filter="url(#hologramBloom)">
              {Array.from({ length: 32 }).map((_, idx) => {
                const angle = (idx * 360) / 32;
                const rad = (angle * Math.PI) / 180;
                
                const rStart = 100;
                // Reactive height based on real-time sound levels
                const dynamicHeight = 1 + (volumeLevel / 4) * (0.4 + Math.abs(Math.sin((idx * 2) + (idx * 0.5))) * 0.6);
                const rEnd = rStart + dynamicHeight;
                
                const x1 = 120 + rStart * Math.cos(rad);
                const y1 = 120 + rStart * Math.sin(rad);
                const x2 = 120 + rEnd * Math.cos(rad);
                const y2 = 120 + rEnd * Math.sin(rad);
                
                return (
                  <line
                    key={`freq-bar-${idx}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={glowColor}
                    strokeWidth="1.5"
                    opacity="0.85"
                  />
                );
              })}
            </g>
          )}

          {/* Dynamic lightning filaments for sparking electrical arcs */}
          {status !== "idle" && (
            <g opacity="0.9" filter="url(#hologramBloom)">
              {/* Lightning filament 1: Center to top-left */}
              <motion.path
                d="M 120 120 Q 98 98 80 80"
                stroke="#ffffff"
                strokeWidth="1.2"
                fill="none"
                animate={{
                  d: [
                    "M 120 120 Q 98 98 80 80",
                    "M 120 120 Q 110 85 80 80",
                    "M 120 120 Q 90 105 80 80",
                    "M 120 120 Q 105 100 80 80",
                  ],
                  opacity: [0.1, 0.95, 0.15, 0.85, 0.2, 0.95, 0.05],
                  stroke: [glowColor, "#ffffff", glowColor, "#ffffff"]
                }}
                transition={{
                  duration: 0.2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
              {/* Lightning filament 2: Center to bottom-right */}
              <motion.path
                d="M 120 120 Q 142 142 160 160"
                stroke="#ffffff"
                strokeWidth="1.2"
                fill="none"
                animate={{
                  d: [
                    "M 120 120 Q 142 142 160 160",
                    "M 120 120 Q 130 155 160 160",
                    "M 120 120 Q 150 135 160 160",
                    "M 120 120 Q 135 140 160 160",
                  ],
                  opacity: [0.95, 0.15, 0.85, 0.3, 0.95, 0.1, 0.9],
                  stroke: [glowColor, "#ffffff", glowColor, "#ffffff"]
                }}
                transition={{
                  duration: 0.24,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            </g>
          )}

          {/* Precision Crosshair Target Markers */}
          <g stroke={glowColor} strokeWidth="0.6" opacity="0.4" fill="none">
            <line x1="120" y1="15" x2="120" y2="30" />
            <line x1="120" y1="210" x2="120" y2="225" />
            <line x1="15" y1="120" x2="30" y2="120" />
            <line x1="210" y1="120" x2="225" y2="120" />
            <circle cx="120" cy="120" r="110" strokeDasharray="3 4" />
          </g>
        </svg>
      </motion.div>

      {/* 5. Center-glowing Core Glass Ring */}
      <div 
        className="absolute w-[252px] h-[252px] rounded-full border pointer-events-none z-2 flex items-center justify-center"
        style={{
          borderColor: `${glowColor}33`,
          boxShadow: `0 0 20px ${glowColor}15`,
        }}
      >
        {/* Standing Text & Subtitles */}
        <div className="flex flex-col items-center translate-y-[96px] z-20">
          <span 
            className="text-[9px] font-black font-mono tracking-[0.25em] uppercase select-none transition-all duration-300"
            style={{
              color: glowColor,
              textShadow: `0 0 10px ${glowColor}c0`
            }}
          >
            {status === "idle" ? (emotion !== "calm" ? `${emotion} core` : "STANDBY") : status}
          </span>
          
          {/* Live micro-status subtitles */}
          {status === "listening" && (
            <span className="text-[6px] font-mono tracking-widest text-orange-400 animate-pulse mt-0.5 font-bold">
              AUDIO CAPTURED
            </span>
          )}
          {status === "thinking" && (
            <span className="text-[6px] font-mono tracking-widest text-yellow-400 animate-pulse mt-0.5 font-bold">
              SOLVING MATRICES...
            </span>
          )}
          {status === "speaking" && (
            <span className="text-[6.5px] font-mono tracking-widest text-orange-300 mt-0.5 animate-pulse font-bold">
              AUDIO EMISSION ACTIVE
            </span>
          )}
          {status === "idle" && emotion !== "calm" && (
            <span 
              className="text-[5.5px] font-mono tracking-widest animate-pulse mt-0.5 font-bold uppercase transition-all duration-300"
              style={{ color: glowColor }}
            >
              {emotion === "happy" && "HUMOR COEFFICIENT OPTIMAL"}
              {emotion === "proud" && "STARK PROTOCOLS ENGAGED"}
              {emotion === "concerned" && "EMPATHY CORE ONLINE"}
              {emotion === "excited" && "THRUSTER MATRIX PREHEATED"}
              {emotion === "sarcastic" && "WITTY COMPLIANCE ACTIVE"}
              {emotion === "curious" && "SENSORY SUBGRID EXPANDED"}
            </span>
          )}
        </div>
      </div>

    </div>
  );
}
