import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Zap, Mic, AlertCircle, Sparkles } from "lucide-react";

interface ClapSensorProps {
  enabled: boolean;
  sensitivity: number; // 1 to 10 (10 being most sensitive, meaning lower threshold)
  onDoubleClap: () => void;
  showVisualizer: boolean; // Render a visual feedback indicator for settings page
}

export default function ClapSensor({
  enabled,
  sensitivity,
  onDoubleClap,
  showVisualizer,
}: ClapSensorProps) {
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied">("prompt");
  const [currentPeak, setCurrentPeak] = useState<number>(0);
  const [detectedClapsCount, setDetectedClapsCount] = useState<number>(0);
  const [isClapTriggered, setIsClapTriggered] = useState<boolean>(false);
  const [debugMsg, setDebugMsg] = useState<string>("Mic Standby");

  // Web Audio refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Clap timing references
  const lastClapTimeRef = useRef<number>(0);
  const runningAverageRef = useRef<number>(0.02);

  // Keep callback fresh without tearing down audio stream listeners
  const onDoubleClapRef = useRef(onDoubleClap);
  useEffect(() => {
    onDoubleClapRef.current = onDoubleClap;
  }, [onDoubleClap]);

  // Convert sensitivity (1 to 10) to a threshold
  // Higher sensitivity value = lower threshold = easier to trigger
  const threshold = Math.max(0.01, 0.22 - sensitivity * 0.018);

  // Resume listener to bypass autoplay context blocks on user interaction
  const resumeListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!enabled) {
      cleanupAudio();
      setDebugMsg("Mic Standby (Disabled)");
      return;
    }

    let active = true;

    async function initAudio() {
      try {
        console.log("[ClapSensor] Requesting mic access for acoustic signature mapping...");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        setPermissionState("granted");
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioContextClass();
        audioContextRef.current = ctx;

        // Auto-resume AudioContext on first tap/click of window
        const resumeCtx = () => {
          if (ctx && ctx.state === "suspended") {
            ctx.resume().then(() => {
              console.log("[ClapSensor] AudioContext resumed successfully by user gesture.");
              setDebugMsg("Listening for Claps...");
            }).catch(e => console.warn("[ClapSensor] Could not resume context:", e));
          }
        };
        resumeListenerRef.current = resumeCtx;
        window.addEventListener("click", resumeCtx);
        window.addEventListener("touchstart", resumeCtx, { passive: true });

        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;

        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyserRef.current = analyser;

        source.connect(analyser);

        setDebugMsg(ctx.state === "suspended" ? "Mic Suspended (Tap to Arm)" : "Listening for Claps...");

        // Start processing loops
        const bufferLength = analyser.fftSize;
        const dataArray = new Float32Array(bufferLength);

        const analyze = () => {
          if (!active || !analyserRef.current) return;

          analyserRef.current.getFloatTimeDomainData(dataArray);

          // Find the absolute peak of the amplitude in this chunk
          let peak = 0;
          for (let i = 0; i < bufferLength; i++) {
            const val = Math.abs(dataArray[i]);
            if (val > peak) {
              peak = val;
            }
          }

          if (showVisualizer) {
            setCurrentPeak(peak);
          }

          // Smooth exponential running average of natural background noise
          // Slowly responds to continuous hums/speaking, keeping them from false-triggering
          runningAverageRef.current = runningAverageRef.current * 0.98 + peak * 0.02;

          const now = Date.now();

          // Criteria to detect a single clap:
          // 1. Peak is greater than current threshold set by user sensitivity
          // 2. Peak is at least 3.0 times higher than immediate background average (onset spike)
          // 3. Minimum 200ms must pass since the previous clap (refractory cooldown)
          if (peak > threshold && peak > runningAverageRef.current * 3.0) {
            if (now - lastClapTimeRef.current > 200) {
              const delta = now - lastClapTimeRef.current;
              console.log(`[ClapSensor] Dynamic Peak Detected: ${peak.toFixed(3)} | Background Ref: ${runningAverageRef.current.toFixed(3)} | Delta: ${delta}ms`);
              
              // Visual signal indicator blip
              setIsClapTriggered(true);
              setTimeout(() => setIsClapTriggered(false), 150);

              if (delta >= 220 && delta <= 850) {
                // Bingo! Double clap achieved!
                console.log("⚡⚡ [ClapSensor] Double Clap acoustic signature accepted!");
                setDetectedClapsCount(prev => prev + 2);
                onDoubleClapRef.current();
                lastClapTimeRef.current = 0; // Reset timer entirely to prevent a triple-clap causing 2 triggers
              } else {
                // First clap or subsequent slow clap
                lastClapTimeRef.current = now;
                setDetectedClapsCount(1);
              }
            }
          }

          // Reset the clap counts if a single clap is orphaned for more than 900ms
          if (now - lastClapTimeRef.current > 900 && lastClapTimeRef.current !== 0) {
            setDetectedClapsCount(0);
          }

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();

      } catch (err) {
        console.warn("[ClapSensor] Unable to initialize acoustic sensor:", err);
        if (active) {
          setPermissionState("denied");
          setDebugMsg("Microphone authorization denied.");
        }
      }
    }

    initAudio();

    return () => {
      active = false;
      cleanupAudio();
    };
  }, [enabled, sensitivity, showVisualizer]);

  function cleanupAudio() {
    if (resumeListenerRef.current) {
      window.removeEventListener("click", resumeListenerRef.current);
      window.removeEventListener("touchstart", resumeListenerRef.current);
      resumeListenerRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
  }

  if (!showVisualizer) return null;

  // Render highly responsive, premium Iron-man style acoustic calibration monitor panel
  return (
    <div className="bg-slate-950/80 border border-cyan-500/10 rounded-xl p-3 space-y-2 select-none select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className={`w-3.5 h-3.5 ${isClapTriggered ? "text-cyan-400 animate-bounce scale-125" : "text-cyan-500/40"}`} />
          <span className="text-[10px] uppercase tracking-wider font-mono font-bold text-cyan-400">
            ACOUSTIC CLAP RADAR (박수 해제 모듈)
          </span>
        </div>
        <span className="text-[9px] font-mono text-slate-500 bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded leading-none uppercase">
          {debugMsg}
        </span>
      </div>

      {permissionState === "denied" ? (
        <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300 font-mono">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>브라우저 마이크 권한이 차단되어 있습니다. 설정에서 승인해주세요.</span>
        </div>
      ) : (
        <div className="space-y-1.5">
          {/* Live meter bar */}
          <div className="relative h-2 bg-slate-900 border border-slate-800 rounded-full overflow-hidden flex items-center">
            {/* Clap Trigger Threshold Line */}
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-10" 
              style={{ left: `${threshold * 100}%` }}
              title={`Trigger point threshold: ${(threshold * 100).toFixed(0)}%`}
            />

            {/* Live Volume Fill */}
            <div 
              className={`h-full transition-all duration-75 ${isClapTriggered ? "bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" : "bg-cyan-500/60"}`}
              style={{ width: `${Math.min(currentPeak * 100, 100)}%` }}
            />
          </div>

          <div className="flex justify-between items-center text-[9px] font-mono">
            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">CURRENT PEAK:</span>
              <span className={`font-semibold ${currentPeak > threshold ? "text-cyan-400" : "text-slate-400"}`}>
                {(currentPeak * 100).toFixed(0)}%
              </span>
              <span className="text-slate-600">/</span>
              <span className="text-slate-500">LIMIT:</span>
              <span className="text-rose-400 font-semibold">
                {(threshold * 100).toFixed(0)}%
              </span>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-slate-500 font-bold">DOUBLE CLAP PULSE:</span>
              <div className="flex gap-1">
                <span className={`w-2 h-2 rounded-full ${detectedClapsCount >= 1 ? "bg-cyan-400 animate-ping" : "bg-slate-800"}`} />
                <span className={`w-2 h-2 rounded-full ${detectedClapsCount >= 2 ? "bg-cyan-400 animate-ping" : "bg-slate-800"}`} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
