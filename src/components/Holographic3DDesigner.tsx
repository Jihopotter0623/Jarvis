import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Layers,
  RotateCw,
  Sliders,
  Wrench,
  Trash2,
  Plus,
  Play,
  Pause,
  Check,
  ChevronRight,
  RefreshCw,
  Box,
  Circle,
  Activity,
  Zap,
  Shield,
  Compass,
  FileText,
  Settings,
  Maximize2,
  Minimize2,
  X,
  Eye,
  EyeOff,
  Save,
  Download,
  SlidersHorizontal,
  Sun,
  Video,
  Info,
  ChevronDown,
  Hammer,
  Grid,
  Sparkle,
  Mic,
  Volume2,
  VolumeX
} from "lucide-react";

interface CustomPart {
  id: string;
  type: "cube" | "sphere" | "cylinder" | "torus";
  name: string;
  position: [number, number, number];
  scale: [number, number, number];
  rotation: [number, number, number]; // in degrees
  color: string;
  wireframe: boolean;
  visible: boolean;
  metalness: number;
  roughness: number;
  opacity: number;
}

interface Holographic3DDesignerProps {
  initialQuery?: string;
  onAskJarvis?: (prompt: string) => void;
  status?: string;
  onClose?: () => void;
}

export default function Holographic3DDesigner({
  initialQuery = "",
  onAskJarvis,
  status = "idle",
  onClose
}: Holographic3DDesignerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const rotYRef = useRef<number>(0.5);
  const rotXRef = useRef<number>(0.3);
  const zoomLevelRef = useRef<number>(110);
  
  // Design configuration states
  const [activePreset, setActivePreset] = useState<"reactor" | "helmet" | "spaceship" | "drone" | "satellite" | "lightsaber" | "hammer" | "mug" | "glasses" | "ring" | "custom">("reactor");
  const [wireframeMode, setWireframeMode] = useState<"wireframe" | "solid" | "transparent" | "thermal">("solid");
  const [rotationSpeed, setRotationSpeed] = useState<number>(0.8); // Auto rotate speed multiplier
  const [isRotating, setIsRotating] = useState<boolean>(true);
  const [explodeRatio, setExplodeRatio] = useState<number>(0); // 0 to 1
  const [scanSpeed, setScanSpeed] = useState<number>(1.2);
  const [laserScanColor, setLaserScanColor] = useState<string>("#06b6d4"); // Cyan
  const [modelColor, setModelColor] = useState<string>("#22d3ee"); // Cyan glow
  const [gridVisible, setGridVisible] = useState<boolean>(true);
  const [activeTool, setActiveTool] = useState<"select" | "move" | "rotate" | "scale">("select");
  
  // High-fidelity speech and laser status states
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState<boolean>(false);
  const [voiceSubtext, setVoiceSubtext] = useState<string>("SYSTEM STANDBY - READY TO COMPILE");
  const [scadCode, setScadCode] = useState<string>("");
  const [typedScadCode, setTypedScadCode] = useState<string>("");
  const [activeRightTab, setActiveRightTab] = useState<"inspector" | "compiler">("inspector");
  const [laserActive, setLaserActive] = useState<boolean>(false);
  
  // Active document/file metadata
  const [fileName, setFileName] = useState<string>("stark_reactor_mark_v.scad");
  const [selectedMenu, setSelectedMenu] = useState<string | null>(null);

  // Custom manual elements array
  const [customParts, setCustomParts] = useState<CustomPart[]>([
    {
      id: "p_base",
      type: "cylinder",
      name: "reactor_hull_base",
      position: [0, -0.6, 0],
      scale: [2.0, 0.25, 2.0],
      rotation: [0, 0, 0],
      color: "#0284c7",
      wireframe: false,
      visible: true,
      metalness: 0.9,
      roughness: 0.1,
      opacity: 0.85
    },
    {
      id: "p_ring",
      type: "torus",
      name: "electromagnetic_ring",
      position: [0, 0.1, 0],
      scale: [1.6, 1.6, 1.6],
      rotation: [90, 0, 0],
      color: "#22d3ee",
      wireframe: true,
      visible: true,
      metalness: 0.8,
      roughness: 0.2,
      opacity: 0.9
    },
    {
      id: "p_orb",
      type: "sphere",
      name: "palladium_core_orb",
      position: [0, 0, 0],
      scale: [0.75, 0.75, 0.75],
      rotation: [0, 0, 0],
      color: "#ffffff",
      wireframe: false,
      visible: true,
      metalness: 0.2,
      roughness: 0.1,
      opacity: 1.0
    }
  ]);
  const [selectedPartId, setSelectedPartId] = useState<string | null>("p_orb");
  
  // Animation timeline states
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const [isPlayingAnimation, setIsPlayingAnimation] = useState<boolean>(false);
  const [aiPromptInput, setAiPromptInput] = useState<string>("");

  // Telemetry logs
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    "STARK CAD v4.2: Holographic CAD Vector suite online.",
    "GRID CALIBRATION: Floored XYZ alignment bounds resolved.",
    "CORE INTERFACE: Connected streaming, pipeline running at 60 FPS.",
    "READY: Awaiting physical workspace parameters."
  ]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false });
    setTerminalLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 18)]);
  };

  // Preset switching
  const selectPreset = (preset: typeof activePreset) => {
    setActivePreset(preset);
    addLog(`LOAD PRESET: Initializing structural mesh assembly for [${preset.toUpperCase()}]`);
    if (preset !== "custom") {
      setSelectedPartId(null);
    } else {
      setSelectedPartId("p_orb");
    }
  };

  const addCustomPart = (type: CustomPart["type"]) => {
    const nextId = `p_${Date.now()}`;
    const newPart: CustomPart = {
      id: nextId,
      type,
      name: `${type}_node_${customParts.length + 1}`,
      position: [0, 0, 0],
      scale: type === "torus" ? [1.2, 1.2, 1.2] : [1, 1, 1],
      rotation: [0, 0, 0],
      color: modelColor,
      wireframe: wireframeMode === "wireframe",
      visible: true,
      metalness: 0.8,
      roughness: 0.2,
      opacity: 0.8
    };
    setCustomParts(prev => [...prev, newPart]);
    setSelectedPartId(nextId);
    selectPreset("custom");
    addLog(`ADD NODE: Inserted raw primitive [${type.toUpperCase()}] to scene stack`);
  };

  const updateCustomPart = (id: string, updates: Partial<CustomPart>) => {
    setCustomParts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const deleteCustomPart = (id: string) => {
    const target = customParts.find(p => p.id === id);
    if (target) {
      addLog(`DELETE NODE: Removed ${target.name} from assembly tree`);
    }
    setCustomParts(prev => prev.filter(p => p.id !== id));
    if (selectedPartId === id) setSelectedPartId(null);
  };

  // 1. Text-to-Speech Output (J.A.R.V.I.S. Voice Engine)
  const speak = (text: string) => {
    if (isVoiceMuted || !window.speechSynthesis) {
      setVoiceSubtext(text);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "ko-KR";
    
    // Select premium/masculine/butler voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => v.lang.includes("ko") || v.name.includes("Google") || v.name.includes("David") || v.name.includes("Jarvis")) || voices[0];
    if (preferredVoice) utterance.voice = preferredVoice;
    
    utterance.rate = 1.05;
    utterance.pitch = 0.85; // lower pitch for sophisticated butler vibe
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setVoiceSubtext(text);
    };
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
    };
    
    window.speechSynthesis.speak(utterance);
  };

  // 2. Continuous Voice Recognition STT dictation
  const startListening = () => {
    const SpeechLib = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechLib) {
      addLog("VOICE ERROR: Speech recognition is unsupported in your browser.");
      speak("죄송합니다. 현재 브라우저에서 음성 인식을 지원하지 않습니다.");
      return;
    }
    
    setIsListening(true);
    setVoiceSubtext("J.A.R.V.I.S.가 주인님의 지시를 경청하는 중...");
    addLog("VOICE DIRECTIVE: Opening micro link. Speak now, Sir.");
    
    const recog = new SpeechLib();
    recog.lang = "ko-KR";
    recog.interimResults = false;
    recog.maxAlternatives = 1;
    
    recog.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      addLog(`VOICE DIRECTIVE CAPTURED: "${transcript}"`);
      setAiPromptInput(transcript);
      setTimeout(() => {
        handleAiGenerationWithQuery(transcript);
      }, 500);
    };
    
    recog.onerror = (e: any) => {
      addLog(`VOICE INTERFACE ERROR: ${e.error}`);
      setIsListening(false);
      setVoiceSubtext("통신 회선 장애 발생.");
    };
    
    recog.onend = () => {
      setIsListening(false);
    };
    
    recog.start();
  };

  // 3. OpenSCAD Code generation helper
  const getScadCodeForModel = (modelType: string): string => {
    switch (modelType) {
      case "reactor":
        return `// Stark Industries CAD - Arc Reactor Mark V\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\nunion() {\n  // Outer Electromagnetic Confinement Ring\n  difference() {\n    torus(r1=1.8, r2=0.25, $fn=100);\n    cylinder(h=1.0, r=1.6, center=true);\n  }\n  // Palladium Cell Plasmoid Core\n  color("white") sphere(r=0.6, $fn=64);\n  // Copper Coil Induction Rails\n  for(i = [0:9]) {\n    rotate([0, 0, i * 36])\n    translate([1.4, 0, 0])\n    cube([0.15, 0.45, 0.35], center=true);\n  }\n}`;
      case "helmet":
        return `// Stark Industries CAD - Mark III Helmet Shield\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\ndifference() {\n  // Cranial Titanium-Gold Dome\n  sphere(r=1.45, $fn=100);\n  // Left ocular HUD interface\n  translate([-0.35, 0.25, 1.1]) rotate([0, -10, -5]) cube([0.48, 0.08, 0.15]);\n  // Right ocular HUD interface\n  translate([0.35, 0.25, 1.1]) rotate([0, 10, 5]) cube([0.48, 0.08, 0.15]);\n}`;
      case "spaceship":
        return `// Stark Industries CAD - Hypersonic Starship\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\nunion() {\n  // Fuselage Thruster body\n  cylinder(h=2.8, r=0.55, center=true);\n  // Cockpit Photonic Dome\n  translate([0, 0.15, 0.8]) sphere(r=0.6);\n  // Left Delta Wing\n  translate([-1.4, -0.1, -0.4]) rotate([0, 15, 5]) cube([1.8, 0.08, 1.1]);\n  // Right Delta Wing\n  translate([1.4, -0.1, -0.4]) rotate([0, -15, -5]) cube([1.8, 0.08, 1.1]);\n}`;
      case "lightsaber":
        return `// Stark Cybernetic - Plasma Kyber Saber\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\nunion() {\n  // Cylinder Silver-Titanium Handle hilt\n  color("silver") cylinder(h=1.4, r=0.18, center=true);\n  // Plasma Containment High-voltage Beam\n  color("red") translate([0, 0, 1.8]) cylinder(h=3.6, r=0.12, center=true);\n}`;
      case "hammer":
        return `// Stark Cybernetic - Thor's Mjolnir Hammer\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\nunion() {\n  // Main brushed silver-steel head\n  color("silver") cube([1.8, 1.1, 1.1], center=true);\n  // Left beveled focus rim\n  translate([-0.95, 0.4, 0]) rotate([0, 90, 0]) cylinder(h=0.2, r=0.37);\n  // Right beveled focus rim\n  translate([0.95, 0.4, 0]) rotate([0, -90, 0]) cylinder(h=0.2, r=0.37);\n  // Leather wrapping shaft handle\n  translate([0, -0.6, 0]) cylinder(h=1.4, r=0.09);\n}`;
      case "mug":
        return `// Stark Cybernetic - Ergonomic Titanium Coffee Mug\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\ndifference() {\n  // Outer Cylindrical Wall container\n  color("cyan") cylinder(h=1.8, r=0.75, center=true);\n  // Hollow core chamber cavity\n  translate([0, 0.1, 0]) cylinder(h=1.65, r=0.67, center=true);\n  // Curved finger-hold torus handle\n  translate([-0.95, 0, 0]) rotate([0, 90, 0]) torus(r1=0.42, r2=0.08);\n}`;
      case "glasses":
        return `// Stark Cybernetic - E.D.I.T.H. Tactical Smart Glasses\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\nunion() {\n  // Polarized Left Lens glass\n  translate([-0.65, 0, 0]) cube([0.95, 0.65, 0.05], center=true);\n  // Polarized Right Lens glass\n  translate([0.65, 0, 0]) cube([0.95, 0.65, 0.05], center=true);\n  // Slim titanium nose bridge wire\n  cylinder(h=0.35, r=0.06);\n}`;
      case "ring":
        return `// Stark Cybernetic - Arc Plasma Power Ring\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\nunion() {\n  // Solid gold outer ring finger band\n  torus(r1=0.65, r2=0.08);\n  // Emissive blue focusing core crystal\n  translate([0, 0.65, 0]) sphere(r=0.22);\n}`;
      default:
        return `// Stark Cybernetic - Procedural Composite Assembly\n// Code Compiled by J.A.R.V.I.S. CAD Suite\n\nunion() {\n  cube([1.2, 1.2, 1.2], center=true);\n  sphere(r=0.85);\n}`;
    }
  };

  // 4. Real-time typewriter effect for OpenSCAD console display
  useEffect(() => {
    setTypedScadCode("");
    if (!scadCode) return;
    let idx = 0;
    const interval = setInterval(() => {
      setTypedScadCode(scadCode.slice(0, idx + 4)); // Type 4 chars at a time for optimal rendering pace
      idx += 4;
      if (idx >= scadCode.length) {
        clearInterval(interval);
      }
    }, 15);
    return () => clearInterval(interval);
  }, [scadCode]);

  // 5. Trigger auto-generation on initialQuery update
  useEffect(() => {
    if (initialQuery) {
      setAiPromptInput(initialQuery);
      handleAiGenerationWithQuery(initialQuery);
    }
  }, [initialQuery]);

  // 6. Primary CAD Prompt compiler handler
  const handleAiGeneration = () => {
    handleAiGenerationWithQuery(aiPromptInput);
  };

  const handleAiGenerationWithQuery = (queryText: string) => {
    const query = queryText.trim();
    if (!query) return;
    
    addLog(`AI SYNTHESIZER: Commencing physical lattice projection for [${query}]...`);
    const qLower = query.toLowerCase();

    // Trigger glowing laser scanning line overlay sweep
    setLaserActive(true);
    setTimeout(() => {
      setLaserActive(false);
    }, 2500);

    // Open CAD code console side-drawer tab to witness compiling live!
    setActiveRightTab("compiler");

    let generatedParts: CustomPart[] = [];
    let speakMessage = "";
    let matchType = "custom";

    if (qLower.includes("원자로") || qLower.includes("아크") || qLower.includes("reactor") || qLower.includes("아이언맨")) {
      generatedParts = [
        { id: "ai_1", type: "cylinder", name: "reactor_hull_base", position: [0, -0.6, 0], scale: [2.0, 0.25, 2.0], rotation: [0, 0, 0], color: "#0f172a", wireframe: false, visible: true, metalness: 0.9, roughness: 0.15, opacity: 0.95 },
        { id: "ai_2", type: "torus", name: "electromagnetic_confinement_ring", position: [0, 0, 0], scale: [1.6, 1.6, 1.6], rotation: [90, 0, 0], color: "#22d3ee", wireframe: true, visible: true, metalness: 0.8, roughness: 0.2, opacity: 0.9 },
        { id: "ai_3", type: "cylinder", name: "magnetic_inductor_alpha", position: [-0.9, 0, -0.9], scale: [0.45, 0.8, 0.45], rotation: [0, 45, 0], color: "#fbbf24", wireframe: false, visible: true, metalness: 0.95, roughness: 0.1, opacity: 0.9 },
        { id: "ai_4", type: "cylinder", name: "magnetic_inductor_beta", position: [0.9, 0, 0.9], scale: [0.45, 0.8, 0.45], rotation: [0, 45, 0], color: "#fbbf24", wireframe: false, visible: true, metalness: 0.95, roughness: 0.1, opacity: 0.9 },
        { id: "ai_5", type: "sphere", name: "palladium_core_orb", position: [0, 0.2, 0], scale: [0.75, 0.75, 0.75], rotation: [0, 0, 0], color: "#ffffff", wireframe: false, visible: true, metalness: 0.1, roughness: 0.1, opacity: 1.0 }
      ];
      setFileName("stark_reactor_mark_v.scad");
      matchType = "reactor";
      speakMessage = "주인님, 새로운 4세대 아크 원자로 홀로그램 모델을 컴파일했습니다. 구리 유도 코일 배열과 중앙 팔라듐 셀의 열적 효율이 모두 안정 수치입니다.";
    } 
    else if (qLower.includes("헬멧") || qLower.includes("슈트") || qLower.includes("helmet") || qLower.includes("ironman")) {
      generatedParts = [
        { id: "ai_1", type: "sphere", name: "cranium_dome", position: [0, 0.2, 0], scale: [1.35, 1.5, 1.35], rotation: [0, 0, 0], color: "#ef4444", wireframe: false, visible: true, metalness: 0.9, roughness: 0.2, opacity: 1.0 },
        { id: "ai_2", type: "cube", name: "face_gold_shield", position: [0, 0.1, 0.85], scale: [1.15, 1.3, 0.4], rotation: [10, 0, 0], color: "#fbbf24", wireframe: false, visible: true, metalness: 0.95, roughness: 0.1, opacity: 1.0 },
        { id: "ai_3", type: "cylinder", name: "emissive_hud_left", position: [-0.35, 0.25, 1.1], scale: [0.35, 0.08, 0.12], rotation: [0, -10, -5], color: "#38bdf8", wireframe: false, visible: true, metalness: 0.1, roughness: 0.1, opacity: 1.0 },
        { id: "ai_4", type: "cylinder", name: "emissive_hud_right", position: [0.35, 0.25, 1.1], scale: [0.35, 0.08, 0.12], rotation: [0, 10, 5], color: "#38bdf8", wireframe: false, visible: true, metalness: 0.1, roughness: 0.1, opacity: 1.0 },
        { id: "ai_5", type: "cylinder", name: "jaw_joint_protector", position: [0, -0.8, 0.45], scale: [0.6, 0.6, 0.6], rotation: [15, 0, 0], color: "#ef4444", wireframe: false, visible: true, metalness: 0.85, roughness: 0.3, opacity: 0.95 }
      ];
      setFileName("mark_v_cranium_shield.scad");
      matchType = "helmet";
      speakMessage = "마크 5형 골드-티타늄 골격 헬멧의 안면 쉴드 파트를 컴파일했습니다. 안구 지오메트리 부분에는 에미시브 파란색 HUD 렌즈 센서가 성공적으로 인입되어 있습니다.";
    } 
    else if (qLower.includes("우주선") || qLower.includes("전투기") || qLower.includes("spaceship") || qLower.includes("starship") || qLower.includes("jet")) {
      generatedParts = [
        { id: "ai_1", type: "cylinder", name: "fuselage_body_thruster", position: [0, 0, 0], scale: [0.55, 2.8, 0.55], rotation: [90, 0, 0], color: "#334155", wireframe: false, visible: true, metalness: 0.8, roughness: 0.2, opacity: 0.9 },
        { id: "ai_2", type: "sphere", name: "cockpit_dome_shield", position: [0, 0.15, 0.8], scale: [0.6, 0.5, 0.8], rotation: [0, 0, 0], color: "#38bdf8", wireframe: false, visible: true, metalness: 0.4, roughness: 0.05, opacity: 0.65 },
        { id: "ai_3", type: "cube", name: "left_delta_wing", position: [-1.4, -0.1, -0.4], scale: [1.8, 0.08, 1.1], rotation: [0, 15, 5], color: "#0369a1", wireframe: false, visible: true, metalness: 0.85, roughness: 0.2, opacity: 0.85 },
        { id: "ai_4", type: "cube", name: "right_delta_wing", position: [1.4, -0.1, -0.4], scale: [1.8, 0.08, 1.1], rotation: [0, -15, -5], color: "#0369a1", wireframe: false, visible: true, metalness: 0.85, roughness: 0.2, opacity: 0.85 },
        { id: "ai_5", type: "torus", name: "hyperdrive_magnetic_ring", position: [0, 0, -1.2], scale: [1.1, 1.1, 1.1], rotation: [0, 0, 0], color: "#f43f5e", wireframe: true, visible: true, metalness: 0.9, roughness: 0.1, opacity: 0.9 }
      ];
      setFileName("aerodynamic_starship.scad");
      matchType = "spaceship";
      speakMessage = "알겠습니다 주인님. 즉시 극초음속 우주선 전투기 격자 메쉬를 생성했습니다. 하이퍼드라이브 마그네틱 플럭스 링을 후미에 오버랩 설계했습니다.";
    } 
    else if (qLower.includes("광선검") || qLower.includes("라이트세이버") || qLower.includes("saber") || qLower.includes("lightsaber")) {
      generatedParts = [
        { id: "ai_1", type: "cylinder", name: "emitter_handle_hilt", position: [0, -0.7, 0], scale: [0.18, 1.4, 0.18], rotation: [90, 0, 0], color: "#475569", wireframe: false, visible: true, metalness: 0.9, roughness: 0.2, opacity: 1.0 },
        { id: "ai_2", type: "cylinder", name: "plasma_laser_blade", position: [0, 1.8, 0], scale: [0.12, 3.6, 0.12], rotation: [90, 0, 0], color: "#ef4444", wireframe: false, visible: true, metalness: 0.1, roughness: 0.1, opacity: 0.8 }
      ];
      setFileName("kyber_plasma_saber.scad");
      matchType = "lightsaber";
      speakMessage = "카이버 플라즈마 광선검 설계 도면입니다. 내부 카이버 크리스탈 슬롯 점검 완료, 무한 에너지 자기 차폐 방출 방식을 적용해 안정화시켰습니다.";
    } 
    else if (qLower.includes("묠니르") || qLower.includes("망치") || qLower.includes("토르") || qLower.includes("hammer") || qLower.includes("mjolnir")) {
      generatedParts = [
        { id: "ai_1", type: "cube", name: "mjolnir_main_head", position: [0, 0.4, 0], scale: [1.8, 1.1, 1.1], rotation: [0, 0, 0], color: "#94a3b8", wireframe: false, visible: true, metalness: 0.95, roughness: 0.2, opacity: 1.0 },
        { id: "ai_2", type: "cylinder", name: "head_bevel_left", position: [-0.95, 0.4, 0], scale: [0.75, 0.2, 0.75], rotation: [0, 0, 90], color: "#64748b", wireframe: false, visible: true, metalness: 0.9, roughness: 0.3, opacity: 1.0 },
        { id: "ai_3", type: "cylinder", name: "head_bevel_right", position: [0.95, 0.4, 0], scale: [0.75, 0.2, 0.75], rotation: [0, 0, -90], color: "#64748b", wireframe: false, visible: true, metalness: 0.9, roughness: 0.3, opacity: 1.0 },
        { id: "ai_4", type: "cylinder", name: "shaft_hilt_handle", position: [0, -0.6, 0], scale: [0.18, 1.4, 0.18], rotation: [0, 0, 0], color: "#78350f", wireframe: false, visible: true, metalness: 0.2, roughness: 0.8, opacity: 1.0 },
        { id: "ai_5", type: "torus", name: "leather_strap_wrap", position: [0, -1.2, 0], scale: [0.25, 0.25, 0.2], rotation: [90, 0, 0], color: "#f59e0b", wireframe: false, visible: true, metalness: 0.4, roughness: 0.5, opacity: 1.0 }
      ];
      setFileName("mjolnir_thor_hammer.scad");
      matchType = "hammer";
      speakMessage = "묠니르 망치 지오메트리 조립 완료했습니다. 브러쉬드 아스 가디언 스틸 재질 함유량을 95% 이상으로 높이고 하단 가죽 스트랩 걸이를 설계해 완성했습니다.";
    } 
    else if (qLower.includes("컵") || qLower.includes("머그") || qLower.includes("머그컵") || qLower.includes("커피") || qLower.includes("mug") || qLower.includes("cup") || qLower.includes("coffee")) {
      generatedParts = [
        { id: "ai_1", type: "cylinder", name: "ceramic_mug_wall", position: [0, 0, 0], scale: [1.3, 1.8, 1.3], rotation: [0, 0, 0], color: "#06b6d4", wireframe: false, visible: true, metalness: 0.4, roughness: 0.1, opacity: 0.8 },
        { id: "ai_2", type: "cylinder", name: "inner_liquid_chamber", position: [0, 0.1, 0], scale: [1.15, 1.65, 1.15], rotation: [0, 0, 0], color: "#1e1b4b", wireframe: false, visible: true, metalness: 0.1, roughness: 0.2, opacity: 0.9 },
        { id: "ai_3", type: "torus", name: "ergonomic_handle", position: [-0.95, 0, 0], scale: [0.8, 0.8, 0.6], rotation: [0, 90, 0], color: "#06b6d4", wireframe: false, visible: true, metalness: 0.4, roughness: 0.1, opacity: 0.8 }
      ];
      setFileName("ergonomic_coffee_mug.scad");
      matchType = "mug";
      speakMessage = "주인님을 위해 인체공학적 티타늄 코팅 커피 머그컵 설계 시나리오를 구성했습니다. 마그네틱 고정형 손잡이와 고밀도 세라믹 챔버 파트를 장착했습니다.";
    } 
    else if (qLower.includes("안경") || qLower.includes("토니안경") || qLower.includes("이디스") || qLower.includes("glasses") || qLower.includes("edith")) {
      generatedParts = [
        { id: "ai_1", type: "cube", name: "polarized_lens_left", position: [-0.65, 0, 0], scale: [0.95, 0.65, 0.05], rotation: [0, 0, 0], color: "#38bdf8", wireframe: false, visible: true, metalness: 0.1, roughness: 0.05, opacity: 0.5 },
        { id: "ai_2", type: "cube", name: "polarized_lens_right", position: [0.65, 0, 0], scale: [0.95, 0.65, 0.05], rotation: [0, 0, 0], color: "#38bdf8", wireframe: false, visible: true, metalness: 0.1, roughness: 0.05, opacity: 0.5 },
        { id: "ai_3", type: "cylinder", name: "titanium_bridge", position: [0, 0.15, 0], scale: [0.12, 0.35, 0.12], rotation: [0, 0, 90], color: "#94a3b8", wireframe: false, visible: true, metalness: 0.95, roughness: 0.15, opacity: 1.0 },
        { id: "ai_4", type: "cube", name: "temple_arm_left", position: [-1.15, 0, -0.65], scale: [0.05, 0.05, 1.3], rotation: [0, 0, 0], color: "#64748b", wireframe: false, visible: true, metalness: 0.9, roughness: 0.2, opacity: 1.0 },
        { id: "ai_5", type: "cube", name: "temple_arm_right", position: [1.15, 0, -0.65], scale: [0.05, 0.05, 1.3], rotation: [0, 0, 0], color: "#64748b", wireframe: false, visible: true, metalness: 0.9, roughness: 0.2, opacity: 1.0 }
      ];
      setFileName("edith_tactical_glasses.scad");
      matchType = "glasses";
      speakMessage = "이디스 스마트 선글라스 레이아웃을 컴파일했습니다. 가벼운 티타늄 프레임에 스마트 다기능 AR HUD 편광 렌즈 한 쌍을 매칭했습니다.";
    } 
    else if (qLower.includes("반지") || qLower.includes("링") || qLower.includes("ring")) {
      generatedParts = [
        { id: "ai_1", type: "torus", name: "outer_ring_band", position: [0, 0, 0], scale: [1.2, 1.2, 1.4], rotation: [90, 0, 0], color: "#fbbf24", wireframe: false, visible: true, metalness: 0.95, roughness: 0.1, opacity: 1.0 },
        { id: "ai_2", type: "cylinder", name: "core_flux_insulator", position: [0, 0, 0], scale: [0.85, 0.6, 0.85], rotation: [0, 0, 0], color: "#1e293b", wireframe: false, visible: true, metalness: 0.5, roughness: 0.5, opacity: 0.9 },
        { id: "ai_3", type: "sphere", name: "emissive_power_crystal", position: [0, 0.65, 0], scale: [0.45, 0.45, 0.45], rotation: [0, 0, 0], color: "#22d3ee", wireframe: false, visible: true, metalness: 0.2, roughness: 0.1, opacity: 1.0 }
      ];
      setFileName("plasma_arc_power_ring.scad");
      matchType = "ring";
      speakMessage = "자기유도 나노 파워 링 3D 모델 설계가 완료되었습니다. 가동 시 전자기 플럭스 결합 강도를 최대로 높일 수 있는 카이버 결정 중심 코어를 생성했습니다.";
    } 
    else {
      // Default procedurally spaced layout
      generatedParts = [
        { id: "ai_1", type: "cube", name: "core_block", position: [0, 0, 0], scale: [1.2, 1.2, 1.2], rotation: [0, 45, 0], color: modelColor, wireframe: false, visible: true, metalness: 0.8, roughness: 0.2, opacity: 0.8 },
        { id: "ai_2", type: "sphere", name: "sensor_dome", position: [0, 0.9, 0], scale: [0.8, 0.8, 0.8], rotation: [0, 0, 0], color: "#10b981", wireframe: true, visible: true, metalness: 0.1, roughness: 0.1, opacity: 0.9 },
        { id: "ai_3", type: "torus", name: "planetary_orbit_ring", position: [0, 0, 0], scale: [1.8, 1.8, 1.8], rotation: [75, 15, 0], color: "#38bdf8", wireframe: true, visible: true, metalness: 0.9, roughness: 0.2, opacity: 0.9 }
      ];
      setFileName(`ai_${qLower.replace(/\s+/g, "_")}.scad`);
      matchType = "custom";
      speakMessage = `요청하신 [${query}]에 맞는 3D 와이어프레임 기하 합성 결과물을 구성했습니다. 세부 파라미터는 properties 탭을 통해 직접 보정하실 수 있습니다.`;
    }

    setCustomParts(generatedParts);
    setSelectedPartId(generatedParts[generatedParts.length - 1].id);
    setActivePreset("custom"); // force render custom parts list
    
    // Set OpenSCAD Code for compiling typewriter effect
    const code = getScadCodeForModel(matchType);
    setScadCode(code);

    addLog(`AI SYNTHESIZER: Compiled assembly with ${generatedParts.length} nodes successfully.`);
    setAiPromptInput("");
    
    speak(speakMessage);

    if (onAskJarvis) {
      onAskJarvis(`AI가 [${query}] 가상 입체 3D 홀로그램 모델 조립 완료했습니다.`);
    }
  };

  // Export action
  const handleExportModel = (format: "obj" | "scad") => {
    addLog(`EXPORT CORE: Compiling scene mesh buffer to *.${format} stream...`);
    const activeNodes = activePreset === "custom" ? customParts : [{ type: "preset", name: activePreset }];
    
    const payload = {
      compiler: "Stark CAD Compiler v4.2",
      timestamp: new Date().toISOString(),
      preset: activePreset,
      wireframe: wireframeMode,
      tint: modelColor,
      meshes: activeNodes
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement("a");
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", `${fileName.split(".")[0]}_export.${format}`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    addLog(`EXPORT SUCCESS: Downloaded ${fileName.split(".")[0]}_export.${format} cleanly.`);
  };

  // Timeline / Animation frame incrementer
  useEffect(() => {
    if (!isPlayingAnimation) return;
    const interval = setInterval(() => {
      setCurrentFrame(prev => {
        if (prev >= 120) return 0;
        return prev + 1;
      });
    }, 45); // Frame duration approx ~22fps
    return () => clearInterval(interval);
  }, [isPlayingAnimation]);

  // 2D Canvas CAD Blueprint Renderer Hook Setup
  useEffect(() => {
    if (!mountRef.current) return;

    // Get current container width and calculate height
    const width = mountRef.current.clientWidth || 600;
    const height = 480;

    // Dynamically create a high-performance 2D Canvas element
    const canvas = document.createElement("canvas");
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    canvas.style.display = "block";
    canvas.style.background = "#020617";
    canvas.style.cursor = "grab";

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(canvas);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const center_x = width / 2;
    const center_y = height / 2;

    // Track active projected parts for raycasting click logic
    interface VisiblePartProj {
      id: string;
      name: string;
      cx: number;
      cy: number;
    }
    let visiblePartsData: VisiblePartProj[] = [];

    // Part definitions for built-in preset models
    const getPartsForPreset = () => {
      if (activePreset === "custom") {
        return customParts;
      }
      
      const parts: Array<{
        id: string;
        type: "cube" | "sphere" | "cylinder" | "torus";
        name: string;
        position: [number, number, number];
        scale: [number, number, number];
        rotation: [number, number, number];
        color: string;
        wireframe: boolean;
        visible: boolean;
        opacity: number;
      }> = [];

      if (activePreset === "reactor") {
        parts.push({
          id: "preset_outer_torus",
          type: "torus",
          name: "Outer Ring Shield",
          position: [0, 0, 0],
          scale: [1.6, 1.6, 1.6],
          rotation: [90, 0, 0],
          color: modelColor,
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_inner_torus",
          type: "torus",
          name: "Inner Magnetic Core",
          position: [0, 0, 0],
          scale: [1.0, 1.0, 1.0],
          rotation: [90, 0, 0],
          color: modelColor,
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_center_orb",
          type: "sphere",
          name: "Palladium Plasmoid Core",
          position: [0, 0, 0],
          scale: [0.45, 0.45, 0.45],
          rotation: [0, 0, 0],
          color: "#ffffff",
          wireframe: false,
          visible: true,
          opacity: 1.0
        });
        const coilsCount = 10;
        for (let i = 0; i < coilsCount; i++) {
          const angle = (i / coilsCount) * Math.PI * 2;
          const radius = 1.3 + (explodeRatio * 0.8);
          parts.push({
            id: `preset_coil_${i}`,
            type: "cube",
            name: `Inductor Coil #${i+1}`,
            position: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
            scale: [0.15, 0.4, 0.35],
            rotation: [0, -angle * 180 / Math.PI, 0],
            color: "#38bdf8",
            wireframe: true,
            visible: true,
            opacity: 0.8
          });
        }
      } else if (activePreset === "spaceship") {
        parts.push({
          id: "preset_space_fuselage",
          type: "cylinder",
          name: "Titanium Fuselage Hull",
          position: [0, 0, 0],
          scale: [0.45, 3.0, 0.45],
          rotation: [90, 0, 0],
          color: modelColor,
          wireframe: false,
          visible: true,
          opacity: 0.85
        });
        parts.push({
          id: "preset_space_nose",
          type: "sphere",
          name: "Hypersonic Nosecone",
          position: [0, 0, 1.5 + (explodeRatio * 0.5)],
          scale: [0.45, 0.9, 0.45],
          rotation: [0, 0, 0],
          color: "#38bdf8",
          wireframe: false,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_space_wing_l",
          type: "cube",
          name: "Hyper-Wing (Port)",
          position: [-1.1 - (explodeRatio * 1.0), -0.1, -0.4],
          scale: [1.6, 0.08, 0.95],
          rotation: [0, 22.5, 0],
          color: modelColor,
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_space_wing_r",
          type: "cube",
          name: "Hyper-Wing (Starboard)",
          position: [1.1 + (explodeRatio * 1.0), -0.1, -0.4],
          scale: [1.6, 0.08, 0.95],
          rotation: [0, -22.5, 0],
          color: modelColor,
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_space_fin",
          type: "cube",
          name: "Vertical Yaw Stabilizer",
          position: [0, 0.65 + (explodeRatio * 0.6), -1.1],
          scale: [0.06, 0.85, 0.65],
          rotation: [0, 0, 0],
          color: modelColor,
          wireframe: false,
          visible: true,
          opacity: 0.8
        });
      } else if (activePreset === "helmet") {
        parts.push({
          id: "preset_helmet_skull",
          type: "sphere",
          name: "Mark III Cranium Dome",
          position: [0, 0, 0],
          scale: [1.33, 1.61, 1.47],
          rotation: [0, 0, 0],
          color: modelColor,
          wireframe: false,
          visible: true,
          opacity: 0.85
        });
        parts.push({
          id: "preset_helmet_eye_l",
          type: "cube",
          name: "Optic HUD Matrix (Left)",
          position: [-0.35, 0.25, 1.1 + (explodeRatio * 0.5)],
          scale: [0.48, 0.08, 0.15],
          rotation: [0, -11.25, -10],
          color: "#ffffff",
          wireframe: false,
          visible: true,
          opacity: 1.0
        });
        parts.push({
          id: "preset_helmet_eye_r",
          type: "cube",
          name: "Optic HUD Matrix (Right)",
          position: [0.35, 0.25, 1.1 + (explodeRatio * 0.5)],
          scale: [0.48, 0.08, 0.15],
          rotation: [0, 11.25, 10],
          color: "#ffffff",
          wireframe: false,
          visible: true,
          opacity: 1.0
        });
        parts.push({
          id: "preset_helmet_jaw",
          type: "cylinder",
          name: "Kinematic Jaw Protector",
          position: [0, -1.0 - (explodeRatio * 0.8), 0.45],
          scale: [0.68, 0.75, 0.48],
          rotation: [30, 0, 0],
          color: "#38bdf8",
          wireframe: false,
          visible: true,
          opacity: 0.85
        });
      } else if (activePreset === "drone") {
        parts.push({
          id: "preset_drone_hub",
          type: "cylinder",
          name: "Avionics Core Hub",
          position: [0, 0, 0],
          scale: [0.65, 0.35, 0.65],
          rotation: [0, 0, 0],
          color: modelColor,
          wireframe: false,
          visible: true,
          opacity: 0.9
        });
        const armLength = 1.4 + (explodeRatio * 0.7);
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
          parts.push({
            id: `preset_drone_arm_${i}`,
            type: "cylinder",
            name: `Rotor Arm #${i+1}`,
            position: [Math.cos(angle) * (armLength / 2), 0, Math.sin(angle) * (armLength / 2)],
            scale: [0.06, armLength, 0.06],
            rotation: [90, angle * 180 / Math.PI, 0],
            color: modelColor,
            wireframe: true,
            visible: true,
            opacity: 0.8
          });
          parts.push({
            id: `preset_drone_motor_${i}`,
            type: "cylinder",
            name: `Brushless Motor #${i+1}`,
            position: [Math.cos(angle) * armLength, 0.15, Math.sin(angle) * armLength],
            scale: [0.18, 0.35, 0.18],
            rotation: [0, 0, 0],
            color: "#38bdf8",
            wireframe: false,
            visible: true,
            opacity: 0.9
          });
          parts.push({
            id: `preset_drone_blade_${i}`,
            type: "cube",
            name: `Carbon Blade #${i+1}`,
            position: [Math.cos(angle) * armLength, 0.35, Math.sin(angle) * armLength],
            scale: [0.85, 0.02, 0.06],
            rotation: [0, angle * 180 / Math.PI, 0],
            color: "#ffffff",
            wireframe: false,
            visible: true,
            opacity: 1.0
          });
        }
      } else if (activePreset === "satellite") {
        parts.push({
          id: "preset_sat_core",
          type: "cube",
          name: "Payload Chassis",
          position: [0, 0, 0],
          scale: [0.95, 1.35, 0.95],
          rotation: [0, 0, 0],
          color: modelColor,
          wireframe: false,
          visible: true,
          opacity: 0.85
        });
        const arrayDist = 1.5 + (explodeRatio * 0.95);
        parts.push({
          id: "preset_sat_wing_l",
          type: "cube",
          name: "Photovoltaic Panel (A)",
          position: [-arrayDist, 0, 0],
          scale: [1.6, 0.65, 0.04],
          rotation: [30, 0, 0],
          color: "#0284c7",
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_sat_wing_r",
          type: "cube",
          name: "Photovoltaic Panel (B)",
          position: [arrayDist, 0, 0],
          scale: [1.6, 0.65, 0.04],
          rotation: [-30, 0, 0],
          color: "#0284c7",
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_sat_stalk",
          type: "cylinder",
          name: "Antenna Feeder Horn",
          position: [0, 0.95 + (explodeRatio * 0.4), 0],
          scale: [0.04, 0.65, 0.04],
          rotation: [0, 0, 0],
          color: modelColor,
          wireframe: true,
          visible: true,
          opacity: 0.85
        });
        parts.push({
          id: "preset_sat_dish",
          type: "cylinder",
          name: "Parabolic Reflector Dish",
          position: [0, 1.35 + (explodeRatio * 0.6), 0.1],
          scale: [0.65, 0.25, 0.65],
          rotation: [-45, 0, 0],
          color: "#ffffff",
          wireframe: false,
          visible: true,
          opacity: 0.9
        });
      } else if (activePreset === "lightsaber") {
        parts.push({
          id: "preset_saber_hilt",
          type: "cylinder",
          name: "Kyber Emitter Handle",
          position: [0, 0, -0.7 - (explodeRatio * 0.4)],
          scale: [0.18, 1.4, 0.18],
          rotation: [90, 0, 0],
          color: "#475569",
          wireframe: false,
          visible: true,
          opacity: 0.95
        });
        parts.push({
          id: "preset_saber_beam",
          type: "cylinder",
          name: "Plasma Containment Beam",
          position: [0, 0, 1.8 + (explodeRatio * 0.2)],
          scale: [0.12, 3.6, 0.12],
          rotation: [90, 0, 0],
          color: "#f43f5e",
          wireframe: false,
          visible: true,
          opacity: 0.8
        });
      } else if (activePreset === "hammer") {
        parts.push({
          id: "preset_hammer_head",
          type: "cube",
          name: "Uru Steel Head",
          position: [0, 0.4, 0],
          scale: [1.8, 1.1, 1.1],
          rotation: [0, 0, 0],
          color: "#94a3b8",
          wireframe: false,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_hammer_handle",
          type: "cylinder",
          name: "Vibranium Handle",
          position: [0, -0.6 - (explodeRatio * 0.4), 0],
          scale: [0.09, 1.4, 0.09],
          rotation: [0, 0, 0],
          color: "#475569",
          wireframe: true,
          visible: true,
          opacity: 0.95
        });
      } else if (activePreset === "mug") {
        parts.push({
          id: "preset_mug_body",
          type: "cylinder",
          name: "Titanium Double Wall",
          position: [0, 0, 0],
          scale: [0.75, 1.8, 0.75],
          rotation: [0, 0, 0],
          color: modelColor,
          wireframe: false,
          visible: true,
          opacity: 0.85
        });
        parts.push({
          id: "preset_mug_handle",
          type: "torus",
          name: "Thermal Grip Handle",
          position: [-0.75 - (explodeRatio * 0.4), 0, 0],
          scale: [0.42, 0.42, 0.42],
          rotation: [0, 0, 90],
          color: "#0284c7",
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
      } else if (activePreset === "glasses") {
        parts.push({
          id: "preset_glasses_lens_l",
          type: "cube",
          name: "Tactical HUD Lens (L)",
          position: [-0.65 - (explodeRatio * 0.5), 0, 0],
          scale: [0.95, 0.65, 0.05],
          rotation: [0, 5, 0],
          color: "#0ea5e9",
          wireframe: false,
          visible: true,
          opacity: 0.6
        });
        parts.push({
          id: "preset_glasses_lens_r",
          type: "cube",
          name: "Tactical HUD Lens (R)",
          position: [0.65 + (explodeRatio * 0.5), 0, 0],
          scale: [0.95, 0.65, 0.05],
          rotation: [0, -5, 0],
          color: "#0ea5e9",
          wireframe: false,
          visible: true,
          opacity: 0.6
        });
        parts.push({
          id: "preset_glasses_bridge",
          type: "cylinder",
          name: "Titanium Bridge",
          position: [0, 0.1, 0],
          scale: [0.06, 0.35, 0.06],
          rotation: [0, 0, 90],
          color: "#475569",
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
      } else if (activePreset === "ring") {
        parts.push({
          id: "preset_ring_band",
          type: "torus",
          name: "Inductor Ring Band",
          position: [0, 0, 0],
          scale: [1.2, 1.2, 1.2],
          rotation: [90, 0, 0],
          color: "#38bdf8",
          wireframe: true,
          visible: true,
          opacity: 0.9
        });
        parts.push({
          id: "preset_ring_crystal",
          type: "sphere",
          name: "Micro-Kyber Core",
          position: [0, 0.6 + (explodeRatio * 0.3), 0],
          scale: [0.22, 0.22, 0.22],
          rotation: [0, 0, 0],
          color: "#f43f5e",
          wireframe: false,
          visible: true,
          opacity: 1.0
        });
      }

      return parts;
    };

    const getPrimitiveMesh = (type: string) => {
      if (type === "cube") {
        const h = 0.5;
        const vertices: [number, number, number][] = [
          [-h, -h, -h], [h, -h, -h], [h, h, -h], [-h, h, -h],
          [-h, -h, h], [h, -h, h], [h, h, h], [-h, h, h]
        ];
        const edges: [number, number][] = [
          [0, 1], [1, 2], [2, 3], [3, 0],
          [4, 5], [5, 6], [6, 7], [7, 4],
          [0, 4], [1, 5], [2, 6], [3, 7]
        ];
        return { vertices, edges };
      } else if (type === "sphere") {
        const vertices: [number, number, number][] = [];
        const edges: [number, number][] = [];
        const r = 0.55;
        const latBands = 5;
        const lonBands = 10;
        for (let lat = 0; lat <= latBands; lat++) {
          const theta = (lat * Math.PI) / latBands;
          const sinTheta = Math.sin(theta);
          const cosTheta = Math.cos(theta);
          for (let lon = 0; lon < lonBands; lon++) {
            const phi = (lon * Math.PI * 2) / lonBands;
            const x = r * sinTheta * Math.cos(phi);
            const y = r * cosTheta;
            const z = r * sinTheta * Math.sin(phi);
            vertices.push([x, y, z]);
          }
        }
        for (let lat = 0; lat <= latBands; lat++) {
          for (let lon = 0; lon < lonBands; lon++) {
            const curr = lat * lonBands + lon;
            const nextLon = lat * lonBands + ((lon + 1) % lonBands);
            edges.push([curr, nextLon]);
            if (lat < latBands) {
              const nextLat = (lat + 1) * lonBands + lon;
              edges.push([curr, nextLat]);
            }
          }
        }
        return { vertices, edges };
      } else if (type === "cylinder") {
        const vertices: [number, number, number][] = [];
        const edges: [number, number][] = [];
        const segments = 12;
        const r = 0.5;
        const h = 0.5;
        for (let i = 0; i < segments; i++) {
          const angle = (i * Math.PI * 2) / segments;
          vertices.push([Math.cos(angle) * r, h, Math.sin(angle) * r]);
        }
        for (let i = 0; i < segments; i++) {
          const angle = (i * Math.PI * 2) / segments;
          vertices.push([Math.cos(angle) * r, -h, Math.sin(angle) * r]);
        }
        vertices.push([0, h, 0]);
        vertices.push([0, -h, 0]);
        const centerTopIdx = segments * 2;
        const centerBotIdx = segments * 2 + 1;

        for (let i = 0; i < segments; i++) {
          const next = (i + 1) % segments;
          edges.push([i, next]);
          edges.push([segments + i, segments + next]);
          edges.push([i, segments + i]);
          if (i % 3 === 0) {
            edges.push([i, centerTopIdx]);
            edges.push([segments + i, centerBotIdx]);
          }
        }
        return { vertices, edges };
      } else {
        const vertices: [number, number, number][] = [];
        const edges: [number, number][] = [];
        const radialSegments = 6;
        const tubularSegments = 12;
        const R_torus = 0.55;
        const r_torus = 0.14;
        for (let i = 0; i < radialSegments; i++) {
          const u = (i * Math.PI * 2) / radialSegments;
          const cosU = Math.cos(u);
          const sinU = Math.sin(u);
          for (let j = 0; j < tubularSegments; j++) {
            const v = (j * Math.PI * 2) / tubularSegments;
            const x = (R_torus + r_torus * Math.cos(v)) * cosU;
            const y = (R_torus + r_torus * Math.cos(v)) * sinU;
            const z = r_torus * Math.sin(v);
            vertices.push([x, y, z]);
          }
        }
        for (let i = 0; i < radialSegments; i++) {
          for (let j = 0; j < tubularSegments; j++) {
            const curr = i * tubularSegments + j;
            const nextTub = i * tubularSegments + ((j + 1) % tubularSegments);
            const nextRad = ((i + 1) % radialSegments) * tubularSegments + j;
            edges.push([curr, nextTub]);
            edges.push([curr, nextRad]);
          }
        }
        return { vertices, edges };
      }
    };

    // Pointer variables
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let previousMousePosition = { x: 0, y: 0 };

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y,
      };

      rotYRef.current += deltaMove.x * 0.01;
      rotXRef.current += deltaMove.y * 0.007;

      // Restrict polar vertical flip
      rotXRef.current = Math.max(-Math.PI / 2.3, Math.min(Math.PI / 2.3, rotXRef.current));
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const handlePointerUp = (e: PointerEvent) => {
      isDragging = false;
      const dx = Math.abs(e.clientX - dragStartX);
      const dy = Math.abs(e.clientY - dragStartY);

      if (dx < 5 && dy < 5) {
        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        let closestPart: any = null;
        let bestDist = 28;

        visiblePartsData.forEach(p => {
          const dist = Math.sqrt((clickX - p.cx) ** 2 + (clickY - p.cy) ** 2);
          if (dist < bestDist) {
            bestDist = dist;
            closestPart = p;
          }
        });

        if (closestPart) {
          setSelectedPartId(closestPart.id);
          addLog(`SELECTED CORE NODE: ${closestPart.name.toUpperCase()}`);
        } else {
          setSelectedPartId(null);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomLevelRef.current -= e.deltaY * 0.08;
      zoomLevelRef.current = Math.max(45, Math.min(250, zoomLevelRef.current));
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    // Animation Render Loop
    let animationId: number;
    
    const render2D = () => {
      animationId = requestAnimationFrame(render2D);

      // Auto-rotation
      if (isRotating) {
        rotYRef.current += rotationSpeed * 0.01;
      }

      // Clear Screen
      ctx.fillStyle = "#020617";
      ctx.fillRect(0, 0, width, height);

      // Draw Grid alignment layers
      if (gridVisible) {
        ctx.strokeStyle = "rgba(6, 182, 212, 0.07)";
        ctx.lineWidth = 1;

        // Polar Blueprint Radar Rings
        const rings = [45, 90, 135, 180];
        rings.forEach(r => {
          ctx.beginPath();
          ctx.arc(center_x, center_y, r, 0, Math.PI * 2);
          ctx.stroke();
        });

        // Compass crosshairs
        ctx.beginPath();
        ctx.moveTo(center_x - 200, center_y);
        ctx.lineTo(center_x + 200, center_y);
        ctx.moveTo(center_x, center_y - 200);
        ctx.lineTo(center_x, center_y + 200);
        ctx.stroke();

        // Subtly draw isometric flooring lines
        ctx.strokeStyle = "rgba(6, 182, 212, 0.03)";
        for (let i = -6; i <= 6; i++) {
          ctx.beginPath();
          ctx.moveTo(center_x - 220, center_y + i * 20 + 30);
          ctx.lineTo(center_x + 220, center_y + i * 20 - 30);
          ctx.stroke();
        }
      }

      // Procedural scanner sweep line overlay
      const scanY = center_y + Math.sin(Date.now() * 0.001 * scanSpeed) * (height / 2);
      ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, scanY);
      ctx.lineTo(width, scanY);
      ctx.stroke();

      // Retrieve shapes based on preset / custom state
      const parts = getPartsForPreset();
      const nextVisibleParts: VisiblePartProj[] = [];

      parts.forEach(part => {
        if ("visible" in part && !part.visible) return;

        const { vertices, edges } = getPrimitiveMesh(part.type);
        const projected: [number, number][] = [];

        // Precompute local rotation radians
        const ax = (part.rotation[0] || 0) * Math.PI / 180;
        const ay = (part.rotation[1] || 0) * Math.PI / 180;
        const az = (part.rotation[2] || 0) * Math.PI / 180;

        // 3D-to-2D Coordinate pipeline
        vertices.forEach(vert => {
          // 1. Local Scaling
          let x = vert[0] * part.scale[0];
          let y = vert[1] * part.scale[1];
          let z = vert[2] * part.scale[2];

          // 2. Local Rotation (SRT structure)
          // Rotate X
          let y1 = y * Math.cos(ax) - z * Math.sin(ax);
          let z1 = y * Math.sin(ax) + z * Math.cos(ax);
          let x1 = x;
          // Rotate Y
          let x2 = x1 * Math.cos(ay) + z1 * Math.sin(ay);
          let z2 = -x1 * Math.sin(ay) + z1 * Math.cos(ay);
          let y2 = y1;
          // Rotate Z
          let x3 = x2 * Math.cos(az) - y2 * Math.sin(az);
          let y3 = x2 * Math.sin(az) + y2 * Math.cos(az);
          let z3 = z2;

          // 3. Local Translation
          x3 += part.position[0];
          y3 += part.position[1];
          z3 += part.position[2];

          // 4. Global Viewport Rotation
          const gY = rotYRef.current;
          const gX = rotXRef.current;
          // Rotate around global Y
          let gx = x3 * Math.cos(gY) + z3 * Math.sin(gY);
          let gz = -x3 * Math.sin(gY) + z3 * Math.cos(gY);
          let gy = y3;
          // Rotate around global X
          let cam_y = gy * Math.cos(gX) - gz * Math.sin(gX);
          let cam_z = gy * Math.sin(gX) + gz * Math.cos(gX);
          let cam_x = gx;

          // 5. Light Perspective projection mapping
          const d = 8;
          const sf = d / (d + cam_z);
          const px = center_x + cam_x * zoomLevelRef.current * sf;
          const py = center_y - cam_y * zoomLevelRef.current * sf;

          projected.push([px, py]);
        });

        // Project the absolute center of this node for click targets
        const cx3 = part.position[0];
        const cy3 = part.position[1];
        const cz3 = part.position[2];
        const gY = rotYRef.current;
        const gX = rotXRef.current;
        let cgx = cx3 * Math.cos(gY) + cz3 * Math.sin(gY);
        let cgz = -cx3 * Math.sin(gY) + cz3 * Math.cos(gY);
        let cgy = cy3;
        let c_y = cgy * Math.cos(gX) - cgz * Math.sin(gX);
        let c_z = cgy * Math.sin(gX) + cgz * Math.cos(gX);
        let c_x = cgx;
        const d_c = 8;
        const sf_c = d_c / (d_c + c_z);
        const pcx = center_x + c_x * zoomLevelRef.current * sf_c;
        const pcy = center_y - c_y * zoomLevelRef.current * sf_c;

        nextVisibleParts.push({
          id: part.id,
          name: part.name,
          cx: pcx,
          cy: pcy
        });

        // Determine shading colors
        let strokeColor = part.color;
        if (wireframeMode === "thermal") {
          // Temperature gradient based on coordinate Y level
          const normHeight = Math.max(0, Math.min(1, (part.position[1] + 1.8) / 3.6));
          strokeColor = normHeight > 0.65 ? "#ef4444" : normHeight > 0.35 ? "#f59e0b" : "#10b981";
        }

        const isSelected = selectedPartId === part.id;
        ctx.strokeStyle = strokeColor;
        
        let opacityVal = "opacity" in part ? part.opacity : 0.85;
        if (wireframeMode === "transparent") opacityVal = 0.2;
        ctx.globalAlpha = opacityVal;

        // Apply neon scan glows to selected mesh node
        if (isSelected) {
          ctx.lineWidth = 1.8;
          ctx.shadowBlur = 8;
          ctx.shadowColor = strokeColor;
        } else {
          ctx.lineWidth = 0.75;
          ctx.shadowBlur = 0;
        }

        // Render wireframe mesh paths
        edges.forEach(edge => {
          const p1 = projected[edge[0]];
          const p2 = projected[edge[1]];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1[0], p1[1]);
            ctx.lineTo(p2[0], p2[1]);
            ctx.stroke();
          }
        });

        ctx.shadowBlur = 0;

        // Render holographic joints/vertices
        ctx.fillStyle = strokeColor;
        ctx.globalAlpha = isSelected ? 0.9 : 0.6;
        projected.forEach(p => {
          ctx.beginPath();
          ctx.arc(p[0], p[1], isSelected ? 2.0 : 1.2, 0, Math.PI * 2);
          ctx.fill();
        });

        // Selected HUD overlay text labels in workspace - REMOVED per user request to remove text appearing in CAD
        if (isSelected) {
          // No text or labels are drawn inside the canvas to keep it perfectly clean
        }
      });

      visiblePartsData = nextVisibleParts;
    };

    render2D();

    const handleResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      canvas.width = w * window.devicePixelRatio;
      canvas.style.width = `${w}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(mountRef.current);

    return () => {
      cancelAnimationFrame(animationId);
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", handlePointerUp);
      canvas.removeEventListener("wheel", handleWheel);
      resizeObserver.disconnect();
    };
  }, [activePreset, wireframeMode, rotationSpeed, isRotating, explodeRatio, scanSpeed, laserScanColor, modelColor, gridVisible, customParts, selectedPartId]);

  // Compute specs on the fly
  const specs = (() => {
    switch (activePreset) {
      case "reactor":
        return { alloy: "Palladium-Titanium Mesh", power: "3.5 GJ/sec", mass: "1.45 kg", heat: "1850°C Max", integrity: "99.8%", status: "OPTIMIZED" };
      case "spaceship":
        return { alloy: "Starship Vibranium Shell", power: "450 MW Thrust", mass: "12.4 Tons", heat: "3400°C Max", integrity: "95.2%", status: "CRUISE SECURE" };
      case "helmet":
        return { alloy: "Gold-Titanium Plate (MK V)", power: "120 kW Draw", mass: "3.82 kg", heat: "840°C Peak", integrity: "100.0%", status: "HUD SYNC'D" };
      case "drone":
        return { alloy: "Carbon Fiber Epoxy Composite", power: "4.8 kW Lift", mass: "12.2 kg", heat: "95°C Stable", integrity: "99.4%", status: "GPS STABLE" };
      case "satellite":
        return { alloy: "Kevlar-Aluminium honeycomb", power: "220 W Solar Array", mass: "1.24 Tons", heat: "120°C Shadow", integrity: "97.1%", status: "ALIGN LOCKED" };
      default:
        return { 
          alloy: "Composite Procedural Grid", 
          power: "12.5 kW Node Flux", 
          mass: `${(customParts.length * 0.45 + 1.2).toFixed(2)} kg`, 
          heat: "410°C Nominal", 
          integrity: "98.9%", 
          status: "MANUAL ASSEMBLED" 
        };
    }
  })();

  return (
    <div className="w-full bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 md:p-6 shadow-[0_0_50px_rgba(6,182,212,0.12)] font-sans relative flex flex-col min-h-[700px] text-slate-300">
      
      {/* 1. PROFESSIONAL CAD HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-cyan-500/20 pb-4 mb-4 gap-4">
        
        {/* Left branding & file name */}
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center bg-cyan-950/60 border border-cyan-400 rounded-xl shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            <Compass className="w-5 h-5 text-cyan-300 animate-[spin_10s_linear_infinite]" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse border border-slate-950" />
          </div>
          <div className="text-left font-mono">
            <h1 className="text-sm font-black text-cyan-100 tracking-widest uppercase flex items-center gap-1.5 leading-none">
              STARK CAD STUDIO <span className="text-[9px] bg-cyan-500/15 border border-cyan-500/30 px-1.5 py-0.5 rounded text-cyan-400">PRO v4.2</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-cyan-300 font-bold bg-cyan-950/40 border border-cyan-500/10 px-2 py-0.5 rounded flex items-center gap-1">
                <FileText className="w-3 h-3 text-cyan-400" />
                {fileName}
              </span>
              <span className="text-[9px] text-slate-500">SAVED LOCAL DISK</span>
            </div>
          </div>
        </div>

        {/* Center: Interactive AI command generator in CAD top bar */}
        <div className="flex-1 max-w-lg mx-2 flex items-center gap-1.5 bg-slate-900/60 border border-cyan-500/15 p-1 rounded-xl">
          <Sparkle className="w-4 h-4 text-cyan-400 ml-2 shrink-0 animate-pulse" />
          <input
            type="text"
            placeholder="J.A.R.V.I.S.에게 명령: '아이언맨 우주선', '아크 원자로' 등을 생성해줘..."
            value={aiPromptInput}
            onChange={(e) => setAiPromptInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAiGeneration()}
            className="w-full bg-transparent outline-none border-none text-xs text-cyan-100 placeholder-cyan-500/40 font-mono px-1.5 py-1"
          />
          
          {/* Continuous Speech Mic Button */}
          <button
            onClick={startListening}
            className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer flex items-center justify-center ${
              isListening
                ? "bg-rose-500/20 border-rose-400 text-rose-300 animate-pulse"
                : "bg-slate-950 border-cyan-500/25 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10"
            }`}
            title="Speech Dictation Link to J.A.R.V.I.S."
          >
            <Mic className={`w-3.5 h-3.5 ${isListening ? "scale-110" : ""}`} />
          </button>

          {/* JARVIS Speech Mute Toggle Button */}
          <button
            onClick={() => {
              setIsVoiceMuted(!isVoiceMuted);
              addLog(`JARVIS SPEECH: Voice feedback ${!isVoiceMuted ? "MUTED" : "ENABLED"}`);
            }}
            className={`p-1.5 rounded-lg border transition-all shrink-0 cursor-pointer flex items-center justify-center ${
              isVoiceMuted
                ? "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400"
                : "bg-slate-950 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/5"
            }`}
            title={isVoiceMuted ? "Unmute J.A.R.V.I.S. Voice" : "Mute J.A.R.V.I.S. Voice"}
          >
            {isVoiceMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={handleAiGeneration}
            className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold font-mono text-[10px] rounded-lg transition-all shadow-[0_0_12px_rgba(34,211,238,0.4)] cursor-pointer hover:scale-[1.02] shrink-0"
          >
            A.I. BUILD
          </button>
        </div>

        {/* Right menu actions & close */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleExportModel("scad")}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/25 rounded-xl transition-all text-slate-400 hover:text-cyan-300 flex items-center justify-center cursor-pointer"
            title="Export SCED design schema"
          >
            <Save className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleExportModel("obj")}
            className="px-3 py-1.5 bg-cyan-950/40 border border-cyan-500/20 hover:border-cyan-500/40 text-cyan-300 rounded-xl font-mono text-[10px] font-bold flex items-center gap-1.5 hover:bg-cyan-500/10 cursor-pointer"
            title="Download OBJ mesh data"
          >
            <Download className="w-3.5 h-3.5" />
            <span>EXPORT OBJ</span>
          </button>
          
          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-rose-950/30 hover:bg-rose-950/60 border border-rose-500/35 hover:border-rose-400 text-rose-300 rounded-xl font-mono text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(244,63,94,0.1)] hover:scale-105"
            >
              <X className="w-3.5 h-3.5 text-rose-400" />
              <span>EXIT CAD</span>
            </button>
          )}
        </div>
      </div>

      {/* Top Menu Dropdowns (Aesthetics of real CAD programs!) */}
      <div className="flex flex-wrap items-center gap-1 bg-slate-950/60 border border-cyan-500/5 p-1 rounded-xl mb-4 font-mono text-[10px] text-slate-500">
        {["File", "Edit", "Add Mesh", "Shading", "Render Mode", "Window", "Help"].map((menu) => (
          <div key={menu} className="relative">
            <button
              onClick={() => {
                setSelectedMenu(selectedMenu === menu ? null : menu);
                addLog(`CAD MENU: Opened drop-down [${menu.toUpperCase()}]`);
              }}
              className={`px-3 py-1.5 rounded-lg hover:text-cyan-300 hover:bg-cyan-950/30 transition-all flex items-center gap-1 cursor-pointer ${selectedMenu === menu ? "bg-cyan-500/10 text-cyan-300" : ""}`}
            >
              <span>{menu}</span>
              <ChevronDown className="w-3 h-3 text-slate-600" />
            </button>
            {selectedMenu === menu && (
              <div className="absolute left-0 top-full mt-1.5 z-50 bg-slate-950 border border-cyan-500/20 rounded-xl p-1.5 w-40 flex flex-col text-left text-[9.5px] text-slate-400 shadow-xl shadow-slate-950/80">
                {menu === "Add Mesh" && (
                  <>
                    <button onClick={() => { addCustomPart("cube"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 flex items-center gap-1.5 text-left"><Box className="w-3 h-3 text-cyan-400" /> + Cube</button>
                    <button onClick={() => { addCustomPart("sphere"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 flex items-center gap-1.5 text-left"><Circle className="w-3 h-3 text-cyan-400" /> + Sphere</button>
                    <button onClick={() => { addCustomPart("cylinder"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 flex items-center gap-1.5 text-left"><Box className="w-3 h-3 text-cyan-400 rotate-45" /> + Cylinder</button>
                    <button onClick={() => { addCustomPart("torus"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 flex items-center gap-1.5 text-left"><Circle className="w-3 h-3 text-cyan-400 border border-dashed" /> + Torus Ring</button>
                  </>
                )}
                {menu === "File" && (
                  <>
                    <button onClick={() => { addLog("CAD DISK: Cleared memory workspace"); selectPreset("custom"); setCustomParts([]); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 text-left">New Project</button>
                    <button onClick={() => { handleExportModel("scad"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 text-left">Save to Drive</button>
                    <button onClick={() => { setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-rose-500/10 hover:text-rose-400 text-left">Close Workspace</button>
                  </>
                )}
                {menu === "Shading" && (
                  <>
                    <button onClick={() => { setWireframeMode("wireframe"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 text-left">Wireframe</button>
                    <button onClick={() => { setWireframeMode("solid"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 text-left">Solid Shading</button>
                    <button onClick={() => { setWireframeMode("transparent"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 text-left">X-Ray Transparent</button>
                    <button onClick={() => { setWireframeMode("thermal"); setSelectedMenu(null); }} className="px-2.5 py-1.5 rounded hover:bg-cyan-500/10 hover:text-cyan-100 text-left">Thermal Scan</button>
                  </>
                )}
                {menu !== "Add Mesh" && menu !== "File" && menu !== "Shading" && (
                  <div className="p-2 text-slate-600 italic">Menu action placeholder loaded.</div>
                )}
              </div>
            )}
          </div>
        ))}
        <div className="h-4 w-[1px] bg-slate-800 mx-2" />
        <span className="text-[9px] text-emerald-400 animate-pulse flex items-center gap-1 uppercase font-bold ml-auto pr-2">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>CYBERNETIC RENDERER ONLINE</span>
        </span>
      </div>

      {/* 2. DYNAMIC WORKSPACE LAYOUT (BLENDER/FUSION 360 STYLE) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 flex-1">
        
        {/* LEFT COLUMN: SCENE TREE OUTLINER & TOOLBAR (xl:col-span-3) */}
        <div className="xl:col-span-3 col-span-12 flex flex-col gap-4">
          
          {/* Vertical Floating Toolbox */}
          <div className="bg-slate-950/50 border border-cyan-500/15 p-3 rounded-2xl flex flex-col gap-2 font-mono text-[9px] text-left">
            <span className="text-[10px] font-bold text-cyan-300 tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-cyan-500/10">
              <Hammer className="w-3.5 h-3.5 text-cyan-400" />
              TOOLBOX
            </span>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              {[
                { id: "select", name: "Select Node", icon: Compass },
                { id: "move", name: "Translate (G)", icon: SlidersHorizontal },
                { id: "rotate", name: "Rotate (R)", icon: RotateCw },
                { id: "scale", name: "Scale (S)", icon: Sliders }
              ].map((tool) => {
                const Icon = tool.icon;
                return (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id as any);
                      addLog(`TOOLBOX: Set active operation vector to [${tool.name.toUpperCase()}]`);
                    }}
                    className={`py-2 rounded-xl border flex flex-col items-center justify-center gap-1 font-bold cursor-pointer transition-all ${activeTool === tool.id ? "bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_8px_rgba(6,182,212,0.15)]" : "bg-transparent border-slate-900 text-slate-500 hover:text-slate-300 hover:border-slate-800"}`}
                  >
                    <Icon className="w-4 h-4 text-cyan-400" />
                    <span className="text-[8px] uppercase tracking-tighter">{tool.name.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Quick Primitive Adders inside Toolbox */}
            <div className="mt-2.5 pt-2.5 border-t border-cyan-500/10 space-y-1.5">
              <span className="text-[8px] text-slate-500 uppercase block font-bold">Quick Mesh Add:</span>
              <div className="grid grid-cols-4 gap-1">
                <button onClick={() => addCustomPart("cube")} className="p-1 border border-slate-900 hover:border-cyan-500/20 rounded bg-slate-900/40 text-slate-400 hover:text-cyan-200 flex flex-col items-center cursor-pointer" title="Add Cube"><Box className="w-3.5 h-3.5" /></button>
                <button onClick={() => addCustomPart("sphere")} className="p-1 border border-slate-900 hover:border-cyan-500/20 rounded bg-slate-900/40 text-slate-400 hover:text-cyan-200 flex flex-col items-center cursor-pointer" title="Add Sphere"><Circle className="w-3.5 h-3.5" /></button>
                <button onClick={() => addCustomPart("cylinder")} className="p-1 border border-slate-900 hover:border-cyan-500/20 rounded bg-slate-900/40 text-slate-400 hover:text-cyan-200 flex flex-col items-center cursor-pointer" title="Add Cylinder"><Box className="w-3.5 h-3.5 rotate-45" /></button>
                <button onClick={() => addCustomPart("torus")} className="p-1 border border-slate-900 hover:border-cyan-500/20 rounded bg-slate-900/40 text-slate-400 hover:text-cyan-200 flex flex-col items-center cursor-pointer" title="Add Torus Ring"><Circle className="w-3.5 h-3.5 border border-dashed rounded-full" /></button>
              </div>
            </div>
          </div>

          {/* Outliner Scene Tree Hierarchy (Crucial element of Blender / real design programs!) */}
          <div className="bg-slate-950/50 border border-cyan-500/15 p-4 rounded-2xl flex flex-col flex-1 font-mono text-[9px] text-left">
            <span className="text-[10px] font-bold text-cyan-300 tracking-wider flex items-center justify-between pb-2 border-b border-cyan-500/10">
              <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-cyan-400" />SCENE COLLECTION</span>
              <span className="text-[8px] text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded uppercase">Outliner</span>
            </span>
            
            {/* Standard preset select row */}
            <div className="mt-2 text-[8px] text-slate-500 uppercase font-black tracking-widest pb-1">SCENE TEMPLATE PRESETS:</div>
            <div className="grid grid-cols-2 gap-1 mb-3">
              {[
                { id: "reactor", label: "⚛️ Arc Core" },
                { id: "helmet", label: "🪖 Helmet" },
                { id: "spaceship", label: "🚀 Cruiser" },
                { id: "drone", label: "🛸 Drone" },
                { id: "satellite", label: "🛰️ Sat" },
                { id: "lightsaber", label: "⚔️ Saber" },
                { id: "custom", label: "🛠️ Manual" }
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => selectPreset(p.id as any)}
                  className={`p-1 text-left rounded border text-[8px] font-bold transition-all truncate cursor-pointer ${activePreset === p.id ? "bg-cyan-500/15 border-cyan-500/35 text-cyan-300" : "border-slate-900 hover:border-slate-800 text-slate-500"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Mesh Hierarchy List */}
            <div className="text-[8px] text-slate-500 uppercase font-black tracking-widest pb-1 flex justify-between items-center">
              <span>ACTIVE MESHES IN SPACE:</span>
              <span className="text-cyan-500/70 bg-cyan-950/40 px-1.5 rounded">{activePreset === "custom" ? customParts.length : "PRESET"}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[170px] space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/10">
              {activePreset === "custom" ? (
                customParts.length === 0 ? (
                  <p className="text-slate-600 italic py-4 text-center leading-relaxed">No elements in assembly tree. Click 'Quick Add' or type AI build parameters.</p>
                ) : (
                  customParts.map((part) => (
                    <div
                      key={part.id}
                      onClick={() => setSelectedPartId(part.id)}
                      className={`p-2 rounded-xl border flex items-center justify-between transition-all cursor-pointer ${selectedPartId === part.id ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-200" : "bg-transparent border-slate-900/50 hover:bg-slate-900/20 text-slate-400"}`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        {part.type === "cube" && <Box className="w-3 h-3 text-cyan-400" />}
                        {part.type === "sphere" && <Circle className="w-3 h-3 text-cyan-400" />}
                        {part.type === "cylinder" && <Box className="w-3 h-3 text-cyan-400 rotate-45" />}
                        {part.type === "torus" && <Circle className="w-3 h-3 text-cyan-400 border border-dashed rounded-full" />}
                        <span className="truncate font-bold tracking-tight text-[8.5px]">{part.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 ml-2 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            updateCustomPart(part.id, { visible: !part.visible });
                          }}
                          className="text-slate-500 hover:text-cyan-400 p-0.5 transition-all"
                          title="Toggle Mesh Visibility"
                        >
                          {part.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCustomPart(part.id);
                          }}
                          className="text-slate-500 hover:text-rose-400 p-0.5 transition-all"
                          title="Purge Node"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )
              ) : (
                // Preset items representation
                <div className="space-y-1 text-slate-400 text-[8.5px]">
                  <div className="p-1.5 rounded bg-slate-900/35 border border-slate-900 flex justify-between">
                    <span className="text-cyan-300">⚛️ main_assembly_node</span>
                    <span className="text-slate-600">STATIC GROUP</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/35 border border-slate-900 flex justify-between">
                    <span className="text-cyan-300">🛰️ sensor_photonic_ref</span>
                    <span className="text-slate-600">EMISSIVE</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/35 border border-slate-900 flex justify-between font-mono">
                    <span className="text-cyan-300">🛡️ grid_floor_xyz</span>
                    <span className="text-emerald-500">ACTIVE</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: FULL-SIZE 3D VIEWPORT CANVAS (xl:col-span-6) */}
        <div className="xl:col-span-6 col-span-12 flex flex-col gap-4">
          <div className="relative rounded-2xl border border-cyan-500/20 bg-slate-950 overflow-hidden flex flex-col group min-h-[480px]">
            
            {/* Inline keyframe animation styles */}
            <style dangerouslySetInnerHTML={{__html: `
              @keyframes scan-laser {
                0% { top: 0%; }
                50% { top: 100%; }
                100% { top: 0%; }
              }
              @keyframes wave-bounce-1 {
                0%, 100% { transform: scaleY(0.25); }
                50% { transform: scaleY(1.3); }
              }
              @keyframes wave-bounce-2 {
                0%, 100% { transform: scaleY(0.4); }
                50% { transform: scaleY(1.1); }
              }
              @keyframes wave-bounce-3 {
                0%, 100% { transform: scaleY(0.15); }
                50% { transform: scaleY(1.4); }
              }
              @keyframes wave-bounce-4 {
                0%, 100% { transform: scaleY(0.3); }
                50% { transform: scaleY(1.2); }
              }
            `}} />

            {/* Live Holographic Scanning Laser Overlay */}
            {laserActive && (
              <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                <div 
                  className="w-full h-[3px] bg-cyan-400 shadow-[0_0_15px_#22d3ee,0_0_30px_#06b6d4] absolute left-0" 
                  style={{
                    animation: "scan-laser 2.5s ease-in-out infinite"
                  }}
                />
                <div className="absolute inset-0 bg-cyan-500/5 animate-pulse" />
              </div>
            )}

            {/* J.A.R.V.I.S. Interactive Voice Assistant HUD Floating Card - REMOVED per user request to keep the CAD viewport free of text overlays */}
            
            {/* Viewport Floating Status Overlays - REMOVED per user request to remove text appearing in CAD */}

            {/* Shading View Mode Selector Buttons */}
            <div className="absolute top-3 right-3 z-10 font-mono text-[9px] bg-slate-950/80 p-1 rounded-xl border border-cyan-500/15 backdrop-blur-md flex gap-1">
              {[
                { id: "solid", label: "Solid" },
                { id: "wireframe", label: "Wire" },
                { id: "transparent", label: "X-Ray" },
                { id: "thermal", label: "Thermal" }
              ].map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setWireframeMode(mode.id as any);
                    addLog(`VIEWPORT RENDER: Applied shade pipeline [${mode.label.toUpperCase()}]`);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[8.5px] font-bold cursor-pointer transition-all ${wireframeMode === mode.id ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300" : "text-slate-500 hover:text-slate-300 border border-transparent"}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Bottom Floating Gizmos Controller overlay */}
            <div className="absolute bottom-3 left-3 z-10 font-mono text-[9px] bg-slate-950/80 p-2 rounded-xl border border-cyan-500/15 backdrop-blur-md flex items-center gap-3.5">
              <div className="flex gap-2 font-bold">
                <button
                  onClick={() => setGridVisible(!gridVisible)}
                  className={`px-2 py-1 rounded-lg border text-[8px] cursor-pointer transition-all ${gridVisible ? "border-cyan-500/30 text-cyan-300 bg-cyan-500/10" : "border-slate-800 text-slate-500"}`}
                >
                  XYZ FLOORED GRID
                </button>
                <button
                  onClick={() => {
                    setIsRotating(!isRotating);
                    addLog(`CAD CAM: Auto-rotate toggled to ${!isRotating}`);
                  }}
                  className={`px-2 py-1 rounded-lg border text-[8px] cursor-pointer transition-all ${isRotating ? "border-cyan-500/30 text-cyan-300 bg-cyan-500/10" : "border-slate-800 text-slate-500"}`}
                >
                  AUTO ROTATE
                </button>
              </div>
            </div>

            {/* Viewport Statistics overlay - REMOVED per user request to remove text appearing in CAD */}

            {/* The Main WebGL Canvas mounts here */}
            <div ref={mountRef} className="w-full h-[480px] cursor-grab active:cursor-grabbing relative flex-1" />
            
          </div>
        </div>

        {/* RIGHT COLUMN: TABBED PROPERTIES & J.A.R.V.I.S. SCAD CODE COMPILER (xl:col-span-3) */}
        <div className="xl:col-span-3 col-span-12 flex flex-col gap-4 text-left">
          
          {/* Sidebar Tab Selection Bar */}
          <div className="flex bg-slate-950 border border-cyan-500/15 p-1 rounded-xl font-mono text-[9px]">
            <button
              onClick={() => setActiveRightTab("inspector")}
              className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer ${
                activeRightTab === "inspector"
                  ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              PROPERTIES
            </button>
            <button
              onClick={() => setActiveRightTab("compiler")}
              className={`flex-1 py-1.5 rounded-lg text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeRightTab === "compiler"
                  ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <FileText className="w-3 h-3 text-cyan-400" />
              <span>SCAD COMPILER</span>
            </button>
          </div>

          {activeRightTab === "inspector" ? (
            /* Properties Inspector Panel */
            <div className="bg-slate-950/50 border border-cyan-500/15 p-4 rounded-2xl flex flex-col font-mono text-[9px] text-slate-400 space-y-3">
              <span className="text-[10px] font-bold text-cyan-300 tracking-wider flex items-center gap-1.5 pb-2 border-b border-cyan-500/10">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                PROPERTIES INSPECTOR
              </span>

              {/* Selected Node Details or Preset Details */}
              {(() => {
                const part = activePreset === "custom" ? customParts.find(p => p.id === selectedPartId) : null;
                
                if (activePreset !== "custom") {
                  return (
                    <div className="space-y-2 text-[9.5px]">
                      <div className="flex justify-between border-b border-slate-900 pb-1 text-cyan-200 font-bold">
                        <span>PRESET MODEL:</span>
                        <span className="uppercase text-cyan-400 font-black">{activePreset}</span>
                      </div>
                      <div className="text-[8.5px] text-slate-500 space-y-1">
                        <p>Selected Preset represents a composite procedural structure designed for optimal cybernetic assembly. Coordinates are auto-optimized.</p>
                        <p>To manually edit individual coordinate nodes, switch the scene selection template to <strong>Manual (🛠️)</strong> mode.</p>
                      </div>
                    </div>
                  );
                }

                if (!part) {
                  return (
                    <div className="text-center py-6 text-slate-500 italic">
                      No active node selected. Click on a mesh shape in the outliner list or viewport to load its raw property scalars.
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    
                    {/* Part Title and Purge */}
                    <div className="flex justify-between items-center border-b border-slate-900 pb-2 text-cyan-300 font-bold">
                      <span className="truncate max-w-[130px]">NODE: {part.name}</span>
                      <button
                        onClick={() => deleteCustomPart(part.id)}
                        className="p-1 bg-red-950/20 hover:bg-red-950/50 border border-red-500/20 rounded-lg text-red-400 hover:text-red-300 transition-all cursor-pointer"
                        title="Purge Component"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Positioning Coordinates (V / Translate Tool) */}
                    <div className="space-y-2">
                      <span className="text-[8px] text-slate-500 font-bold uppercase flex items-center justify-between">
                        <span>[X/Y/Z] Global Position:</span>
                        <span className="text-cyan-400">XYZ Vec</span>
                      </span>
                      <div className="space-y-1.5">
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">POS X:</span>
                            <span className="text-cyan-300 font-bold">{part.position[0].toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="-4"
                            max="4"
                            step="0.05"
                            value={part.position[0]}
                            onChange={(e) => updateCustomPart(part.id, { position: [parseFloat(e.target.value), part.position[1], part.position[2]] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">POS Y:</span>
                            <span className="text-cyan-300 font-bold">{part.position[1].toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="-4"
                            max="4"
                            step="0.05"
                            value={part.position[1]}
                            onChange={(e) => updateCustomPart(part.id, { position: [part.position[0], parseFloat(e.target.value), part.position[2]] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">POS Z:</span>
                            <span className="text-cyan-300 font-bold">{part.position[2].toFixed(2)}</span>
                          </div>
                          <input
                            type="range"
                            min="-4"
                            max="4"
                            step="0.05"
                            value={part.position[2]}
                            onChange={(e) => updateCustomPart(part.id, { position: [part.position[0], part.position[1], parseFloat(e.target.value)] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rotation Coordinates (R / Rotate Tool) */}
                    <div className="space-y-2 pt-2 border-t border-slate-900/60">
                      <span className="text-[8px] text-slate-500 font-bold uppercase flex items-center justify-between">
                        <span>[X/Y/Z] Mesh Rotation:</span>
                        <span className="text-cyan-400">Euler Deg</span>
                      </span>
                      <div className="space-y-1.5">
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">ROT X:</span>
                            <span className="text-cyan-300 font-bold">{part.rotation[0]}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="5"
                            value={part.rotation[0]}
                            onChange={(e) => updateCustomPart(part.id, { rotation: [parseInt(e.target.value), part.rotation[1], part.rotation[2]] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">ROT Y:</span>
                            <span className="text-cyan-300 font-bold">{part.rotation[1]}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="5"
                            value={part.rotation[1]}
                            onChange={(e) => updateCustomPart(part.id, { rotation: [part.rotation[0], parseInt(e.target.value), part.rotation[2]] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">ROT Z:</span>
                            <span className="text-cyan-300 font-bold">{part.rotation[2]}°</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            step="5"
                            value={part.rotation[2]}
                            onChange={(e) => updateCustomPart(part.id, { rotation: [part.rotation[0], part.rotation[1], parseInt(e.target.value)] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Scaling Scale Factors (S / Scale Tool) */}
                    <div className="space-y-2 pt-2 border-t border-slate-900/60">
                      <span className="text-[8px] text-slate-500 font-bold uppercase flex items-center justify-between">
                        <span>Mesh Scaling Dimension:</span>
                        <span className="text-cyan-400">XYZ Ratio</span>
                      </span>
                      <div className="space-y-1.5">
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">SCALE X:</span>
                            <span className="text-cyan-300 font-bold">{part.scale[0].toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="4"
                            step="0.1"
                            value={part.scale[0]}
                            onChange={(e) => updateCustomPart(part.id, { scale: [parseFloat(e.target.value), part.scale[1], part.scale[2]] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">SCALE Y:</span>
                            <span className="text-cyan-300 font-bold">{part.scale[1].toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="4"
                            step="0.1"
                            value={part.scale[1]}
                            onChange={(e) => updateCustomPart(part.id, { scale: [part.scale[0], parseFloat(e.target.value), part.scale[2]] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between mb-0.5 text-[8.5px]">
                            <span className="text-slate-500">SCALE Z:</span>
                            <span className="text-cyan-300 font-bold">{part.scale[2].toFixed(1)}x</span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="4"
                            step="0.1"
                            value={part.scale[2]}
                            onChange={(e) => updateCustomPart(part.id, { scale: [part.scale[0], part.scale[1], parseFloat(e.target.value)] })}
                            className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Color & Shading options */}
                    <div className="space-y-2 pt-2 border-t border-slate-900/60">
                      <span className="text-[8px] text-slate-500 font-bold uppercase">Mesh Material Shading:</span>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Color Palette:</span>
                        <div className="flex gap-1">
                          {["#22d3ee", "#fbbf24", "#ef4444", "#34d399", "#a855f7", "#ffffff"].map((color) => (
                            <button
                              key={color}
                              onClick={() => updateCustomPart(part.id, { color })}
                              className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${part.color === color ? "border-white scale-110 shadow-[0_0_5px_currentColor]" : "border-transparent"}`}
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center pt-1.5">
                        <span className="text-slate-500">Wireframe Mesh:</span>
                        <button
                          onClick={() => updateCustomPart(part.id, { wireframe: !part.wireframe })}
                          className={`px-2 py-0.5 text-[8px] font-bold rounded border uppercase ${part.wireframe ? "border-cyan-400 text-cyan-300 bg-cyan-500/10" : "border-slate-800 text-slate-600"}`}
                        >
                          {part.wireframe ? "Wireframe" : "Solid"}
                        </button>
                      </div>

                      <div className="space-y-1 pt-1.5">
                        <div className="flex justify-between text-[8.5px]">
                          <span className="text-slate-500">Opacity:</span>
                          <span className="text-cyan-300 font-bold">{(part.opacity * 100).toFixed(0)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={part.opacity}
                          onChange={(e) => updateCustomPart(part.id, { opacity: parseFloat(e.target.value) })}
                          className="w-full accent-cyan-500 h-1 cursor-pointer bg-slate-900 rounded"
                        />
                      </div>
                    </div>

                  </div>
                );
              })()}
            </div>
          ) : (
            /* J.A.R.V.I.S. SCAD Code Compiler Console Panel */
            <div className="bg-slate-950 border border-emerald-500/30 p-4 rounded-2xl flex flex-col font-mono text-[9px] text-emerald-400 space-y-3 shadow-[0_0_20px_rgba(16,185,129,0.08)] relative min-h-[380px]">
              
              {/* Compiler Header Bar */}
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2 mb-1">
                <span className="text-[10px] font-bold tracking-widest text-emerald-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  J.A.R.V.I.S. COMPILER v4.2
                </span>
                <span className="text-[7.5px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.2 rounded uppercase font-bold animate-pulse">
                  STABLE LATTICE
                </span>
              </div>

              {/* Code Filename Indicator */}
              <div className="text-[8.5px] text-emerald-500/70 flex items-center justify-between bg-emerald-950/25 p-1.5 rounded border border-emerald-500/10">
                <span className="flex items-center gap-1">
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>{fileName}</span>
                </span>
                <span>OPEN_SCAD TYPE</span>
              </div>

              {/* Glowing Code Textarea Screen */}
              <div className="flex-1 bg-slate-950/80 border border-emerald-500/10 rounded-xl p-3 text-[8.5px] text-emerald-300/90 leading-relaxed font-mono overflow-y-auto max-h-[300px] h-[280px] scrollbar-thin scrollbar-thumb-emerald-500/10">
                {typedScadCode ? (
                  <pre className="whitespace-pre-wrap font-mono select-text selection:bg-emerald-500/30 text-left">
                    {typedScadCode}
                    <span className="w-1.5 h-3.5 bg-emerald-400 inline-block align-middle ml-0.5 animate-pulse" />
                  </pre>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-emerald-600/60 py-12 text-center leading-normal">
                    <Zap className="w-5 h-5 mb-2 text-emerald-600/40 animate-pulse" />
                    <span>Awaiting dynamic geometric compilation...</span>
                    <span className="text-[7.5px] mt-1 text-slate-600">Type a J.A.R.V.I.S build instruction to compile OpenSCAD code.</span>
                  </div>
                )}
              </div>

              {/* Compiler Controls Footer */}
              <div className="pt-2 border-t border-emerald-500/15 flex justify-between items-center text-[7.5px] text-emerald-600 font-bold">
                <span>MEM ADDR: 0x7FFF3B821A</span>
                <span>COMPILATION RATE: 100% OK</span>
              </div>
            </div>
          )}

          {/* Assembly spectrometer telemetry */}
          <div className="bg-slate-950/50 border border-cyan-500/15 p-4 rounded-2xl flex flex-col font-mono text-[9px] text-slate-400">
            <span className="text-[10px] font-bold text-cyan-300 tracking-wider flex items-center gap-1.5 pb-2 border-b border-cyan-500/10 mb-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              MATERIAL SPECTROMETER
            </span>
            <div className="space-y-2 text-slate-500">
              <div className="flex justify-between border-b border-slate-900/50 pb-0.5">
                <span>Alloy Base:</span>
                <span className="text-cyan-200 font-bold truncate max-w-[120px]">{specs.alloy}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/50 pb-0.5">
                <span>Energy Flux:</span>
                <span className="text-cyan-300 font-bold">{specs.power}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/50 pb-0.5">
                <span>Total Weight:</span>
                <span className="text-cyan-300 font-bold">{specs.mass}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/50 pb-0.5">
                <span>Thermal Limit:</span>
                <span className="text-amber-400 font-bold">{specs.heat}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/50 pb-0.5">
                <span>Tension Factor:</span>
                <span className="text-emerald-400 font-bold">{specs.integrity}</span>
              </div>
              <div className="flex justify-between border-b border-slate-900/50 pb-0.5">
                <span>Assembly Status:</span>
                <span className="text-cyan-400 font-bold text-right truncate max-w-[110px]">{specs.status}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. BOTTOM PANEL: ANIMATION TIMELINE TRACKS (BLENDER TIMELINE STYLE) */}
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-12 gap-4 border-t border-cyan-500/15 pt-4">
        
        {/* Timeline Slider & VCR controls */}
        <div className="xl:col-span-8 col-span-12 bg-slate-950/50 border border-cyan-500/15 p-3 rounded-2xl flex flex-col justify-between font-mono text-[9px] gap-2">
          
          {/* Controls top bar */}
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-bold text-cyan-300 flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-cyan-400" />
              ANIMATION KEYFRAME TIMELINE
            </span>
            <div className="flex items-center gap-2">
              <span className="text-slate-600">Active range:</span>
              <span className="text-cyan-400 font-extrabold bg-slate-900 px-1.5 py-0.5 rounded">0 - 120 FPS</span>
            </div>
          </div>

          {/* VCR buttons */}
          <div className="flex flex-wrap items-center gap-4 py-1 border-t border-slate-900/50 border-b border-slate-900/50">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsPlayingAnimation(!isPlayingAnimation);
                  addLog(isPlayingAnimation ? "ANIMATION: Paused timeline playback" : "ANIMATION: Initiated active sequence playback loop");
                }}
                className={`w-7 h-7 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${isPlayingAnimation ? "bg-cyan-500/15 border-cyan-400 text-cyan-300" : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"}`}
                title={isPlayingAnimation ? "Pause Timeline (Space)" : "Play Timeline (Space)"}
              >
                {isPlayingAnimation ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => {
                  setCurrentFrame(0);
                  addLog("ANIMATION: Reset frame pointer to key zero");
                }}
                className="w-7 h-7 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center cursor-pointer transition-all"
                title="Rewind to frame zero"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Slider track */}
            <div className="flex-1 flex items-center gap-2">
              <span className="text-[8.5px] text-slate-600 font-bold font-mono">000</span>
              <input
                type="range"
                min="0"
                max="120"
                step="1"
                value={currentFrame}
                onChange={(e) => {
                  setCurrentFrame(parseInt(e.target.value));
                  if (isPlayingAnimation) setIsPlayingAnimation(false);
                }}
                className="flex-1 accent-cyan-500 h-1.5 rounded cursor-pointer bg-slate-900 border border-slate-800"
              />
              <span className="text-[8.5px] text-cyan-400 font-bold font-mono bg-cyan-950/40 border border-cyan-500/10 px-1.5 rounded">
                FRAME: {String(currentFrame).padStart(3, "0")}
              </span>
            </div>
          </div>

          {/* Sliders for layout effects */}
          <div className="grid grid-cols-2 gap-4 text-[8.5px] text-slate-500">
            
            {/* Assembly exploder slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span>EXPLODE ASSEMBLY SCALAR:</span>
                <span className="text-cyan-400 font-bold">{(explodeRatio * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={explodeRatio}
                onChange={(e) => {
                  setExplodeRatio(parseFloat(e.target.value));
                  addLog(`EXPLODE UPDATE: Dynamic assembly explode factor modified to ${(parseFloat(e.target.value)*100).toFixed(0)}%`);
                }}
                className="w-full accent-cyan-500 h-1 rounded cursor-pointer bg-slate-900"
              />
            </div>

            {/* Rotation speed slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span>SCENE ROTATION RADIAN:</span>
                <span className="text-cyan-400 font-bold">{rotationSpeed.toFixed(1)} rad/s</span>
              </div>
              <input
                type="range"
                min="0"
                max="3"
                step="0.1"
                value={rotationSpeed}
                onChange={(e) => {
                  setRotationSpeed(parseFloat(e.target.value));
                  addLog(`ROTATION UPDATE: Camera auto orbit vector velocity scaled to ${parseFloat(e.target.value).toFixed(1)} rad/s`);
                }}
                className="w-full accent-cyan-500 h-1 rounded cursor-pointer bg-slate-900"
              />
            </div>

          </div>

        </div>

        {/* Operational Terminal CAD logger feed (xl:col-span-4) */}
        <div className="xl:col-span-4 col-span-12 bg-slate-950/65 border border-cyan-500/15 rounded-2xl p-3 font-mono text-[8px] flex flex-col justify-between min-h-[110px] text-left">
          <div className="flex justify-between text-slate-500 border-b border-cyan-500/10 pb-1.5 mb-1.5 font-bold">
            <span>STARK CAD TELEMETRY SYSTEM LOGGER:</span>
            <span className="text-cyan-500/70 animate-pulse">STREAMING CONNECTED</span>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[75px] space-y-1 scrollbar-thin scrollbar-thumb-cyan-500/10">
            {terminalLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed truncate">
                <span className="text-cyan-400 mr-1">&gt;</span>
                <span className={log.includes("EXPORT") ? "text-emerald-400/80" : log.includes("AI SYNTHESIZER") ? "text-amber-400/90" : "text-slate-400"}>
                  {log}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
