import React, { useState, useEffect, useRef } from "react";
import { Play, RotateCcw, AlertTriangle, ShieldCheck, Zap, Thermometer, Radio, Cpu, Settings, ChevronRight, X } from "lucide-react";

interface HolographicSimulationProps {
  initialQuery: string;
  onClose: () => void;
}

interface SimulationStep {
  time: number;
  message: string;
  status: "success" | "warning" | "error" | "info";
}

export default function HolographicSimulation({ initialQuery, onClose }: HolographicSimulationProps) {
  // Parse topic
  const queryText = initialQuery || "Stark Mk-85 Kinetic Overload";
  
  // Custom states for adjustable simulation parameters
  const [energyLevel, setEnergyLevel] = useState<number>(85);
  const [confinement, setConfinement] = useState<number>(90);
  const [externalForce, setExternalForce] = useState<number>(50);
  const [thermalLoad, setThermalLoad] = useState<number>(40);

  const [simTime, setSimTime] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simLogs, setSimLogs] = useState<SimulationStep[]>([]);
  const [currentStatus, setCurrentStatus] = useState<"READY" | "CALCULATING" | "CONVERGING" | "COMPLETED" | "CRITICAL">("CALCULATING");
  const [failureRate, setFailureRate] = useState<number>(0);
  const [chartData, setChartData] = useState<{ x: number; y1: number; y2: number }[]>([]);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Generate dynamic simulation specs based on prompt
  const getSimulationProfile = () => {
    const q = queryText.toLowerCase();
    if (q.includes("reactor") || q.includes("리액터") || q.includes("아크") || q.includes("overload") || q.includes("과부하")) {
      return {
        title: "ARC REACTOR THERMAL PLASMONIC COLLAPSE",
        param1: "Plasma Density (n_e)",
        param2: "Magnetic Trap Strength (T)",
        param3: "Core Temperature (MK)",
        param4: "Coolant Flow Vector (m³/s)",
        verdictSuccess: "Arc Core successfully stabilized under extreme load.",
        verdictFail: "Core collapse imminent. Magnetic containment breach detected.",
        steps: [
          "Initializing core plasmonic field matrix...",
          "Calibrating palladium-isotope fusion decay channels...",
          "Power levels surging past 120% nominal load...",
          "Thermal dissipation failure in auxiliary manifold-B.",
          "Warning: Magnetic confinement field experiencing resonance jitter.",
          "Analyzing quantum fluctuation envelope...",
          "Coolant pressure localized bypass initiated...",
          "Core plasma pressure reached critical thresholds...",
          "Calculating stabilization vector coordinates..."
        ]
      };
    } else if (q.includes("suit") || q.includes("flight") || q.includes("수트") || q.includes("비행") || q.includes("마하") || q.includes("mach")) {
      return {
        title: "MARK-85 HYPERSONIC FLIGHT AERODYNAMIC DYNAMICS",
        param1: "Thruster Output (kN)",
        param2: "Aero Drag Coeff (Cd)",
        param3: "Skin Thermal Load (°C)",
        param4: "Pitch Feedback Gain (dB)",
        verdictSuccess: "Mach stabilization attained. Structural shield integrity green.",
        verdictFail: "Airframe stress exceeds 240%. Surface disintegration detected.",
        steps: [
          "Engaging Mark-85 flight stabilization algorithms...",
          "Analyzing atmospheric friction vector gradients...",
          "Velocity exceeding Mach 5.2. Boundary layer compression active.",
          "Warning: Wingtip deflection stress approaching tolerance peak.",
          "Calibrating micro-thruster pitch recovery vectors...",
          "Dynamic pressure (Q-max) reaching structural limit...",
          "Compiling active drag reduction field parameters...",
          "Thermal shielding radiating at 850° Kelvin...",
          "Assessing structural fatigue across visual grid telemetry..."
        ]
      };
    } else if (q.includes("hole") || q.includes("black") || q.includes("우주") || q.includes("블랙홀") || q.includes("gravity") || q.includes("중력")) {
      return {
        title: "SINGULARITY EVENT HORIZON GRAVITATIONAL DILATION",
        param1: "Tidal Force Ratio (G)",
        param2: "Orbital Deceleration (m/s²)",
        param3: "Hawking Radiation (W)",
        param4: "Spacetime Warp Index (θ)",
        verdictSuccess: "Event horizon slingshot successfully navigated.",
        verdictFail: "Spacetime shear threshold exceeded. Spaghettification completed.",
        steps: [
          "Scanning local gravitational metric tensor fields...",
          "Mapping Schwarzschild radius horizon parameters...",
          "Relativistic doppler shift factor climbing exponentially...",
          "Tidal force shear ratio climbing near structural tolerance limits.",
          "Executing warp compensation on thruster subroutines...",
          "Warning: Extreme chronological dilation detected (1s = 4.2 years)...",
          "Attempting gravitational slingshot angle injection...",
          "Photon sphere boundary crossing registered...",
          "Analyzing escape velocity vector geometry..."
        ]
      };
    } else {
      return {
        title: "STARK COGNITIVE COMPLEX MULTI-VARIABLE SIMULATRON",
        param1: "Subsystem Core Load (%)",
        param2: "Quantum Coherence (φ)",
        param3: "Dynamic Friction Coefficient",
        param4: "Entropy Generation Index",
        verdictSuccess: "Simulation converged to steady state. System optimal.",
        verdictFail: "Cascade thermal run-away detected. System force shutdown recommended.",
        steps: [
          "Mapping simulation nodes for query: " + queryText,
          "Setting up boundary conditions for custom physical space...",
          "Evaluating multi-grid hydrodynamic differential equations...",
          "Injecting dynamic stress variables to stress-test core system...",
          "Warning: High friction divergence in second order nodes.",
          "Calculating quantum feedback loops and damping parameters...",
          "Recalibrating solver to minimize residual calculations...",
          "Plotting state-space convergence trajectory...",
          "Refining mathematical output accuracy to 99.98%..."
        ]
      };
    }
  };

  const profile = getSimulationProfile();

  // Handle dynamic simulation ticks
  useEffect(() => {
    if (!isRunning) return;

    // Reset simulation logs and status initially
    if (simTime === 0) {
      setSimLogs([
        { time: 0, message: "🚨 SIMULATOR START: Initializing holographic mainframe...", status: "info" }
      ]);
      setChartData([]);
      setCurrentStatus("CALCULATING");
    }

    const timer = setInterval(() => {
      setSimTime((prevTime) => {
        const nextTime = prevTime + 1;
        
        // Progress steps
        if (nextTime <= 9) {
          const stepMsg = profile.steps[nextTime - 1];
          const isWarning = stepMsg.toLowerCase().includes("warning") || stepMsg.includes("위험");
          setSimLogs((prev) => [
            ...prev,
            {
              time: nextTime,
              message: stepMsg,
              status: isWarning ? "warning" : "info"
            }
          ]);
        }

        // Handle dynamic graph plotting
        setChartData((prev) => {
          // Dynamic math formula simulating physical convergence with noise and adjustable sliders
          const base1 = energyLevel * (1 - Math.exp(-nextTime / 3));
          const noise1 = (Math.sin(nextTime * 1.5) * externalForce) / 10;
          const val1 = Math.max(0, Math.min(100, Math.round(base1 + noise1)));

          const base2 = (100 - confinement) * (1 + Math.exp(-nextTime / 5));
          const noise2 = (Math.cos(nextTime * 2.1) * thermalLoad) / 15;
          const val2 = Math.max(0, Math.min(100, Math.round(base2 + noise2)));

          return [...prev, { x: nextTime, y1: val1, y2: val2 }];
        });

        // Dynamic failure calculation based on sliders
        const energyTerm = energyLevel > 80 ? (energyLevel - 80) * 1.5 : 0;
        const confinementTerm = confinement < 50 ? (50 - confinement) * 1.2 : 0;
        const loadTerm = thermalLoad > 70 ? (thermalLoad - 70) * 1.0 : 0;
        const calculatedFailure = Math.min(100, Math.round(energyTerm + confinementTerm + loadTerm + (externalForce * 0.3)));
        setFailureRate(calculatedFailure);

        if (nextTime === 5) {
          setCurrentStatus("CONVERGING");
        }

        if (nextTime >= 10) {
          setIsRunning(false);
          const isFailed = calculatedFailure > 65;
          setCurrentStatus(isFailed ? "CRITICAL" : "COMPLETED");
          
          setSimLogs((prev) => [
            ...prev,
            {
              time: nextTime,
              message: isFailed 
                ? `❌ SIMULATION FAILED: ${profile.verdictFail} (Risk Index: ${calculatedFailure}%)`
                : `✅ SIMULATION SUCCESS: ${profile.verdictSuccess} (Risk Index: ${calculatedFailure}%)`,
              status: isFailed ? "error" : "success"
            }
          ]);
          clearInterval(timer);
        }

        return nextTime;
      });
    }, 1200);

    return () => clearInterval(timer);
  }, [isRunning, simTime, energyLevel, confinement, externalForce, thermalLoad, queryText]);

  // Scroll to bottom on log additions
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [simLogs]);

  const restartSimulation = () => {
    setSimTime(0);
    setSimLogs([]);
    setChartData([]);
    setIsRunning(true);
    setCurrentStatus("CALCULATING");
  };

  return (
    <div className="flex flex-col h-[520px] bg-slate-950/95 text-slate-100 font-sans relative">
      <style>{`
        @keyframes holo-spin-clockwise {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes holo-spin-counter {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes holo-pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(0.97); }
          50% { opacity: 0.95; transform: scale(1.03); }
        }
        .holo-spin-cw {
          animation: holo-spin-clockwise 15s linear infinite;
          transform-origin: center;
        }
        .holo-spin-ccw {
          animation: holo-spin-counter 10s linear infinite;
          transform-origin: center;
        }
        .holo-pulse {
          animation: holo-pulse-glow 2s ease-in-out infinite;
        }
        .scanline-overlay {
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(6, 182, 212, 0.12) 50%
          );
          background-size: 100% 4px;
        }
      `}</style>

      {/* Holographic Scanline Overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-40 rounded-2xl" />

      {/* Simulation Header */}
      <div className="bg-cyan-950/20 px-4 py-3 border-b border-cyan-500/10 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400 animate-spin" />
          <div>
            <h4 className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
              {profile.title}
            </h4>
            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
              TARGET QUERY: <span className="text-cyan-200">"{queryText}"</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
            currentStatus === "COMPLETED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30" :
            currentStatus === "CRITICAL" ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse" :
            "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 animate-pulse"
          }`}>
            STATUS: {currentStatus}
          </span>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden relative z-10">
        {/* Left Control Board: Interactive Parameters */}
        <div className="col-span-4 bg-slate-900/60 border border-cyan-500/10 rounded-xl p-3 flex flex-col justify-between overflow-y-auto">
          <div>
            <div className="flex items-center gap-1.5 mb-2.5 pb-1 border-b border-cyan-500/10">
              <Settings className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-widest">
                ENVIRONMENTAL CONSTANTS
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Slider 1 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-slate-400 font-bold">{profile.param1}</span>
                  <span className="text-cyan-400 font-bold">{energyLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="150"
                  value={energyLevel}
                  onChange={(e) => {
                    setEnergyLevel(Number(e.target.value));
                    setSimTime(0); // Trigger live reset
                  }}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Slider 2 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-slate-400 font-bold">{profile.param2}</span>
                  <span className="text-cyan-400 font-bold">{confinement}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={confinement}
                  onChange={(e) => {
                    setConfinement(Number(e.target.value));
                    setSimTime(0);
                  }}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Slider 3 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-slate-400 font-bold">{profile.param3}</span>
                  <span className="text-cyan-400 font-bold">{externalForce}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={externalForce}
                  onChange={(e) => {
                    setExternalForce(Number(e.target.value));
                    setSimTime(0);
                  }}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              {/* Slider 4 */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[9px] font-mono">
                  <span className="text-slate-400 font-bold">{profile.param4}</span>
                  <span className="text-cyan-400 font-bold">{thermalLoad}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={thermalLoad}
                  onChange={(e) => {
                    setThermalLoad(Number(e.target.value));
                    setSimTime(0);
                  }}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* Core Gauge & Controls */}
          <div className="mt-4 pt-3 border-t border-cyan-500/10 space-y-2.5">
            <div className="bg-slate-950/80 rounded border border-cyan-500/20 p-2 text-center relative overflow-hidden">
              <div className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">COLLAPSE RISK INDEX</div>
              <div className={`text-xl font-mono font-extrabold mt-0.5 ${failureRate > 65 ? "text-rose-400" : failureRate > 35 ? "text-amber-400" : "text-emerald-400"}`}>
                {failureRate}%
              </div>
              
              {/* Small dynamic progress bar indicator */}
              <div className="w-full bg-slate-900 h-1.5 rounded-full mt-1.5 overflow-hidden border border-slate-800">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${failureRate > 65 ? "bg-rose-500 animate-pulse" : failureRate > 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                  style={{ width: `${failureRate}%` }}
                />
              </div>
            </div>

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setIsRunning(!isRunning)}
                disabled={currentStatus === "COMPLETED" || currentStatus === "CRITICAL"}
                className={`flex-1 py-1.5 px-2 rounded-lg font-mono font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer border ${
                  isRunning 
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20" 
                    : "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                } disabled:opacity-50`}
              >
                {isRunning ? (
                  <>
                    <X className="w-3 h-3" /> PAUSE
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" /> RUN
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={restartSimulation}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-slate-200 cursor-pointer hover:border-cyan-500/20 flex items-center justify-center"
                title="Restart Simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Dashboard: Logs & Interactive Graph Canvas */}
        <div className="col-span-8 flex flex-col gap-3 overflow-hidden">
          {/* Holographic Line Chart Area (Dynamic Split View!) */}
          <div className="h-[180px] bg-slate-900/60 border border-cyan-500/10 rounded-xl p-2.5 flex flex-row gap-4 relative overflow-hidden">
            {/* Left circular HUD panel */}
            <div className="w-32 h-full flex flex-col items-center justify-center border-r border-cyan-500/10 pr-2 select-none relative shrink-0">
              <span className="text-[7.5px] font-mono text-cyan-400/70 uppercase tracking-widest absolute top-0 left-0">
                HUD ORIENTATION
              </span>
              
              <div className="relative w-24 h-24 flex items-center justify-center mt-2.5">
                {/* SVG Concentric Rings */}
                <svg className="w-full h-full absolute inset-0 text-cyan-400" viewBox="0 0 100 100">
                  {/* Outer Orbit Coordinates Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.5"
                    strokeOpacity="0.25"
                    strokeDasharray="2 6"
                    className="holo-spin-cw"
                  />
                  {/* Ticked Outer Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeOpacity="0.4"
                    strokeDasharray="20 4 5 4"
                    className="holo-spin-ccw"
                  />
                  {/* Segmented Inner Ring */}
                  <circle
                    cx="50"
                    cy="50"
                    r="32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                    strokeDasharray="45 10 15 10"
                    className="holo-spin-cw"
                  />
                  {/* Dotted Core Boundary */}
                  <circle
                    cx="50"
                    cy="50"
                    r="24"
                    fill="none"
                    stroke={currentStatus === "CRITICAL" ? "#ef4444" : "#22d3ee"}
                    strokeWidth="1"
                    strokeOpacity="0.6"
                    className="holo-spin-ccw"
                  />
                  {/* Locking Reticles */}
                  <path
                    d="M 50 10 L 50 18 M 50 82 L 50 90 M 10 50 L 18 50 M 82 50 L 90 50"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                </svg>

                {/* Inner Pulsing Arc Core Generator */}
                <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 holo-pulse ${
                  currentStatus === "CRITICAL"
                    ? "bg-rose-500/20 border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                    : isRunning
                    ? "bg-cyan-500/20 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                    : "bg-slate-950 border-cyan-500/40 shadow-none"
                }`}>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[7.5px] font-mono font-black ${
                    currentStatus === "CRITICAL"
                      ? "bg-rose-950/60 border-rose-400 text-rose-300"
                      : "bg-cyan-950/60 border-cyan-300 text-cyan-200"
                  }`}>
                    {currentStatus === "CRITICAL" ? "ERR" : isRunning ? "RUN" : "STB"}
                  </div>
                </div>

                {/* Sweeping Scanner line */}
                <div className="absolute inset-0 border-r border-cyan-400/20 rounded-full animate-spin pointer-events-none" style={{ animationDuration: "3s" }} />
              </div>

              {/* Real-time coordinates feed below ring */}
              <div className="flex gap-2 justify-between w-full mt-1 text-[7px] font-mono text-cyan-500/60 px-1">
                <span>R: {((energyLevel * 3.8) || 120.5).toFixed(1)}</span>
                <span className="animate-pulse">θ: {((simTime * 36) % 360)}°</span>
              </div>
            </div>

            {/* Right side convergence chart */}
            <div className="flex-1 h-full flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 left-1.5 flex gap-4 pointer-events-none z-10">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest font-bold">STABILITY (Y1)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-widest font-bold">THERMAL (Y2)</span>
                </div>
              </div>

              {/* Dynamic Graph drawing area */}
              <div className="flex-1 w-full mt-4 flex items-end justify-center relative">
                {/* Background structural Grid lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                  <div className="border-b border-cyan-400 w-full h-0" />
                  <div className="border-b border-cyan-400 w-full h-0" />
                  <div className="border-b border-cyan-400 w-full h-0" />
                  <div className="border-b border-cyan-400 w-full h-0" />
                </div>

                {chartData.length > 1 ? (
                  <svg className="w-full h-full absolute inset-0" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Linear gradients for ambient glowing curves */}
                    <defs>
                      <linearGradient id="glow-y1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                      </linearGradient>
                      <linearGradient id="glow-y2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#34d399" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                      </linearGradient>
                    </defs>

                    {/* Draw filled areas */}
                    <path
                      d={`M 0 100 ${chartData.map((d, i) => `L ${(i / 9) * 100} ${100 - d.y1}`).join(" ")} L 100 100 Z`}
                      fill="url(#glow-y1)"
                    />
                    <path
                      d={`M 0 100 ${chartData.map((d, i) => `L ${(i / 9) * 100} ${100 - d.y2}`).join(" ")} L 100 100 Z`}
                      fill="url(#glow-y2)"
                    />

                    {/* Lines */}
                    <path
                      d={chartData.map((d, i) => `${i === 0 ? "M" : "L"} ${(i / 9) * 100} ${100 - d.y1}`).join(" ")}
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                    <path
                      d={chartData.map((d, i) => `${i === 0 ? "M" : "L"} ${(i / 9) * 100} ${100 - d.y2}`).join(" ")}
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />

                    {/* Point circles */}
                    {chartData.map((d, i) => (
                      <g key={i}>
                        <circle cx={(i / 9) * 100} cy={100 - d.y1} r="1.2" fill="#22d3ee" className="animate-pulse" />
                        <circle cx={(i / 9) * 100} cy={100 - d.y2} r="1.2" fill="#34d399" />
                      </g>
                    ))}
                  </svg>
                ) : (
                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 animate-pulse">
                    <Radio className="w-3 h-3 text-cyan-400" /> COMPILING LIVE CARRIER CO-EFFICIENTS...
                  </div>
                )}
              </div>

              {/* Time stamp indicator */}
              <div className="flex justify-between border-t border-slate-800/60 pt-1.5 text-[8px] font-mono text-slate-400">
                <span>SOLVER STEP: T+0.00s</span>
                <span>T+{((simTime * 1.2) || 0).toFixed(2)}s</span>
                <span>T+12.00s (LIMIT)</span>
              </div>
            </div>
          </div>

          {/* Terminal Console Logs */}
          <div className="flex-1 bg-slate-950/90 border border-cyan-500/10 rounded-xl p-3 flex flex-col justify-between overflow-hidden relative">
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 uppercase tracking-widest border-b border-slate-900 pb-1.5 mb-2 pointer-events-none">
              <span>SYSTEM EVENT SOLVER FEED</span>
              <span>MATRIX FREQUENCY: 85.2 GHz</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[10px] font-mono custom-scrollbar">
              {simLogs.map((log, index) => (
                <div key={index} className="flex gap-2 leading-relaxed">
                  <span className="text-cyan-500/50">[{index + 1}]</span>
                  <div className="flex-1">
                    {log.status === "warning" && (
                      <span className="text-amber-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 inline text-amber-400 shrink-0" />
                        {log.message}
                      </span>
                    )}
                    {log.status === "error" && (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 inline text-rose-400 shrink-0 animate-ping" />
                        {log.message}
                      </span>
                    )}
                    {log.status === "success" && (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 inline text-emerald-400 shrink-0" />
                        {log.message}
                      </span>
                    )}
                    {log.status === "info" && (
                      <span className="text-slate-200">
                        {log.message}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            {/* Simulated Quantum Verdict */}
            {currentStatus === "COMPLETED" && (
              <div className="mt-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-lg p-2.5 flex items-start gap-2 animate-fade-in">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
                    SIMULATION VERDICT: HIGH CORE SAFETY CO-EFFICIENT
                  </h5>
                  <p className="text-[9px] text-slate-400 leading-normal font-mono mt-0.5">
                    {profile.verdictSuccess} 모든 열역학 벡터 및 운동 에너지 하중이 완벽한 조화(Convergence)를 유지하며 아머 설계 안전 한계선 이내로 검출되었습니다.
                  </p>
                </div>
              </div>
            )}

            {currentStatus === "CRITICAL" && (
              <div className="mt-2.5 bg-rose-950/30 border border-rose-500/30 rounded-lg p-2.5 flex items-start gap-2 animate-pulse">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider">
                    SIMULATION VERDICT: CRITICAL STRUCTURAL FAILURE
                  </h5>
                  <p className="text-[9px] text-slate-400 leading-normal font-mono mt-0.5">
                    {profile.verdictFail} 설계 허용 범위를 초과하는 외부 마찰 및 과도한 에너지가 주입되었습니다. 고정 장치 소실 및 재앙적 붕괴가 관찰됩니다. 즉각 시뮬레이션 환경 설정을 하향 조정하십시오.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
