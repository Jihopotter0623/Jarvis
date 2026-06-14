import React, { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  status: "idle" | "listening" | "thinking" | "speaking";
  volumeLevel?: number; // Reactive scale
}

export default function AudioVisualizer({ status, volumeLevel = 0 }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      canvas.width = (rect?.width || 500) * window.devicePixelRatio;
      canvas.height = (rect?.height || 80) * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Multi-layered sine wave generator
    const draw = () => {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, w, h);

      // Setup parameters based on Jarvis status
      let numWaves = 3;
      let amplitude = 4;
      let frequency = 0.015;
      let speed = 0.04;
      let colors = ["rgba(6, 182, 212, 0.15)", "rgba(14, 116, 144, 0.3)", "rgba(34, 211, 238, 0.6)"]; // Default cyan

      if (status === "speaking") {
        amplitude = 12 + volumeLevel / 4;
        frequency = 0.02;
        speed = 0.08;
        numWaves = 4;
        colors = [
          "rgba(6, 182, 212, 0.15)",
          "rgba(34, 211, 238, 0.35)",
          "rgba(6, 182, 212, 0.6)",
          "rgba(191, 219, 254, 0.8)",
        ];
      } else if (status === "listening") {
        amplitude = 10 + Math.random() * 8;
        frequency = 0.03;
        speed = 0.15;
        numWaves = 3;
        colors = ["rgba(239, 68, 68, 0.15)", "rgba(220, 38, 38, 0.4)", "rgba(248, 113, 113, 0.7)"]; // Red alarm alert
      } else if (status === "thinking") {
        amplitude = 6;
        frequency = 0.06; // Highly dense frequency showing computation
        speed = 0.12;
        numWaves = 3;
        colors = ["rgba(245, 158, 11, 0.15)", "rgba(217, 119, 6, 0.45)", "rgba(251, 191, 36, 0.7)"]; // Amber processing
      } else {
        // Idle
        amplitude = 2.5;
        frequency = 0.01;
        speed = 0.03;
        numWaves = 2;
        colors = ["rgba(14, 116, 144, 0.1)", "rgba(6, 182, 212, 0.2)"];
      }

      phaseRef.current += speed;

      // Draw each wave with offset phases
      for (let i = 0; i < numWaves; i++) {
        ctx.beginPath();
        ctx.lineWidth = i === numWaves - 1 ? 2 : 1;
        ctx.strokeStyle = colors[i];

        const phaseOffset = i * Math.PI * 0.4;
        const localAmplitude = amplitude * (1 - i * 0.22);

        for (let x = 0; x < w; x++) {
          // Normalize x coordinate for fade-out styling at edges (sine envelope)
          const edgeFade = Math.sin((x / w) * Math.PI);
          const y = h / 2 + Math.sin(x * frequency + phaseRef.current + phaseOffset) * localAmplitude * edgeFade;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [status, volumeLevel]);

  return (
    <div id="jarvis-frequency-visualizer-wrap" className="w-full h-16 relative">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
}
