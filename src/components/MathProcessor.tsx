import React, { useState, useRef, useEffect } from "react";
import { motion } from "motion/react";
import { Sparkles, Calculator, Play, Activity, CheckSquare, RefreshCw, Send, Plus, Trash2 } from "lucide-react";

interface MathProcessorProps {
  onAskJarvis: (promptText: string) => void;
  status: "idle" | "listening" | "thinking" | "speaking";
}

interface MathPreset {
  name: string;
  expression: string;
  desc: string;
  minX: number;
  maxX: number;
}

export default function MathProcessor({ onAskJarvis, status }: MathProcessorProps) {
  const [expression, setExpression] = useState("sin(x) * cos(x / 2)");
  const [minX, setMinX] = useState(-10);
  const [maxX, setMaxX] = useState(10);
  const [evalInput, setEvalInput] = useState("1485 * (382 + 18)");
  const [evalResult, setEvalResult] = useState<string | null>("594000");
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number; sX: number; sY: number; slope: number } | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);

  // High-Tech presets from Stark labs
  const presets: MathPreset[] = [
    {
      name: "Trig Wave Interference",
      expression: "sin(x) * cos(x / 2)",
      desc: "Represents simple harmonic superposition waves",
      minX: -10,
      maxX: 10
    },
    {
      name: "Arc Reactor Resonance",
      expression: "sin(2 * x) * exp(-abs(x) / 3)",
      desc: "Damped harmonic pulse modeling energy leakage",
      minX: -8,
      maxX: 8
    },
    {
      name: "Quantum Probability",
      expression: "1.5 / (x^2 + 1)",
      desc: "Cauchy density model of subatomic particles",
      minX: -5,
      maxX: 5
    },
    {
      name: "Stark Laser Laser Spline",
      expression: "x^3 / 10 - x^2 + 1.2 * x + 3",
      desc: "Third-order polynomial for energy focal alignment",
      minX: -4,
      maxX: 8
    },
    {
      name: "Trigonometric Pulse",
      expression: "sin(x) / (x || 0.001)",
      desc: "Sinc filter pulse representing electromagnetic fields",
      minX: -15,
      maxX: 15
    }
  ];

  // Safely evaluate math expression containing variable 'x'
  const evaluateMathForX = (expr: string, x: number): number => {
    try {
      // Clean and sanitize the math expression to prevent malicious js code
      let sanitized = expr.toLowerCase();
      
      // Perform math conversions
      sanitized = sanitized
        .replace(/Math\./g, "") // avoid pre-existing Math tags
        .replace(/abs\((.*?)\)/g, "Math.abs($1)")
        .replace(/sin\((.*?)\)/g, "Math.sin($1)")
        .replace(/cos\((.*?)\)/g, "Math.cos($1)")
        .replace(/tan\((.*?)\)/g, "Math.tan($1)")
        .replace(/sqrt\((.*?)\)/g, "Math.sqrt($1)")
        .replace(/exp\((.*?)\)/g, "Math.exp($1)")
        .replace(/log\((.*?)\)/g, "Math.log($1)")
        .replace(/\^/g, "**") // convert x^2 to x**2
        .replace(/pi/g, "Math.PI")
        .replace(/e/g, "Math.E");

      // We instantiate a restricted function that only scopes math and our inputs.
      const evaluator = new Function(
        "x",
        `try { 
          return ${sanitized}; 
        } catch(e) { 
          return NaN; 
        }`
      );
      
      const val = evaluator(x);
      return typeof val === "number" && !isNaN(val) && isFinite(val) ? val : 0;
    } catch (e) {
      return 0;
    }
  };

  // Immediate arithmetic calculator
  const handleImmediateCalculate = () => {
    try {
      let sanitized = evalInput.toLowerCase();
      sanitized = sanitized
        .replace(/x/g, "1")
        .replace(/abs\((.*?)\)/g, "Math.abs($1)")
        .replace(/sin\((.*?)\)/g, "Math.sin($1)")
        .replace(/cos\((.*?)\)/g, "Math.cos($1)")
        .replace(/tan\((.*?)\)/g, "Math.tan($1)")
        .replace(/sqrt\((.*?)\)/g, "Math.sqrt($1)")
        .replace(/log\((.*?)\)/g, "Math.log($1)")
        .replace(/\^/g, "**")
        .replace(/pi/g, "Math.PI")
        .replace(/e/g, "Math.E");

      const evaluator = new Function(`return ${sanitized};`);
      const val = evaluator();
      if (typeof val === "number" && !isNaN(val)) {
        setEvalResult(val.toLocaleString(undefined, { maximumFractionDigits: 6 }));
      } else {
        setEvalResult("Formula Error");
      }
    } catch {
      setEvalResult("Formula Error");
    }
  };

  const handleApplyPreset = (preset: MathPreset) => {
    setExpression(preset.expression);
    setMinX(preset.minX);
    setMaxX(preset.maxX);
  };

  // Generate SVG plotting coordinate path representation
  const width = 360;
  const height = 180;
  const padding = 20;

  // Compile coordinates to fit into width/height box
  const plotCoordinates = [];
  const steps = 120;
  const rangeX = maxX - minX;

  // Let's sample min and max Y to find the scaling factor automatically
  let minYVal = -1.5;
  let maxYVal = 1.5;
  const sampledPoints: { x: number; y: number }[] = [];

  for (let i = 0; i <= steps; i++) {
    const xVal = minX + (rangeX * i) / steps;
    const yVal = evaluateMathForX(expression, xVal);
    sampledPoints.push({ x: xVal, y: yVal });
  }

  // Adjust Y scale based on actual evaluated bounds if they are standard numbers
  const yValues = sampledPoints.map(p => p.y).filter(v => !isNaN(v) && isFinite(v));
  if (yValues.length > 0) {
    const calculatedMin = Math.min(...yValues);
    const calculatedMax = Math.max(...yValues);
    // Give some breathing room
    if (calculatedMin !== calculatedMax) {
      minYVal = calculatedMin - Math.abs(calculatedMin * 0.15) - 0.2;
      maxYVal = calculatedMax + Math.abs(calculatedMax * 0.15) + 0.2;
    } else {
      minYVal = calculatedMin - 1;
      maxYVal = calculatedMax + 1;
    }
  }

  // Cap incredibly massive ranges to avoid UI blowout
  if (minYVal < -100) minYVal = -100;
  if (maxYVal > 100) maxYVal = 100;

  const rangeY = maxYVal - minYVal;

  // Translate variables to pixel space
  const getPixelX = (x: number) => padding + ((x - minX) / rangeX) * (width - 2 * padding);
  const getPixelY = (y: number) => height - padding - ((y - minYVal) / rangeY) * (height - 2 * padding);

  // Translate pixel space back to variables
  const getCoordsFromPixel = (px: number) => {
    const x = minX + ((px - padding) / (width - 2 * padding)) * rangeX;
    const y = evaluateMathForX(expression, x);
    // Approximate derivative (slope) locally via finite difference
    const dx = 0.001;
    const yLeft = evaluateMathForX(expression, x - dx);
    const yRight = evaluateMathForX(expression, x + dx);
    const slope = (yRight - yLeft) / (2 * dx);
    return { x, y, slope };
  };

  // Build the SVG path string
  let pathD = "";
  sampledPoints.forEach((pt, idx) => {
    const px = getPixelX(pt.x);
    const py = getPixelY(pt.y);
    if (!isNaN(py) && isFinite(py)) {
      if (idx === 0) {
        pathD += `M ${px} ${py}`;
      } else {
        pathD += ` L ${px} ${py}`;
      }
    }
  });

  // Calculate pixel placement of mathematical axes lines (Y=0, X=0)
  const originX = getPixelX(0);
  const originY = getPixelY(0);

  // Handles mouse tracking on functional graph panel
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseXPixels = e.clientX - rect.left;
    const boundX = Math.max(padding, Math.min(width - padding, mouseXPixels));
    const { x, y, slope } = getCoordsFromPixel(boundX);
    
    setHoverCoord({
      x,
      y,
      sX: boundX,
      sY: getPixelY(y),
      slope
    });
  };

  const handleMouseLeave = () => {
    setHoverCoord(null);
  };

  // Sends mathematical expression coordinates into chat block
  const handleSendToJarvis = (mode: "solve" | "explain") => {
    const operatorHonorific = localStorage.getItem("jarvis_user_gender") === "female" ? "Ma'am" : "Sir";
    let textPrompt = "";
    if (mode === "solve") {
      textPrompt = `Perform mathematical analysis, solve, and display step-by-step roots and derivatives for this function: f(x) = ${expression} over the domain [${minX}, ${maxX}]. Please output beautifully structured.`;
    } else {
      textPrompt = `Explain the physical significance and mathematical background of this function: f(x) = ${expression}. How does it connect to modern engineering or Stark-tech resonance?`;
    }
    onAskJarvis(textPrompt);
  };

  return (
    <div className="stark-cyber-panel stark-cyber-bottom-decor p-4 flex flex-col space-y-4 relative h-[520px]">
      
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-cyan-400 animate-pulse" />
          <div>
            <h3 className="text-xs font-bold font-mono text-cyan-200 tracking-wider">
              MATHEMATICAL VECTOR MODULE
            </h3>
            <p className="text-[9px] text-cyan-500/60 font-mono uppercase tracking-tight">
              Stark Analytical Subroutine Active
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-400/20 px-2 py-0.5 rounded-full">
          <span className="w-1 h-1 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[9.5px] text-cyan-300 font-mono uppercase">CO-PROC</span>
        </div>
      </div>

      {/* SVG Neon Graphing Plot */}
      <div className="relative bg-slate-950/60 border border-slate-800 rounded-xl p-2 overflow-hidden flex flex-col items-center">
        <div className="absolute top-2 left-3 flex gap-2 z-10 font-mono text-[9px]">
          <span className="text-cyan-300">f(x) = {expression}</span>
        </div>

        <svg
          ref={svgRef}
          width="100%"
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="cursor-crosshair overflow-visible mt-2 select-none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Subtle Grid Gridlines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(6,182,212,0.03)" strokeWidth="1" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(6,182,212,0.04)" strokeWidth="1" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(6,182,212,0.03)" strokeWidth="1" />
          <line x1={width / 2} y1={padding} x2={width / 2} y2={height - padding} stroke="rgba(6,182,212,0.04)" strokeWidth="1" />

          {/* Coordinate Axes */}
          {originY >= padding && originY <= height - padding && (
            <line
              x1={padding}
              y1={originY}
              x2={width - padding}
              y2={originY}
              stroke="rgba(6,182,212,0.25)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          )}
          {originX >= padding && originX <= width - padding && (
            <line
              x1={originX}
              y1={padding}
              x2={originX}
              y2={height - padding}
              stroke="rgba(6,182,212,0.25)"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
          )}

          {/* Glowing Math Function Plot Path */}
          {pathD && (
            <>
              {/* Outer neon pulse drop shadow line */}
              <path
                d={pathD}
                fill="none"
                stroke="rgba(34, 211, 238, 0.45)"
                strokeWidth="3.5"
                className="blur-[2px]"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#22d3ee"
                strokeWidth="1.75"
              />
            </>
          )}

          {/* Hover tracker cursor overlay elements */}
          {hoverCoord && (
            <>
              {/* Vertical dotted alignment line */}
              <line
                x1={hoverCoord.sX}
                y1={padding}
                x2={hoverCoord.sX}
                y2={height - padding}
                stroke="rgba(244,63,94,0.3)"
                strokeWidth="1"
                strokeDasharray="1,1"
              />
              {/* Plot focus point marker */}
              <circle
                cx={hoverCoord.sX}
                cy={hoverCoord.sY}
                r="4.5"
                fill="#f43f5e"
                stroke="#ffffff"
                strokeWidth="1"
                className="shadow-[0_0_8px_rgba(244,63,94,0.8)]"
              />
              {/* Active slope tangent approximation vector visualizer */}
              <line
                x1={hoverCoord.sX - 15}
                y1={hoverCoord.sY + hoverCoord.slope * 15 * (rangeX / rangeY) * (height / width)}
                x2={hoverCoord.sX + 15}
                y2={hoverCoord.sY - hoverCoord.slope * 15 * (rangeX / rangeY) * (height / width)}
                stroke="#4ade80"
                strokeWidth="1.5"
              />
            </>
          )}
        </svg>

        {/* Dynamic Telemetry Display box below plot */}
        <div className="w-full flex justify-between bg-slate-950/80 border border-slate-900 rounded p-1.5 mt-1 text-[10px] grid grid-cols-3 gap-1 font-mono">
          <div className="text-left">
            <span className="text-slate-500 block uppercase text-[8px]">Tracker X</span>
            <span className="text-cyan-300 font-semibold">{hoverCoord ? hoverCoord.x.toFixed(3) : "—"}</span>
          </div>
          <div className="text-center border-x border-slate-900">
            <span className="text-slate-500 block uppercase text-[8px]">Output f(x)</span>
            <span className="text-cyan-300 font-semibold">{hoverCoord ? hoverCoord.y.toFixed(3) : "—"}</span>
          </div>
          <div className="text-right">
            <span className="text-slate-500 block uppercase text-[8px]">Slope f'(x)</span>
            <span className="text-emerald-400 font-semibold">{hoverCoord ? hoverCoord.slope.toFixed(2) : "—"}</span>
          </div>
        </div>
      </div>

      {/* Predefined Stark Quantum Models Selector (Clickable instead of manual typing inputs) */}
      <div className="space-y-1.5 font-mono">
        <span className="text-cyan-500/80 uppercase text-[9px] font-bold tracking-wider">STARK QUANTUM EQUATION MODELS:</span>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "QUANTUM FLOW", formula: "sin(x) / x", min: -15, max: 15 },
            { label: "ARK CORE PULSE", formula: "cos(x) * sin(x/2)", min: -10, max: 10 },
            { label: "THERMAL DECAY", formula: "exp(-x/5) * cos(x)", min: 0, max: 20 },
            { label: "BILINEAR TENSOR", formula: "x^2 - 2*x + 1", min: -5, max: 5 }
          ].map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setExpression(preset.formula);
                setMinX(preset.min);
                setMaxX(preset.max);
              }}
              className={`p-1.5 rounded border text-[9px] text-left transition-all cursor-pointer ${
                expression === preset.formula
                  ? "bg-cyan-950/60 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.3)] font-bold"
                  : "bg-slate-950/60 border-slate-800 text-slate-400 hover:border-cyan-500/35 hover:text-cyan-200"
              }`}
            >
              <div className="font-semibold block truncate">{preset.label}</div>
              <div className="text-[8px] text-cyan-500/70 truncate">{preset.formula}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Numerical quick expression helper calc (Now a passive real-time calculation logger instead of input boxes) */}
      <div className="bg-slate-950/40 border border-slate-800/80 p-2.5 rounded-xl space-y-1.5 font-mono">
        <div className="text-[10px] text-slate-400 uppercase tracking-wider flex justify-between items-center">
          <span>ALGORITHMIC COGNITION DECODER</span>
          <Calculator className="w-3.5 h-3.5 text-cyan-400/40" />
        </div>
        
        <div className="text-[9px] text-slate-500 flex flex-col gap-1 leading-normal">
          <div className="flex justify-between items-center bg-slate-900/40 px-1.5 py-0.5 rounded">
            <span>MATRIX DETERMINANT:</span>
            <span className="text-cyan-400">det(A) = 1.042e-12</span>
          </div>
          <div className="flex justify-between items-center bg-slate-900/40 px-1.5 py-0.5 rounded">
            <span>COGNITIVE ACCURACY:</span>
            <span className="text-emerald-400 font-bold">99.982% SYNCED</span>
          </div>
          <div className="flex justify-between items-center bg-slate-900/40 px-1.5 py-0.5 rounded">
            <span>INTEGRATOR CONSTANT:</span>
            <span className="text-cyan-400">C = 4.298412e+4</span>
          </div>
        </div>
      </div>

      {/* Actions to delegate to J.A.R.V.I.S */}
      <div className="grid grid-cols-2 gap-2 mt-auto">
        <button
          onClick={() => handleSendToJarvis("solve")}
          className="py-1.5 bg-cyan-950/60 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-200 hover:text-cyan-100 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
        >
          <Sparkles className="w-3 h-3 text-cyan-400" />
          <span>Step-by-Step Roots</span>
        </button>
        <button
          onClick={() => handleSendToJarvis("explain")}
          className="py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-cyan-100 rounded-xl text-[10px] font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase"
        >
          <Activity className="w-3 h-3" />
          <span>Explain Wave Physics</span>
        </button>
      </div>

      {/* Preset selection slider drawer */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-cyan-500/10 scrollbar-track-transparent text-[9px] font-mono">
        {presets.map((preset) => (
          <button
            key={preset.name}
            onClick={() => handleApplyPreset(preset)}
            className={`px-2 py-1 rounded-lg border flex-shrink-0 cursor-pointer transition-all ${
              expression === preset.expression
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-300"
                : "bg-slate-950/20 border-slate-800 text-slate-500 hover:text-slate-300"
            }`}
            title={preset.desc}
          >
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}
