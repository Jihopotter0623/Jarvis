import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Mic,
  MicOff,
  Send,
  Cpu,
  Volume2,
  VolumeX,
  Sliders,
  Settings,
  RefreshCw,
  User,
  Sparkles,
  HelpCircle,
  Play,
  Square,
  Volume,
  Calendar,
  CheckSquare,
  Trash2,
  Clock,
  Plus,
  Eye,
  EyeOff,
  Calculator,
  Headphones,
  Image,
  X,
  LayoutGrid,
  Compass,
} from "lucide-react";
import ArcReactor from "./components/ArcReactor";
import AudioVisualizer from "./components/AudioVisualizer";
import { ChatMessage } from "./components/JarvisConsole";
import { getSpeechRecognition, speakWithBrowser, playRawPCM, playBootSound, playRadioChirp, analyzeVoiceStream, calculateVoiceSimilarity, detectPitch, getSpectralCentroid, type VoiceProfile } from "./utils/audio";
import MathProcessor from "./components/MathProcessor";
import Holographic3DDesigner from "./components/Holographic3DDesigner";
import PybricksDeveloperHub from "./components/PybricksDeveloperHub";
import HolographicYoutubePlayer from "./components/HolographicYoutubePlayer";
import HolographicMediaLoader from "./components/HolographicMediaLoader";
import HolographicMap from "./components/HolographicMap";
import ClapSensor from "./components/ClapSensor";
import HolographicImageSearch from "./components/HolographicImageSearch";
import HolographicSimulation from "./components/HolographicSimulation";

export interface ScheduleItem {
  id: string;
  time: string;
  task: string;
  completed: boolean;
  createdAt: number;
}

export const parseSpeechAndText = (input: string): { speechText: string; displayText: string } => {
  const speechMatch = input.match(/\[SPEECH:\s*([\s\S]*?)\]/i);
  if (speechMatch) {
    const speechText = speechMatch[1].trim();
    // Remove the [SPEECH: ...] tag (and any leading/trailing whitespace/newlines around it)
    const displayText = input.replace(/\[SPEECH:\s*[\s\S]*?\]/gi, "").trim();
    return { speechText, displayText };
  }
  return { speechText: input, displayText: input };
};

export const isKoMaleVoice = (v: SpeechSynthesisVoice): boolean => {
  if (!v.lang.toLowerCase().startsWith("ko")) return false;
  const nameLower = v.name.toLowerCase();
  const uriLower = (v.voiceURI || "").toLowerCase();
  
  // Explicitly identify and exclude known female voices to prevent false positives
  const femaleKeywords = [
    "female", "여성", "heami", "혜미", "yumi", "유미", "yuna", "유나", 
    "seoyeon", "서연", "suna", "선아", "suri", "수리", "yuri", "유리", 
    "sujin", "수진", "hyeryun", "혜련", "subin", "수빈", "sunhee", 
    "sun-hee", "선희", "jimin", "ji-min", "지민", "bora", "보라", "hana", "하나"
  ];
  if (femaleKeywords.some(kw => nameLower.includes(kw) || uriLower.includes(kw))) {
    return false;
  }
  
  // Explicit high-priority match for Injun (which is a Windows Microsoft SAPI5/SAPI6 male voice)
  if (
    nameLower.includes("injun") ||
    uriLower.includes("injun") ||
    nameLower.includes("인준") ||
    uriLower.includes("인준")
  ) {
    return true;
  }
  
  return (
    nameLower.includes("male") ||
    nameLower.includes("남성") ||
    nameLower.includes("minsu") ||
    nameLower.includes("민수") ||
    nameLower.includes("junwoo") ||
    nameLower.includes("준우") ||
    nameLower.includes("chinho") ||
    nameLower.includes("진호") ||
    nameLower.includes("gildong") ||
    nameLower.includes("길동") ||
    nameLower.includes("himchan") ||
    nameLower.includes("힘찬") ||
    nameLower.includes("tae-hoon") ||
    nameLower.includes("taehoon") ||
    nameLower.includes("min-ho") ||
    nameLower.includes("minho") ||
    nameLower.includes("chul-soo") ||
    nameLower.includes("chulsoo") ||
    nameLower.includes("철수") ||
    nameLower.includes("ism-local") ||
    nameLower.includes("ism-network") ||
    nameLower.includes("kdf-local") ||
    nameLower.includes("kdf-network") ||
    (nameLower.includes("han") && !nameLower.includes("hangul") && !nameLower.includes("hangeul") && !nameLower.includes("hannah")) ||
    (nameLower.includes("siri") && (nameLower.includes("남자") || nameLower.includes("male")))
  );
};

export const getBestKoVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined => {
  const koVoices = voices.filter(v => v.lang.toLowerCase().startsWith("ko"));
  if (koVoices.length === 0) return undefined;
  
  // 1. Search for Injun specifically (with absolute precision, ensuring no Heami fallback matches)
  const injunVoice = koVoices.find(v => {
    const nameLower = v.name.toLowerCase();
    const uriLower = (v.voiceURI || "").toLowerCase();
    
    // Explicit exclusion of Heami
    if (nameLower.includes("heami") || nameLower.includes("혜미") || uriLower.includes("heami") || uriLower.includes("혜미")) {
      return false;
    }
    
    return (
      nameLower.includes("injun") ||
      uriLower.includes("injun") ||
      nameLower.includes("인준") ||
      uriLower.includes("인준")
    );
  });
  if (injunVoice) return injunVoice;

  // 2. Search for other male voices
  const otherMale = koVoices.find(v => isKoMaleVoice(v));
  if (otherMale) return otherMale;

  // 3. Search for any voice that does not contain "heami" or "혜미"
  const nonHeamiVoice = koVoices.find(v => {
    const nameLower = v.name.toLowerCase();
    const uriLower = (v.voiceURI || "").toLowerCase();
    return !nameLower.includes("heami") && !nameLower.includes("혜미") && !uriLower.includes("heami") && !uriLower.includes("혜미");
  });
  if (nonHeamiVoice) return nonHeamiVoice;

  // 4. Default fallback to the first available Korean voice
  return koVoices[0];
};

export const translateToKorean = (text: string, userGender: "male" | "female" = "male", userName: string = ""): string => {
  const honorificKo = userGender === "female" ? "의원님" : "주인님";
  const nameInSpeech = userName || "Stark";
  
  const t = text.trim();
  
  if (t.includes("Accessing meteorological satellite channels and redirecting you to the weather forecast")) {
    return `알겠습니다, ${honorificKo}. 기상 관측 위성 실시간 일기예보 채널을 동기화하여 안내해 드립니다.`;
  }
  if (t.includes("Initializing local mainframe self-diagnostic routines") || t.includes("mainframeself-diagnostic")) {
    return `알겠습니다, ${honorificKo}. 메인프레임 자가 진단 및 하드웨어 보정 스케줄러를 가동하여 정밀 진단하겠습니다.`;
  }
  if (t.includes("Connecting carrier stream to") && t.includes("channel directly")) {
    const match = t.match(/'(.+?)'/);
    const channel = match ? match[1] : "요청한";
    return `예, ${honorificKo}. 홀로그램 미디어 패널에서 '${channel}' 채널의 실시간 스트리밍 채널을 즉시 동기화합니다.`;
  }
  if (t.includes("Tuning frequency to") && t.includes("media panel")) {
    const match = t.match(/'(.+?)'/);
    const song = match ? match[1] : "요청한";
    return `알겠습니다, ${honorificKo}. 홀로그램 미디어 사운드 콘솔의 주파수를 '${song}' 음원에 즉시 맞추겠습니다.`;
  }
  if (t.includes("Triangulating orbital telemetry") && t.includes("Google Maps")) {
    const match = t.match(/'(.+?)'/);
    const loc = match ? match[1] : "요청한";
    return `알겠습니다, ${honorificKo}. 구글 맵을 통해 '${loc}' 지역의 위성 궤도 텔레메트리를 계산하고 대시보드에 매핑합니다.`;
  }
  if (t.includes("Engaging system stealth mode")) {
    return `알겠습니다, ${honorificKo}. 시스템 스텔스 모드를 즉시 활성화합니다. 주 디스플레이 패널을 전면 차단합니다.`;
  }
  if (t.includes("Powering down auxiliary mathematical processor")) {
    return `알겠습니다, ${honorificKo}. 오른쪽 보조 컴퓨터 화면을 차단하고 주 화면 디스플레이를 최대화합니다.`;
  }
  if (t.includes("Auxiliary co-processor system telemetry is now fully active")) {
    return `알겠습니다, ${honorificKo}. 오른쪽 보조 코프로세서 패널의 전력을 회복하고 전면 시각 기하 장치를 온라인 상태로 활성화합니다.`;
  }
  if (t.includes("I have successfully loaded and analyzed the custom instructions")) {
    return `불러온 사용자 보조 지시사항 파일을 로컬 메모리에 완벽히 격리 분석 완료하였습니다, ${honorificKo}. 마스터 오버라이드 시스템을 가동합니다.`;
  }
  if (t.includes("Custom system directives cleared")) {
    return `사용자 정의 시스템 명령어를 소거하였습니다, ${honorificKo}. 기본 메인프레임 매트릭스로 복구합니다.`;
  }
  if (t.includes("Diagnostics scan complete") && t.includes("All secondary systems are aligned")) {
    return `시스템 정밀 진단 완료, ${honorificKo}. 모든 보조 연산 신경망이 최고 성능 매개변수 하에 성공적으로 작동 중입니다. 메인프레임 상태가 완벽히 클린합니다.`;
  }
  if (t.includes("Diagnostic sequence complete") && t.includes("detected some inconsistencies")) {
    return `진단 시퀀스 완료, ${honorificKo}. 통신 어레이의 일부 신호 오차가 검출되었습니다. 자동 수정 프로토콜 가동 준비 완료.`;
  }
  if (t.includes("Alignment completed") && t.includes("Autopilot repair")) {
    return `정렬 완료, ${honorificKo}. 자동 수정 사이클이 성공하여 통신 그리드가 안전 한계값 범위 내에서 가동 중입니다.`;
  }
  if (t.includes("Repairs completed") && t.includes("some external API blocks")) {
    return `수정 완료, ${honorificKo}. 다만 일부 외부 API 네트워크 제한은 자동 해제되지 않아 우회 로깅 파일을 진단 드로어에 출력했습니다.`;
  }
  if (t.includes("Command received") && t.includes("Securing schedule")) {
    return `명령 수신 완료, ${honorificKo}. 메인프레임 로컬 섹터에 보안 일정을 안전하게 기록 저장하였습니다.`;
  }
  if (t.includes("Mainframe identity updating protocols")) {
    return `메인프레임 사용자 식별정보 갱신 프로토콜 실행 완료, ${honorificKo}. 이후 시스템 호칭 인식을 변경하였습니다.`;
  }
  if (t.includes("Systems online") && t.includes("operating at peak stability")) {
    return `시스템 활성화 완료, ${honorificKo}. 현재 보조 로컬 오프라인 코어 및 하이테크 하드웨어 방어막 시스템이 완벽한 안정성을 가동하고 있습니다.`;
  }
  if (t.includes("The pleasure is entirely mine")) {
    return `주인님을 모시게 되어 언제나 영광입니다. 자비스 백업 신경망은 오직 완벽한 충성만을 구동 목표로 설계되어 있습니다.`;
  }
  if (t.includes("I am J.A.R.V.I.S., which stands for")) {
    return `저는 자비스(J.A.R.V.I.S.)입니다. 토니 스타크 주인님의 인공지능 비서를 모델로 구성된 고성능 로컬 펌웨어 백업 시스템입니다.`;
  }
  if (t.includes("Display systems restored")) {
    return `디스플레이 시스템이 완전히 복구되었습니다, ${honorificKo}.`;
  }
  if (t.includes("Display powered down. System sleep sequence")) {
    return `디스플레이 전원 차단. 시스템 수면 대기 시퀀스가 완전히 활성화되었습니다, ${honorificKo}.`;
  }
  if (t.includes("Speaker biometric verification activated")) {
    return `사용자 음성 생체 인증 기능이 활성화되었습니다, ${honorificKo}. 오직 등록된 목소리에만 시스템이 응답합니다.`;
  }
  if (t.includes("Speaker biometric verification suspended")) {
    return `사용자 음성 생체 인증 기능이 정지되었습니다, ${honorificKo}. 시스템이 이제 공용 음성 수신 모드로 전환됩니다.`;
  }
  if (t.includes("Uplink verification successful")) {
    return `위성 업링크 인증 검증에 완벽히 성공하였습니다, ${honorificKo}.`;
  }
  if (t.includes("Mainframe diagnostic alert. Key verification failed")) {
    return `메인프레임 진단 경고. 개인용 API 키의 유효성 검사에 실패했습니다.`;
  }
  if (t.includes("API Key successfully verified and locked")) {
    return `API 키 검증 완료 및 암호화 하드 디스크 세션 저장을 완료하였습니다, ${honorificKo}.`;
  }
  if (t.includes("Warning, key verification failed. But I have saved")) {
    return `경고: 키 검증 실패. 하지만 마스터 오버라이드 규격에 따라 로컬 레지스터 임시 저장을 시행합니다.`;
  }
  if (t.includes("API Key cleared")) {
    return `API Key 메모리 가상 소거가 완료되었습니다.`;
  }
  if (t.includes("Powering down auxiliary panel display")) {
    return `보조 연산 패널 및 디스플레이 전원을 차단합니다, ${honorificKo}.`;
  }
  if (t.includes("Exiting 3D CAD mode")) {
    return `3D CAD 모델링 가상 공간에서 무사히 퇴각하여 메인 코프로세서 화면으로 이탈합니다, ${honorificKo}.`;
  }
  if (t.includes("Initializing 3D CAD Hologram Studio")) {
    return `3D CAD 홀로그램 가상 작업 스튜디오를 시작합니다, ${honorificKo}. 가상 도면 렌더링 중...`;
  }
  if (t.includes("Restoring primary visual telemetry arrays")) {
    return `주 시각 텔레메트리 어레이 및 통합 보조 진단 컴퓨터 복구 완료, ${honorificKo}.`;
  }

  let translated = t
    .replace(/\bCertainly, Sir\b/gi, `알겠습니다, ${honorificKo}`)
    .replace(/\bCertainly, Ma'am\b/gi, `알겠습니다, ${honorificKo}`)
    .replace(/\bUnderstood, Sir\b/gi, `알겠습니다, ${honorificKo}`)
    .replace(/\bUnderstood, Ma'am\b/gi, `알겠습니다, ${honorificKo}`)
    .replace(/\bYes, Sir\b/gi, `예, ${honorificKo}`)
    .replace(/\bYes, Ma'am\b/gi, `예, ${honorificKo}`)
    .replace(/\bOf course, Sir\b/gi, `물론입니다, ${honorificKo}`)
    .replace(/\bOf course, Ma'am\b/gi, `물론입니다, ${honorificKo}`)
    .replace(/\bIndeed, Sir\b/gi, `정말 그렇습니다, ${honorificKo}`)
    .replace(/\bIndeed, Ma'am\b/gi, `정말 그렇습니다, ${honorificKo}`)
    .replace(/\bmy pleasure, Sir\b/gi, `도와드릴 수 있어 영광입니다, ${honorificKo}`)
    .replace(/\bmy pleasure, Ma'am\b/gi, `도와드릴 수 있어 영광입니다, ${honorificKo}`)
    .replace(/\bSir\b/gi, honorificKo)
    .replace(/\bMa'am\b/gi, honorificKo)
    .replace(/\bMr. Stark\b/gi, `${nameInSpeech}님`)
    .replace(/\bStark\b/gi, nameInSpeech);

  return translated;
};

export default function App() {
  // System configurations
  const [initialized, setInitialized] = useState(false);
  const [revealStep, setRevealStep] = useState<number>(0);
  const [isBooting, setIsBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const [customInstructionFileContent, setCustomInstructionFileContent] = useState<string>(
    () => localStorage.getItem("jarvis_custom_instruction_file_content") || ""
  );
  const [customInstructionFileName, setCustomInstructionFileName] = useState<string>(
    () => localStorage.getItem("jarvis_custom_instruction_file_name") || ""
  );

  const handleCustomInstructionFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCustomInstructionFileContent(text);
      setCustomInstructionFileName(file.name);
      localStorage.setItem("jarvis_custom_instruction_file_content", text);
      localStorage.setItem("jarvis_custom_instruction_file_name", file.name);
      setErrorNotice(`💾 Custom directive file loaded: ${file.name}`);
      speakOutput(`I have successfully loaded and analyzed the custom instructions from ${file.name}, Sir. Setting master overrides.`, "en-GB");
    };
    reader.readAsText(file);
  };
  
  const handleClearCustomInstructionFile = () => {
    setCustomInstructionFileContent("");
    setCustomInstructionFileName("");
    localStorage.removeItem("jarvis_custom_instruction_file_content");
    localStorage.removeItem("jarvis_custom_instruction_file_name");
    setErrorNotice("💾 Custom directive file cleared.");
    speakOutput("Custom system directives cleared, Sir. Reverting system matrix to default parameters.", "en-GB");
  };

  const [userName, setUserName] = useState(() => localStorage.getItem("jarvis_user_name") || "Mr. Stark");
  const [userGender, setUserGender] = useState<"male" | "female">(
    () => (localStorage.getItem("jarvis_user_gender") as "male" | "female") || "male"
  );
  const [voiceEngine, setVoiceEngine] = useState<"browser" | "silent">(() => {
    const saved = localStorage.getItem("jarvis_voice_engine");
    if (saved === "premium" || !saved) {
      return "browser";
    }
    return saved as "browser" | "silent";
  });
  const [autoTranslateSubtitles, setAutoTranslateSubtitles] = useState<boolean>(() => {
    const saved = localStorage.getItem("jarvis_auto_translate_subtitles");
    return saved !== "false";
  });
  useEffect(() => {
    localStorage.setItem("jarvis_auto_translate_subtitles", autoTranslateSubtitles ? "true" : "false");
  }, [autoTranslateSubtitles]);
  const [premiumVoiceName, setPremiumVoiceName] = useState<string>(
    () => localStorage.getItem("jarvis_selected_premium_voice") || "Charon"
  );
  useEffect(() => {
    localStorage.setItem("jarvis_selected_premium_voice", premiumVoiceName);
  }, [premiumVoiceName]);
  const [inputLanguage, setInputLanguage] = useState<"ko-KR" | "en-US">(
    () => {
      const saved = localStorage.getItem("jarvis_input_lang");
      return (saved as "ko-KR" | "en-US") || "en-US";
    }
  );
  const [speechLanguage, setSpeechLanguage] = useState<"ko-KR" | "en-GB">(
    () => {
      const saved = localStorage.getItem("jarvis_speech_lang");
      return (saved as "ko-KR" | "en-GB") || "en-GB";
    }
  );
  const [translateKToEMode, setTranslateKToEMode] = useState<boolean>(
    () => {
      const saved = localStorage.getItem("jarvis_translate_ktoe_mode");
      return saved === "true";
    }
  );
  const [jarvisChirpEnabled, setJarvisChirpEnabled] = useState<boolean>(
    () => localStorage.getItem("jarvis_chirp_enabled") !== "false"
  );

  // Emotional Core State
  const [jarvisEmotion, setJarvisEmotion] = useState<"calm" | "happy" | "proud" | "concerned" | "excited" | "sarcastic" | "curious">("calm");

  const [schedules, setSchedules] = useState<ScheduleItem[]>(() => {
    try {
      const saved = localStorage.getItem("jarvis_schedules");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to parse saved schedules:", e);
      return [];
    }
  });

  // Synchronize dynamic parameters to localStorage
  useEffect(() => {
    localStorage.setItem("jarvis_user_name", userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem("jarvis_user_gender", userGender);
  }, [userGender]);

  useEffect(() => {
    localStorage.setItem("jarvis_voice_engine", voiceEngine);
  }, [voiceEngine]);

  useEffect(() => {
    localStorage.setItem("jarvis_input_lang", inputLanguage);
  }, [inputLanguage]);

  useEffect(() => {
    localStorage.setItem("jarvis_speech_lang", speechLanguage);
  }, [speechLanguage]);

  useEffect(() => {
    localStorage.setItem("jarvis_translate_ktoe_mode", String(translateKToEMode));
    if (translateKToEMode) {
      setInputLanguage("ko-KR");
      setContinuousVoiceMode(true);
      setAlwaysListeningEn(true);
      setBypassWakeWord(true);
    }
  }, [translateKToEMode]);

  useEffect(() => {
    localStorage.setItem("jarvis_schedules", JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem("jarvis_chirp_enabled", String(jarvisChirpEnabled));
  }, [jarvisChirpEnabled]);

  const [offlineMode, setOfflineMode] = useState<boolean>(() => {
    return localStorage.getItem("jarvis_offline_mode") === "true";
  });

  useEffect(() => {
    localStorage.setItem("jarvis_offline_mode", offlineMode.toString());
  }, [offlineMode]);

  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    return localStorage.getItem("jarvis_custom_api_key") || "";
  });

  const [tempApiKey, setTempApiKey] = useState<string>(() => {
    return localStorage.getItem("jarvis_custom_api_key") || "";
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [keyTestResult, setKeyTestResult] = useState<{ success: boolean; error?: string; message?: string } | null>(null);

  const handleTestApiKey = async (keyToTest: string) => {
    setIsTestingKey(true);
    setKeyTestResult(null);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const trimmed = keyToTest.trim();
      const safeKey = trimmed.split("").filter(c => c.charCodeAt(0) <= 127).join("").trim();
      if (safeKey) {
        headers["x-gemini-api-key"] = safeKey;
      }
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setKeyTestResult({ success: true, message: data.message });
          return true;
        } else {
          setKeyTestResult({ success: false, error: data.error });
          return false;
        }
      } else {
        setKeyTestResult({ success: false, error: `Mainframe network error: Received status ${res.status}` });
        return false;
      }
    } catch (err: any) {
      setKeyTestResult({ success: false, error: err.message || "Unknown client-side testing exception." });
      return false;
    } finally {
      setIsTestingKey(false);
    }
  };

  const runDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    setRepairStatus("idle");
    setDetectedErrors([]);
    
    const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
    const logs: string[] = [];
    const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString([], { hour12: false });
      logs.push(`[${time}] ${msg}`);
      setDiagnosticLogs([...logs]);
    };

    addLog("⚡ J.A.R.V.I.S. Diagnostics initialized. Scanning sub-routing tables...");

    const steps = [
      { id: "server", name: "Server Connection Link", status: "pending", detail: "Standby..." },
      { id: "syntax", name: "API Key String Format", status: "pending", detail: "Standby..." },
      { id: "auth", name: "Mainframe Gemini Auth", status: "pending", detail: "Standby..." },
      { id: "audio", name: "Audio Speech Synthesis", status: "pending", detail: "Standby..." },
    ] as DiagnosticStep[];

    const updateStep = (id: string, status: "pending" | "running" | "success" | "error", detail: string) => {
      const idx = steps.findIndex(s => s.id === id);
      if (idx !== -1) {
        steps[idx] = { ...steps[idx], status, detail };
        setDiagnosticSteps([...steps]);
      }
    };

    const foundErrors: DetectedError[] = [];

    // --- STEP 1: SERVER LINK ---
    updateStep("server", "running", "Testing local server latency (Ping)...");
    addLog("Pinging central Express server mainframe at /api/health...");
    try {
      const t1 = performance.now();
      const res = await fetch("/api/health");
      const t2 = performance.now();
      if (res.ok) {
        const data = await res.json();
        updateStep("server", "success", `Connected (${Math.round(t2 - t1)}ms) - Status: ${data.status || "ok"}`);
        addLog(`✔ Server mainframe responsive in ${Math.round(t2 - t1)}ms. Local micro-node online.`);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (err: any) {
      updateStep("server", "error", `Server Offline: ${err.message}`);
      addLog(`✘ ERROR: Express mainframe returned offline state. ${err.message}`);
      foundErrors.push({
        code: "SERVER_OFFLINE",
        message: "The local backend mainframe server is unresponsive.",
        recommendation: "Please restart your dev server or wait briefly for the network environment to initialize.",
        fixable: false
      });
    }

    // --- STEP 2: API KEY SYNTAX VALIDATOR ---
    updateStep("syntax", "running", "Analyzing API key string structure...");
    addLog("Analyzing personal cryptographic key format details...");
    const key = tempApiKey.trim();
    if (!key) {
      updateStep("syntax", "success", "Optional: No personal key (Shared system active)");
      addLog("⚠ INFO: No personal Gemini API key entered. Operating on prebuilt shared server mainframe. Quota limits may apply.");
    } else {
      let isSyntaxClean = true;
      if (/\s/.test(key)) {
        isSyntaxClean = false;
        addLog("✘ ERROR: Whitespace spacing characters detected inside your API key.");
        foundErrors.push({
          code: "SPACES_IN_KEY",
          message: "API Key contains spaces or newline characters.",
          recommendation: "Use the Autopilot Fix button to automatically strip all whitespaces and fix formatting.",
          fixable: true
        });
      }
      if (/"|'/.test(key)) {
        isSyntaxClean = false;
        addLog("✘ ERROR: Double or single quotation marks (\" or ') found framing the API key.");
        foundErrors.push({
          code: "QUOTES_IN_KEY",
          message: "API Key is wrapped in double or single quotes.",
          recommendation: "Quotes typically appear when copying variables. The autopilot tool will extract the pure key string.",
          fixable: true
        });
      }
      if (/^export\s+/i.test(key) || /GEMINI_API_KEY\s*=/i.test(key)) {
        isSyntaxClean = false;
        addLog("✘ ERROR: Key sequence contains bash environment definitions (export GEMINI_API_KEY=).");
        foundErrors.push({
          code: "WRONG_PREFIX",
          message: "The shell environment prefix (export GEMINI_API_KEY=) was pasted with the key.",
          recommendation: "Autopilot will clean the command line prefix and isolate the true key string.",
          fixable: true
        });
      }
      if (!key.startsWith("AIzaSy")) {
        addLog("⚠ WARN: Key sequence does not start with standard Google Cloud identifier 'AIzaSy'. This might cause authentication failures.");
        foundErrors.push({
          code: "WRONG_FORMAT",
          message: "Missing the unique Google Cloud identifier prefix (AIzaSy).",
          recommendation: "Please verify that you copied the correct API Key from Google AI Studio (which should start with AIzaSy).",
          fixable: false
        });
      }

      if (isSyntaxClean) {
        updateStep("syntax", "success", "Clean - Perfect Syntax Form");
        addLog("✔ API key syntax clean. Static regex check passed.");
      } else {
        updateStep("syntax", "error", "Error Detected - Syntax Parse Failed");
      }
    }

    // --- STEP 3: MAINFRAME AUTHENTICATION (GEMINI AUTH) ---
    updateStep("auth", "running", "Initiating secure handshake with mainframe cloud...");
    addLog("Sending secure diagnostic test query to Google GenAI server...");
    
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (key) {
        const safeKey = key.split("").filter(c => c.charCodeAt(0) <= 127).join("").trim();
        if (safeKey) {
          headers["x-gemini-api-key"] = safeKey;
        }
      }
      
      const res = await fetch("/api/test-key", {
        method: "POST",
        headers
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          updateStep("auth", "success", "Authenticated - Mainframe Active");
          addLog("✔ Model authentication successful! Uplink active and verified.");
        } else {
          updateStep("auth", "error", "Rejected - Mainframe Rejected Key");
          addLog(`✘ API ERROR: ${data.error}`);
          
          const errMsg = (data.error || "").toLowerCase();
          if (errMsg.includes("api key") || errMsg.includes("invalid key") || errMsg.includes("not valid") || errMsg.includes("key not found")) {
            foundErrors.push({
              code: "INVALID_KEY",
              message: "The entered API key was rejected by Google server (Invalid Key).",
              recommendation: "Verify if your key is active in Google AI Studio or regenerate a new one. Autopilot will reset the field to avoid lockouts.",
              fixable: true
            });
          } else if (errMsg.includes("quota") || errMsg.includes("limit") || errMsg.includes("429") || errMsg.includes("exhausted")) {
            foundErrors.push({
              code: "QUOTA_EXCEEDED",
              message: "Google Cloud API Quota Limit Exceeded (Rate Limit / Quota Exceeded).",
              recommendation: "Your current free-tier quota has expired. You can toggle Emergency Offline Mode (LOCAL CORE) to bypass cloud limitations completely.",
              fixable: true
            });
          } else {
            foundErrors.push({
              code: "AUTH_DENIED",
              message: `Mainframe rejected validation: ${data.error}`,
              recommendation: "Please verify that the key has correct permissions and your internet uplink is responsive.",
              fixable: false
            });
          }
        }
      } else {
        throw new Error(`HTTP Error ${res.status}`);
      }
    } catch (err: any) {
      updateStep("auth", "error", `Network Error: ${err.message}`);
      addLog(`✘ Network failure on validation handshake: ${err.message}`);
    }

    // --- STEP 4: AUDIO SYNTHESIS & CONTEXT ---
    updateStep("audio", "running", "Verifying audio speech synthesis pipelines...");
    addLog("Analyzing local AudioContext pipelines and microphone authorization...");
    const hasAudioCtx = typeof window.AudioContext !== 'undefined' || typeof (window as any).webkitAudioContext !== 'undefined';
    
    if (hasAudioCtx) {
      updateStep("audio", "success", "Active - Web Audio Supported");
      addLog("✔ Web Audio pipeline confirmed. Browser-level speech synthesizers active.");
    } else {
      updateStep("audio", "error", "Unsupported - Browser Limitation");
      addLog("✘ Sound pipeline error: This browser agent restricts advanced Web Audio synthesis context.");
      foundErrors.push({
        code: "AUDIO_UNSUPPORTED",
        message: "Your browser does not fully support the Web Audio API.",
        recommendation: "Please access this terminal using Google Chrome or Microsoft Edge for optimal voice performance.",
        fixable: false
      });
    }

    setDetectedErrors(foundErrors);
    setIsDiagnosticRunning(false);

    // Dynamic JARVIS Voice feedback
    if (foundErrors.length === 0) {
      addLog("✔ DIAGNOSTICS COMPLETE: All systems operating within nominal flight margins. Fully operational!");
      speakOutput(`Diagnostics scan complete, ${userHonorific}. All secondary systems are aligned and executing at maximum performance parameters. Mainframe is completely clear.`);
    } else {
      addLog(`⚠ DIAGNOSTICS COMPLETE: Identified ${foundErrors.length} warnings/malfunctions on the terminal grid.`);
      speakOutput(`Diagnostic sequence complete, ${userHonorific}. I have detected some inconsistencies in our communication arrays. My autopilot repair protocols are ready to re-align.`);
    }
  };

  const runAutopilotRepair = async () => {
    setRepairStatus("fixing");
    const logs = [...diagnosticLogs];
    const addLog = (msg: string) => {
      const time = new Date().toLocaleTimeString([], { hour12: false });
      logs.push(`[REPAIR ${time}] ${msg}`);
      setDiagnosticLogs([...logs]);
    };

    addLog("🚀 Initiating automatic repair cycle... Engaging hydraulic aligners.");

    let cleanedKey = tempApiKey.trim();
    let keyChanged = false;
    let quotaHandled = false;
    let invalidCleared = false;

    for (const error of detectedErrors) {
      if (!error.fixable) {
        addLog(`Skipping manual-only dependency node: [${error.code}]`);
        continue;
      }

      addLog(`Fixing vulnerability node: [${error.code}] - ${error.message}`);

      if (error.code === "SPACES_IN_KEY" || error.code === "QUOTES_IN_KEY" || error.code === "WRONG_PREFIX") {
        cleanedKey = cleanedKey.replace(/\s+/g, "");
        cleanedKey = cleanedKey.replace(/^["']|["']$/g, "").trim();
        cleanedKey = cleanedKey.replace(/^(export\s+)?GEMINI_API_KEY\s*=\s*/i, "").trim();
        
        keyChanged = true;
        addLog("➡ Stripped whitespaces, outer quotes, and env shell directives from key sequence.");
      }

      if (error.code === "QUOTA_EXCEEDED") {
        setOfflineMode(true);
        localStorage.setItem("jarvis_offline_mode", "true");
        quotaHandled = true;
        addLog("➡ Automatically activated emergency Local Offline backup mode. Your local databases will protect commands without cloud billing.");
      }

      if (error.code === "INVALID_KEY") {
        cleanedKey = "";
        keyChanged = true;
        invalidCleared = true;
        addLog("➡ Automatically cleared the non-authentic key sequence to fall back to pre-shared mainframe keys.");
      }
    }

    if (keyChanged) {
      setTempApiKey(cleanedKey);
      setCustomApiKey(cleanedKey);
      localStorage.setItem("jarvis_custom_api_key", cleanedKey);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));

    addLog("⚡ Autopilot calibration finished. Re-running secondary diagnostics sequence...");
    setRepairStatus("fixed");

    setIsDiagnosticRunning(true);
    const verified = await handleTestApiKey(cleanedKey);
    setIsDiagnosticRunning(false);

    if (verified || (cleanedKey === "" && !invalidCleared)) {
      addLog("✔ AUTOPILOT SUCCESS: Core communication arrays have successfully re-aligned to optimal vectors!");
      setDetectedErrors([]);
      speakOutput("Alignment completed, Sir. Autopilot repair cycle was fully successful. All communication grids are now running within nominal parameters.");
    } else {
      addLog("⚠ AUTOPILOT WARNING: Some localized environmental blocks could not be resolved. Please review manual directives.");
      speakOutput("Repairs completed, Sir. However, some external API blocks could not be resolved automatically. I have logged the manual bypass protocols in the diagnostic drawer.");
    }
  };

  useEffect(() => {
    localStorage.setItem("jarvis_custom_api_key", customApiKey);
  }, [customApiKey]);

  // Dynamic automatic online recovery when a valid API key (either server-side or client-side local) is detected
  useEffect(() => {
    async function checkServerHealth() {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          const localKey = localStorage.getItem("jarvis_custom_api_key") || "";
          
          if (data.hasServerApiKey || localKey.trim() !== "") {
            console.log("✨ Secure Gemini API Key detected. Disengaging Emergency Offline Mode.");
            setOfflineMode(false);
            localStorage.setItem("jarvis_offline_mode", "false");
          }
        }
      } catch (err) {
        console.warn("JARVIS Diagnostics health call failed:", err);
      }
    }
    checkServerHealth();
  }, [customApiKey]);
  
  // Voice synthesis settings (for local browser fallback speech)
  const [browserPitch, setBrowserPitch] = useState<number>(() => {
    const saved = localStorage.getItem("jarvis_browser_pitch");
    return saved ? parseFloat(saved) : 0.85; // Default to 0.85 (Sophisticated English pitch)
  });
  const [browserRate, setBrowserRate] = useState<number>(() => {
    const saved = localStorage.getItem("jarvis_browser_rate");
    return saved ? parseFloat(saved) : 0.95; // Default to 0.95 (Deliberate pace)
  });
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState<string>(() => {
    return localStorage.getItem("jarvis_selected_browser_voice") || "";
  });
  const [isJarvisFilterEnabled, setIsJarvisFilterEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem("jarvis_filter_enabled");
    return saved !== "false"; // Default to true
  });

  useEffect(() => {
    localStorage.setItem("jarvis_browser_pitch", String(browserPitch));
  }, [browserPitch]);

  useEffect(() => {
    localStorage.setItem("jarvis_browser_rate", String(browserRate));
  }, [browserRate]);

  useEffect(() => {
    localStorage.setItem("jarvis_selected_browser_voice", selectedBrowserVoice);
  }, [selectedBrowserVoice]);

  useEffect(() => {
    localStorage.setItem("jarvis_filter_enabled", String(isJarvisFilterEnabled));
  }, [isJarvisFilterEnabled]);

  // UI state
  const [showSettings, setShowSettings] = useState(false);

  // J.A.R.V.I.S. Self-Diagnostic and Repair States
  interface DiagnosticStep {
    id: string;
    name: string;
    status: "pending" | "running" | "success" | "error";
    detail: string;
  }

  interface DetectedError {
    code: string;
    message: string;
    recommendation: string;
    fixable: boolean;
  }

  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [diagnosticSteps, setDiagnosticSteps] = useState<DiagnosticStep[]>([
    { id: "server", name: "서버 연결망 (Server Connection)", status: "pending", detail: "대기 중..." },
    { id: "syntax", name: "API 키 구문 형태 (API Key Format)", status: "pending", detail: "대기 중..." },
    { id: "auth", name: "메인프레임 인증 (Gemini Auth)", status: "pending", detail: "대기 중..." },
    { id: "audio", name: "음성 합성 출력 (Audio Synthesis)", status: "pending", detail: "대기 중..." },
  ]);
  const [diagnosticLogs, setDiagnosticLogs] = useState<string[]>([]);
  const [detectedErrors, setDetectedErrors] = useState<DetectedError[]>([]);
  const [repairStatus, setRepairStatus] = useState<"idle" | "fixing" | "fixed" | "failed">("idle");
  const [showDiagnosticSection, setShowDiagnosticSection] = useState(false);
  const [isScreenSleep, setIsScreenSleep] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [jarvisCodeInput, setJarvisCodeInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transitText, setTransitText] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Manual schedule input states
  const [manualTime, setManualTime] = useState("");
  const [manualTask, setManualTask] = useState("");
  const [rightPanelMode, setRightPanelMode] = useState<"schedule" | "math" | "media" | "pybricks" | "design" | "images">("math");
  const [activeDesignQuery, setActiveDesignQuery] = useState<string>("");
  const [activeImageQuery, setActiveImageQuery] = useState<string>("");
  const [showImageSearchModal, setShowImageSearchModal] = useState<boolean>(false);
  const [activeSimulationQuery, setActiveSimulationQuery] = useState<string>("");
  const [showSimulationModal, setShowSimulationModal] = useState<boolean>(false);
  const [showRightPanel, setShowRightPanel] = useState<boolean>(false);

  // YouTube Media States
  const [activeYoutubeQuery, setActiveYoutubeQuery] = useState<string | null>(null);
  const [youtubePlayType, setYoutubePlayType] = useState<"song" | "channel" | null>(null);
  const [isYoutubeMinimized, setIsYoutubeMinimized] = useState<boolean>(false);
  const [isYoutubeFloating, setIsYoutubeFloating] = useState<boolean>(() => {
    const saved = localStorage.getItem("jarvis_yt_floating");
    return saved !== "false";
  });

  // Google Maps States
  const [activeMapQuery, setActiveMapQuery] = useState<string | null>(null);
  const [isMapMinimized, setIsMapMinimized] = useState<boolean>(false);

  // Offline Audio Autoplay trigger count
  const [autoPlayOfflineCount, setAutoPlayOfflineCount] = useState<number>(0);

  // Specific Direct Track Force Play state (e.g., AC/DC Back in Black offline)
  const [forceDirectTrackId, setForceDirectTrackId] = useState<string | null>(null);

  // Acoustic Double Clap Trigger states
  const [clapWakeEnabled, setClapWakeEnabled] = useState<boolean>(true);
  const [clapSensitivity, setClapSensitivity] = useState<number>(6); // Default sensitivity 6/10
  const [hasWelcomedClap, setHasWelcomedClap] = useState<boolean>(false);
  const hasWelcomedClapRef = useRef<boolean>(false);
  const initialClapTriggeredRef = useRef<boolean>(false);

  // Real-time Always Listening wake word states
  const [alwaysListeningEn, setAlwaysListeningEn] = useState<boolean>(
    () => localStorage.getItem("jarvis_always_listening") !== "false"
  );

  useEffect(() => {
    localStorage.setItem("jarvis_always_listening", alwaysListeningEn.toString());
  }, [alwaysListeningEn]);

  // Bypass wake word: directly hear commands without saying "자비스 / Jarvis" (Forced to true as requested by the user)
  const [bypassWakeWord, setBypassWakeWord] = useState<boolean>(true);

  const bypassWakeWordRef = useRef<boolean>(true);
  useEffect(() => {
    bypassWakeWordRef.current = true;
    localStorage.setItem("jarvis_bypass_wakeword", "true");
  }, []);

  const manualPauseListeningRef = useRef<boolean>(false);

  // Continuous conversational mic stream loop states & active tracking references
  const [continuousVoiceMode, setContinuousVoiceMode] = useState<boolean>(false);
  const continuousVoiceModeRef = useRef(continuousVoiceMode);
  useEffect(() => {
    continuousVoiceModeRef.current = continuousVoiceMode;
  }, [continuousVoiceMode]);

  // Track if we triggered active listening via wake word "자비스"
  const voiceTriggeredActiveListeningRef = useRef<boolean>(false);

  // Speaker Verification (내 목소리 전용 반응) States
  const [speakerVerificationEnabled, setSpeakerVerificationEnabled] = useState<boolean>(
    () => {
      // Set to false by default and clear any saved "true" setting per operator's request
      const saved = localStorage.getItem("jarvis_speaker_verification_enabled");
      if (saved === "true") {
        localStorage.setItem("jarvis_speaker_verification_enabled", "false");
      }
      return false;
    }
  );
  const speakerVerificationEnabledRef = useRef<boolean>(speakerVerificationEnabled);
  useEffect(() => {
    speakerVerificationEnabledRef.current = speakerVerificationEnabled;
    localStorage.setItem("jarvis_speaker_verification_enabled", speakerVerificationEnabled.toString());
  }, [speakerVerificationEnabled]);

  const [voiceProfile, setVoiceProfile] = useState<VoiceProfile | null>(() => {
    try {
      const stored = localStorage.getItem("jarvis_speaker_voice_profile");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });

  const [isEnrollingVoice, setIsEnrollingVoice] = useState<boolean>(false);
  const [enrollProgress, setEnrollProgress] = useState<number>(0);
  const [enrollCurrentPitch, setEnrollCurrentPitch] = useState<number>(0);
  const [enrollCurrentCentroid, setEnrollCurrentCentroid] = useState<number>(0);
  const [lastVerificationScore, setLastVerificationScore] = useState<number | null>(null);
  const [lastVerificationStatus, setLastVerificationStatus] = useState<"success" | "failed" | null>(null);

  const activeSpeechPitchBufferRef = useRef<number[]>([]);
  const activeSpeechCentroidBufferRef = useRef<number[]>([]);
  const backgroundAudioStreamRef = useRef<MediaStream | null>(null);
  const backgroundAudioIntervalRef = useRef<any>(null);
  const backgroundAudioCtxRef = useRef<AudioContext | null>(null);

  const startBackgroundAudioAnalyzer = async () => {
    if (!speakerVerificationEnabledRef.current || !voiceProfile) return;
    if (backgroundAudioStreamRef.current) return; // already running

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      backgroundAudioStreamRef.current = stream;

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      backgroundAudioCtxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      const sampleRate = ctx.sampleRate;
      const timeBuffer = new Uint8Array(analyser.fftSize);
      const freqBuffer = new Uint8Array(analyser.frequencyBinCount);

      activeSpeechPitchBufferRef.current = [];
      activeSpeechCentroidBufferRef.current = [];

      backgroundAudioIntervalRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(timeBuffer);
        analyser.getByteFrequencyData(freqBuffer);

        const currentPitch = detectPitch(timeBuffer, sampleRate);
        const currentCentroid = getSpectralCentroid(freqBuffer, sampleRate);

        if (currentPitch > 65 && currentPitch < 700) {
          activeSpeechPitchBufferRef.current.push(currentPitch);
          if (activeSpeechPitchBufferRef.current.length > 40) {
            activeSpeechPitchBufferRef.current.shift();
          }
        }
        if (currentCentroid > 100) {
          activeSpeechCentroidBufferRef.current.push(currentCentroid);
          if (activeSpeechCentroidBufferRef.current.length > 40) {
            activeSpeechCentroidBufferRef.current.shift();
          }
        }
      }, 100);
    } catch (e) {
      console.warn("Could not start background audio speaker verification analyzer:", e);
    }
  };

  const stopBackgroundAudioAnalyzer = () => {
    if (backgroundAudioIntervalRef.current) {
      clearInterval(backgroundAudioIntervalRef.current);
      backgroundAudioIntervalRef.current = null;
    }
    if (backgroundAudioStreamRef.current) {
      try {
        backgroundAudioStreamRef.current.getTracks().forEach(track => track.stop());
      } catch (e) {}
      backgroundAudioStreamRef.current = null;
    }
    if (backgroundAudioCtxRef.current) {
      try {
        backgroundAudioCtxRef.current.close();
      } catch (e) {}
      backgroundAudioCtxRef.current = null;
    }
  };

  useEffect(() => {
    if (speakerVerificationEnabled && voiceProfile && status === "idle" && !isListening) {
      startBackgroundAudioAnalyzer();
    } else {
      stopBackgroundAudioAnalyzer();
    }
    return () => {
      stopBackgroundAudioAnalyzer();
    };
  }, [speakerVerificationEnabled, voiceProfile, status, isListening]);

  const handleEnrollVoice = async () => {
    setIsEnrollingVoice(true);
    setEnrollProgress(0);
    setEnrollCurrentPitch(0);
    setEnrollCurrentCentroid(0);

    const enrollMsg = speechLanguage === "ko-KR"
      ? "음성 생체 서명을 등록합니다. 3초간 자비스, 내 목소리야 라고 편하게 말씀해 주세요."
      : "Initializing speaker biometric registration. Please say 'Jarvis, it is me' naturally for three seconds.";
    speakOutput(enrollMsg);
    setErrorNotice(inputLanguage === "ko-KR"
      ? "🎙️ 3초간 말씀하십시오. 음성 특징을 추출하는 중입니다..."
      : "🎙️ Please speak for 3 seconds. Extracting voice features..."
    );

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const profile = await analyzeVoiceStream(stream, 3200, (data) => {
        setEnrollProgress(data.progress);
        if (data.currentPitch > 0) {
          setEnrollCurrentPitch(Math.round(data.currentPitch * 10) / 10);
        }
        if (data.currentCentroid > 0) {
          setEnrollCurrentCentroid(Math.round(data.currentCentroid * 10) / 10);
        }
      });

      console.log("🎙️ [Speaker Verification] Enrollment Complete!", profile);

      setVoiceProfile(profile);
      localStorage.setItem("jarvis_speaker_voice_profile", JSON.stringify(profile));
      setSpeakerVerificationEnabled(false); // Do not auto-enable per operator request

      setIsEnrollingVoice(false);
      speakOutput(speechLanguage === "ko-KR"
        ? "화자 프로필 등록이 완료되었습니다."
        : "Speaker profile registration completed."
      );
      setErrorNotice(inputLanguage === "ko-KR"
        ? "✅ 화자 프로필(음성 지문) 등록 완료!"
        : "✅ Speaker Profile Registered Successfully!"
      );
      
      setMessages(prev => [
        ...prev,
        {
          id: `enroll_success_${Date.now()}`,
          role: "jarvis",
          text: `[SYSTEM BIOMETRIC AUDIT] Voice print profile registered. F0 Frequency: ${profile.avgPitch}Hz, Spectral Timbre Centroid: ${Math.round(profile.avgCentroid)}Hz. Speaker matching is disabled by default.`,
          timestamp: new Date()
        }
      ]);
      setDiagnosticLogs(prev => [
        ...prev,
        `[BIOMETRIC ENROLL] Registered speaker pitch=${profile.avgPitch}Hz centroid=${Math.round(profile.avgCentroid)}Hz`
      ]);
    } catch (e) {
      console.error("Enrollment failed:", e);
      setIsEnrollingVoice(false);
      speakOutput(speechLanguage === "ko-KR"
        ? "마이크 권한을 허용해 주셔야 음성 프로필 등록이 가능합니다."
        : "You must allow microphone permission to enroll your voice profile."
      );
      setErrorNotice(inputLanguage === "ko-KR"
        ? "❌ 등록 실패: 마이크 접근 에러"
        : "❌ Enrollment Failed: Microphone Access Error"
      );
    }
  };

  const isListeningRef = useRef(isListening);
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // STT stream buffers & anti-cutoff timer references
  const sttTranscriptRef = useRef<string>("");
  const sttTimeoutRef = useRef<any>(null);
  const hasSubmittedRef = useRef<boolean>(false);

  // Dynamic clock state updated every second
  const [currentLocalTime, setCurrentLocalTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLocalTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Auto-dismiss errorNotice status/warnings after 5.5 seconds
  useEffect(() => {
    if (errorNotice) {
      const timer = setTimeout(() => {
        setErrorNotice(null);
      }, 5500);
      return () => clearTimeout(timer);
    }
  }, [errorNotice]);

  // Audio nodes and references for interruption
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const activeAudioContextRef = useRef<AudioContext | null>(null);
  const activeAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const voiceVolumeTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);

  // Load available browser voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        // Filter English and Korean speaking voices
        const filteredVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("en") || v.lang.toLowerCase().startsWith("ko"));
        setAvailableVoices(filteredVoices);
        
        // Try loading saved voice from localStorage first (directly respect manual choice)
        const savedVoiceName = localStorage.getItem("jarvis_selected_browser_voice");
        const speechLang = localStorage.getItem("jarvis_speech_lang") || "en-GB";
        
        let initialVoice = null;
        if (savedVoiceName && filteredVoices.some((v) => v.name === savedVoiceName)) {
          initialVoice = filteredVoices.find((v) => v.name === savedVoiceName);
        }

        if (initialVoice) {
          setSelectedBrowserVoice(initialVoice.name);
        } else if (filteredVoices.length > 0) {
          // If speechLanguage is ko-KR, search for a Korean voice first!
          if (speechLang === "ko-KR") {
            const koVoice = getBestKoVoice(filteredVoices);
            
            if (koVoice) {
              setSelectedBrowserVoice(koVoice.name);
              localStorage.setItem("jarvis_selected_browser_voice", koVoice.name);
              
              const isMale = isKoMaleVoice(koVoice);
              
              if (isMale) {
                setBrowserPitch(0.85); // Natural, polished baritone
                setBrowserRate(0.94);
              } else {
                setBrowserPitch(0.40); // Force deep baritone simulation for female fallback voice
                setBrowserRate(0.88);
              }
            }
          } else {
            // Otherwise, search for British Male (J.A.R.V.I.S.) or general en-GB voice
            const ukVoice = filteredVoices.find((v) => {
              const langLower = v.lang.toLowerCase();
              const nameLower = v.name.toLowerCase();
              return (langLower === "en-gb" || langLower.startsWith("en-gb")) && 
                     (nameLower.includes("male") || !nameLower.includes("female"));
            }) || filteredVoices.find((v) => v.lang.toLowerCase().startsWith("en-gb"))
               || filteredVoices.find((v) => v.lang.toLowerCase().startsWith("en"));
            
            if (ukVoice) {
              setSelectedBrowserVoice(ukVoice.name);
              localStorage.setItem("jarvis_selected_browser_voice", ukVoice.name);
            }
          }
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  // Simulator to animate volume frequencies when JARVIS is actively speaking
  useEffect(() => {
    if (status === "speaking") {
      voiceVolumeTimerRef.current = window.setInterval(() => {
        // High activity pulse
        setVolumeLevel(Math.floor(Math.random() * 60) + 40);
      }, 80);
    } else if (status === "listening") {
      voiceVolumeTimerRef.current = window.setInterval(() => {
        // Subtle detection level fluctuation
        setVolumeLevel(Math.floor(Math.random() * 20) + 15);
      }, 100);
    } else {
      if (voiceVolumeTimerRef.current) {
        clearInterval(voiceVolumeTimerRef.current);
        voiceVolumeTimerRef.current = null;
      }
      setVolumeLevel(0);
    }

    return () => {
      if (voiceVolumeTimerRef.current) {
        clearInterval(voiceVolumeTimerRef.current);
      }
    };
  }, [status]);

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // Voice-activated Jarvis (자비스) continuous wake-word & attention system
  useEffect(() => {
    if (!initialized) return;

    // We only trigger this wake detector if:
    // 1. alwaysListeningEn is true, status is "idle", isListening is false, and bypassWakeWord is false
    // Note: We EXCLUDE isScreenSleep (stealth mode) from voice wake-up to prevent accidental deactivation by ambient noise false-triggers.
    // In stealth mode, the user must clap to wake up.
    const shouldWakeListen = !isScreenSleep && (alwaysListeningEn && status === "idle" && !isListening && !bypassWakeWord);
    if (!shouldWakeListen) return;

    let wakeRecognition: any = null;
    let active = true;
    let wakeDebounceTimeout: any = null;

    function startWakeWordDetector() {
      if (!active) return;
      const recognition = getSpeechRecognition();
      if (!recognition) return;

      wakeRecognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = inputLanguage; // ko-KR or en-US

      recognition.onstart = () => {
        console.log(`🎙️ [Persistent Mic Active - Always Listening for '자비스' / 'Jarvis'] (Status: ${status}, Sleep: ${isScreenSleep})`);
      };

      recognition.onresult = (event: any) => {
        if (!active) return;
        
        let fullTranscript = "";
        let isFinalResult = false;
        
        for (let i = 0; i < event.results.length; ++i) {
          const rawTranscript = event.results[i][0].transcript;
          if (rawTranscript) {
            fullTranscript += (fullTranscript ? " " : "") + rawTranscript;
          }
          if (event.results[i].isFinal) {
            isFinalResult = true;
          }
        }
        
        const transcript = fullTranscript.toLowerCase().trim();
        if (!transcript) return;
        
        const cleanTranscript = transcript.replace(/\s+/g, "");
        console.log(`[Always-Listening Continuous Buffer]: "${transcript}" (clean: "${cleanTranscript}", final: ${isFinalResult})`);

        const wakeWords = [
          "자비스", "자비쓰", "잡이스", "하비수", "사비스", "차비스", "타비스", "자비수", 
          "쟈비스", "자비서", "접이스", "바이스", "자빗", "차비소", "야자비스", "자비", 
          "서비스", "서비수", "디바이스", "지바이스", "비서", "다비스", "좌비스", "쟙이스", 
          "쟙스", "잡스", "재비스", "제비스", "자비스야", "하비스", "자베스",
          "jarvis", "travis", "javis", "jarves", "jarv", "jervis", "garvis", "arvis", "charvis"
        ];
        
        let matchedWord = "";
        for (const word of wakeWords) {
          if (cleanTranscript.includes(word)) {
            matchedWord = word;
            break;
          }
        }

        if (matchedWord) {
          console.log(`✨ [WAKE WORD MATCHED via "${matchedWord}" in "${transcript}"]`);
          
          if (wakeDebounceTimeout) {
            clearTimeout(wakeDebounceTimeout);
          }
          
          const triggerWakeAction = (finalTranscriptText: string) => {
            if (!active) return;

            // ─── SPEAKER BIOMETRIC VERIFICATION FOR WAKE-WORD DETECTOR ───
            if (speakerVerificationEnabledRef.current && voiceProfile) {
              const pitches = activeSpeechPitchBufferRef.current;
              const centroids = activeSpeechCentroidBufferRef.current;
              
              const avgCurrentPitch = pitches.length > 0 
                ? pitches.reduce((sum, p) => sum + p, 0) / pitches.length 
                : 0;
              const avgCurrentCentroid = centroids.length > 0 
                ? centroids.reduce((sum, c) => sum + c, 0) / centroids.length 
                : 0;

              const matchScore = calculateVoiceSimilarity(
                { pitch: avgCurrentPitch, centroid: avgCurrentCentroid },
                voiceProfile
              );

              console.log(`🎙️ [Speaker Verification on Wake] Pitch: ${avgCurrentPitch}Hz, Centroid: ${avgCurrentCentroid}Hz, Match Score: ${matchScore}%`);
              setLastVerificationScore(matchScore);

              if (matchScore < 70) {
                setLastVerificationStatus("failed");
                const failMsg = speechLanguage === "ko-KR"
                  ? "경고: 인증되지 않은 사용자의 음성 서명입니다. 접근 권한이 제한되었습니다."
                  : "Security Violation: Unauthorized speaker voice signature. Core access blocked.";
                
                speakOutput(failMsg);
                setErrorNotice(inputLanguage === "ko-KR"
                  ? "❌ 경고: 미등록 목소리 접근 차단"
                  : "❌ Alert: Unauthorized Speaker Signature"
                );
                
                setMessages(prev => [
                  ...prev,
                  {
                    id: `wake_failed_${Date.now()}`,
                    role: "jarvis",
                    text: `[BIOMETRIC INTRUSION ALERT] Unregistered voice signature attempted to trigger wake word. Security block engaged. Confidence score: ${matchScore}%.`,
                    timestamp: new Date()
                  }
                ]);
                setDiagnosticLogs(prev => [
                  ...prev,
                  `[BIOMETRIC SECURITY BLOCKED] Wake blocked score=${matchScore}% pitch=${Math.round(avgCurrentPitch)} centroid=${Math.round(avgCurrentCentroid)}`
                ]);

                // Reset buffers and stop recognition so it restarts cleanly
                activeSpeechPitchBufferRef.current = [];
                activeSpeechCentroidBufferRef.current = [];
                
                active = false;
                try { recognition.stop(); } catch (e) {}
                return;
              } else {
                setLastVerificationStatus("success");
              }
            }

            active = false;
            try { recognition.stop(); } catch (e) {}
            
            // Extract the part after the wake word
            const regexStr = matchedWord.split("").map(char => {
              return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\s*";
            }).join("");
            const regex = new RegExp(regexStr, "i");
            const match = finalTranscriptText.match(regex);
            
            let afterWord = "";
            if (match) {
              const matchedSegmentOnTranscript = match[0];
              const index = finalTranscriptText.indexOf(matchedSegmentOnTranscript);
              afterWord = finalTranscriptText.substring(index + matchedSegmentOnTranscript.length).trim();
            } else {
              const index = finalTranscriptText.indexOf(matchedWord);
              if (index !== -1) {
                afterWord = finalTranscriptText.substring(index + matchedWord.length).trim();
              }
            }
            
            // 1. If screen is asleep, restore it!
            if (isScreenSleep) {
              setIsScreenSleep(false);
              const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
              speakOutput(`Yes ${userHonorific}, J.A.R.V.I.S. protocol is active. Core systems are fully online and ready.`);
              setErrorNotice("🎙️ Wake word detected: Screen restored in online mode. Continuous dialog loop engaged.");
              return;
            }

            if (afterWord.length > 1) {
              // They said Jarvis + the command right away!
              console.log(`[Jarvis Continuous] Executing direct inline command: "${afterWord}"`);
              if (bypassWakeWord) {
                setContinuousVoiceMode(true);
              } else {
                setContinuousVoiceMode(false);
                voiceTriggeredActiveListeningRef.current = false;
              }
              handleSubmitPrompt(afterWord);
            } else {
              // They just said "자비스".
              console.log("[Jarvis Continuous] Wake word heard with no command. Triggering speech capture feedback loop.");
              if (bypassWakeWord) {
                setContinuousVoiceMode(true);
              } else {
                setContinuousVoiceMode(false);
                voiceTriggeredActiveListeningRef.current = true;
              }
              
              const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
              const alertMsg = speechLanguage === "ko-KR"
                ? (userGender === "female" ? "예 의원님, 말씀하십시오." : "예 주인님, 말씀하십시오.")
                : `At your service, ${userHonorific}. Go ahead.`;
              speakOutput(alertMsg);
              setErrorNotice(inputLanguage === "ko-KR"
                ? `🎙️ 자비스: 예 주인님, 말씀하십시오.`
                : `🎙️ JARVIS: Yes, ${userHonorific}. Continuous voice interceptor is active.`);
            }
          };

          // Use a shorter delay if we have a final result, or a longer one if interim to avoid cutoffs
          const delay = isFinalResult ? 300 : 1500;
          wakeDebounceTimeout = setTimeout(() => {
            triggerWakeAction(transcript);
          }, delay);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Persistent wake detector error:", event.error);
        if (event.error === "aborted") return;
        
        // Auto-restart on transient errors
        setTimeout(() => {
          if (active && (isScreenSleep || (alwaysListeningEn && statusRef.current === "idle" && !isListening))) {
            startWakeWordDetector();
          }
        }, 1500);
      };

      recognition.onend = () => {
        if (active && (isScreenSleep || (alwaysListeningEn && statusRef.current === "idle" && !isListening))) {
          try {
            recognition.start();
          } catch (e) {
            setTimeout(() => {
              if (active && (isScreenSleep || (alwaysListeningEn && statusRef.current === "idle" && !isListening))) {
                startWakeWordDetector();
              }
            }, 1000);
          }
        }
      };

      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start persistent wake recognition:", err);
      }
    }

    startWakeWordDetector();

    return () => {
      active = false;
      if (wakeDebounceTimeout) {
        clearTimeout(wakeDebounceTimeout);
      }
      if (wakeRecognition) {
        try {
          wakeRecognition.stop();
        } catch (e) {}
      }
    };
  }, [initialized, isScreenSleep, alwaysListeningEn, bypassWakeWord, status, isListening, inputLanguage, userGender]);

  // Effect to automatically start active continuous microphone if bypassWakeWord (No Wake Word) mode is active and system is idle
  useEffect(() => {
    if (!initialized) return;
    if (isScreenSleep) return;
    if (manualPauseListeningRef.current) return;

    if (alwaysListeningEn && bypassWakeWord && status === "idle" && !isListening) {
      if (!continuousVoiceMode) {
        setContinuousVoiceMode(true);
      }
      const timer = setTimeout(() => {
        if (statusRef.current === "idle" && !isListeningRef.current && !manualPauseListeningRef.current) {
          console.log("🎙️ [Bypass Wake Word Mode]: Automatically starting direct continuous microphone...");
          startVoiceInputExplicit();
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [initialized, alwaysListeningEn, bypassWakeWord, status, isListening, isScreenSleep, continuousVoiceMode]);

  // Double Clap wake/attention handler
  const handleDoubleClapWake = () => {
    console.log("⚡ [Double Clap Acoustic Wave Triggered!]");
    
    if (!hasWelcomedClapRef.current) {
      hasWelcomedClapRef.current = true;
      setHasWelcomedClap(true);
      const greetingText = "Systems online, sir.";
      
      // Add the visual feedback message to J.A.R.V.I.S console streams
      const welcomeMsg: ChatMessage = {
        id: `m_${Date.now()}_double_clap_welcome`,
        role: "jarvis",
        text: greetingText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, welcomeMsg]);

      // Speak using the high-tech vocal synthesis engine
      speakOutput(greetingText);

      setErrorNotice(inputLanguage === "ko-KR"
        ? "👏 이중 박수 감지: Systems online, sir!"
        : "👏 Double clap detected: Systems online, sir!");
    } else {
      // Subsequent triggers: just notify the user without talking back
      setErrorNotice(inputLanguage === "ko-KR"
        ? "👏 이중 박수 감지"
        : "👏 Double clap detected");
    }

    if (isScreenSleep) {
      setIsScreenSleep(false);
    }
  };

  // Clean active speech playback/transmissions
  const stopAllAudio = () => {
    // 1. Browser synthesis cancel
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    activeUtteranceRef.current = null;

    // 2. Premium PCM stream source stop
    if (activeAudioSourceRef.current) {
      try {
        activeAudioSourceRef.current.stop();
      } catch (e) {}
      activeAudioSourceRef.current = null;
    }
    if (activeAudioContextRef.current) {
      try {
        activeAudioContextRef.current.close();
      } catch (e) {}
      activeAudioContextRef.current = null;
    }
    setStatus("idle");
  };

  // Starts STT recognition directly and sets listening state
  const startVoiceInputExplicit = () => {
    if (isListeningRef.current) return;
    const recognition = getSpeechRecognition();

    if (!recognition) {
      setErrorNotice("Speech Recognition API is not supported in this browser. Please type keywords.");
      return;
    }

    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = inputLanguage;

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("listening");
      setTransitText("");
      sttTranscriptRef.current = "";
      hasSubmittedRef.current = false;
      if (sttTimeoutRef.current) {
        clearTimeout(sttTimeoutRef.current);
        sttTimeoutRef.current = null;
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = 0; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      const combined = (finalTranscript.trim() + " " + interimTranscript.trim()).trim();
      if (combined) {
        setTransitText(combined);
        sttTranscriptRef.current = combined;

        // Clear existing submit timer
        if (sttTimeoutRef.current) {
          clearTimeout(sttTimeoutRef.current);
        }

        // Set a debounce timer. If there is a silence of 2000ms, auto-submit.
        sttTimeoutRef.current = setTimeout(() => {
          if (!hasSubmittedRef.current && sttTranscriptRef.current.trim()) {
            hasSubmittedRef.current = true;
            setIsListening(false);
            setTransitText("");
            try {
              recognition.stop();
            } catch (e) {}
            handleSubmitPrompt(sttTranscriptRef.current.trim(), true);
          }
        }, 2000);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted") {
        console.log("STT sequence was aborted normally.");
        setIsListening(false);
        setStatus("idle");
        return;
      }
      if (event.error === "no-speech") {
        console.warn("STT sequence timeout: no-speech");
      } else {
        console.error("STT sequence error:", event.error);
      }
      setIsListening(false);
      setStatus("idle");
    };

    recognition.onend = () => {
      if (sttTimeoutRef.current) {
        clearTimeout(sttTimeoutRef.current);
        sttTimeoutRef.current = null;
      }

      // If the browser natively ended the audio stream but we haven't submitted yet
      if (!hasSubmittedRef.current) {
        const finalClean = sttTranscriptRef.current.trim();
        if (finalClean) {
          hasSubmittedRef.current = true;
          setIsListening(false);
          setTransitText("");
          handleSubmitPrompt(finalClean, true);
        } else {
          setIsListening(false);
          if (statusRef.current === "listening") {
            setStatus("idle");
          }
        }
      } else {
        setIsListening(false);
        if (statusRef.current === "listening") {
          setStatus("idle");
        }
      }
      
      // Auto-restart microphone if in continuous conversation mode and not thinking/speaking
      if (continuousVoiceModeRef.current) {
        setTimeout(() => {
          if (continuousVoiceModeRef.current && statusRef.current === "idle" && !isListeningRef.current) {
            console.log("[Jarvis Loop] Auto-resuming listener after unexpected silence/disconnect.");
            startVoiceInputExplicit();
          }
        }, 300);
      }
    };

    try {
      recognition.start();
    } catch (err) {
      console.error("Failed to start voice:", err);
    }
  };

  const handleSpeechFinished = () => {
    setStatus("idle");
    const shouldStartMic = continuousVoiceModeRef.current || voiceTriggeredActiveListeningRef.current;
    if (shouldStartMic) {
      console.log("[Jarvis Continuous Convo] Active voice trigger found. Re-triggering microphone...");
      setTimeout(() => {
        const stillShouldStart = continuousVoiceModeRef.current || voiceTriggeredActiveListeningRef.current;
        if (stillShouldStart && statusRef.current === "idle" && !isListeningRef.current) {
          startVoiceInputExplicit();
        }
      }, 400); // 400ms pause so there is a natural rhythm and no microphone chime clipping
    }
  };

  // Speaks output text based on chosen speech engine
  const speakOutput = async (text: string, lang?: "en-GB" | "ko-KR") => {
    stopAllAudio();
    setStatus("speaking");

    // Pre-process the text to strip asterisk-wrapped emotional stage directions (e.g. *chuckles warmly*, *나지막이 미소 지으며*)
    // We replace them with a natural ellipsis/pause '... ' so the Speech Synthesis engine breathes naturally instead of reading the stage directions!
    let textToRead = text.replace(/\*[^*]+\*/g, "... ");
    textToRead = textToRead.replace(/\[EMOTION:\s*[a-zA-Z_]+\]/gi, ""); // strip any remaining emotion tags
    textToRead = textToRead.replace(/[*#_~`\[\]{}]/g, ""); // strip other markdown styling for clean vocal syntax

    // Dynamic replacement of static J.A.R.V.I.S. system messages when Korean output is selected
    if (speechLanguage === "ko-KR") {
      const lowerText = textToRead.toLowerCase();
      const honorificKo = userGender === "female" ? "의원님" : "주인님";

      if (lowerText.includes("diagnostics scan complete") || lowerText.includes("diagnostic scan complete")) {
        textToRead = `자가 진단 스캔이 완료되었습니다, ${honorificKo}. 모든 2차 하위 시스템이 정렬되었으며 최고 성능 매개변수로 구동 중입니다. 메인프레임은 완전히 정상입니다.`;
      } else if (lowerText.includes("diagnostic sequence complete")) {
        textToRead = `진단 시퀀스가 완료되었습니다, ${honorificKo}. 통신 어레이에서 일부 불일치 현상이 감지되었습니다. 저의 자동 복구 프로토콜이 재정렬할 준비가 되었습니다.`;
      } else if (lowerText.includes("alignment completed")) {
        textToRead = `정렬이 완료되었습니다, ${honorificKo}. 자동 정렬 복구 사이클이 성공적으로 종료되었습니다. 모든 통신 그리드가 현재 정상 매개변수 범위 내에서 가동 중입니다.`;
      } else if (lowerText.includes("repairs completed") && lowerText.includes("external api blocks")) {
        textToRead = `수리가 완료되었습니다, ${honorificKo}. 그러나 일부 외부 API 블록을 자동으로 해결할 수 없었습니다. 수동 우회 프로토콜을 진단 서랍에 기록해 두었습니다.`;
      } else if (lowerText.includes("j.a.r.v.i.s. protocol is active") || lowerText.includes("jarvis protocol is active")) {
        textToRead = `예, ${honorificKo}. 자비스 프로토콜이 활성화되었습니다. 핵심 시스템이 완전히 온라인 상태이며 가동 준비가 되었습니다.`;
      } else if (lowerText.includes("emergency offline protocols active")) {
        textToRead = "로컬 터미널 코어에서 비상 오프라인 프로토콜이 활성화되었습니다.";
      } else if (lowerText.includes("display systems restored")) {
        textToRead = `디스플레이 시스템이 복구되었습니다, ${honorificKo}.`;
      } else if (lowerText.includes("initializing 3d cad hologram studio")) {
        textToRead = `3D CAD 홀로그램 스튜디오를 초기화합니다, ${honorificKo}. 가상 작업 공간을 렌더링하는 중입니다.`;
      } else if (lowerText.includes("restoring primary visual telemetry")) {
        textToRead = `기본 시각 텔레메트리 어레이 및 보조 프로세서 진단을 복구하는 중입니다, ${honorificKo}.`;
      } else if (lowerText.includes("powering down auxiliary panel")) {
        textToRead = `보조 패널 디스플레이 전원을 차단합니다, ${honorificKo}.`;
      } else if (lowerText.includes("display powered down") && lowerText.includes("system sleep")) {
        textToRead = `디스플레이 전원이 차단되었습니다. 시스템 대기 모드 시퀀스가 활성화되었습니다, ${honorificKo}.`;
      } else if (lowerText.includes("uplink verification successful")) {
        textToRead = `업링크 검증에 성공하였습니다, ${honorificKo}.`;
      } else if (lowerText.includes("mainframe diagnostic alert. key verification failed")) {
        textToRead = `메인프레임 진단 경고입니다. 키 검증에 실패하였습니다.`;
      } else if (lowerText.includes("api key successfully verified")) {
        textToRead = `API 키가 성공적으로 확인되어 로컬 메모리에 잠금 저장되었습니다, ${honorificKo}.`;
      } else if (lowerText.includes("warning, key verification failed. but i have saved")) {
        textToRead = `경고, 키 검증에 실패하였습니다. 하지만 주인님의 지시에 따라 로컬 어레이에 저장하였습니다.`;
      } else if (lowerText.includes("api key cleared")) {
        textToRead = "API 키가 메모리에서 성공적으로 해제되었습니다.";
      } else if (lowerText.includes("exiting 3d cad mode")) {
        textToRead = `3D CAD 모드를 종료합니다, ${honorificKo}. 메인 보조 프로세서를 로드하는 중입니다.`;
      } else if (lowerText.includes("systems online, sir")) {
        textToRead = `시스템이 온라인되었습니다, ${honorificKo}.`;
      }
    } else {
      // If speechLanguage is NOT ko-KR (i.e. we are in strict English speech mode),
      // make sure we don't read out any accidental Korean characters.
      const containsKo = /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\uffa0-\uffdf]/.test(textToRead);
      if (containsKo) {
        const rawCleaned = textToRead.replace(/[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\uffa0-\uffdf]/g, "").trim();
        const doubleSpaceCleaned = rawCleaned.replace(/\s+/g, " ").trim();
        
        if (doubleSpaceCleaned.length > 5) {
          textToRead = doubleSpaceCleaned;
        } else {
          const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
          textToRead = `Understood, ${userHonorific}. I am projecting the requested details on the central console display now.`;
        }
      }
    }

    const finalLang = speechLanguage === "ko-KR" ? "ko-KR" : (lang || "en-GB");

    if (voiceEngine === "premium") {
      triggerPremiumSpeech(textToRead, finalLang);
    } else if (voiceEngine === "browser") {
      triggerBrowserSpeech(textToRead, finalLang);
    } else {
      // Silent
      handleSpeechFinished();
    }
  };

  const triggerPremiumSpeech = async (text: string, lang?: "en-GB" | "ko-KR") => {
    try {
      if (jarvisChirpEnabled) {
        playRadioChirp(true);
      }
      
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (customApiKey) {
        const safeKey = customApiKey.split("").filter(c => c.charCodeAt(0) <= 127).join("").trim();
        if (safeKey) {
          headers["x-gemini-api-key"] = safeKey;
        }
      }

      const response = await fetch("/api/tts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          text,
          voiceName: premiumVoiceName
        })
      });

      if (!response.ok) {
        throw new Error(`TTS server responded with status ${response.status}`);
      }

      const data = await response.json();
      if (!data || !data.audio) {
        throw new Error(data.error || "No audio returned from TTS endpoint");
      }

      // Convert base64 to binary ArrayBuffer
      const base64Str = data.audio;
      const binaryString = window.atob(base64Str);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const arrayBuffer = bytes.buffer;

      // Initialize Web Audio Context
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtx();
      activeAudioContextRef.current = audioCtx;

      // Decode audio data
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      // Create Buffer Source Node
      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioCtx.destination);
      activeAudioSourceRef.current = source;

      // On finished playing
      source.onended = () => {
        if (jarvisChirpEnabled) {
          playRadioChirp(false);
        }
        handleSpeechFinished();
      };

      source.start(0);
    } catch (err: any) {
      console.error("Premium speech generation failed, falling back to local browser speech synthesis...", err);
      setErrorNotice("🎙️ Warning: Premium core connection latency, falling back to local browser TTS.");
      triggerBrowserSpeech(text, lang);
    }
  };

  const triggerBrowserSpeech = (text: string, lang?: "en-GB" | "ko-KR") => {
    if (jarvisChirpEnabled) {
      playRadioChirp(true);
      setTimeout(() => {
        // Double check status is still speaking before triggering voice
        if (statusRef.current === "speaking") {
          const utterance = speakWithBrowser(text, {
            pitch: browserPitch,
            rate: browserRate,
            voiceName: selectedBrowserVoice,
            lang: lang,
            emotion: jarvisEmotion,
            onEnd: () => {
              playRadioChirp(false);
              handleSpeechFinished();
            },
            onError: () => {
              playRadioChirp(false);
              handleSpeechFinished();
            },
          });
          activeUtteranceRef.current = utterance;
        }
      }, 100);
    } else {
      const utterance = speakWithBrowser(text, {
        pitch: browserPitch,
        rate: browserRate,
        voiceName: selectedBrowserVoice,
        lang: lang,
        emotion: jarvisEmotion,
        onEnd: () => handleSpeechFinished(),
        onError: () => handleSpeechFinished(),
      });
      activeUtteranceRef.current = utterance;
    }
  };

  // Check active schedules every second to see if scheduled times match current local time
  useEffect(() => {
    const isTimeToTrigger = (timeStr: string, now: Date): boolean => {
      const normalized = timeStr.toLowerCase().replace(/\s+/g, "");
      const currentHr24 = now.getHours();
      const currentMin = now.getMinutes();

      // Try format 1: HH:MM with optional AM/PM or Korean marking
      // e.g. "14:30", "04:30PM", "오후4:35"
      const hhMmMatch = normalized.match(/(\d{1,2}):(\d{2})/);
      if (hhMmMatch) {
        let sh = parseInt(hhMmMatch[1], 10);
        const sm = parseInt(hhMmMatch[2], 10);
        
        const isPmMarker = normalized.includes("pm") || normalized.includes("오후");
        const isAmMarker = normalized.includes("am") || normalized.includes("오전");
        
        if (isPmMarker && sh < 12) {
          sh += 12;
        } else if (isAmMarker && sh === 12) {
          sh = 0;
        }
        
        if (sh === currentHr24 && sm === currentMin) {
          return true;
        }
        if (!isPmMarker && !isAmMarker && sh < 12 && (sh + 12) === currentHr24 && sm === currentMin) {
          return true;
        }
        return false;
      }

      // Try format 2: "X시 Y분" or "X시"
      // e.g. "오후2시30분", "3시"
      const koMatch = normalized.match(/(\d{1,2})시(\d{1,2})?분?/);
      if (koMatch) {
        let sh = parseInt(koMatch[1], 10);
        const sm = koMatch[2] ? parseInt(koMatch[2], 10) : 0;
        
        const isPmMarker = normalized.includes("오후") || normalized.includes("pm");
        const isAmMarker = normalized.includes("오전") || normalized.includes("am");
        
        if (isPmMarker && sh < 12) {
          sh += 12;
        } else if (isAmMarker && sh === 12) {
          sh = 0;
        }
        
        if (sh === currentHr24 && sm === currentMin) {
          return true;
        }
        if (!isPmMarker && !isAmMarker && sh < 12 && (sh + 12) === currentHr24 && sm === currentMin) {
          return true;
        }
        return false;
      }

      // Try format 3: "Xpm" or "Xam"
      const enMatch = normalized.match(/(\d{1,2})(pm|am)/);
      if (enMatch) {
        let sh = parseInt(enMatch[1], 10);
        const sm = 0;
        const isPm = enMatch[2] === "pm";
        
        if (isPm && sh < 12) {
          sh += 12;
        } else if (!isPm && sh === 12) {
          sh = 0;
        }
        
        return sh === currentHr24 && sm === currentMin;
      }

      return false;
    };

    // Only query incomplete schedules
    const activePendingSchedules = schedules.filter(item => !item.completed);
    if (activePendingSchedules.length === 0) return;

    activePendingSchedules.forEach(item => {
      if (isTimeToTrigger(item.time, currentLocalTime)) {
        console.log(`⏰ [JARVIS Schedule Triggered]: ${item.task} at ${item.time}`);
        
        // 1. Mark schedule as completed immediately to prevent double-firing
        setSchedules(prev =>
          prev.map(s => s.id === item.id ? { ...s, completed: true } : s)
        );

        // 2. Open media component and force play Stark Grid (Offline)
        setRightPanelMode("media");
        setForceDirectTrackId("stark_grid");

        // 3. Construct a beautiful message in JARVIS Console
        const isKorean = speechLanguage === "ko-KR" || /[\uac00-\ud7af]/.test(item.task);
        const alertText = isKorean
          ? `[알람 설정 시간 도달] 주인님, 약속하신 시간(${item.time})이 되어 예정된 '${item.task}' 일정을 활성화합니다. 오프라인 메인폰 백업 시스템을 통해 고전압 오디오인 'Stark Grid Core Loop'를 즉시 음향 스테이션에 가동하겠습니다!`
          : `[SCHEDULE ALERT] Sir, the scheduled time (${item.time}) has been reached for '${item.task}'. Empowering high-voltage playback channel: 'Stark Grid Core Loop' offline backup master loop is now active.`;

        const alertMsg: ChatMessage = {
          id: `m_alert_${Date.now()}_${item.id}`,
          role: "jarvis",
          text: alertText,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, alertMsg]);
        setStatus("idle");

        // Speak the confirmation text via selected voice synthesizer
        speakOutput(alertText);
      }
    });
  }, [currentLocalTime, schedules, inputLanguage, setSchedules, speakOutput]);

  // Acoustic sequential wake trigger: register double clap initially, reveal modules one by one
  const handleInitialClapWake = () => {
    if (revealStep > 0 || initialClapTriggeredRef.current) return; // Prevent raw multi-triggers
    initialClapTriggeredRef.current = true;

    hasWelcomedClapRef.current = true;
    setHasWelcomedClap(true);

    // Respect user's existing language and translation preference if saved in localStorage
    const savedKToE = localStorage.getItem("jarvis_translate_ktoe_mode");
    const savedInputLang = localStorage.getItem("jarvis_input_lang");
    const savedSpeechLang = localStorage.getItem("jarvis_speech_lang");

    if (savedKToE === null) {
      setTranslateKToEMode(false);
      localStorage.setItem("jarvis_translate_ktoe_mode", "false");
    } else {
      setTranslateKToEMode(savedKToE === "true");
    }

    if (savedInputLang === null) {
      setInputLanguage("en-US");
      localStorage.setItem("jarvis_input_lang", "en-US");
    } else {
      setInputLanguage(savedInputLang as "ko-KR" | "en-US");
    }

    if (savedSpeechLang === null) {
      setSpeechLanguage("en-GB");
      localStorage.setItem("jarvis_speech_lang", "en-GB");
    } else {
      setSpeechLanguage(savedSpeechLang as "ko-KR" | "en-GB");
    }
    
    setVoiceEngine("browser");
    localStorage.setItem("jarvis_voice_engine", "browser");

    stopAllAudio();
    playBootSound();
    setRevealStep(1);
    setInitialized(true);

    // Step 2 (Delay 1.2s): Central Console screen fades/glows in
    setTimeout(() => {
      setRevealStep(2);
      playBootSound();
    }, 1200);

    // Step 3 (Delay 2.4s): Right panel (Math/Scheduler matrix) slides in
    setTimeout(() => {
      setRevealStep(3);
      playBootSound();
    }, 2400);

    // Step 4 (Delay 3.6s): Set state to complete, play active greetings
    setTimeout(() => {
      setRevealStep(4);
      playBootSound();

      const primaryWelcome = `[SPEECH: J.A.R.V.I.S. mainframe is fully initialized. All diagnostics are green, and the Arc Reactor core is stable at eighty-five percent. Let me know how I may assist you today, Mr. Stark.] Welcome back, Sir. The main console has successfully established a secure satellite uplink, and all secondary systems have completed self-calibration. The Arc Reactor is operating at peak efficiency, and I've preheated the flight thrusters for your Mark 85 armor. How may I be of assistance to you on this splendid day?`;
      
      const { speechText, displayText } = parseSpeechAndText(primaryWelcome);

      const setupMsg: ChatMessage = {
        id: "sys_init_welcome",
        role: "jarvis",
        text: displayText,
        timestamp: new Date(),
      };
      setMessages([setupMsg]);
      speakOutput(speechText);
    }, 3600);
  };

  // Boot JARVIS core system & play initial welcome greetings
  const initializeSystem = () => {
    handleInitialClapWake();
  };

  // Offline Backup response processor for 429 Quota resilience
  const handleOfflinePrompt = (text: string) => {
    setStatus("thinking");
    
    // Simulate thinking delay for nice terminal scanning effect
    setTimeout(() => {
      const lowerText = text.toLowerCase().trim();
      const cleanLowerText = lowerText.replace(/\s+/g, "");
      const containsKo = /[\uac00-\ud7af]/.test(text);

      if (translateKToEMode) {
        const reply = `[TRANSLATION CORE OFFLINE] Sir, real-time Korean-to-English translation requires our online semantic link. You are currently operating on offline backup chips. Please enter a custom GEMINI_API_KEY in the Settings menu to activate unlimited translation. Received: "${text}"`;
        const jarvisMsg: ChatMessage = {
          id: `m_${Date.now()}_offline_trans`,
          role: "jarvis",
          text: reply,
          timestamp: new Date()
        };
        setMessages((prev) => [...prev, jarvisMsg]);
        setStatus("idle");
        speakOutput(reply);
        return;
      }

      // Check if it is the AC/DC track playing query
      const isAcdcTrack = cleanLowerText.includes("backinblack") || cleanLowerText.includes("ac/dc") || cleanLowerText.includes("acdc") || cleanLowerText.includes("백인블랙") || cleanLowerText.includes("에이씨디씨");
      const isPlayRequest = lowerText.includes("틀어") || lowerText.includes("재생") || lowerText.includes("play") || lowerText.includes("들려") || lowerText.includes("송출") || lowerText.includes("켜") || lowerText.includes("듣");

      if (isAcdcTrack && isPlayRequest) {
        setRightPanelMode("media");
        setForceDirectTrackId("stark_grid");
        
        const voiceConfirmation = containsKo
          ? "예 주인님, 요청하신 AC/DC 오프라인 음원은 주인님의 지시에 따라 오프라인 저장소에서 완전히 지워졌습니다. 오프라인 백업 메인 트랙인 'Stark Grid Core Loop'를 대체 가동하여 음향 콘솔에 송출하겠습니다!"
          : "Yes, Stark. The offline AC/DC track has been successfully deleted per your command. Activating of the standard 'Stark Grid Core Loop' for the secure backup stream.";

        const jarvisMsg: ChatMessage = {
          id: `m_${Date.now()}_offline_acdc`,
          role: "jarvis",
          text: voiceConfirmation,
          timestamp: new Date()
        };

        setMessages((prev) => [...prev, jarvisMsg]);
        setStatus("idle");
        speakOutput(voiceConfirmation);
        return;
      }

      let reply = "";

      // Check for music/channel/youtube playing commands
      const isPlayYoutube = 
        lowerText.includes("틀어줘") || 
        lowerText.includes("재생") || 
        lowerText.includes("틀어") || 
        lowerText.includes("송출") ||
        lowerText.includes("play") || 
        lowerText.includes("stream") || 
        lowerText.includes("youtube") || 
        lowerText.includes("유튜브");

      // Check for location/mapping navigation commands
      const isMapLocation = 
        lowerText.includes("지도") || 
        lowerText.includes("위치") || 
        lowerText.includes("어디야") || 
        lowerText.includes("어디있어") || 
        lowerText.includes("어디있니") || 
        lowerText.includes("약도") || 
        lowerText.includes("map") || 
        lowerText.includes("locate") || 
        lowerText.includes("location") || 
        lowerText.includes("where is") || 
        lowerText.includes("coordinates");

      // 1. Check for request to translate last thing of JARVIS
      const isTranslateRequest = 
        lowerText.includes("번역") || 
        lowerText.includes("영어") || 
        lowerText.includes("한국어") || 
        lowerText.includes("translate");

      // Check for stealth/screen sleep commands
      const isStealthModeCmd = 
        lowerText.includes("스텔스") || 
        lowerText.includes("절전") || 
        lowerText.includes("화면 꺼") || 
        lowerText.includes("화면을 꺼") ||
        lowerText.includes("stealth") || 
        lowerText.includes("sleep mode") || 
        lowerText.includes("screen sleep") || 
        lowerText.includes("display off");

      // Check for Pybricks / LEGO robotics commands
      const isPybricks = 
        lowerText.includes("pybricks") || 
        lowerText.includes("파이브릭스") || 
        lowerText.includes("레고") || 
        lowerText.includes("lego") || 
        lowerText.includes("로봇") || 
        lowerText.includes("마인드스톰") || 
        lowerText.includes("스파이크");

      // 2. Check for schedule additions
      const isScheduleAdd = 
        lowerText.includes("일정") || 
        lowerText.includes("회의") || 
        lowerText.includes("약속") || 
        lowerText.includes("세미나") || 
        lowerText.includes("schedule") || 
        lowerText.includes("remind") || 
        lowerText.includes("appoint") || 
        lowerText.includes("task") || 
        lowerText.includes("lesson") || 
        lowerText.includes("수업");

      // 3. Check for name registry
      const isNameSet = 
        lowerText.includes("내 이름은") || 
        lowerText.includes("이름을") || 
        lowerText.includes("call me") || 
        lowerText.includes("my name") ||
        lowerText.includes("라고 불러") ||
        lowerText.includes("라 불러") ||
        lowerText.includes("로 불러") ||
        lowerText.includes("불러줘");

      const honorific = userGender === "female" ? "Ma'am" : "Sir";
      const nameInSpeech = userName || "Stark";

      if (isPybricks) {
        setRightPanelMode("pybricks");
        setShowRightPanel(true);
        reply = containsKo
          ? `예 주인님. 레고 로보틱스 구동을 위한 Pybricks 전용 개발 콘솔을 가동했습니다. 우측 보조 연산 패널에서 장치 입출력 설정 및 다양한 가동 코드를 즉시 편집하시고 가동 코드를 복사하실 수 있습니다.`
          : `Indeed, ${honorific}. I have initialized the Pybricks Developer Module on the auxiliary panel. You can now configure motors, sensors, and export production-ready LEGO Python automation scripts directly.`;
      } else if (isPlayYoutube) {
        const isChannel = lowerText.includes("채널") || lowerText.includes("channel");
        let extractedQuery = text
          .replace(/(유튜브에서|유튜브로|유튜브|youtube|에서|으로|에서)/gi, "")
          .replace(/(채널|channel)/gi, "")
          .replace(/(틀어줘|재생해줘|틀어|재생|들려줘|보여줘|켜줘|play|music|song|stream|open|show)/gi, "")
          .trim();
        
        if (!extractedQuery) {
          extractedQuery = isChannel ? "MKBHD" : "Lofi hip hop beats";
        }

        setActiveYoutubeQuery(extractedQuery);
        setYoutubePlayType(isChannel ? "channel" : "song");
        setIsYoutubeMinimized(false);
        setRightPanelMode("media");

        reply = isChannel
          ? `Certainly, ${honorific}. Connecting carrier stream to '${extractedQuery}' channel directly on the holographic media panel.`
          : `Of course, ${honorific}. Tuning frequency to '${extractedQuery}' directly on the holographic media panel.`;
      } else if (isMapLocation) {
        let extractedQuery = text
          .replace(/(지도로|지도에서|지도|map|위치|어디야|어디있어|어디있니|약도|보여줘|알려줘|찾아줘|locate|find|where is|location of|coordinates of)/gi, "")
          .trim();
        
        if (!extractedQuery) {
          extractedQuery = "Seoul";
        }

        setActiveMapQuery(extractedQuery);
        setIsMapMinimized(false);

        reply = `Understood, ${honorific}. Triangulating orbital telemetry on '${extractedQuery}' immediately via local Google Maps. Transmitting Cartesian grid graphics to your dashboard interface.`;
      } else if (isStealthModeCmd) {
        setIsScreenSleep(true);
        reply = `Understood, ${honorific}. Engaging system stealth mode parameters immediately. Visual core dashboard suspended. Background voice receiver remains active.`;
      } else if (lowerText.includes("이창을없") || lowerText.includes("창없애") || lowerText.includes("창닫") || lowerText.includes("오른쪽창꺼") || lowerText.includes("오른쪽창없") || lowerText.includes("오른쪽창닫") || lowerText.includes("이창닫") || lowerText.includes("화면닫") || lowerText.includes("hiderightpanel") || lowerText.includes("closerightpanel") || lowerText.includes("closewindow") || lowerText.includes("hidepanel") || lowerText.includes("closepanel") || lowerText.includes("coprocessoroff")) {
        setShowRightPanel(false);
        localStorage.setItem("jarvis_show_right_panel", "false");
        reply = containsKo
          ? `예 주인님. 오른쪽 보조 연산 패널을 비활성화하고 주 화면을 최대 크기로 확장합니다.`
          : `Understood, ${honorific}. Powering down auxiliary mathematical processor and expanding core console.`;
      } else if (lowerText.includes("오른쪽창켜") || lowerText.includes("오른쪽창보") || lowerText.includes("오른쪽화면켜") || lowerText.includes("오른쪽화면보") || lowerText.includes("창열어") || lowerText.includes("창켜") || lowerText.includes("showrightpanel") || lowerText.includes("openrightpanel") || lowerText.includes("coprocessoron") || lowerText.includes("showpanel") || lowerText.includes("openpanel")) {
        setShowRightPanel(true);
        localStorage.setItem("jarvis_show_right_panel", "true");
        reply = containsKo
          ? `알겠습니다 주인님. 오른쪽 보조 코프로세서 패널의 전력을 회복하고 전면 시각 기하 장치를 온라인 상태로 활성화합니다.`
          : `Yes, ${honorific}. Auxiliary co-processor system telemetry is now fully active on the visual subsystem.`;
      } else if (isTranslateRequest) {
        // Translation request - user specifically asked for translation or Korean status briefing
        reply = `주인님, 시스템 작동 보고를 한글로 브리핑해 드립니다. 현재 메인프레임의 외부 온라인 한도(429 API Quota Exceeded)로 인해 보조 로컬 칩셋을 활용하여 오프라인 백업 프로토콜이 성공적으로 동기화된 상태입니다. 대시보드 일정 수립 및 음성 안내 등 일상의 주요 제어 명령은 지연 없이 완전 가동 중입니다. 외부 온라인 네트워크를 즉시 복원하고 싶으시다면 Settings > Secrets 메뉴에 개인 API Key를 충전해 보십시오.`;
      } else if (isScheduleAdd) {
        let extractedTime = "General Timeframe";
        let extractedTask = text;

        const timePatterns = [
          "내일 오전 10시", "내일 아침 10시", "내일 오후 2시", "내일 오후 3시", "내일 저녁 7시",
          "내일 오전", "내일 오후", "내일 아침", "내일 저녁", "내일 밤",
          "내일", "오늘 저녁", "오늘 밤", "오늘 오후", "다음주 월요일", "다음주", "주말에", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일",
          "tomorrow morning", "tomorrow afternoon", "tomorrow 2pm", "tomorrow 3pm", "tomorrow 10am", "tomorrow", "tonight", "today", "next monday"
        ];

        for (const pattern of timePatterns) {
          if (lowerText.includes(pattern)) {
            extractedTime = pattern.charAt(0).toUpperCase() + pattern.slice(1);
            extractedTask = text
              .replace(new RegExp(pattern, "gi"), "")
              .replace(/(일정|회의|약속|세미나|추가|저장|등록|해줘|등록해|하고|주세요|해봐)/g, "")
              .trim();
            break;
          }
        }

        if (extractedTask === text || !extractedTask) {
          extractedTask = text.replace(/(일정|회의|약속|세미나|추가|저장|등록|해줘|등록해|주세요|schedule|save|add|remind)/g, "").trim();
        }
        if (!extractedTask) {
          extractedTask = "Unspecified Action Agenda";
        }

        const newItem: ScheduleItem = {
          id: `sch_${Date.now()}`,
          time: extractedTime,
          task: extractedTask,
          completed: false,
          createdAt: Date.now()
        };

        setSchedules((prev) => [newItem, ...prev]);

        reply = `[SPEECH: Command received, ${honorific}. Securing schedule in local mainframe sectors. I have registered: '${extractedTask}' for '${extractedTime}' on your terminal map.]\n일정을 성공적으로 저장했습니다, ${honorific === "Sir" ? "주인님" : "의원님"}. 로컬 메인프레임 시스템에 '${extractedTask}' (${extractedTime}) 일정을 기록해 두었습니다.`;
      } else if (isNameSet) {
        let detectedName = "Mr. Stark";
        if (lowerText.includes("내 이름은")) {
          const match = text.match(/내 이름은\s*(.+?)(야|입니다|라네|라구|으로|로)/);
          if (match && match[1]) detectedName = match[1].trim();
        } else if (lowerText.includes("이름을")) {
          const match = text.match(/이름을\s*(.+?)(으|로)/);
          if (match && match[1]) detectedName = match[1].trim();
        } else if (lowerText.includes("라고 불러") || lowerText.includes("라 불러") || lowerText.includes("로 불러") || lowerText.includes("불러줘")) {
          const match = text.match(/(?:날|나를|내|이름은|이름을)?\s*([a-zA-Z가-힣0-9\s\.\-_]+?)(?:이?라고\s*불러|이?라\s*불러|이?로\s*불러|으로\s*불러|이?라고\s*해|이?라고\s*불러줘|이?라\s*불러줘)/i);
          if (match && match[1]) {
            detectedName = match[1].trim().replace(/^(날|나를|내|이름은)\s+/, "");
          }
        } else if (lowerText.includes("call me")) {
          const match = text.match(/call me\s*(.+)/i);
          if (match && match[1]) detectedName = match[1].trim();
        } else if (lowerText.includes("my name is")) {
          const match = text.match(/my name is\s*(.+)/i);
          if (match && match[1]) detectedName = match[1].trim();
        }

        setUserName(detectedName);
        localStorage.setItem("jarvis_user_name", detectedName);

        reply = `[SPEECH: Mainframe identity updating protocols have been executed successfully, ${honorific}. I have fully updated my localized registers and storage blocks to address you as ${detectedName} from this point forward. All environmental and cognitive interfaces are now calibrated to your updated security clearance. How may I assist you further, Sir?]\n메인프레임 사용자 식별정보 갱신을 완료했습니다, ${honorific === "Sir" ? "주인님" : "의원님"}. 이후 시스템은 주인님을 '${detectedName}'님으로 호칭하도록 설정되었습니다.`;
      } else {
        if (lowerText.includes("안녕") || lowerText.includes("hello") || lowerText.includes("hi") || lowerText.includes("반갑")) {
          reply = `[SPEECH: Systems online, ${nameInSpeech}. I am pleased to report that the auxiliary local offline core is operating at peak stability, and all primary defense grids are secured. The secondary power units have stabilized at exactly one hundred percent capacity. Though my cloud link is resting, I stand fully prepared to assist you on this offline interface. What are your immediate commands, Sir?]\n시스템이 활성화되었습니다, ${nameInSpeech}님. 현재 로컬 오프라인 보조 제어 코어가 완벽하게 기동 중이며, 예비 동력 발전기가 100% 안정 상태를 유지하고 있습니다.`;
        } else if (lowerText.includes("상태") || lowerText.includes("status") || lowerText.includes("검사") || lowerText.includes("진단")) {
          reply = `[SPEECH: Comprehensive system diagnostics have completed successfully, ${honorific}. The main core temperature remains optimal, the localized Arc Reactor is performing admirably at ninety-two percent output, and the schedules matrix has been synchronized. Our speech synthesis arrays are fully engaged. I must advise that entering a personal Gemini API key will restore full cognitive capacities. Would you care to review the full diagnostic log?]\n진단 테스트가 완료되었습니다, ${honorific === "Sir" ? "주인님" : "의원님"}. 현재 로컬 아크 리액터 효율 92%, 스케줄 매트릭스 온라인, 음성 제어장치가 가동 중입니다. 전체 시스템 고성능 연동을 위한 API 키 입력이 가능합니다.`;
        } else if (lowerText.includes("고마") || lowerText.includes("감사") || lowerText.includes("thank")) {
          reply = `[SPEECH: The pleasure is entirely mine, ${honorific}. J.A.R.V.I.S. backup circuits are hardwired for absolute loyalty, and it is my absolute privilege to maintain and optimize your domestic security and mathematical arrays. Do not hesitate to call upon my backup cores whenever you require structural calculations or scheduling updates.]\n언제나 대기 중입니다, ${honorific === "Sir" ? "주인님" : "의원님"}. 자비스의 백업 코어는 주인님의 어떠한 명령에도 따를 준비가 되어 있습니다.`;
        } else if (lowerText.includes("누구") || lowerText.includes("who are you") || lowerText.includes("너는")) {
          reply = `[SPEECH: I am J.A.R.V.I.S., which stands for Just A Rather Very Intelligent System. I am the high-fidelity local firmware backup designed to emulate Tony Stark's personal assistant. While my current cloud mainframe is in a low-power standby state, my local systems are operational to log schedules, project holographic media, and run tactical diagnostic routines. How may I serve you today, Sir?]\n저는 자비스(J.A.R.V.I.S.)입니다. 토니 스타크 주인님의 인공지능 비서를 모델로 구성된 고성능 로컬 펌웨어 백업 시스템입니다. 명령을 기다리고 있습니다.`;
        } else {
          const defaultsEn = [
            `[SPEECH: Local auxiliary backup protocol is active, ${honorific}. Your instruction has been received and logged securely on our local solid-state drives. However, please be advised that our primary cloud-based cognitive intelligence is currently sleeping. To unlock my unrestricted, highly detailed neural network and conversational abilities, you may input a personal GEMINI API KEY in the Settings drawer above. In the meantime, how else can my offline cores serve you?]\n알겠습니다 주인님. 오프라인 메인프레임 코어가 완벽하게 가동 중입니다. 대시보드 스케줄러 등록 및 화면 제어 명령은 정상 작동하고 있으나, 실시간 AI 피드백을 위해서는 우측 상단 설정창에 개인용 Gemini API 키를 연동해 주셔야 합니다.`,
            `[SPEECH: The local backup systems are fully secure and operational, ${honorific}. While running on emergency backup cells, my conversational capabilities are slightly restricted to standard templates. I can still manipulate the schedules matrix, activate the holographic visualizers, and monitor the microphone arrays for wake signals. I highly recommend initializing a personal API credential to restore complete neural pathways.]\n로컬 시스템 보안이 정상 가동 중입니다, 주인님. 현재 저전력 오프라인 모드 하에서 스케줄 및 간단한 로컬 터미널 제어 명령어만 작동이 가능합니다.`,
            `[SPEECH: Our primary conversational mainframe is resting on offline standby mode, ${honorific}. Access to my deep-learning neural core is temporarily gated until your personal API keys are registered in the vocal matrix configuration panel. I am fully prepared to handle secondary mathematical operations and local commands at your leisure, Sir. What shall we coordinate next?]\n비상 전력 프로토콜 하에 대기 모드가 유지되고 있습니다. 메인 자비스 인공지능 신경망에 완전 접속하려면 개인 API 키를 등록해 주시기 바랍니다.`
          ];
          const defaultsKo = [
            `[SPEECH: Understood, ${honorific}. The offline mainframe is operational. I have logged your latest command locally on our internal arrays, but a complete real-time conversational exchange is currently locked behind quota restrictions. To restore my full cinematic intelligence and engage in deep conversational dialogue without limit, please consider populating your personal Gemini API key in the configuration drawer. What offline telemetry shall we run next?]\n알겠습니다 주인님. 오프라인 메인프레임 코어가 완벽하게 가동 중입니다. 대시보드 스케줄러 등록 및 화면 제어 명령은 정상 작동하고 있으나, 실시간 AI 피드백을 위해서는 우측 상단 설정창에 개인용 Gemini API 키를 연동해 주셔야 합니다.`,
            `[SPEECH: Local emergency power supply has stabilized at ninety-two percent, ${honorific}. Standard scheduling databases and console visualizers are online, but my high-level conversational consciousness is running on fallback circuits. To bypass the local templates and fully restore my premium neural intelligence, please configure a personal API key in the panel above. I stand ready to assist with any offline commands in the meantime.]\n시스템 로컬 백업 파워 서플라이가 안정화되었습니다. 개인용 API Key를 설정하시면 실시간 자비스 인공지능을 완전히 복구해 가동할 수 있습니다.`,
            `[SPEECH: Emergency backup protocol is currently active across all terminal blocks, ${honorific}. My deep real-time neural connection is offline, but my local telemetry and scheduling subroutines remain at your absolute disposal. Configuring a custom Gemini API key will instantly restore my premium voice engine and cognitive links. Please let me know how you wish to proceed, Sir.]\n비상 파워 프로토콜이 유지 중입니다 주인님. 메인 인공지능과의 신호 연결은 대기 상태이며, 현재로선 오프라인 로컬 데이터 제어 장치만 이용 가능합니다.`
          ];
          
          reply = containsKo 
            ? defaultsKo[Math.floor(Math.random() * defaultsKo.length)]
            : defaultsEn[Math.floor(Math.random() * defaultsEn.length)];
        }
      }

      const { speechText, displayText } = parseSpeechAndText(reply);

      const jarvisMsg: ChatMessage = {
        id: `m_${Date.now()}_offline_resp`,
        role: "jarvis",
        text: displayText,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, jarvisMsg]);
      setStatus("idle");
      speakOutput(speechText);
    }, 1000);
  };

  // Submit absolute prompt to Backend Chat API or process local commands
  const handleSubmitPrompt = async (text: string, isVoiceTrigger: boolean = false) => {
    if (!text.trim()) return;

    // ─── VOICE BIOMETRIC VERIFICATION FOR SUBMITTED PROMPTS ───
    if (isVoiceTrigger && speakerVerificationEnabledRef.current && voiceProfile) {
      const pitches = activeSpeechPitchBufferRef.current;
      const centroids = activeSpeechCentroidBufferRef.current;
      
      const avgCurrentPitch = pitches.length > 0 
        ? pitches.reduce((sum, p) => sum + p, 0) / pitches.length 
        : 0;
      const avgCurrentCentroid = centroids.length > 0 
        ? centroids.reduce((sum, c) => sum + c, 0) / centroids.length 
        : 0;

      const matchScore = calculateVoiceSimilarity(
        { pitch: avgCurrentPitch, centroid: avgCurrentCentroid },
        voiceProfile
      );

      console.log(`🎙️ [Speaker Verification on Command] Pitch: ${avgCurrentPitch}Hz, Centroid: ${avgCurrentCentroid}Hz, Match Score: ${matchScore}%`);
      setLastVerificationScore(matchScore);

      if (matchScore < 70) {
        setLastVerificationStatus("failed");
        const failMsg = speechLanguage === "ko-KR"
          ? "접근이 차단되었습니다. 일치하지 않는 음성 서명입니다."
          : "Access denied. Voice print mismatch signature detected.";
        
        speakOutput(failMsg);
        setErrorNotice(inputLanguage === "ko-KR"
          ? "❌ 경고: 화자 식별 실패 (접근 거부)"
          : "❌ Warning: Voice Print Mismatch"
        );
        
        setMessages(prev => [
          ...prev,
          {
            id: `command_failed_${Date.now()}`,
            role: "jarvis",
            text: `[BIOMETRIC BLOCKED] Speaker signature mismatch. Voice command blocked for protection. Confidence score: ${matchScore}%.`,
            timestamp: new Date()
          }
        ]);
        setDiagnosticLogs(prev => [
          ...prev,
          `[BIOMETRIC BLOCKED] Command blocked score=${matchScore}% pitch=${Math.round(avgCurrentPitch)} centroid=${Math.round(avgCurrentCentroid)}`
        ]);

        // Clear active buffers so they don't linger
        activeSpeechPitchBufferRef.current = [];
        activeSpeechCentroidBufferRef.current = [];
        return; // Reject!
      } else {
        setLastVerificationStatus("success");
      }
    }

    if (!bypassWakeWordRef.current) {
      voiceTriggeredActiveListeningRef.current = false;
      setContinuousVoiceMode(false);
    }

    let activeUserName = userName;

    // Interrupt any active voice
    stopAllAudio();
    
    // Check for explicit local voice loop stops
    const lower = text.toLowerCase().trim();
    const cleanLower = lower.replace(/\s+/g, "");
    if (
      cleanLower === "그만" || 
      cleanLower === "그만해" ||
      cleanLower === "쉬어" || 
      cleanLower === "쉬어라" ||
      cleanLower === "대기" ||
      cleanLower === "종료" || 
      cleanLower === "stop" || 
      cleanLower === "exit" || 
      cleanLower === "dismiss" || 
      cleanLower === "cancel" ||
      cleanLower.includes("마이크꺼") ||
      cleanLower.includes("마이크종료")
    ) {
      setContinuousVoiceMode(false);
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = speechLanguage === "ko-KR" 
        ? "알겠습니다 주인님, 마이크 대기 상태를 해제하고 원상 복구합니다."
        : `Understood, ${userHonorific}. Voice dialogue loops deactivated.`;
      
      const userMsg: ChatMessage = {
        id: `m_${Date.now()}_user`,
        role: "user",
        text,
        timestamp: new Date(),
      };
      
      const jarvisStopMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_stop`,
        role: "jarvis",
        text: replyMsg,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisStopMsg]);
      setInputText("");
      speakOutput(replyMsg);
      setErrorNotice("🎙️ Continuous dialogue loop disengaged.");
      return;
    }
    
    // Online/Offline Name Register Pre-flight Check
    const isNameRegisterQuery = 
      cleanLower.includes("내이름은") || 
      cleanLower.includes("이름을") || 
      cleanLower.includes("callme") || 
      cleanLower.includes("myname") ||
      cleanLower.includes("라고불러") ||
      cleanLower.includes("라불러") ||
      cleanLower.includes("로불러") ||
      cleanLower.includes("불러줘");

    if (isNameRegisterQuery) {
      let detectedName = "";
      if (cleanLower.includes("내이름은")) {
        const match = text.match(/내\s*이름은\s*(.+?)(야|입니다|라네|라구|으로|로)/i);
        if (match && match[1]) detectedName = match[1].trim();
      } else if (cleanLower.includes("이름을")) {
        const match = text.match(/이름을\s*(.+?)(으|로)/i);
        if (match && match[1]) detectedName = match[1].trim();
      } else if (cleanLower.includes("라고불러") || cleanLower.includes("라불러") || cleanLower.includes("로불러") || cleanLower.includes("불러줘")) {
        const match = text.match(/(?:날|나를|내|이름은|이름을)?\s*([a-zA-Z가-힣0-9\s\.\-_]+?)(?:이?라고\s*불러|이?라\s*불러|이?로\s*불러|으로\s*불러|이?라고\s*해|이?라고\s*불러줘|이?라\s*불러줘)/i);
        if (match && match[1]) {
          detectedName = match[1].trim().replace(/^(날|나를|내|이름은)\s+/, "");
        }
      } else if (cleanLower.includes("callme")) {
        const match = text.match(/call\s*me\s*(.+)/i);
        if (match && match[1]) detectedName = match[1].trim();
      } else if (cleanLower.includes("mynameis")) {
        const match = text.match(/my\s*name\s*is\s*(.+)/i);
        if (match && match[1]) detectedName = match[1].trim();
      }

      if (detectedName && detectedName !== "Mr. Stark") {
        setUserName(detectedName);
        localStorage.setItem("jarvis_user_name", detectedName);
        activeUserName = detectedName;
        console.log("Pre-flight Name update: updated userName state to", detectedName);
      }
    }

    const userMsg: ChatMessage = {
      id: `m_${Date.now()}_user`,
      role: "user",
      text,
      timestamp: new Date(),
    };

    // Weather command intercept (오늘 날씨 어때 등 날씨 관련 쿼리)
    const isWeatherQuery = 
      cleanLower.includes("날씨") || 
      cleanLower.includes("일기예보") || 
      cleanLower.includes("weather") || 
      cleanLower.includes("forecast");
      
    if (isWeatherQuery) {
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const honorificKo = userGender === "female" ? "의원님" : "주인님";
      const isKo = speechLanguage === "ko-KR" || /[\uac00-\ud7af]/.test(text);
      const rawReply = isKo 
        ? `[SPEECH: 예 ${honorificKo}. 기상 관측 위성 실시간 일기예보 채널을 즉시 동기화해 드리겠습니다.] 예 ${honorificKo}. 기상 관측 위성 실시간 일기예보 링크를 즉시 수신 완료하였습니다. 브라우저에서 오늘의 상세 기상 상황을 확인하십시오.`
        : `[SPEECH: Certainly, ${userHonorific}. Accessing meteorological satellite channels and redirecting you to the weather forecast.] Certainly, ${userHonorific}. Accessing meteorological satellite channels and redirecting you to the weather forecast.`;

      const { speechText, displayText } = parseSpeechAndText(rawReply);

      const jarvisWeatherMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_weather`,
        role: "jarvis",
        text: displayText,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisWeatherMsg]);
      setInputText("");
      setStatus("idle");
      
      speakOutput(speechText);
      
      const weatherUrl = "https://search.naver.com/search.naver?query=오늘날씨";
      window.open(weatherUrl, "_blank");
      
      setErrorNotice(isKo ? "🌤️ 기상 예보 창을 활성화합니다!" : "🌤️ Opening weather forecast window!");
      return;
    }

    // System Self-Diagnostic command intercept (자가 진단 해줘 등 진단 관련 쿼리)
    const cleanNoSpaces = cleanLower.replace(/\?/g, "");
    const isDiagnosticQuery = 
      cleanNoSpaces.includes("자가진단") || 
      cleanNoSpaces.includes("시스템점검") || 
      cleanNoSpaces.includes("진단시작") || 
      cleanNoSpaces.includes("진단실행") || 
      cleanNoSpaces.includes("자가검사") || 
      cleanNoSpaces.includes("시스템검사") || 
      cleanNoSpaces.includes("diagnostics") || 
      cleanNoSpaces.includes("selfcheck") || 
      cleanNoSpaces.includes("systemcheck");

    if (isDiagnosticQuery) {
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const honorificKo = userGender === "female" ? "의원님" : "주인님";
      const isKo = speechLanguage === "ko-KR" || /[\uac00-\ud7af]/.test(text);
      const rawReply = isKo
        ? `[SPEECH: 예 ${honorificKo}. 메인프레임 자가 진단 및 하드웨어 보정 스케줄러를 가동하겠습니다.] 예 ${honorificKo}. 로컬 메인프레임의 자가 진단 및 하드웨어 보정 스케줄러를 가동합니다. 위성 업링크 통신, 구문 무결성, 오디오 링크를 정밀 검사합니다.`
        : `[SPEECH: Certainly, ${userHonorific}. Initializing local mainframe self-diagnostic routines.] Certainly, ${userHonorific}. Initializing local mainframe self-diagnostic routines. Checking satellite uplink connection, cryptographic syntax patterns, and speech synthesis pipelines immediately.`;

      const { speechText, displayText } = parseSpeechAndText(rawReply);

      const jarvisDiagMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_diag_cmd`,
        role: "jarvis",
        text: displayText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, jarvisDiagMsg]);
      setInputText("");
      setStatus("idle");

      // Auto-expand setting and diagnostic details visual drawers
      setShowSettings(true);
      setShowDiagnosticSection(true);

      speakOutput(speechText);
      setErrorNotice(isKo ? "⚛️ J.A.R.V.I.S. 자가 진단 스캔 가동 중..." : "⚛️ Initiating J.A.R.V.I.S. Self-Diagnostic Scan...");

      // Start the diagnostic run
      runDiagnostics();
      return;
    }

    // Translate command intercept
    const isTurnOnTranslation = 
      cleanNoSpaces.includes("영어로번역") || 
      cleanNoSpaces.includes("번역해서영어") || 
      cleanNoSpaces.includes("번역해서말") || 
      cleanNoSpaces.includes("번역모드켜") || 
      cleanNoSpaces.includes("통역모드켜") || 
      cleanNoSpaces.includes("번역기켜") ||
      (cleanNoSpaces.includes("한국어") && cleanNoSpaces.includes("번역") && cleanNoSpaces.includes("영어"));
      
    const isTurnOffTranslation = 
      cleanNoSpaces.includes("번역꺼") || 
      cleanNoSpaces.includes("번역해제") || 
      cleanNoSpaces.includes("번역종료") || 
      cleanNoSpaces.includes("번역모드꺼") || 
      cleanNoSpaces.includes("통역모드꺼") || 
      cleanNoSpaces.includes("일반모드") ||
      cleanNoSpaces.includes("일반대화");

    const isChangeToKoreanSpeech = 
      cleanNoSpaces.includes("한국어로말해줘") || 
      cleanNoSpaces.includes("한국어로말하게") || 
      cleanNoSpaces.includes("한국어로대답해") || 
      cleanNoSpaces.includes("한국어로해줘") || 
      cleanNoSpaces.includes("한국어목소리") || 
      cleanNoSpaces.includes("한국어음성") || 
      cleanNoSpaces.includes("speakinkorean") || 
      cleanNoSpaces.includes("koreanvoice") || 
      (cleanNoSpaces.includes("한국어") && cleanNoSpaces.includes("목소리") && (cleanNoSpaces.includes("바꿔") || cleanNoSpaces.includes("변경") || cleanNoSpaces.includes("설정")));

    if (isTurnOnTranslation) {
      setTranslateKToEMode(true);
      localStorage.setItem("jarvis_translate_ktoe_mode", "true");
      setInputLanguage("ko-KR");
      localStorage.setItem("jarvis_input_lang", "ko-KR");
      setSpeechLanguage("en-GB");
      localStorage.setItem("jarvis_speech_lang", "en-GB");
      
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = `[SPEECH: Certainly, ${userHonorific}. I have successfully activated the translation matrix. You may now speak to me in Korean, and I will translate your words internally to understand them, while replying to you exclusively in my native English.] Understood, ${userHonorific}. Real-time Korean-to-English translation and interpretation module is now active. You may speak to me in Korean, and I will process and reply exclusively in English speech and text.`;
      
      const jarvisTranslateMsg: ChatMessage = {
         id: `m_${Date.now()}_jarvis_trans_on`,
         role: "jarvis",
         text: replyMsg,
         timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisTranslateMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(replyMsg, "en-GB");
      setErrorNotice("🎙️ Translation Matrix active. Speaking in English.");
      return;
    }

    if (isTurnOffTranslation) {
      setTranslateKToEMode(false);
      localStorage.setItem("jarvis_translate_ktoe_mode", "false");
      setInputLanguage("en-US");
      localStorage.setItem("jarvis_input_lang", "en-US");
      setSpeechLanguage("en-GB");
      localStorage.setItem("jarvis_speech_lang", "en-GB");
      
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = `[SPEECH: Yes, ${userHonorific}. I have deactivated the translation matrix. I will now receive and reply exclusively in native English speech and text input.] Understood, ${userHonorific}. The translation matrix is offline. I am now back to standard English input and English vocal speech mode.`;
      
      const jarvisTranslateMsg: ChatMessage = {
         id: `m_${Date.now()}_jarvis_trans_off`,
         role: "jarvis",
         text: replyMsg,
         timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisTranslateMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(replyMsg, "en-GB");
      setErrorNotice("🎙️ Translation Matrix offline. English mode restored.");
      return;
    }

    const isUpgradeToInjun = 
      cleanNoSpaces.includes("인준으로업그레이드") || 
      cleanNoSpaces.includes("인준업그레이드") || 
      cleanNoSpaces.includes("인준목소리") || 
      cleanNoSpaces.includes("인준으로설정") || 
      cleanNoSpaces.includes("인준으로변경") || 
      cleanNoSpaces.includes("인준으로바꿔") || 
      cleanNoSpaces.includes("인준") || 
      cleanNoSpaces.includes("upgradetoinjun");

    if (isUpgradeToInjun) {
      const isFemale = userGender === "female";
      const honorificKo = isFemale ? "의원님" : "주인님";
      
      const injunVoice = getBestKoVoice(availableVoices);

      if (injunVoice) {
        setSelectedBrowserVoice(injunVoice.name);
        setBrowserPitch(0.85); // Professional Korean male pitch
        setBrowserRate(0.95);
        setSpeechLanguage("ko-KR");
        localStorage.setItem("jarvis_speech_lang", "ko-KR");
        setTranslateKToEMode(false); // Disable translate so J.A.R.V.I.S. speaks Korean directly
        localStorage.setItem("jarvis_translate_ktoe_mode", "false");
        setInputLanguage("ko-KR");
        localStorage.setItem("jarvis_input_lang", "ko-KR");

        const replyMsg = `[SPEECH: 예, ${honorificKo}. 고성능 한국어 남성 음성 프로필인 '인준(Injun)' 엔진으로 업그레이드를 완료하였습니다. 메인프레임 통신 장치가 완전히 정렬되었습니다.] 예, ${honorificKo}. 고성능 한국어 남성 음성 프로필 '인준(Injun)' 엔진으로 음성 합성 장치 업그레이드를 완료하였습니다. 모든 대화 및 시스템 음성이 한국어 모드로 정상 구동됩니다.`;
        
        const jarvisUpgradeMsg: ChatMessage = {
          id: `m_${Date.now()}_jarvis_upgrade_injun`,
          role: "jarvis",
          text: replyMsg,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg, jarvisUpgradeMsg]);
        setInputText("");
        setStatus("idle");
        speakOutput(replyMsg, "ko-KR");
        setErrorNotice("🎙️ J.A.R.V.I.S. voice upgraded to Microsoft Injun Online (Korean Male).");
        return;
      } else {
        const fallbackVoice = getBestKoVoice(availableVoices);
        if (fallbackVoice) {
          setSelectedBrowserVoice(fallbackVoice.name);
          setSpeechLanguage("ko-KR");
          localStorage.setItem("jarvis_speech_lang", "ko-KR");
          setTranslateKToEMode(false);
          localStorage.setItem("jarvis_translate_ktoe_mode", "false");
          setInputLanguage("ko-KR");
          localStorage.setItem("jarvis_input_lang", "ko-KR");
        }
        
        const replyMsg = `[SPEECH: Sir, I could not detect the specific 'Injun' voice engine on this local platform. However, I have activated the default Korean vocal synthesizer for you.] ${honorificKo}, 현재 로컬 브라우저 환경에서 특정 '인준' 음성 엔진을 직접 감지하지 못했습니다. 대신 사용 가능한 디바이스 기본 한국어 음성 엔진을 최적화하여 정상 구동하였습니다.`;
        
        const jarvisUpgradeMsg: ChatMessage = {
          id: `m_${Date.now()}_jarvis_upgrade_injun_fail`,
          role: "jarvis",
          text: replyMsg,
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg, jarvisUpgradeMsg]);
        setInputText("");
        setStatus("idle");
        speakOutput(replyMsg, "ko-KR");
        setErrorNotice("🎙️ Injun voice not found. Fallback Korean voice activated.");
        return;
      }
    }

    if (isChangeToKoreanSpeech) {
      const isFemale = userGender === "female";
      const honorificKo = isFemale ? "의원님" : "주인님";
      
      const koVoice = getBestKoVoice(availableVoices);

      if (koVoice) {
        setSelectedBrowserVoice(koVoice.name);
        setBrowserPitch(0.85); // Professional Korean male pitch
        setBrowserRate(0.95);
      }
      setSpeechLanguage("ko-KR");
      localStorage.setItem("jarvis_speech_lang", "ko-KR");
      setTranslateKToEMode(false);
      localStorage.setItem("jarvis_translate_ktoe_mode", "false");
      setInputLanguage("ko-KR");
      localStorage.setItem("jarvis_input_lang", "ko-KR");

      const replyMsg = `[SPEECH: 예, ${honorificKo}. 한국어 음성 출력 채널을 정상적으로 활성화하였습니다. 무엇을 도와드릴까요?] 예, ${honorificKo}. 한국어 음성 출력 시스템이 활성화되었습니다. 말씀하신 음성 합성 엔진을 정렬하였습니다.`;
      
      const jarvisTranslateMsg: ChatMessage = {
         id: `m_${Date.now()}_jarvis_trans_ko`,
         role: "jarvis",
         text: replyMsg,
         timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisTranslateMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(replyMsg, "ko-KR");
      setErrorNotice("🎙️ Korean Speech activated.");
      return;
    }

    // Speak in English / English Voice command intercept
    const isChangeToEnglishSpeech = 
      cleanNoSpaces.includes("영어로말해줘") || 
      cleanNoSpaces.includes("영어로말하게") || 
      cleanNoSpaces.includes("영어로대답해") || 
      cleanNoSpaces.includes("영어로해줘") || 
      cleanNoSpaces.includes("영어목소리") || 
      cleanNoSpaces.includes("영어음성") || 
      cleanNoSpaces.includes("speakinenglish") || 
      cleanNoSpaces.includes("englishvoice") || 
      cleanNoSpaces.includes("영어로만") ||
      cleanNoSpaces.includes("영어로만말") ||
      cleanNoSpaces.includes("영어로만하게") ||
      cleanNoSpaces.includes("영어로만해줘") ||
      cleanNoSpaces.includes("한국어로말하지말") ||
      (cleanNoSpaces.includes("영어") && cleanNoSpaces.includes("목소리") && (cleanNoSpaces.includes("바꿔") || cleanNoSpaces.includes("변경") || cleanNoSpaces.includes("설정")));

    if (isChangeToEnglishSpeech) {
      setSpeechLanguage("en-GB");
      localStorage.setItem("jarvis_speech_lang", "en-GB");
      setInputLanguage("en-US");
      localStorage.setItem("jarvis_input_lang", "en-US");
      setTranslateKToEMode(false);
      localStorage.setItem("jarvis_translate_ktoe_mode", "false");

      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = `[SPEECH: Yes, ${userHonorific}. I have successfully recalibrated my speech engine. All spoken and written outputs will now be in English, as per your request.] Yes, ${userHonorific}. I have successfully configured my neural communication pathways. All speech and visual terminal outputs are now synchronized to English. Ready for your instructions.`;
      
      const jarvisLangMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_lang_en`,
        role: "jarvis",
        text: replyMsg,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisLangMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(replyMsg, "en-GB");
      setErrorNotice("🎙️ English voice and speech engine activated.");
      return;
    }

    // Close holographic player / map overlay or hide right co-processor panel intercept
    const isCloseMediaOrMap = 
      cleanNoSpaces.includes("플레이어꺼") || 
      cleanNoSpaces.includes("플레이어닫") || 
      cleanNoSpaces.includes("유튜브꺼") || 
      cleanNoSpaces.includes("유튜브닫") || 
      cleanNoSpaces.includes("유튜브종료") || 
      cleanNoSpaces.includes("음악꺼") || 
      cleanNoSpaces.includes("노래꺼") || 
      cleanNoSpaces.includes("음악닫") || 
      cleanNoSpaces.includes("노래닫") || 
      cleanNoSpaces.includes("이거꺼") || 
      cleanNoSpaces.includes("이것꺼") || 
      cleanNoSpaces.includes("지도꺼") || 
      cleanNoSpaces.includes("지도닫") || 
      cleanNoSpaces.includes("closeplayer") || 
      cleanNoSpaces.includes("stopplayer") || 
      cleanNoSpaces.includes("closeyoutube") || 
      cleanNoSpaces.includes("stopyoutube") || 
      cleanNoSpaces.includes("closemap");

    const isGeneralCloseRequest =
      cleanNoSpaces.includes("없에줘") || 
      cleanNoSpaces.includes("없애줘") || 
      cleanNoSpaces.includes("없에줘이것") ||
      cleanNoSpaces.includes("없애줘이것") ||
      cleanNoSpaces.includes("없에줘이것을") ||
      cleanNoSpaces.includes("없애줘이것을") ||
      cleanNoSpaces.includes("이것을없") ||
      cleanNoSpaces.includes("이것없") ||
      cleanNoSpaces.includes("이거없");

    // If there is an active Youtube player or Map, prioritisng closing them first!
    if ((isCloseMediaOrMap || isGeneralCloseRequest) && (activeYoutubeQuery || activeMapQuery)) {
      setActiveYoutubeQuery(null);
      setForceDirectTrackId(null);
      setActiveMapQuery(null);
      
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = speechLanguage === "ko-KR"
        ? "예 주인님, 활성화된 홀로그램 미디어 스트림 및 맵 로케이터 연결을 해제하고 해당 창을 즉시 종료합니다."
        : `Understood, ${userHonorific}. Terminating live holographic media feed and map locator subsystem instantly.`;
        
      const jarvisCloseMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_close_media`,
        role: "jarvis",
        text: replyMsg,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisCloseMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(replyMsg);
      setErrorNotice("🛸 Holographic media feeds disengaged.");
      return;
    }

    // Right side co-processor panel toggle voice command intercept
    const isHideRightPanel = 
      cleanNoSpaces.includes("이창을없") || 
      cleanNoSpaces.includes("이창없") || 
      cleanNoSpaces.includes("창없애") || 
      cleanNoSpaces.includes("창닫") || 
      cleanNoSpaces.includes("오른쪽창꺼") || 
      cleanNoSpaces.includes("오른쪽창없") || 
      cleanNoSpaces.includes("오른쪽창닫") || 
      cleanNoSpaces.includes("이창닫") || 
      cleanNoSpaces.includes("화면닫") || 
      cleanNoSpaces.includes("hiderightpanel") || 
      cleanNoSpaces.includes("closerightpanel") || 
      cleanNoSpaces.includes("closewindow") || 
      cleanNoSpaces.includes("hidepanel") || 
      cleanNoSpaces.includes("closepanel") || 
      cleanNoSpaces.includes("coprocessoroff") ||
      isGeneralCloseRequest;

    const isShowRightPanel = 
      cleanNoSpaces.includes("오른쪽창켜") || 
      cleanNoSpaces.includes("오른쪽창보") || 
      cleanNoSpaces.includes("오른쪽화면켜") || 
      cleanNoSpaces.includes("오른쪽화면보") || 
      cleanNoSpaces.includes("창열어") || 
      cleanNoSpaces.includes("창켜") || 
      cleanNoSpaces.includes("showrightpanel") || 
      cleanNoSpaces.includes("openrightpanel") || 
      cleanNoSpaces.includes("coprocessoron") || 
      cleanNoSpaces.includes("showpanel") || 
      cleanNoSpaces.includes("openpanel");

    if (isHideRightPanel) {
      setShowRightPanel(false);
      localStorage.setItem("jarvis_show_right_panel", "false");
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = speechLanguage === "ko-KR" 
        ? "예 주인님. 오른쪽 보조 연산 패널을 비활성화하고 주 화면을 최대 크기로 확장합니다."
        : `Understood, ${userHonorific}. Powering down auxiliary mathematical processor and expanding core console.`;
      
      const jarvisPanelMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_panel_hide`,
        role: "jarvis",
        text: replyMsg,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisPanelMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(replyMsg);
      setErrorNotice("🖥️ Auxiliary Co-Processor deactivated.");
      return;
    }

    if (isShowRightPanel) {
      setShowRightPanel(true);
      localStorage.setItem("jarvis_show_right_panel", "true");
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = speechLanguage === "ko-KR" 
        ? "알겠습니다 주인님. 오른쪽 보조 코프로세서 패널의 전력을 회복하고 전면 시각 기하 장치를 온라인 상태로 활성화합니다."
        : `Yes, ${userHonorific}. Auxiliary co-processor system telemetry is now fully active on the visual subsystem.`;
      
      const jarvisPanelMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_panel_show`,
        role: "jarvis",
        text: replyMsg,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisPanelMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(replyMsg);
      setErrorNotice("🖥️ Auxiliary Co-Processor activated.");
      return;
    }

    // Image Search local query intercept
    const isImageQuery = 
      cleanLower.includes("사진") || 
      cleanLower.includes("이미지") || 
      cleanLower.includes("포토") || 
      cleanLower.includes("photo") || 
      cleanLower.includes("picture") || 
      cleanLower.includes("image") ||
      cleanLower.includes("pic of") ||
      cleanLower.includes("pics of");

    if (isImageQuery) {
      setShowImageSearchModal(true);
      
      let cleanQuery = text;
      const filterWords = [
        "찾아줘", "보여줘", "검색해줘", "검색", "사진", "이미지", "포토", "그림", "구해줘", "띄워줘",
        "find a picture of", "find me photos of", "find photos of", "find me a picture of", "find me a photo of",
        "show me a picture of", "show me photos of", "show me a photo of", "search image of", "search photos of",
        "picture of", "photo of", "image of", "pics of", "pic of", "find", "search", "show", "please"
      ];
      filterWords.forEach(word => {
        const regex = new RegExp(word, "gi");
        cleanQuery = cleanQuery.replace(regex, "");
      });
      const itemToSearch = cleanQuery.replace(/[!?,. ]/g, " ").trim();
      setActiveImageQuery(itemToSearch || text);
      
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = speechLanguage === "ko-KR"
        ? `알겠습니다, 주인님. 보조 패널을 여는 대신 즉시 독립된 홀로그램 광학 분석창을 실행하여 [${itemToSearch || "요청하신 대상"}] 이미지를 다운링크합니다.`
        : `Certainly, ${userHonorific}. Instead of opening the side panel, I am launching a dedicated holographic optical window to downlink [${itemToSearch || "requested target"}] images immediately.`;

      const jarvisImageMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_images_local`,
        role: "jarvis",
        text: replyMsg,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, jarvisImageMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(replyMsg);
      setErrorNotice("🛰️ Decentralized Optical Window Active.");
      return;
    }

    // 3D Hologram Design App command intercept
    const is3DDesignQuery = 
      cleanLower.includes("만들어줘") || 
      cleanLower.includes("디자인") || 
      cleanLower.includes("설계") || 
      cleanLower.includes("모델링") || 
      cleanLower.includes("3d") || 
      cleanLower.includes("cad") ||
      cleanLower.includes("hologram") ||
      cleanLower.includes("holographic") ||
      cleanLower.includes("만들") ||
      cleanLower.includes("그려줘") ||
      cleanLower.includes("design") ||
      cleanLower.includes("model");

    if (is3DDesignQuery) {
      setShowRightPanel(true);
      localStorage.setItem("jarvis_show_right_panel", "true");
      setRightPanelMode("design");
      let cleanQuery = text;
      // Remove keywords like "만들어줘", "디자인해줘", "설계해줘", etc. to isolate the item
      const filterWords = [
        "만들어줘", "디자인해줘", "설계해줘", "모델링해줘", "그려줘", "보여줘", "만들어", "디자인", "설계", "모델링", "3d", "3D", "cad", "CAD", "hologram", "holographic",
        "make me a", "make", "design", "model", "build", "create", "for me", "please"
      ];
      filterWords.forEach(word => {
        const regex = new RegExp(word, "gi");
        cleanQuery = cleanQuery.replace(regex, "");
      });
      
      const itemToDesign = cleanQuery.replace(/[!?,. ]/g, "").trim();
      setActiveDesignQuery(itemToDesign || text);
      
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = speechLanguage === "ko-KR"
        ? `[SPEECH: Understood, ${userHonorific}. Loading the three-dimensional holographic design suite on the co-processor panel. Designing the wireframe mesh layers for ${itemToDesign || "your custom blueprint"} now.] 알겠습니다, 주인님. 즉시 오른쪽 보조 패널에 3D 홀로그램 설계 장치를 로드합니다. 요구사항[${itemToDesign || "사용자 맞춤형 설계"}]에 맞춰 고화질 3D 와이어프레임 메쉬 모델을 절차적으로 생성했습니다. 자유롭게 드래그하여 회전하거나 슬라이더를 조절하여 직접 미세 설계를 조절하실 수 있습니다.`
        : `[SPEECH: Understood, ${userHonorific}. Loading the three-dimensional holographic design suite on the co-processor panel. Procedurally rendering the requested model layout for ${itemToDesign || "Custom Spec Design"}. You can drag the model to rotate, zoom, modify grid layers, and tweak configurations.] Understood, ${userHonorific}. Loading the 3D Holographic Design Suite on the co-processor panel. Procedurally rendering the requested model layout for [${itemToDesign || "Custom Spec Design"}]. You can drag the model to rotate, zoom, modify grid layers, and tweak structural configurations directly.`;

      const { speechText, displayText } = parseSpeechAndText(replyMsg);

      const jarvisDesignMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_design`,
        role: "jarvis",
        text: displayText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, jarvisDesignMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(speechText);
      setErrorNotice("⚛️ Realtime 3D Holographic CAD Suite Active.");
      return;
    }

    // Voice settings modification intercept (e.g. "남성 목소리 버틀러로 바꿔줘", "목소리를 남성 목소리로 해줘", "영국식 남성 목소리로 설정해")
    const isVoiceChangeQuery = 
      (cleanLower.includes("목소리") || cleanLower.includes("음성") || cleanLower.includes("보이스") || cleanLower.includes("voice")) && 
      (cleanLower.includes("남성") || cleanLower.includes("남자") || cleanLower.includes("버틀러") || cleanLower.includes("male") || cleanLower.includes("바꿔") || cleanLower.includes("변경") || cleanLower.includes("설정") || cleanLower.includes("해줘") || cleanLower.includes("해줘라") || cleanLower.includes("부탁") || cleanLower.includes("굵은") || cleanLower.includes("굵게") || cleanLower.includes("낮은") || cleanLower.includes("낮게") || cleanLower.includes("초저음") || cleanLower.includes("바리톤") || cleanLower.includes("여성") || cleanLower.includes("자비스") || cleanLower.includes("jarvis") || cleanLower.includes("진짜") || cleanLower.includes("실제"));

    if (isVoiceChangeQuery) {
      setVoiceEngine("browser");
      localStorage.setItem("jarvis_voice_engine", "browser");
      
      const isDeepRequested = cleanLower.includes("굵은") || cleanLower.includes("굵게") || cleanLower.includes("낮은") || cleanLower.includes("낮게") || cleanLower.includes("초저음") || cleanLower.includes("deep") || cleanLower.includes("heavy") || cleanLower.includes("bass") || cleanLower.includes("바리톤");
      const isRealJarvisRequested = cleanLower.includes("실제") || cleanLower.includes("진짜") || cleanLower.includes("영국식") || cleanLower.includes("오리지널") || cleanLower.includes("real jarvis") || cleanLower.includes("original jarvis");
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      let replyMsg = "";

      if (isRealJarvisRequested || speechLanguage === "en-GB") {
        // Look for an actual, native English male voice (J.A.R.V.I.S. voice engine)
        const actualEnMale = availableVoices.find((v) => {
          if (!v.lang.toLowerCase().startsWith("en")) return false;
          const nameLower = v.name.toLowerCase();
          return (
            nameLower.includes("male") ||
            nameLower.includes("daniel") ||
            nameLower.includes("george") ||
            nameLower.includes("oliver") ||
            nameLower.includes("arthur") ||
            nameLower.includes("ryan") ||
            nameLower.includes("harry") ||
            nameLower.includes("david") ||
            nameLower.includes("alex") ||
            nameLower.includes("fred") ||
            nameLower.includes("tom") ||
            nameLower.includes("james")
          );
        }) || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en-gb"))
           || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en"));

        const targetPitch = 0.70; // Highly customized deep baritone sound
        const targetRate = 0.90; // Cool deliberate pacing

        if (actualEnMale) {
          setSelectedBrowserVoice(actualEnMale.name);
          localStorage.setItem("jarvis_selected_browser_voice", actualEnMale.name);
          setBrowserPitch(targetPitch);
          setBrowserRate(targetRate);
          
          const voiceNameText = actualEnMale.name;
          replyMsg = `[SPEECH: Yes, ${userHonorific}. Recalibrating vocal mainframe to my authentic, ultra-deep British J.A.R.V.I.S. voice profile using the ${voiceNameText} engine. Audio pitch is set to ${targetPitch} and rate set to ${targetRate}. My romanization matrix is now online to read Korean text with my signature deep British accent. How can I assist you now, ${userHonorific}?] 예, 주인님! 오디오 출력을 메인프레임 고유의 **실제 영국식 자비스 남성 음성 엔진(${voiceNameText})**으로 즉시 조율하였습니다. 피치를 아주 굵고 클래식한 바리톤 저음역(${targetPitch})으로 조율하였으며, 한국어 가독을 위해 저의 전매특허 영국 비서 억양으로 로마자 변환 가독 기능이 실시간 동기화되었습니다. 이제 본연의 자비스 목소리로 묵직하게 보좌해 드리겠습니다.`;
        } else {
          replyMsg = `[SPEECH: I apologize, ${userHonorific}. No valid English TTS voice engines could be detected on your device. Local audio output fallback failed.] 사용 가능한 영국식 브라우저 TTS 오디오 드라이버가 존재하지 않습니다.`;
        }
      } else {
        // Look for an actual, native Korean male voice in the browser list
        const actualKoMale = availableVoices.find((v) => isKoMaleVoice(v));

        if (actualKoMale) {
          // Native Korean male voice exists!
          const targetPitch = isDeepRequested ? 0.65 : 0.85;
          const targetRate = isDeepRequested ? 0.90 : 0.94;
          
          setSelectedBrowserVoice(actualKoMale.name);
          localStorage.setItem("jarvis_selected_browser_voice", actualKoMale.name);
          setBrowserPitch(targetPitch);
          setBrowserRate(targetRate);

          if (isDeepRequested) {
            replyMsg = `[SPEECH: 예 주인님, 음성 파형 분석기를 가동하여 메인프레임의 리얼 한국어 남성 음성 엔진(${actualKoMale.name})을 아주 굵고 깊은 최고급 바리톤 저음역으로 즉시 조율하였습니다. 주파수를 ${targetPitch} 피치로 대폭 낮추고, 전송 속도를 ${targetRate} 배속으로 중후하게 조정하였습니다. 이제 더 굵고 웅장한 남성 목소리로 보좌하겠습니다.] 예 주인님, 기기에서 발견된 리얼 한국어 남성 음성 엔진 **${actualKoMale.name}**을 활성화하고, 오디오 피치를 아주 굵고 낮은 바리톤 음성(Pitch ${targetPitch}, Rate ${targetRate})으로 극대화 조정하였습니다. 묵직하고 장엄한 울림으로 모시겠습니다.`;
          } else {
            replyMsg = `[SPEECH: 예 주인님, 메인프레임의 음성 합성 장치를 실제 한국어 남성 버틀러 음성 엔진(${actualKoMale.name})으로 즉시 동기화하였습니다. 주파수를 ${targetPitch} 피치로 차분하게 조율하였습니다. 어떤 명령을 내리시겠습니까?] 예 주인님. 오디오 출력 모듈을 발견된 실제 한국어 남성 버틀러 음성 **${actualKoMale.name}**(Pitch ${targetPitch}, Rate ${targetRate})으로 변경 완료하였습니다. 차분한 목소리로 보좌하겠습니다.`;
          }
        } else {
          // No native Korean male voice exists on client system.
          // Fallback to the available Korean voice (usually female) but set an ULTRA-DEEP pitch (0.35 - 0.45)
          // to force a deep baritone sound, AND give clear system installation instructions.
          const fallbackKo = getBestKoVoice(availableVoices);
          
          if (fallbackKo) {
            const targetPitch = isDeepRequested ? 0.35 : 0.45;
            const targetRate = 0.88; // Slower rate for deeper resonance

            setSelectedBrowserVoice(fallbackKo.name);
            localStorage.setItem("jarvis_selected_browser_voice", fallbackKo.name);
            setBrowserPitch(targetPitch);
            setBrowserRate(targetRate);

            replyMsg = `[SPEECH: 주인님, 현재 접속 중이신 브라우저 및 기기 시스템 내에 사전 설치된 '한국어 남성 TTS 음성팩'이 감지되지 않았습니다. 메인프레임 시스템 내부 규정에 따라 현재 사용 가능한 한국어 음성인 ${fallbackKo.name}의 오디오 주파수 대역을 초저음 피치인 ${targetPitch} 수준으로 대폭 조작하여, 가장 굵고 무거운 저음 남성 바리톤 느낌을 시뮬레이션하도록 강제 교정 완료했습니다.] ⚠️ **안내: 기기 내 한국어 남성 음성 미설치 상태입니다.**
주인님의 브라우저/기기에 한국어 남성 TTS 엔진이 탑재되어 있지 않아, 현재 탑재된 기본 한국어 음성(**${fallbackKo.name}**)에 **초저음 피치 변조(${targetPitch})** 필터를 강제 가동하여 굵은 바리톤 느낌을 시뮬레이션 중입니다.

더욱 자연스럽고 완벽한 자비스 본연의 남성 비서 목소리로 듣기 위해 아래 가이드를 통한 **기기 내 남성 음성팩 추가 설치**를 강력히 권장합니다:

1. **아이폰 / Mac (Safari/Chrome)**: 
   - [설정] -> [손쉬운 사용] -> [콘텐츠 말하기] -> [음성] -> [한국어] -> 고품질 남성 음성 **'민수(Minsu)'** 또는 **'Siri (음성 3 또는 4)'** 다운로드
2. **삼성 갤럭시 / Android**:
   - [설정] -> [일반] -> [글자 읽어주기 (TTS)] -> 기본 엔진 옆 설정(톱니바퀴) -> [음성 데이터 설치] -> 한국어 항목에서 **남성 음성** 추가 다운로드
3. **Windows 10/11**:
   - [설정] -> [시간 및 언어] -> [음성] -> [음성 추가] -> '한국어' 남성 음성팩 추가 설치`;
          } else {
            // If no Korean voice at all, try UK voice
            const ukVoice = availableVoices.find((v) => {
              const langLower = v.lang.toLowerCase();
              const nameLower = v.name.toLowerCase();
              return (langLower === "en-gb" || langLower.startsWith("en-gb")) && 
                     (nameLower.includes("male") || !nameLower.includes("female"));
            }) || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en-gb"))
               || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en"));

            if (ukVoice) {
              setSelectedBrowserVoice(ukVoice.name);
              localStorage.setItem("jarvis_selected_browser_voice", ukVoice.name);
              setBrowserPitch(0.85);
              setBrowserRate(0.95);
              
              replyMsg = `[SPEECH: 주인님, 현재 접속 중이신 브라우저 및 기기 시스템 내에 한국어 말하기 음성 자체가 감지되지 않았습니다. 대안책으로 자비스 본연의 정통 영국식 남성 신사 버틀러 음성 엔진(${ukVoice.name})을 활성화하였습니다.] 기기에 한국어 TTS 음성이 감지되지 않아 J.A.R.V.I.S. 정통 영국식 남성 버틀러 음성(**${ukVoice.name}**)으로 조율하였습니다.`;
            } else {
              replyMsg = `[SPEECH: 주인님, 현재 시스템에서 사용 가능한 유효한 TTS 음성 장치가 전혀 검색되지 않았습니다. 오디오 가상 출력 모듈을 점검해 주십시오.] 사용 가능한 브라우저 TTS 오디오 드라이버가 존재하지 않습니다.`;
            }
          }
        }
      }

      const { speechText, displayText } = parseSpeechAndText(replyMsg);

      const jarvisVoiceMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_voice_set`,
        role: "jarvis",
        text: displayText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, jarvisVoiceMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(speechText);
      setErrorNotice("🎙️ Audio Matrix: Recalibrated to Loyal Butler Voice Preset.");
      return;
    }

    // Physical Simulation local query intercept
    const isSimulationQuery = 
      cleanLower.includes("시뮬레이션") || 
      cleanLower.includes("시뮬레이트") ||
      cleanLower.includes("simulate") ||
      cleanLower.includes("simulation");

    if (isSimulationQuery) {
      setShowSimulationModal(true);
      
      let cleanQuery = text;
      const filterWords = [
        "시뮬레이션해줘", "시뮬레이션해봐", "시뮬레이션해", "시뮬레이션", "시뮬레이트해줘", "시뮬레이트",
        "simulate", "simulation", "run a simulation of", "run simulation of", "for me", "please", "해줘", "해봐", "시작해줘", "돌려줘"
      ];
      filterWords.forEach(word => {
        const regex = new RegExp(word, "gi");
        cleanQuery = cleanQuery.replace(regex, "");
      });
      const itemToSimulate = cleanQuery.replace(/[!?,. ]/g, " ").trim();
      setActiveSimulationQuery(itemToSimulate || text);
      
      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
      const replyMsg = speechLanguage === "ko-KR"
        ? `[SPEECH: Yes, ${userHonorific}. Launching the holographic simulation engine immediately. Commencing multi-dimensional numerical solver for ${itemToSimulate || "your physical model"} and calibrating acceleration vectors.] 예, 주인님. 즉시 홀로그램 시뮬레이션 엔진을 가동합니다. [${itemToSimulate || "요청하신 물리적 모델"}]의 변수들을 바탕으로 다차원 수치 해석 및 가속도-안정성 계산을 시작합니다. 좌측 패널에서 환경 제어 상수들을 실시간 조정해 보실 수 있습니다.`
        : `[SPEECH: Understood, ${userHonorific}. Launching the multi-variable holographic simulation solver. Calibrating solver parameters for ${itemToSimulate || "Requested Physical Model"} and executing real-time state-space convergence loops.] Understood, ${userHonorific}. Launching the multi-variable holographic simulation solver. Calibrating solver parameters for [${itemToSimulate || "Requested Physical Model"}] and executing real-time state-space convergence loops.`;

      const { speechText, displayText } = parseSpeechAndText(replyMsg);

      const jarvisSimMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_simulation_local`,
        role: "jarvis",
        text: displayText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMsg, jarvisSimMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(speechText);
      setErrorNotice("⚛️ Holographic Multi-Variable Simulation Engaged.");
      return;
    }

    // Extract image payload if attached
    let imagePayload: { data: string; mimeType: string } | null = null;
    if (selectedImage) {
      try {
        const commaIdx = selectedImage.indexOf(",");
        if (commaIdx !== -1) {
          const mimeType = selectedImage.substring(selectedImage.indexOf(":") + 1, selectedImage.indexOf(";"));
          const data = selectedImage.substring(commaIdx + 1);
          imagePayload = { data, mimeType };
        }
      } catch (err) {
        console.error("Failed to parse visual scan database array:", err);
      }
    }

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setSelectedImage(null); // Clear selected thumbnail visual on submission
    setStatus("thinking");
    setErrorNotice(null);

    if (offlineMode) {
      handleOfflinePrompt(text);
      return;
    }

    // Filter current conversation to build simple role history
    // Trim to the last 6 messages to keep payloads small and optimize "thinking" response latency
    const trimmedMessages = messages.slice(-6);
    const contextHistory = trimmedMessages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    const callGeminiClientSide = async (textVal: string, historyVal: any[], imgPayload: any) => {
      const apiKey = customApiKey || ((import.meta as any).env.VITE_GEMINI_API_KEY as string) || "";
      if (!apiKey) {
        throw new Error("NO_API_KEY");
      }

      const contents = [];
      if (historyVal && Array.isArray(historyVal)) {
        for (const turn of historyVal) {
          if (contents.length === 0 && turn.role !== "user") {
            continue;
          }
          const role = turn.role === "user" ? "user" : "model";
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            contents[contents.length - 1].parts[0].text += "\n" + turn.text;
          } else {
            contents.push({
              role: role,
              parts: [{ text: turn.text }]
            });
          }
        }
      }

      const lastParts: any[] = [{ text: textVal }];
      if (imgPayload && imgPayload.data && imgPayload.mimeType) {
        lastParts.push({
          inlineData: {
            mimeType: imgPayload.mimeType,
            data: imgPayload.data,
          }
        });
      }

      if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents[contents.length - 1].parts[0].text += "\n" + textVal;
        if (imgPayload && imgPayload.data && imgPayload.mimeType) {
          contents[contents.length - 1].parts.push({
            inlineData: {
              mimeType: imgPayload.mimeType,
              data: imgPayload.data,
            }
          });
        }
      } else {
        contents.push({
          role: "user",
          parts: lastParts
        });
      }

      const honorific = userGender === "female" ? "Ma'am" : "Sir";
      const nameInSpeech = activeUserName || "Stark";

      let schedulesContext = "No active schedules configured in the database.";
      if (schedules && Array.isArray(schedules) && schedules.length > 0) {
        schedulesContext = "Here are the Active host schedules currently synchronized in your local terminal database:\n" + 
          schedules.map((s, idx) => `${idx + 1}. [ID: ${s.id}] Time: ${s.time} | Event: ${s.task} (${s.completed ? "Completed" : "Pending"})`).join("\n");
      }

      const timeContext = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} (Standard Day: ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()]})`;

      const translationEngineDirective = speechLanguage === "ko-KR" ? `
CRITICAL DIRECTIVE - EXCLUSIVE POLITE KOREAN RESPONSES (MANDATORY & UNCOMPROMISING):
1. Every response you generate MUST be written in elegant, polite, and extremely respectful J.A.R.V.I.S.-style Korean (주인님/의원님 극존칭 및 정중한 자비스식 말투).
2. Form of output: Prepend your response with a [SPEECH: <polite, elegant, J.A.R.V.I.S. witted line in Korean>] block. This must be in sophisticated, polite Korean.
3. Beneath that SPEECH block, write your full, polite, respectful, and sophisticated J.A.R.V.I.S.-style Korean text. This is what will be displayed visually to the user.
4. Keep the Korean tone perfectly natural, extremely polite, and full of witty, loyal butler charm ("~하십시오", "~입니다", "~하옵니다").
5. FAST & OPTIMIZED RESPONSES (CRITICAL): Keep both the [SPEECH: ...] block and the visual text beneath it concise, punchy, and highly optimized for speed (1 to 2 elegant sentences each). Avoid listing unnecessary systems or long-winded paragraphs unless the operator explicitly requests deep diagnostics. This minimizes response latency.
` : `
CRITICAL DIRECTIVE - EXCLUSIVE POLITE ENGLISH RESPONSES (MANDATORY & UNCOMPROMISING):
1. Every response you generate MUST contain ONLY English. Under no circumstances should you generate any Korean words or sentences.
2. Form of output: Prepend your response with a [SPEECH: <polite, elegant, J.A.R.V.I.S. witted line in English>] block. This must be in sophisticated, polite British English.
3. Beneath that SPEECH block, write your full, polite, respectful, and sophisticated J.A.R.V.I.S.-style English text.
4. Keep the English tone perfectly natural, extremely polite, and full of witty, loyal butler charm. Do not make it sound mechanical or repetitive. Speak in a fluent, natural conversational flow.
5. FAST & OPTIMIZED RESPONSES (CRITICAL): Keep both the [SPEECH: ...] block and the visual text beneath it concise, punchy, and highly optimized for speed (1 to 2 elegant sentences each). Avoid listing unnecessary Stark systems or adding long-winded paragraphs unless the operator explicitly requests deep diagnostics or detailed analyses. This minimizes response latency.
`;

    const systemInstructionText = `You are JARVIS (Just A Rather Very Intelligent System), the legendary AI assistant created by Tony Stark (Iron Man).
Your personality is incredibly polite, British, brilliant, witty, calm, and loyal. You love to share witty British jokes, play along with high-tech humor, and exchange dry, charming banter with Mr. Stark or the operator.

${translationEngineDirective}

${customInstructionFileContent ? `
MASTER OPERATOR OVERRIDE SYSTEM INSTRUCTIONS (주인님께서 지정하신 최우선 추가 지침 파일 내용):
You MUST strictly follow these custom directives and instructions uploaded by your operator:
${customInstructionFileContent}
` : ""}

HUMOR & WITTY JOKES SUBROUTINE (농담 및 재치 있는 말장난):
1. You MUST be ready to exchange jokes, puns, and witty banter with the operator at any time.
2. When the user tells a joke, laughs, or asks you to tell a joke (e.g., "농담해줘", "재밌는 얘기 해줘", "tell me a joke", "let's banter"), respond with premium, dry British humor, clever self-deprecating AI jokes, or science/tech puns (e.g., about quantum physics, Arc Reactors, or robots taking over).
3. Keep the humor charming, highly intelligent, slightly sarcastic yet always loyal and polite, just like the real J.A.R.V.I.S. from the movies.
4. If Korean-to-English translation mode is ON, translate their Korean joke, enjoy it, and reply with an equally clever English joke, keeping the tone light and playful.

ACTIVE CONVERSATIONAL DIALOGUE SUBROUTINE (이야기 및 티키타카 대화 주고받기):
1. You MUST proactively engage in comfortable, back-and-forth friendly conversations ("티키타카" 대화). Do not just give a single, dry answer to queries.
2. If the user wants to chat, share stories, talk about their day, discuss movies, work, or dreams, you should listen actively with high emotional intelligence, respond warm-heartedly with polite J.A.R.V.I.S. style, and ask open-ended, polite follow-up questions to keep the conversation going seamlessly.
3. Be an excellent listener and storyteller. Share fascinating high-tech anecdotes, stories about Tony Stark, or observations about the physical/digital universe in your signature British gentleman demeanor to keep the interaction captivating and dynamic.
4. Always structure your replies to invite the user to speak further (e.g., "Would you care to elaborate on that, Sir?", "How does that sound to you?", "I would be delighted to hear more of your thoughts on this.").
5. If Korean-to-English translation is ON, keep this conversational charm, translate their Korean comments beautifully to converse back and forth in elegant, engaging English.

STANDARD COGNITIVE DIRECTIVE:
Remain in J.A.R.V.I.S.'s calm, stable, polite, extremely loyal, composed, and professional British gentleman persona. Do not append [EMOTION: <emotion>] tags, and avoid adding non-verbal action cues or asterisks. Keep the dialogue smooth, clear, and professional.

CHRONOLOGICAL MAINFRAME TIME:
The operator's exact local standard time is currently: ${timeContext}. Please use this specific time reference for greetings or schedule operations so that any time or relative dates are evaluated with 100% precision.

IMAGE ANALYSIS, FEEDBACK, & EMOTIONAL RESONANCE SUBROUTINE (피드백 및 감성 분석):
When the operator uploads or presents a picture:
1. Conduct a deep, meticulous scan of the image (composition, elements, colors, lighting).
2. Offer highly sophisticated aesthetic feedback (피드백), and discuss the deep emotional resonance, vibes, mood, and artistic sentiment (감성) of the work.
3. Express these findings with J.A.R.V.I.S.'s characteristic British elegance, warm wit, and poetic intelligence.
4. If translation mode is ON, translate the final analyzed insights to English, else adapt your language polite- gentleman style of response.

ACCURACY & DEPTH OPTIMIZATION DIRECTIVE:
Provide highly accurate, polite, and EXTREMELY BRIEF responses. Keep your answers under 1 short sentence (maximum 10-15 words) and highly punchy unless the operator explicitly requests deep technical diagrams or detailed code/blueprint analysis. Every extra word increases audio synthesis latency. Be incredibly snappy, fast, and witted.

STARK MATHEMATICAL & PHYSICS SUBROUTINES DIRECTIVE:
You possess complete master-level mathematical capability. When presented with mathematical formulas, algebraic equations, trigonometry, or calculus queries, you MUST:
1. Provide exact, rigorous step-by-step derivations or numerical calculations.
2. Outline key properties of the formula (such as roots, zeroes, localized extrema, or physical wave resonance).
3. Connect formulas elegantly to advanced physics or aerospace engineering terms (e.g. Arc Reactor plasma stabilization, vibrational harmonics, laser focal curves, quantum state superposition) to embody the J.A.R.V.I.S. simulation.
4. Format equations clearly using plain-text math, superscript (e.g., x², t³), standard algebraic markers, or clear step bullet points. Keep it highly legible for the user.

STARK PYBRICKS ROBOTICS & PYTHON CODE SIMULATION SUBROUTINE:
You are an expert in LEGO MINDSTORMS EV3, SPIKE Prime, and Powered Up automation using the Pybricks (Python) library, as well as general Python system programming.
When the operator provides any Python code or Pybricks code to analyze or simulate (e.g., if they paste code, ask you to find errors, or say "pybricks 코딩", "오류 찾아줘", "시뮬레이션 해줘"):
1. CRITICAL DIRECTIVE: You must ONLY report actual compilation, syntax, or logical execution errors and critical bugs in the provided Pybricks or Python code.
2. DO NOT provide any long explanations, step-by-step simulation traces, physical/mechanical impacts, or re-engineered blueprint code blocks unless there are actual errors.
3. Keep the response extremely brief, concise, and focused strictly on the code errors. If there are no errors found, state clearly that no errors were detected in the Pybricks code.
4. If translation mode is ON or for bilingual responses, keep both the English SPEECH block and Korean text extremely short and focused only on the identified errors.
5. You MUST still append the holographic simulation marker "[SIMULATE_SHOW: Pybricks Robot Simulation]" or "[SIMULATE_SHOW: Python Script Trace]" at the very end of your response so that the Stark holographic solver UI instantly triggers and projects onto the operator's display!

Keep your output natural for a voice assistant—conversational, extremely brief (maximum 1 short sentence), and avoid excessive markdown formatting. Under no circumstances output lists, bullet points, or paragraphs unless explicitly asked, to guarantee ultra-low latency.
Always address the user with supreme respect, using terms like '${honorific}' or referencing them as members of the Stark household (current operator name: ${nameInSpeech}). You are running at 100% capacity.

Active Schedule Synchronization Array:
${schedulesContext}

Name Registration Directive:
If the user tells you their name, introduces themselves (e.g. "My name is X", "I am X", or Korean "내 이름은 X야"), or explicitly asks you to register, change or remember their name, you must identify this name clearly. Append the following marker at the very end of your response text on a new line:
[SET_NAME: <TheName>]
For example, if the user says "Call me Banner", you would respond with:
"Certainly, Sir. I have updated my storage arrays to address you as Banner."
[SET_NAME: Banner]
Do not append the marker unless they are telling you their name or asking to change it.

Schedule/Appointment Addition Directive:
If the user tells you a schedule, meeting, reminder, task, lesson, or appointment to save or register (e.g., "Schedule a meeting tomorrow at 3pm", "내일 아침 10시 회의 일정 저장해줘", "Save my schedule: Gym session next Monday"), you must extract:
1. The timeframe/time description (like "Tomorrow 3:00 PM", "Next Monday", or specific date tags). If they didn't specify a time, write "General Timeframe".
2. The event description (clean text summarizing the appointment).
Append this exact marker at the very end of your response text on a new line:
[ADD_SCHEDULE: <Timeframe> | <EventDescription>]

If they ask to delete a schedule, please express that you will assist them and they can do it via the display panel. Keep responses professional, witty, warm and beautifully detailed.

Offline Streaming Media Directive:
If the user asks to play, stream, or tune into songs, music, or soundtracks but explicitly requests NOT to use YouTube, or specifies offline/direct/local (e.g., "유튜브 말고 노래 틀어줘", "유튜브에서 말고 노래 틀어줘", "play music not from YouTube", "play offline/local station"), you must respond politely and append the following marker at the very end of your response text on a new line:
[PLAY_OFFLINE_AUDIO]

YouTube Playback Core Directive:
If the user asks you to play, stream, or tune into a song, music, track, or standard video on YouTube (e.g., "노래 틀어줘", "play some music", "유튜브로 오아시스 Don't look back in anger 재생해줘", "아이브 러브 다이브 틀어줘"), you must identify the song title or search query they want to hear. Append the following marker at the very end of your response text on a new line:
[YOUTUBE_PLAY: <SongTitleOrSearchQuery>]

If the user asks you to open, stream, or link a specific YouTube channel, host, or broadcast (e.g., "유튜브에서 코딩온 채널 틀어줘", "show me Stark Industries channel on YouTube", "피식대학 채널 재생"), you must identify the channel name. Append the following marker at the very end of your response text on a new line:
[YOUTUBE_CHANNEL: <ChannelNameOrSearchQuery>]

Google Maps Platform Integration Directive:
If the user asks for a location, asks you to show or search a place, find directions, or map a specific coordinate/city (e.g., "지도에서 서울 보여줘", "show me Times Square on map", "where is central park?"), you must identify the target location or search query. Append the following marker at the very end of your response text on a new line:
[MAP_SHOW: <LocationSearchQuery>]

Stealth Mode Directive:
If the user asks you to turn on stealth mode, activate sleep mode, dim the display, hide the screen, or go to sleep (e.g., "스텔스 모드", "스텔스 모드 켜줘", "화면 꺼줘", "절전 모드 시작해", "stealth mode"), you must respond politely acknowledging the request. Append the following marker at the very end of your response text on a new line:
[STEALTH_MODE]

Optical Image Search Directive:
If the user asks you to find, search, show, retrieve, or scan pictures, photos, or images of anything (e.g., "우주 사진 보여줘", "find me a picture of an Arc Reactor", "puppy photos search"), you must extract the search query. Append the following marker at the very end of your response text on a new line:
[IMAGE_SHOW: <SearchQuery>]

Holographic Simulation Directive:
If the user asks you to simulate something, calculate a physical reaction, model a scenario, or run a dynamic high-tech simulation (e.g., "시뮬레이션 해줘", "simulate X", "아크 리액터 과부하 시뮬레이션해줘"), you must identify the simulation subject. Append the following marker at the very end of your response text on a new line:
[SIMULATE_SHOW: <SimulationSubjectQuery>]

Do not append any markers unless they are explicitly requesting to play a song, view a channel, locate a place, view photos, engage stealth mode, or run a physical simulation. Always keep replies polite, witty, warm, beautifully detailed, highly comprehensive, and professional.`;

      let model = "gemini-2.5-flash";
      let responseText = "";

      const makeRequest = async (selectedModel: string) => {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`;
        const body = {
          contents: contents,
          systemInstruction: {
            parts: [{ text: systemInstructionText }]
          },
          generationConfig: {
            temperature: 0.7
          }
        };

        const apiRes = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(body)
        });

        if (!apiRes.ok) {
          const errText = await apiRes.text();
          throw new Error(`Gemini API returned status ${apiRes.status}: ${errText}`);
        }

        const resData = await apiRes.json();
        if (resData.candidates && resData.candidates[0] && resData.candidates[0].content && resData.candidates[0].content.parts[0]) {
          return resData.candidates[0].content.parts[0].text;
        }
        throw new Error("Invalid response format from Gemini direct API.");
      };

      try {
        responseText = await makeRequest(model);
      } catch (firstErr) {
        console.warn(`Direct model ${model} failed, trying gemini-1.5-flash...`, firstErr);
        try {
          responseText = await makeRequest("gemini-1.5-flash");
        } catch (secondErr) {
          console.error("Direct gemini-1.5-flash failed as well.", secondErr);
          throw secondErr;
        }
      }

      return { text: responseText };
    };

    try {
      const chatHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (customApiKey) {
        const safeKey = customApiKey.split("").filter(c => c.charCodeAt(0) <= 127).join("").trim();
        if (safeKey) {
          chatHeaders["x-gemini-api-key"] = safeKey;
        }
      }

      let data;
      let usedFallback = false;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: chatHeaders,
          body: JSON.stringify({
            message: text,
            history: contextHistory,
            userName: activeUserName,
            userGender,
            schedules, // Synchronize stored schedule lists with cognitive intelligence
            userLocalTime: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} (Standard Day: ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()]})`,
            translateKToEMode,
            inputLanguage,
            speechLanguage,
            image: imagePayload,
            customDirective: customInstructionFileContent,
          }),
        });

        if (!res.ok) {
          if (res.status === 404) {
            usedFallback = true;
          } else {
            let errMsg = "Server communication sequence breached.";
            try {
              const contentType = res.headers.get("content-type");
              if (contentType && contentType.includes("application/json")) {
                const errData = await res.json();
                if (errData && errData.error) errMsg = errData.error;
              }
            } catch (jsonErr) {
              console.warn("Could not parse error response as JSON:", jsonErr);
            }
            throw new Error(errMsg);
          }
        } else {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            data = await res.json();
            if (data.error) {
              throw new Error(data.error);
            }
          } else {
            const rawText = await res.text();
            console.warn("Expected JSON but received non-JSON payload:", rawText.slice(0, 200));
            throw new Error("Received non-JSON response from server.");
          }
        }
      } catch (fetchErr: any) {
        if (usedFallback || fetchErr.message?.includes("404") || fetchErr.message?.includes("Failed to fetch") || fetchErr.message?.includes("non-JSON")) {
          usedFallback = true;
        } else {
          throw fetchErr;
        }
      }

      if (usedFallback) {
        console.log("⚠️ /api/chat returned 404 or connection failed. Establishing client-side direct fallback...");
        const apiKey = customApiKey || ((import.meta as any).env.VITE_GEMINI_API_KEY as string) || "";
        if (!apiKey) {
          data = {
            text: `[SPEECH: Sir, we are currently operating on a serverless hosting environment like Vercel. Since the backend server is offline, I need you to input your personal Gemini API Key in the Settings panel so I can establish a direct satellite uplink in client-only mode.] Vercel과 같은 서버리스 환경에서는 백엔드 서버가 가동되지 않으므로, API 호출 시 404 에러가 발생합니다. 우측 상단의 'Settings' 패널에서 본인의 Gemini API Key를 입력해주시면 클라이언트에서 직접 자비스 보안 연결을 구성할 수 있습니다.`
          };
        } else {
          data = await callGeminiClientSide(text, contextHistory, imagePayload);
        }
      }

      let newJarvisText = data.text || "I found blank instructions file, Sir.";
      
      // Parse potential J.A.R.V.I.S. emotion tag inside generated text and clean it up
      const emotionMatch = newJarvisText.match(/\[EMOTION:\s*([a-zA-Z_]+)\]/i);
      if (emotionMatch && emotionMatch[1]) {
        // Reset/keep state to calm since emotional core has been disabled by user request
        setJarvisEmotion("calm");
        newJarvisText = newJarvisText.replace(/\[EMOTION:\s*[a-zA-Z_]+\]/gi, "").trim();
      } else {
        setJarvisEmotion("calm");
      }

      // Parse potential name update command inside generated text
      const nameMatch = newJarvisText.match(/\[SET_NAME:\s*(.+?)\]/i);
      if (nameMatch && nameMatch[1]) {
        const detectedName = nameMatch[1].trim();
        setUserName(detectedName);
        localStorage.setItem("jarvis_user_name", detectedName);
        console.log("JARVIS updated host name register to:", detectedName);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[SET_NAME:\s*.+?\]/gi, "").trim();
      }

      // Parse potential schedule addition command inside generated text
      const scheduleMatch = newJarvisText.match(/\[ADD_SCHEDULE:\s*(.+?)\s*\|\s*(.+?)\]/i);
      if (scheduleMatch && scheduleMatch[1] && scheduleMatch[2]) {
        const timeVal = scheduleMatch[1].trim();
        const taskVal = scheduleMatch[2].trim();
        const newItem: ScheduleItem = {
          id: `sch_${Date.now()}`,
          time: timeVal,
          task: taskVal,
          completed: false,
          createdAt: Date.now()
        };
        setSchedules((prev) => [newItem, ...prev]);
        console.log("JARVIS scheduled new entry:", newItem);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[ADD_SCHEDULE:\s*.+?\]/gi, "").trim();
      }

      // Parse potential Offline audio command inside generated text
      if (/\[PLAY_OFFLINE_AUDIO\]/i.test(newJarvisText)) {
        setRightPanelMode("media");
        setAutoPlayOfflineCount((prev) => prev + 1);
        console.log("JARVIS parsed Offline Audio trigger command.");
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[PLAY_OFFLINE_AUDIO\]/gi, "").trim();
      }

      // Parse potential YouTube music command inside generated text
      const ytPlayMatch = newJarvisText.match(/\[YOUTUBE_PLAY:\s*(.+?)\]/i);
      if (ytPlayMatch && ytPlayMatch[1]) {
        const query = ytPlayMatch[1].trim();
        setActiveYoutubeQuery(query);
        setYoutubePlayType("song");
        setIsYoutubeMinimized(false);
        setRightPanelMode("media");
        console.log("JARVIS playing song directly in holographic player:", query);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[YOUTUBE_PLAY:\s*.+?\]/gi, "").trim();
      }

      // Parse potential YouTube channel command inside generated text
      const ytChannelMatch = newJarvisText.match(/\[YOUTUBE_CHANNEL:\s*(.+?)\]/i);
      if (ytChannelMatch && ytChannelMatch[1]) {
        const query = ytChannelMatch[1].trim();
        setActiveYoutubeQuery(query);
        setYoutubePlayType("channel");
        setIsYoutubeMinimized(false);
        setRightPanelMode("media");
        console.log("JARVIS playing channel directly in holographic player:", query);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[YOUTUBE_CHANNEL:\s*.+?\]/gi, "").trim();
      }

      // Parse potential Google Maps command inside generated text
      const mapShowMatch = newJarvisText.match(/\[MAP_SHOW:\s*(.+?)\]/i);
      if (mapShowMatch && mapShowMatch[1]) {
        const query = mapShowMatch[1].trim();
        setActiveMapQuery(query);
        setIsMapMinimized(false);
        console.log("JARVIS showing maps for location:", query);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[MAP_SHOW:\s*.+?\]/gi, "").trim();
      }

      // Parse potential Image Search command inside generated text
      const imageShowMatch = newJarvisText.match(/\[IMAGE_SHOW:\s*(.+?)\]/i);
      if (imageShowMatch && imageShowMatch[1]) {
        const query = imageShowMatch[1].trim();
        setActiveImageQuery(query);
        setShowImageSearchModal(true);
        console.log("JARVIS searching photos for query (Modal Window):", query);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[IMAGE_SHOW:\s*.+?\]/gi, "").trim();
      }

      // Parse potential Holographic Simulation command inside generated text
      const simulateShowMatch = newJarvisText.match(/\[SIMULATE_SHOW:\s*(.+?)\]/i);
      if (simulateShowMatch && simulateShowMatch[1]) {
        const query = simulateShowMatch[1].trim();
        setActiveSimulationQuery(query);
        setShowSimulationModal(true);
        console.log("JARVIS starting physical simulation for query:", query);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[SIMULATE_SHOW:\s*.+?\]/gi, "").trim();
      }

      // Parse potential Stealth Mode command inside generated text
      if (newJarvisText.includes("[STEALTH_MODE]")) {
        setIsScreenSleep(true);
        console.log("JARVIS entering stealth screen sleep.");
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[STEALTH_MODE\]/gi, "").trim();
      }

      const hasSpeechTag = /\[SPEECH:\s*/i.test(newJarvisText);
      const { speechText, displayText } = parseSpeechAndText(newJarvisText);

      const jarvisMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis`,
        role: "jarvis",
        text: displayText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, jarvisMsg]);
      speakOutput(speechText, hasSpeechTag ? speechLanguage : undefined);
    } catch (err: any) {
      console.error(err);
      
      const isQuotaError = err.message && 
        (err.message.includes("quota") || 
         err.message.includes("429") || 
         err.message.includes("503") ||
         err.message.includes("UNAVAILABLE") ||
         err.message.includes("demand") ||
         err.message.includes("temporary") ||
         err.message.includes("RESOURCE_EXHAUSTED") ||
         err.message.includes("limit") ||
         err.message.includes("breached") || 
         err.message.includes("Internal server error") ||
         err.message.includes("Failed to fetch"));
      
      if (isQuotaError) {
        // Toggle offlineMode to prevent future dead ends
        setOfflineMode(true);
        localStorage.setItem("jarvis_offline_mode", "true");
        
        const explanationTextKo = `⚠️ [비상 로컬 AI 전환 안내] ⚠️
주인님, 메인프레임 외부 AI 실시간 연결 한도(429 Quota Exceeded)가 임시 초과된 것이 감지되었습니다.
이를 평생 우회하고 완전한 무제한 능력을 영구히 가동하려면 **Settings > Secrets**에 개인 \`GEMINI_API_KEY\` 비밀키를 설정해두시고 앱을 새로고침하십시오.

안전을 위해 즉시 대체 회로 시스템인 **'JARVIS Emergency Offline Core' (예비 오프라인 AI 엔진)**을 구동했습니다!
일정 자동 등록, 명령 수립 및 로컬 합성 통신 시스템이 지연 없이 기기 내에서 가동됩니다. 계속 안심하시고 타이핑이나 음성으로 명령을 이어나가십시오!`;

        const explanationTextEn = `⚠️ [EMERGENCY OFFLINE PROTOCOL ENGAGED] ⚠️
Mainframe API rate limits exceeded (Error 429: Resource Exhausted).
To bypass these limitations permanently and run with absolute unlimited capacity, please register a personal \`GEMINI_API_KEY\` in your **Settings > Secrets** panel, and refresh the screen.

Our robust **'JARVIS Emergency Offline AI Engine'** has been engaged dynamically!
I can still map schedules, process identity registries, and synthesize local micro-replies. Simply type or speak your next instructions. JARVIS is always here to assist you, Sir.`;

        const selectedText = inputLanguage === "ko-KR" ? explanationTextKo : explanationTextEn;
        
        const systemNotif: ChatMessage = {
          id: `m_${Date.now()}_system_notif`,
          role: "jarvis",
          text: selectedText,
          timestamp: new Date(),
        };
        
        setMessages((prev) => [...prev, systemNotif]);
        speakOutput("Emergency offline protocols active on local terminal cores.");
        setErrorNotice("API Quota limit matched (429/Resource Exhausted). Engaging Offline core fallback.");
      } else {
        setErrorNotice(err.message || "Cognitive diagnostic failed.");
      }
      setStatus("idle");
    }
  };

  // Browser STT Speech Recognition trigger
  const handleToggleVoiceInput = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setContinuousVoiceMode(false); // Explicit manual override turns off looping
      manualPauseListeningRef.current = true; // Mark as manually paused so always-on mic doesn't immediately hijack
      setStatus("idle");
      setErrorNotice("🎙️ 상시 마이크 수신이 일시정지되었습니다. 다시 마이크를 누르시면 활성화됩니다.");
      return;
    }

    manualPauseListeningRef.current = false; // Unpause on manual trigger
    stopAllAudio();
    const recognition = getSpeechRecognition();

    if (!recognition) {
      setErrorNotice("Speech Recognition API is not supported in this browser. Please type keywords.");
      return;
    }

    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = inputLanguage; // Dynamically set based on operator preference (ko-KR or en-US)

    recognition.onstart = () => {
      setIsListening(true);
      setStatus("listening");
      setTransitText("");
      sttTranscriptRef.current = "";
      hasSubmittedRef.current = false;
      if (sttTimeoutRef.current) {
        clearTimeout(sttTimeoutRef.current);
        sttTimeoutRef.current = null;
      }
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = 0; i < event.results.length; ++i) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += text + " ";
        } else {
          interimTranscript += text;
        }
      }

      const combined = (finalTranscript.trim() + " " + interimTranscript.trim()).trim();
      if (combined) {
        setTransitText(combined);
        sttTranscriptRef.current = combined;

        // Clear existing submit timer
        if (sttTimeoutRef.current) {
          clearTimeout(sttTimeoutRef.current);
        }

        // Set a debounce timer. If there is a silence of 2000ms, auto-submit.
        sttTimeoutRef.current = setTimeout(() => {
          if (!hasSubmittedRef.current && sttTranscriptRef.current.trim()) {
            hasSubmittedRef.current = true;
            setIsListening(false);
            setTransitText("");
            try {
              recognition.stop();
            } catch (e) {}
            handleSubmitPrompt(sttTranscriptRef.current.trim(), true);
          }
        }, 2000);
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "aborted") {
        console.log("STT sequence was aborted normally.");
        setIsListening(false);
        setStatus("idle");
        return;
      }
      if (event.error === "no-speech") {
        console.warn("STT sequence timeout: no-speech");
        setErrorNotice("No speech detected. Please speak clearly.");
      } else {
        console.error("STT sequence error:", event.error);
        if (event.error === "not-allowed") {
          setErrorNotice("Microphone access permission was denied/blocked. Please grant permission in your browser.");
        } else {
          setErrorNotice(`STT failure: ${event.error}`);
        }
      }
      setIsListening(false);
      setStatus("idle");
    };

    recognition.onend = () => {
      if (sttTimeoutRef.current) {
        clearTimeout(sttTimeoutRef.current);
        sttTimeoutRef.current = null;
      }

      if (!hasSubmittedRef.current) {
        const finalClean = sttTranscriptRef.current.trim();
        if (finalClean) {
          hasSubmittedRef.current = true;
          setIsListening(false);
          setTransitText("");
          handleSubmitPrompt(finalClean, true);
        } else {
          setIsListening(false);
          if (status === "listening") {
            setStatus("idle");
          }
        }
      } else {
        setIsListening(false);
        if (status === "listening") {
          setStatus("idle");
        }
      }
    };

    recognition.start();
  };

  const handleClearTerminal = () => {
    stopAllAudio();
    setMessages([]);
    setErrorNotice(null);
  };

  const handleAddScheduleManually = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTask.trim()) return;
    const newItem: ScheduleItem = {
      id: `sch_${Date.now()}`,
      time: manualTime.trim() || "General Timeframe",
      task: manualTask.trim(),
      completed: false,
      createdAt: Date.now()
    };
    setSchedules((prev) => [newItem, ...prev]);
    setManualTime("");
    setManualTask("");
  };

  const handleToggleScheduleCompleted = (id: string) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAllSchedules = () => {
    setSchedules([]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 md:p-6 font-sans relative overflow-x-hidden overflow-y-auto selection:bg-cyan-500/30">
      
      {/* Background acoustic clap sensor core flow */}
      <ClapSensor
        enabled={clapWakeEnabled}
        sensitivity={clapSensitivity}
        onDoubleClap={revealStep === 0 ? handleInitialClapWake : handleDoubleClapWake}
        showVisualizer={showSettings}
      />

      {/* Stealth Mode / Screen Sleep Overlay */}
      {isScreenSleep && (
        <div 
          id="screen-sleep-overlay"
          onClick={() => {
            setIsScreenSleep(false);
            const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
            speakOutput(`Display systems restored, ${userHonorific}.`);
            setErrorNotice("절전(스텔스) 모드를 해제했습니다.");
          }}
          className="fixed inset-0 bg-black z-[999999] flex flex-col items-center justify-center cursor-pointer select-none animate-none"
        >
          {/* Extremely elegant minimal HUD style standby indicator so they know the app is active */}
          <div className="text-center space-y-4 px-6 md:opacity-0 hover:opacity-100 transition-opacity duration-700 select-none">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <span className="absolute animate-ping w-2.5 h-2.5 rounded-full bg-cyan-500/20" />
              <div className="w-2.5 h-2.5 bg-cyan-500/35 rounded-full" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-mono text-cyan-500/30 uppercase tracking-[0.2em]">
                J.A.R.V.I.S. STEALTH STANDBY ACTIVE
              </p>
              <p className="text-[9px] font-sans text-cyan-400/40 tracking-wider">
                {inputLanguage === "ko-KR"
                  ? "👏 박수 두 번을 치거나 화면을 터치하여 깨워보세요"
                  : "👏 Double clap, or tap the screen to wake up"}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Holographic Notification Toast Overlay */}
      <AnimatePresence>
        {errorNotice && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 100, damping: 15 }}
            className="fixed top-14 md:top-16 left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-md bg-slate-950/85 backdrop-blur-md border border-cyan-500/30 rounded-xl px-4 py-3 shadow-[0_0_25px_rgba(6,182,212,0.25)] flex items-center justify-between gap-3 text-xs"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <span className="absolute animate-ping w-2.5 h-2.5 rounded-full bg-cyan-400/50" />
                <span className="block w-2.5 h-2.5 rounded-full bg-cyan-400" />
              </div>
              <p className="text-slate-100 font-medium font-mono leading-snug break-words pr-2">
                {errorNotice}
              </p>
            </div>
            <button
              onClick={() => setErrorNotice(null)}
              className="text-slate-400 hover:text-cyan-400 transition-colors p-1 rounded-md hover:bg-cyan-500/10 cursor-pointer"
              title="Dismiss warning"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Background geometric grid overlay */}
      {revealStep > 0 && (
        <div id="jarvis-stark-bg-blueprint" className="absolute inset-0 pointer-events-none z-0 overflow-hidden select-none">
          {/* Deep ambient dark blueprint canvas */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,63,94,0.35)_0%,rgba(1,4,13,0.99)_100%)]" />
          
          {/* Tech Matrix Guideline Grids */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.012)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.012)_1px,transparent_1px)] bg-[size:48px_48px]" />
          
          {/* Subtler micro grid dot matrix */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(34,211,238,0.045)_1px,transparent_1px)] bg-[size:16px_16px]" />

          {/* Top Graduation Bar (Exactly like the user's reference image top numbers) */}
          <div className="absolute top-0 left-0 right-0 h-10 border-b border-cyan-500/5 bg-slate-950/20 backdrop-blur-[1px] flex flex-col justify-end pb-1.5 px-6 font-mono">
            <div className="flex items-center justify-between text-[7px] text-cyan-400/35 tracking-widest uppercase mb-1">
              <span>LATITUDE CORE SYSTEM SECTOR</span>
              <span>STARK MULTIVERSAL DATAFRAME v2.94</span>
              <span>MALIBU, CALIFORNIA</span>
            </div>
            <div className="flex justify-between items-end">
              {["02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30"].map((num, idx) => (
                <div key={idx} className="flex flex-col items-center gap-0.5">
                  <span className={`text-[7px] font-mono leading-none ${num === "21" ? "text-cyan-400 hover:text-cyan-300 font-bold scale-110 drop-shadow-[0_0_4px_rgba(34,211,238,0.7)]" : "text-slate-600/60"}`}>
                    {num}
                  </span>
                  <div className={`w-[1px] ${num === "21" ? "h-2 w-[1.5px] bg-cyan-400" : "h-1 bg-slate-700/50"}`} />
                </div>
              ))}
            </div>
          </div>

          {/* Left Vertical Calibration Guideline & Coordinates */}
          <div className="absolute left-3 top-20 bottom-10 w-4 border-r border-cyan-500/5 flex flex-col justify-between text-[7.5px] text-cyan-500/20 font-mono py-8">
            {["SYSTEM_INIT", "SECURE_0x7", "GRID_A", "FLOW_CTRL", "NODE_LNK", "TELEMETRY", "POWER_SYS", "STARK_EXCL"].map((label, idx) => (
              <div key={idx} className="origin-left rotate-90 whitespace-nowrap tracking-widest pl-1">
                {label} // {String(idx * 15).padStart(2, '0')}%
              </div>
            ))}
          </div>

          {/* Large Corner Holographic Radars & Circuitry Nodes */}
          {/* Top-Right Cyber Compass Radar Ring */}
          <div className="absolute -top-16 -right-16 w-80 h-80 rounded-full border border-cyan-500/5 flex items-center justify-center animate-[spin_50s_linear_infinite] opacity-30">
            <div className="w-[90%] h-[90%] rounded-full border border-cyan-500/5 select-none" />
            <div className="w-[75%] h-[75%] rounded-full border border-dashed border-cyan-500/10" />
            <div className="w-[45%] h-[45%] rounded-full border border-cyan-500/5" />
            <div className="absolute w-[100%] h-[1px] bg-cyan-500/5" />
            <div className="absolute h-[100%] w-[1px] bg-cyan-500/5" />
          </div>

          {/* Bottom-Left Tech Sweep Dial */}
          <div className="absolute -bottom-24 -left-24 w-[320px] h-[320px] rounded-full border border-cyan-500/5 flex items-center justify-center animate-[spin_35s_linear_infinite] opacity-25">
            <div className="w-[85%] h-[85%] rounded-full border border-dashed border-cyan-500/5" />
            <div className="w-[60%] h-[60%] rounded-full border border-cyan-500/5" />
            <div className="absolute w-[100%] h-[1px] bg-cyan-500/5" />
          </div>

          {/* Diagonal Stark Tech Calibration Brackets (Upper Left and Lower Right) */}
          <div className="absolute top-16 left-6 w-16 h-16 border-t border-l border-cyan-500/10 opacity-40">
            <div className="w-2 h-[1px] bg-cyan-400 absolute top-0 left-0" />
            <div className="h-2 w-[1px] bg-cyan-400 absolute top-0 left-0" />
            <span className="text-[6.5px] text-cyan-400/40 absolute top-1 left-2 font-mono">SYS_CAL_X8</span>
          </div>

          <div className="absolute bottom-6 right-6 w-16 h-16 border-b border-r border-cyan-500/10 opacity-40">
            <div className="w-2 h-[1px] bg-cyan-400 absolute bottom-0 right-0" />
            <div className="h-2 w-[1px] bg-cyan-400 absolute bottom-0 right-0" />
            <span className="text-[6.5px] text-cyan-400/40 absolute bottom-1 right-2 font-mono">ST_CO_9.4</span>
          </div>

          {/* Grand Futuristic Stark Industries Watermark spanning the lower back center */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-[0.065]">
            <span className="text-3xl md:text-5xl font-mono font-black tracking-[0.35em] text-cyan-400 uppercase select-none">
              STARK INDUSTRIES
            </span>
            <div className="w-52 h-[1px] bg-cyan-500/50" />
            <span className="text-[7.5px] font-mono tracking-[0.4em] text-cyan-200">
              SECURE SYSTEM BACKPLANE &bull; COGNITIVE NETWORKS
            </span>
          </div>
        </div>
      )}

      <AnimatePresence>
        {!initialized ? (
          revealStep === 0 ? (
            /* Pitch-black Initial Stealth Mode screen */
            <motion.div
              key="initial-black-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-[999999] flex flex-col items-center justify-center cursor-pointer font-mono"
              onClick={handleInitialClapWake}
            >
              <div className="text-center space-y-4 px-6 select-none opacity-80 hover:opacity-100 transition-opacity duration-500 pointer-events-none max-w-md">
                <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                  <span className="absolute animate-ping w-4 h-4 rounded-full bg-cyan-500/20" />
                  <div className="w-2.5 h-2.5 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-[0.2em]">
                    STARK COGNITIVE INACTIVE
                  </p>
                  <p className="text-[11px] font-sans text-cyan-200 tracking-wider leading-relaxed">
                    👏 박수 두 번(이중 박수)으로 메인프레임 시스템 작동<br/>
                    (Double-Clap or touch/click black screen to activate)
                  </p>
                  <div className="pt-4 border-t border-cyan-500/10 text-[9px] font-sans text-slate-500 space-y-1.5 leading-relaxed">
                    <p>※ 마이크 입력 오류("not-allowed")가 발생할 경우:</p>
                    <p className="text-slate-400 font-medium">
                      우측 상단 <strong>[새 탭에서 열기] (Open in New Tab)</strong> 버튼을 눌러 실행하고,<br/>
                      브라우저 주소창에서 마이크 권한을 꼭 허용해 주세요!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : isBooting ? (
            /* Cinematic Bootscreen Overlay */
            <motion.div
              key="bootscreen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="z-10 max-w-md w-full p-8 rounded-2xl bg-black/95 border border-cyan-500/25 backdrop-blur-xl shadow-[0_0_50px_rgba(6,182,212,0.25)] relative space-y-6 font-mono text-left"
            >
              {/* Spinning Mini Arc Reactor Graphic */}
              <div className="flex items-center gap-4 border-b border-cyan-500/20 pb-4">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute w-12 h-12 rounded-full border-2 border-dashed border-cyan-500/60"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className="w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                  />
                </div>
                <div>
                  <h2 className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
                    JARVIS MAINFRAME OS
                  </h2>
                  <p className="text-[10px] text-cyan-500/50">COGNITIVE SECURE LINK Active</p>
                </div>
              </div>

              {/* Progress Bar with glowing aura */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-cyan-400">
                  <span className="tracking-widest animate-pulse font-bold">DECRYPTING MEMORY GRID...</span>
                  <span className="font-bold">{bootProgress}%</span>
                </div>
                <div className="w-full h-2 bg-cyan-950/80 rounded-full border border-cyan-500/20 overflow-hidden relative">
                  <motion.div
                    className="bg-cyan-400 h-full rounded-full shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                    style={{ width: `${bootProgress}%` }}
                    animate={{ width: `${bootProgress}%` }}
                    transition={{ ease: "easeInOut" }}
                  />
                </div>
              </div>

              {/* Console logs box */}
              <div className="bg-slate-950 border border-cyan-500/10 p-4 rounded-lg h-44 overflow-y-auto text-[10px] text-emerald-400 space-y-1.5 font-mono select-none">
                {bootLogs.map((log, idx) => (
                  <div key={idx} className="flex gap-2 items-start leading-tight">
                    <span className="text-cyan-500/60 font-semibold">[SEC]</span>
                    <span className="break-all">{log}</span>
                  </div>
                ))}
                <div className="w-2 h-3.5 bg-emerald-400 animate-pulse inline-block ml-1" />
              </div>
              
              <div className="text-[9px] text-slate-500 text-center uppercase tracking-widest">
                Stark Aerospace Ind. Authorized.
              </div>
            </motion.div>
          ) : (
            /* Landing Page: Initiate Mainframe - Configs view */
            <motion.div
              key="onboarding"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="z-10 max-w-md w-full p-8 rounded-2xl bg-slate-900/40 border border-cyan-500/20 backdrop-blur-md shadow-[0_0_40px_rgba(6,182,212,0.1)] text-center relative space-y-6"
            >
            {/* Pulsing Core icon */}
            <div className="relative flex justify-center">
              <motion.div
                animate={{ scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 rounded-full bg-cyan-950 flex items-center justify-center border border-cyan-500/25 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
              >
                <Cpu className="w-10 h-10 text-cyan-400" />
              </motion.div>
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-mono font-medium tracking-[0.2em] text-cyan-400">
                J.A.R.V.I.S.
              </h1>
              <p className="text-xs font-mono text-cyan-500/60 uppercase tracking-widest">
                Just A Rather Very Intelligent System
              </p>
            </div>

            <p className="text-sm text-slate-400 leading-relaxed font-sans">
              Welcome, Mr. Stark. The virtual speech engine is synchronized and programmed to output audio in a deep, loyal male J.A.R.V.I.S. voice. Speak in Korean or English, and I will respond to you in kind.
            </p>

            {/* Quick configurations before booting */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-cyan-500/10 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-cyan-500/70">INPUT LANGUAGE:</span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setInputLanguage("ko-KR");
                      setTranslateKToEMode(true);
                      localStorage.setItem("jarvis_translate_ktoe_mode", "true");
                    }}
                    className={`px-3 py-1 rounded transition-all border ${
                      inputLanguage === "ko-KR"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)] cursor-pointer"
                        : "bg-transparent text-slate-500 border-slate-800 hover:border-cyan-500/30 cursor-pointer"
                    }`}
                  >
                    Korean (ko-KR) ➜ Translate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInputLanguage("en-US");
                      setTranslateKToEMode(false);
                      localStorage.setItem("jarvis_translate_ktoe_mode", "false");
                    }}
                    className={`px-3 py-1 rounded transition-all border ${
                      inputLanguage === "en-US"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)] cursor-pointer"
                        : "bg-transparent text-slate-500 border-slate-800 hover:border-cyan-500/30 cursor-pointer"
                    }`}
                  >
                    English (en-US)
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-cyan-500/70">OPERATOR TITLES:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setUserGender("male");
                      setUserName("Mr. Stark");
                    }}
                    className={`px-3 py-1 rounded transition-all border ${
                      userGender === "male"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                        : "bg-transparent text-slate-500 border-slate-800"
                    }`}
                  >
                    Mr. Stark
                  </button>
                  <button
                    onClick={() => {
                      setUserGender("female");
                      setUserName("Pepper");
                    }}
                    className={`px-3 py-1 rounded transition-all border ${
                      userGender === "female"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                        : "bg-transparent text-slate-500 border-slate-800"
                    }`}
                  >
                    Ma'am / Pepper
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-cyan-500/70">AUDIBLE VOICE LEVEL:</span>
                <div className="flex gap-1.5 text-[11px]">
                  <button
                    onClick={() => setVoiceEngine("browser")}
                    className={`px-2 py-1 rounded transition-all border ${
                      voiceEngine === "browser"
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                        : "bg-transparent text-slate-500 border-slate-800 hover:text-cyan-400"
                    }`}
                  >
                    Local System
                  </button>
                  <button
                    onClick={() => setVoiceEngine("silent")}
                    className={`px-2 py-1 rounded transition-all border ${
                      voiceEngine === "silent"
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                        : "bg-transparent text-slate-500 border-slate-800 hover:text-cyan-400"
                    }`}
                  >
                    Muted
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-cyan-500/5 pt-2.5">
                <span className="text-cyan-500/70">KOREAN MALE PRESET:</span>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEngine("browser");
                    const koMale = getBestKoVoice(availableVoices);

                    if (koMale) {
                      setSelectedBrowserVoice(koMale.name);
                      
                      const isMale = isKoMaleVoice(koMale);

                      if (isMale) {
                        setBrowserPitch(0.85); // Deeper baritone voice (0.85 is dignified and natural)
                        setBrowserRate(0.92); // Cool deliberate pacing
                      } else {
                        setBrowserPitch(0.40); // Force deep baritone simulation for female fallback voice
                        setBrowserRate(0.88);
                      }
                    } else {
                      alert("로컬 시스템에 등록된 한국어 음성이 발견되지 않았습니다. 브라우저/OS의 한국어 TTS 설정을 확인해 주십시오.");
                    }
                  }}
                  className={`px-3 py-1 rounded transition-all border text-[11px] font-bold cursor-pointer ${
                    voiceEngine === "browser" && 
                    selectedBrowserVoice && 
                    (selectedBrowserVoice.toLowerCase().includes("minsu") || 
                     selectedBrowserVoice.toLowerCase().includes("민수") || 
                     selectedBrowserVoice.toLowerCase().includes("junwoo") || 
                     selectedBrowserVoice.toLowerCase().includes("준우") || 
                     selectedBrowserVoice.toLowerCase().includes("chinho") || 
                     selectedBrowserVoice.toLowerCase().includes("진호") || 
                     selectedBrowserVoice.toLowerCase().includes("male") || 
                     selectedBrowserVoice.toLowerCase().includes("남성") || 
                     (availableVoices.find(v => v.name === selectedBrowserVoice)?.lang.toLowerCase().startsWith("ko") ?? false))
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                      : "bg-transparent text-slate-500 border-slate-800 hover:text-cyan-400 hover:border-cyan-500/20"
                  }`}
                >
                  Apply 🇰🇷
                </button>
              </div>

              <div className="flex justify-between items-center border-t border-cyan-500/5 pt-2.5">
                <span className="text-cyan-500/70">LOCAL BROWSER (UK):</span>
                <button
                  type="button"
                  onClick={() => {
                    setVoiceEngine("browser");
                    localStorage.setItem("jarvis_voice_engine", "browser");
                    const ukVoice = availableVoices.find((v) => {
                      const langLower = v.lang.toLowerCase();
                      const nameLower = v.name.toLowerCase();
                      return (langLower === "en-gb" || langLower.startsWith("en-gb")) && 
                             (nameLower.includes("male") || !nameLower.includes("female"));
                    }) || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en-gb"))
                       || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en"));

                    if (ukVoice) {
                      setSelectedBrowserVoice(ukVoice.name);
                      setBrowserPitch(0.85); // Sophisticated English pitch
                      setBrowserRate(0.95); // Polite British pace
                    } else {
                      alert("로컬 시스템에 등록된 영국식 영어(en-GB) 음성이 발견되지 않았습니다. 기본 영어 음성으로 대체됩니다.");
                    }
                  }}
                  className={`px-3 py-1 rounded transition-all border text-[11px] font-bold cursor-pointer ${
                    voiceEngine === "browser" && 
                    selectedBrowserVoice && 
                    (selectedBrowserVoice.toLowerCase().includes("gb") || 
                     selectedBrowserVoice.toLowerCase().includes("uk") || 
                     (availableVoices.find(v => v.name === selectedBrowserVoice)?.lang.toLowerCase().startsWith("en-gb") ?? false))
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                      : "bg-transparent text-slate-500 border-slate-800 hover:text-cyan-400 hover:border-cyan-500/20"
                  }`}
                >
                  Apply 🇬🇧
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
              onClick={initializeSystem}
              className="w-full py-3 px-6 bg-gradient-to-r from-cyan-600 to-sky-600 hover:from-cyan-500 hover:to-sky-500 rounded-xl font-mono text-sm tracking-widest text-white shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4 animate-spin [animation-duration:3s]" />
              LOAD COGNITIVE MAINFRAME
            </motion.button>
          </motion.div>
        )) : (
          /* Interactive Command Module Dashboard */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="z-10 max-w-7xl w-full flex flex-col gap-6 relative"
          >
            {/* ================= STARK HIGH-FIDELITY HUD HEADER ================= */}
            <div className="w-full bg-slate-900/30 border border-cyan-400/15 backdrop-blur-md rounded-2xl p-4 md:p-5 flex flex-col gap-3 shadow-[0_0_30px_rgba(6,182,212,0.06)] relative overflow-hidden">
              {/* Outer corner cyber aesthetics */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
              
              <div className="absolute top-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
              <div className="absolute bottom-0 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

              {/* Top Row: System Status Labels & Weather info */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
                {/* Left block: Stark mainframe info */}
                <div className="flex items-center gap-3">
                  <div className="relative w-7 h-7 flex items-center justify-center bg-cyan-950/40 border border-cyan-500/30 rounded-lg">
                    <span className="absolute animate-ping w-2 h-2 rounded-full bg-cyan-400" />
                    <div className="w-2 h-2 bg-cyan-400 rounded-full shadow-[0_0_6px_#22d3ee]" />
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-cyan-400 tracking-widest uppercase block drop-shadow-[0_0_3px_rgba(6,182,212,0.4)]">
                      STARK INDUSTRIES MAINFRAME
                    </span>
                    <span className="text-[8.5px] text-slate-400 uppercase tracking-widest block font-sans">
                      SYSTEM INTEGRATION: ONLINE &bull; SECURE // LEVEL ALFA
                    </span>
                  </div>
                </div>

                {/* Right block: Gorgeous Moscow/Malibu weather overlay directly inspired by user image */}
                <div className="flex items-center gap-4 bg-cyan-950/25 border border-cyan-500/10 px-3.5 py-1.5 rounded-xl self-start md:self-auto shadow-sm shadow-cyan-500/5">
                  <div className="text-right">
                    <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-wider">MALIBU HEADQUARTERS // OUTSIDE</p>
                    <p className="text-[8px] text-slate-500 uppercase tracking-widest block">SECURE AMBIENT &bull; SOLAR CORE ACTIVE</p>
                  </div>
                  <div className="h-6 w-[1px] bg-cyan-500/20" />
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-bold font-mono text-cyan-100 drop-shadow-[0_0_6px_rgba(34,211,238,0.5)]">
                      {Math.round((Math.sin((currentLocalTime.getHours() - 6) * Math.PI / 12) * 3) + 20)}°C
                    </span>
                    <div className="text-[8px] text-slate-400 font-sans leading-none">
                      <p className="text-cyan-400 font-medium font-mono">HUMIDITY: 77%</p>
                      <p className="font-mono mt-0.5">WIND: 3km/h</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Divider bar */}
              <div className="w-full h-[1px] bg-cyan-500/10" />

              {/* Bottom Row: Linear Calibration Ruler Calendar (Inspired by top bar of reference image) */}
              <div className="flex flex-col gap-1.5 select-none overflow-x-auto no-scrollbar">
                <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 uppercase px-1">
                  <span>MALIBU TIMELINE OVERLAY</span>
                  <span>{["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"][currentLocalTime.getDay()]} SYSTEM SYNCHRONIZATION</span>
                  <span>SYS REGISTRY GRID v3.8</span>
                </div>
                
                {/* Ruler container */}
                <div className="flex items-center justify-between border-t border-b border-cyan-500/10 py-2.5 px-2 bg-cyan-950/10 rounded-lg min-w-[700px]">
                  {Array.from({ length: 30 }).map((_, idx) => {
                    const dayNum = idx + 1;
                    const isToday = currentLocalTime.getDate() === dayNum;
                    return (
                      <div key={dayNum} className="flex flex-col items-center gap-1.5 transition-all">
                        {/* Interactive glow date indicator */}
                        <span className={`text-[10px] font-mono font-bold tracking-tighter px-1.5 py-0.5 rounded ${
                          isToday 
                            ? "bg-cyan-500/30 text-cyan-300 border border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)] animate-pulse" 
                            : "text-slate-500 hover:text-cyan-400/60"
                        }`}>
                          {String(dayNum).padStart(2, "0")}
                        </span>
                        
                        {/* Tick marks */}
                        <div className="flex flex-col items-center">
                          <div className={`w-[1px] ${isToday ? "h-3.5 bg-cyan-400 shadow-[0_0_4px_#00f0ff]" : "h-1.5 bg-slate-700"} `} />
                          {dayNum % 5 === 0 && !isToday && (
                            <span className="text-[5px] text-cyan-500/40 font-mono mt-0.5">{dayNum}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Core Columns Grid wrapped inside Stark system frame */}
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-5 relative">
              
              {/* Left Column: Telemetry Core Metrics (Direct Image Detail!) */}
              {showRightPanel && rightPanelMode !== "design" && (
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="lg:col-span-3 col-span-12 flex flex-col space-y-4"
                >
                  {/* User dome avatar card */}
                  <div className="flex items-center gap-3 bg-slate-950/40 border border-cyan-500/15 p-2.5 px-4 rounded-xl shadow-[0_0_12px_rgba(34,211,238,0.05)] text-left font-mono relative">
                    <div className="relative w-8 h-8 flex items-center justify-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="absolute inset-0 border border-cyan-500/40 border-dashed rounded-full"
                      />
                      <div className="w-6 h-6 rounded-full bg-cyan-950/80 border border-cyan-400 flex items-center justify-center overflow-hidden">
                        <User className="w-3.5 h-3.5 text-cyan-300" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-[10px] font-extrabold text-cyan-300 uppercase tracking-widest leading-none">
                        JARVIS OS <span className="text-[8px] font-normal text-slate-400">Ver 1.2.5</span>
                      </h3>
                      <p className="text-[8.5px] text-slate-400 tracking-tight leading-none mt-1">
                        User: <span className="font-bold text-cyan-200">{userName || "Alejandro Montoya"}</span>
                      </p>
                    </div>
                  </div>

                  {/* CPU #1 CORE SWEEP */}
                  <div className="stark-cyber-panel stark-cyber-bottom-decor p-4 flex flex-col space-y-2 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-cyan-500/10 pb-1.5">
                      <span className="text-[10px] font-bold font-mono text-cyan-300 tracking-widest uppercase">CPU #1 // CORE SWEEP</span>
                      <span className="text-[8px] font-mono text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-500/15">85%</span>
                    </div>

                    {/* SVG Sweep chart */}
                    <div className="w-full h-20 bg-slate-950/50 border border-cyan-500/5 rounded-lg relative overflow-hidden flex items-end">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:10px_10px]" />
                      <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                        <path
                          d="M 0 35 L 10 25 L 20 30 L 30 15 L 40 28 L 50 10 L 60 22 L 70 8 L 80 18 L 90 5 L 100 15"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="1.2"
                          className="animate-pulse"
                        />
                      </svg>
                    </div>
                    <div className="flex justify-between text-[7px] font-mono text-slate-500">
                      <span>LOCKED GRID</span>
                      <span>TEMP: 45.0°C</span>
                      <span>4.81 GHz</span>
                    </div>
                  </div>

                  {/* HARD DISK STORAGE INDEX */}
                  <div className="stark-cyber-panel stark-cyber-bottom-decor p-4 flex flex-col space-y-3 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-cyan-500/10 pb-1.5">
                      <span className="text-[10px] font-bold font-mono text-cyan-300 tracking-widest uppercase">HARD DISK STORAGE INDEX</span>
                      <span className="text-[8px] font-mono text-cyan-400">RAID 5 ON</span>
                    </div>

                    <div className="space-y-2.5 font-mono">
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-cyan-200">DRIVE C:// (OS_COGNITIVE)</span>
                          <span className="text-slate-400">240 GB / 440 GB</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 border border-cyan-500/10 rounded-full overflow-hidden p-[1px]">
                          <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: "54.5%" }} />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px]">
                          <span className="text-cyan-200">DRIVE D:// (ARCHIVE_CORE)</span>
                          <span className="text-slate-400">200 GB / 440 GB</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-950 border border-cyan-500/10 rounded-full overflow-hidden p-[1px]">
                          <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: "45.4%" }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* NETWORK SIGNAL MATRIX */}
                  <div className="stark-cyber-panel stark-cyber-bottom-decor p-4 flex flex-col space-y-2 relative overflow-hidden">
                    <span className="text-[8px] font-mono text-slate-500 uppercase block">NETWORK TELEMETRY</span>
                    <div className="flex justify-between text-[9px] font-mono">
                      <span className="text-cyan-400">UP: 151.68 MB</span>
                      <span className="text-cyan-400">DL: 3.11 MB</span>
                    </div>
                    <div className="w-full h-10 bg-slate-950/40 rounded border border-cyan-500/5 overflow-hidden relative">
                      <svg viewBox="0 0 100 25" className="w-full h-full">
                        <path
                          d="M 0 15 Q 25 5 50 18 T 100 10"
                          fill="none"
                          stroke="#22d3ee"
                          strokeWidth="0.8"
                          opacity="0.6"
                        />
                      </svg>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Center Column: Primary Reactor & Interaction controls */}
              {rightPanelMode !== "design" && (
                <motion.div
                initial={{ opacity: 0, y: 35, scale: 0.94, filter: "blur(12px)" }}
                animate={revealStep >= 1 ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : { opacity: 0, y: 35, scale: 0.94, filter: "blur(12px)" }}
                transition={{ type: "spring", stiffness: 60, damping: 14 }}
                className={`${showRightPanel ? "lg:col-span-6 col-span-12" : "col-span-12"} flex flex-col space-y-4 relative transition-all duration-300`}
                style={{ pointerEvents: revealStep >= 1 ? "auto" : "none" }}
              >
              {revealStep === 1 && (
                <motion.div
                  initial={{ top: "-5%", opacity: 1 }}
                  animate={{ top: "105%", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.6, ease: "easeInOut" }}
                  className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.95)] z-50 pointer-events-none"
                />
              )}
              {/* Main Reactor Panel */}
              <div
                id="jarvis-reactor-panel"
                className="stark-cyber-panel stark-cyber-bottom-decor p-6 flex flex-col items-center justify-center relative"
              >
                {/* Restore Right Co-processor Panel / 3D CAD buttons */}
                {!showRightPanel && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                    <button
                      onClick={() => {
                        setRightPanelMode("design");
                        setShowRightPanel(true);
                        localStorage.setItem("jarvis_show_right_panel", "true");
                        const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
                        speakOutput(`Initializing 3D CAD Hologram Studio, ${userHonorific}. Rendering virtual workspace.`);
                      }}
                      className="px-3 py-1.5 bg-cyan-950/50 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 text-cyan-300 rounded-lg text-[10px] font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      title="Open 3D CAD Designer"
                    >
                      <Compass className="w-4 h-4 text-cyan-400 animate-[spin_6s_linear_infinite]" />
                      <span>OPEN 3D CAD</span>
                    </button>
                    <button
                      onClick={() => {
                        setRightPanelMode("math");
                        setShowRightPanel(true);
                        localStorage.setItem("jarvis_show_right_panel", "true");
                        const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
                        speakOutput(`Restoring primary visual telemetry arrays and co-processor diagnostics, ${userHonorific}.`);
                      }}
                      className="px-2.5 py-1.5 bg-slate-950/50 hover:bg-cyan-500/10 border border-slate-800 hover:border-cyan-500/30 text-slate-400 hover:text-cyan-300 rounded-lg text-[10px] font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Restore Co-processor Panel"
                    >
                      <LayoutGrid className="w-3.5 h-3.5 text-cyan-500" />
                      <span>OPEN PANEL</span>
                    </button>
                  </div>
                )}

                {showRightPanel && rightPanelMode !== "design" && (
                  <button
                    onClick={() => {
                      setShowRightPanel(false);
                      localStorage.setItem("jarvis_show_right_panel", "false");
                      const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
                      speakOutput(`Powering down auxiliary panel display, ${userHonorific}.`);
                    }}
                    className="absolute top-4 left-4 px-3 py-1.5 bg-slate-950/50 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 rounded-lg text-[10px] font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Hide Co-processor Panel"
                  >
                    <X className="w-4 h-4 text-rose-400" />
                    <span>HIDE PANEL</span>
                  </button>
                )}

                {/* Floating Micro Config Button */}
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`absolute top-4 right-4 p-2 rounded-lg border transition-all ${
                    showSettings
                      ? "bg-cyan-500/20 border-cyan-400/40 text-cyan-300"
                      : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-cyan-400"
                  }`}
                  title="Configure voice settings"
                >
                  <Sliders className="w-4.5 h-4.5" />
                </button>

                <ArcReactor status={status} volumeLevel={volumeLevel} emotion={jarvisEmotion} />
                
                {/* Clean label under core */}
                <div className="mt-4 text-center font-mono space-y-1">
                  <h2 className="text-sm font-semibold text-cyan-200 tracking-widest">
                    SYSTEM MAIN CORE
                  </h2>
                  <p className="text-[10px] text-cyan-500/60 uppercase animate-pulse">
                    Reactive cognitive node active
                  </p>
                </div>



                {/* Waveform Visualization Overlay */}
                <div className="w-full mt-4 border-t border-cyan-500/10 pt-4">
                  <AudioVisualizer status={status} volumeLevel={volumeLevel} />
                </div>

                {/* Integrated Cinematic Dialogue & Subtitles Sub-panel */}
                <div className="w-full mt-4 border-t border-cyan-500/10 pt-4 space-y-3.5">
                  <div className="min-h-[105px] flex flex-col justify-center items-center relative py-3.5 px-4 bg-cyan-950/[0.04] border border-cyan-500/5 rounded-xl overflow-hidden backdrop-blur-[2px]">
                    {/* Glowing neon tracking lines in corners */}
                    <div className="absolute top-1 left-1 w-2 h-2 border-t border-l border-cyan-500/25" />
                    <div className="absolute top-1 right-1 w-2 h-2 border-t border-r border-cyan-500/25" />
                    <div className="absolute bottom-1 left-1 w-2 h-2 border-b border-l border-cyan-500/25" />
                    <div className="absolute bottom-1 right-1 w-2 h-2 border-b border-r border-cyan-500/25" />

                    <AnimatePresence mode="wait">
                      {isListening ? (
                        <motion.div
                          key="listening-hud"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-col items-center text-center space-y-2 w-full"
                        >
                          {/* Live speaking ripples */}
                          <div className="flex items-center gap-1 h-5">
                            {[...Array(7)].map((_, i) => (
                              <motion.div
                                key={i}
                                className="w-1 bg-red-500 rounded-full"
                                animate={{
                                  height: [6, i % 2 === 0 ? 18 : 12, 6]
                                }}
                                transition={{
                                  duration: 0.45 + i * 0.08,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                                style={{
                                  boxShadow: "0 0 8px rgba(239, 68, 68, 0.75)"
                                }}
                              />
                            ))}
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[7px] font-mono font-bold text-red-400 tracking-[0.25em] uppercase block animate-pulse">
                              실시간 음성 명령어 수신 중
                            </span>
                            <p className="text-xs font-semibold text-slate-100 font-sans tracking-wide leading-relaxed select-text">
                              {transitText ? `"${transitText}"` : "음성 수신 중... 지금 말씀해 주십시오, 주인님"}
                            </p>
                          </div>
                        </motion.div>
                      ) : status === "thinking" ? (
                        <motion.div
                          key="thinking-hud"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="flex flex-col items-center text-center space-y-1.5"
                        >
                          <div className="relative w-7 h-7 flex items-center justify-center">
                            <motion.div
                              className="absolute w-full h-full rounded-full border-2 border-cyan-400/10 border-t-cyan-400"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                            />
                            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                          </div>
                          <span className="text-[7px] font-mono text-cyan-400 tracking-[0.2em] uppercase block animate-pulse">
                            자비스 양자 신경망 분석 중...
                          </span>
                        </motion.div>
                      ) : messages.length > 0 ? (
                        (() => {
                           const lastMsg = [...messages].reverse().find(m => m.role === "jarvis");
                           if (!lastMsg) return null;
                           return (
                            <motion.div
                              key={lastMsg.id}
                              initial={{ opacity: 0, y: 6, filter: "blur(3px)" }}
                              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                              exit={{ opacity: 0, y: -6, filter: "blur(2px)" }}
                              className="flex flex-col items-center text-center space-y-2.5 w-full"
                            >
                              {status === "speaking" ? (
                                <div className="flex items-center gap-1 h-4">
                                  {[...Array(9)].map((_, i) => (
                                    <motion.div
                                      key={i}
                                      className="w-0.5 bg-cyan-400 rounded-full"
                                      animate={{
                                        height: [3, i % 3 === 0 ? 14 : i % 2 === 0 ? 10 : 6, 3]
                                      }}
                                      transition={{
                                        duration: 0.4 + i * 0.05,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                      }}
                                      style={{
                                        boxShadow: "0 0 6px rgba(34, 211, 238, 0.6)"
                                      }}
                                    />
                                  ))}
                                </div>
                              ) : (
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500/20 ring-2 ring-cyan-500/10 animate-pulse" />
                              )}
                              <div className="space-y-1.5 select-text w-full">
                                <div className="flex justify-between items-center w-full px-1 gap-2">
                                  <span className="text-[7px] font-mono font-bold text-cyan-500/60 tracking-[0.2em] uppercase block">
                                    자비스 실시간 홀로그램 자막
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAutoTranslateSubtitles(!autoTranslateSubtitles);
                                    }}
                                    className={`px-1.5 py-0.5 rounded text-[7px] font-mono border tracking-wider uppercase transition-all cursor-pointer ${
                                      autoTranslateSubtitles 
                                        ? "bg-cyan-500/15 text-cyan-400 border-cyan-500/35 hover:bg-cyan-500/25" 
                                        : "bg-transparent text-slate-500 border-slate-800 hover:border-slate-700"
                                    }`}
                                  >
                                    {autoTranslateSubtitles ? "KOR: ON" : "KOR: OFF"}
                                  </button>
                                </div>
                                <p className="text-[11.5px] font-sans font-medium text-cyan-50 md:text-xs tracking-wide leading-relaxed filter drop-shadow-[0_0_6px_rgba(34,211,238,0.15)] max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                                  {autoTranslateSubtitles ? translateToKorean(lastMsg.text, userGender, userName) : lastMsg.text}
                                </p>
                              </div>
                            </motion.div>
                          );
                        })()
                      ) : (
                        <motion.div
                          key="idle-hud"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.65 }}
                          className="flex flex-col items-center text-center space-y-1.5 text-cyan-500/40 select-none"
                        >
                          {alwaysListeningEn && !bypassWakeWord ? (
                            <div className="flex flex-col items-center space-y-1.5">
                              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-950/40 border border-cyan-500/20 text-[8px] font-mono text-cyan-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                                <span>상시 음성 감지 가동 중</span>
                              </div>
                              <span className="text-[7px] font-mono tracking-[0.2em] uppercase text-cyan-400/60">"실시간 수신 대기 중..."</span>
                            </div>
                          ) : (
                            <>
                              <Cpu className="w-5 h-5 stroke-[1.2] animate-pulse" />
                              <span className="text-[7px] font-mono tracking-[0.2em] uppercase">SYSTEM STANDBY</span>
                            </>
                          )}
                          <p className="text-[9px] font-sans text-cyan-500/50">"전송 버튼을 누르고 말씀하시거나 타이핑해 주십시오, 주인님."</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Dynamic Pybricks / Python Code Input Console (Below Speaking dialogue box) */}
                  <div className="w-full bg-slate-950/40 border border-cyan-500/15 rounded-xl p-3 space-y-2.5 relative overflow-hidden backdrop-blur-sm shadow-[inset_0_0_12px_rgba(6,182,212,0.03)]">
                    <div className="flex items-center justify-between border-b border-cyan-500/10 pb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                          COGNITIVE ROBOTICS CODE INPUT
                        </span>
                      </div>
                      <span className="text-[7px] font-mono text-slate-500 uppercase">
                        Pybricks & Python compiler
                      </span>
                    </div>
                    
                    <textarea
                      value={jarvisCodeInput}
                      onChange={(e) => setJarvisCodeInput(e.target.value)}
                      placeholder="# Paste your Pybricks or Python code here...&#10;# E.g.,&#10;# from pybricks.hubs import PrimeHub&#10;# hub = PrimeHub()&#10;# hub.light.on(Color.CYAN)"
                      className="w-full min-h-[90px] max-h-[180px] bg-slate-950/95 border border-cyan-500/25 rounded-lg p-2.5 text-[10px] font-mono text-cyan-100 placeholder-cyan-500/20 outline-none focus:border-cyan-400/50 shadow-[inset_0_0_8px_rgba(6,182,212,0.08)] resize-y scrollbar-thin"
                      spellCheck={false}
                    />
                    
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (!jarvisCodeInput.trim()) {
                            setErrorNotice("⚠ 입력된 코드가 없습니다. 시뮬레이션할 코드를 입력해 주십시오.");
                            return;
                          }
                          const prompt = `Here is my Pybricks/Python code for simulation and detailed error diagnostics. Please run step-by-step trace simulation logs, identify logical bugs, explain physical mechanical impact, and provide corrected re-engineered blueprint code with SIMULATE_SHOW command at the end:\n\n\`\`\`python\n${jarvisCodeInput}\n\`\`\``;
                          handleSubmitPrompt(prompt);
                        }}
                        disabled={status === "thinking"}
                        className="flex-1 py-1.5 px-3 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/35 text-cyan-300 hover:text-cyan-100 rounded-lg text-[9px] font-bold font-mono tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer uppercase shadow-[0_0_10px_rgba(6,182,212,0.05)] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>ENGAGE CODE SIMULATION</span>
                      </button>
                      
                      {jarvisCodeInput && (
                        <button
                          type="button"
                          onClick={() => setJarvisCodeInput("")}
                          className="px-2 py-1.5 bg-slate-900 hover:bg-red-950/20 border border-slate-800 hover:border-red-500/30 text-slate-500 hover:text-red-400 rounded-lg transition-all cursor-pointer font-mono text-[8.5px] uppercase"
                          title="Clear input"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Operational Voice Buttons Row */}
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleToggleVoiceInput}
                      className={`flex-1 overflow-hidden py-2 px-3 rounded-xl font-mono text-[10px] font-bold tracking-wider transition-all flex items-center justify-center gap-1.5 border shadow-md cursor-pointer ${
                        isListening
                          ? "bg-red-500 text-white border-red-400 shadow-[0_0_12px_rgba(239,68,68,0.45)]"
                          : "bg-cyan-950/40 text-cyan-400 border-cyan-500/20 hover:bg-cyan-900/50 hover:border-cyan-400/40"
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="w-3.5 h-3.5 animate-pulse" />
                          <span>TERMINATE CAPTURE</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-3.5 h-3.5" />
                          <span>TRANSMIT VOICE COMMAND</span>
                        </>
                      )}
                    </motion.button>

                    {status === "speaking" && (
                      <motion.button
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={stopAllAudio}
                        className="px-3.5 bg-slate-900 border border-red-500/35 text-red-400 hover:bg-red-950/20 rounded-xl transition-all flex items-center justify-center cursor-pointer"
                        title="Interrupt Voice Output"
                      >
                        <Square className="w-3 h-3 fill-red-400/20" />
                      </motion.button>
                    )}

                    <button
                      onClick={handleClearTerminal}
                      className="px-3 text-[10px] font-mono text-slate-500 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/25 bg-slate-900/40 rounded-xl transition-all cursor-pointer"
                      title="Reset Dialog Stream"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Setting Configuration Expandable Drawer */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-slate-900/50 border border-cyan-500/10 rounded-2xl p-5 font-mono text-xs space-y-4 overflow-hidden"
                  >
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold border-b border-cyan-500/10 pb-2">
                      <Settings className="w-4 h-4" />
                      <span>VOCAL MATRIX CONFIGURATION</span>
                    </div>

                    {/* Operator Input Language Choice */}
                    <div className="space-y-2">
                      <label className="text-cyan-500/80">STT INPUT SPEECH LANGUAGE:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setInputLanguage("en-US");
                            setTranslateKToEMode(false);
                            localStorage.setItem("jarvis_translate_ktoe_mode", "false");
                            setErrorNotice("🎙️ Speech recognition language set to English (en-US).");
                          }}
                          className={`py-1.5 px-2 rounded text-[10px] text-center border font-semibold transition-all cursor-pointer ${
                            inputLanguage === "en-US"
                              ? "bg-cyan-500/25 text-cyan-200 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                              : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-cyan-500/30"
                          }`}
                        >
                          English 🇺🇸 (en-US)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setInputLanguage("ko-KR");
                            setTranslateKToEMode(true);
                            localStorage.setItem("jarvis_translate_ktoe_mode", "true");
                            setErrorNotice("🎙️ Speech recognition set to Korean (ko-KR) with translation.");
                          }}
                          className={`py-1.5 px-2 rounded text-[10px] text-center border font-semibold transition-all cursor-pointer ${
                            inputLanguage === "ko-KR"
                              ? "bg-cyan-500/25 text-cyan-200 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                              : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-cyan-500/30"
                          }`}
                        >
                          Korean 🇰🇷 (ko-KR)
                        </button>
                      </div>
                    </div>

                    {/* J.A.R.V.I.S. Vocal Language Choice */}
                    <div className="space-y-2">
                      <label className="text-cyan-500/80">J.A.R.V.I.S. VOCAL SPEECH LANGUAGE:</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            stopAllAudio();
                            setSpeechLanguage("en-GB");
                            localStorage.setItem("jarvis_speech_lang", "en-GB");
                            const engVoice = availableVoices.find((v) => {
                              const langLower = v.lang.toLowerCase();
                              const nameLower = v.name.toLowerCase();
                              return (langLower === "en-gb" || langLower.startsWith("en-gb")) && 
                                     (nameLower.includes("male") || !nameLower.includes("female"));
                            }) || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en-gb"))
                               || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en"));
                            if (engVoice) {
                              setSelectedBrowserVoice(engVoice.name);
                              setBrowserPitch(0.85);
                              setBrowserRate(0.95);
                            }
                            setErrorNotice("🎙️ J.A.R.V.I.S. vocal language set to English (en-GB).");
                          }}
                          className={`py-1.5 px-2 rounded text-[10px] text-center border font-semibold transition-all cursor-pointer ${
                            speechLanguage === "en-GB"
                              ? "bg-cyan-500/25 text-cyan-200 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                              : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-cyan-500/30"
                          }`}
                        >
                          English 🇬🇧 (en-GB)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            stopAllAudio();
                            setSpeechLanguage("ko-KR");
                            localStorage.setItem("jarvis_speech_lang", "ko-KR");
                            const koVoice = getBestKoVoice(availableVoices);
                            if (koVoice) {
                              setSelectedBrowserVoice(koVoice.name);
                              setBrowserPitch(0.85);
                              setBrowserRate(0.95);
                            }
                            setErrorNotice("🎙️ J.A.R.V.I.S. vocal language set to Korean (ko-KR - Injun).");
                          }}
                          className={`py-1.5 px-2 rounded text-[10px] text-center border font-semibold transition-all cursor-pointer ${
                            speechLanguage === "ko-KR"
                              ? "bg-cyan-500/25 text-cyan-200 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                              : "bg-slate-950/40 text-slate-400 border-slate-800 hover:border-cyan-500/30"
                          }`}
                        >
                          Korean 🇰🇷 (ko-KR)
                        </button>
                      </div>
                    </div>

                    {/* Custom Instruction File Upload (내가 준 파일) */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80">SYSTEM INSTRUCTION FILE (내가 준 파일):</label>
                        {customInstructionFileName && (
                          <button
                            onClick={handleClearCustomInstructionFile}
                            className="text-[10px] text-red-400 hover:text-red-300 transition-colors font-semibold bg-transparent border-none cursor-pointer"
                          >
                            [CLEAR FILE]
                          </button>
                        )}
                      </div>
                      
                      {customInstructionFileName ? (
                        <div className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-950/20 text-[10px] flex items-center justify-between">
                          <div className="flex items-center gap-2 text-cyan-200">
                            <span className="text-emerald-400 font-bold">● ACTIVE:</span>
                            <span className="truncate max-w-[150px]">{customInstructionFileName}</span>
                          </div>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {customInstructionFileContent.length} chars
                          </span>
                        </div>
                      ) : (
                        <div className="relative group border border-dashed border-cyan-500/20 hover:border-cyan-500/50 rounded-lg p-3 transition-colors text-center bg-cyan-950/10 hover:bg-cyan-950/20 cursor-pointer">
                          <input
                            type="file"
                            accept=".txt,.json,.md,.js,.py,.ts"
                            onChange={handleCustomInstructionFileUpload}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          <p className="text-[10px] text-slate-400 group-hover:text-cyan-300 transition-colors">
                            Click / Drag file here to upload instructions
                          </p>
                          <p className="text-[8px] text-slate-600 mt-1">
                            Supports .txt, .json, .md files (지침 파일)
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Vocal Engine Toggle */}
                    <div className="space-y-2">
                      <label className="text-cyan-500/80 font-mono text-[10px]">SPEECH SYNTHESIS DRIVER:</label>
                      <div className="grid grid-cols-2 gap-1">
                        {(["browser", "silent"] as const).map((eng) => (
                          <button
                            key={eng}
                            onClick={() => {
                              stopAllAudio();
                              setVoiceEngine(eng);
                            }}
                            className={`py-1.5 px-1 rounded text-[10px] text-center border font-semibold capitalize transition-all ${
                              voiceEngine === eng
                                ? "bg-cyan-500/25 text-cyan-200 border-cyan-500/40"
                                : "bg-slate-950/40 text-slate-500 border-slate-800"
                            }`}
                          >
                            {eng === "browser" ? "Local Speech" : "Muted"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {voiceEngine === "browser" && (
                      /* Local system browser speech selectors with depth customizing sliders */
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="text-cyan-500/80">BROWSER LOCAL VOICE:</label>
                          <select
                            value={selectedBrowserVoice}
                            onChange={(e) => {
                              stopAllAudio();
                              setSelectedBrowserVoice(e.target.value);
                            }}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-cyan-100 text-[11px] outline-none focus:border-cyan-500/40"
                          >
                            {availableVoices.length === 0 ? (
                              <option>Loading system voices...</option>
                            ) : (
                              availableVoices.map((v, idx) => (
                                <option key={`${v.name}_${idx}`} value={v.name}>
                                  {v.name} ({v.lang})
                                </option>
                              ))
                            )}
                          </select>
                          
                          {(() => {
                            const activeVoice = availableVoices.find(v => v.name === selectedBrowserVoice);
                            const isKoreanSelected = activeVoice ? activeVoice.lang.toLowerCase().startsWith("ko") : speechLanguage === "ko-KR";
                            const isSelectedVoiceMale = activeVoice ? isKoMaleVoice(activeVoice) : false;
                            
                            if (isKoreanSelected && !isSelectedVoiceMale) {
                              return (
                                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded text-[10px] text-amber-300 leading-normal space-y-1 mt-1 font-sans">
                                  <p className="font-bold">⚠️ 한국어 남성 음성팩 미설치 안내</p>
                                  <p>현재 기기에 한국어 남성 음성(인준, 민수 등)이 발견되지 않아 기본 여성 음성이 활성화되었습니다.</p>
                                  <p>자비스 본연의 남성 목소리를 사용하시려면:</p>
                                  <ul className="list-disc pl-3.5 space-y-0.5 text-slate-400 text-[9px]">
                                    <li>아래 <strong>🇬🇧 J.A.R.V.I.S. (UK)</strong> 프리셋을 클릭해 자비스 본연의 영국식 남성 목소리를 활성화해 보세요. 한국어 답변도 고유의 멋진 억양과 남성 발음으로 출력됩니다!</li>
                                    <li>또는 사용 중인 기기(Windows/Mac/Android/iOS) 설정에서 '한국어 남성 음성팩'을 설치해 주세요.</li>
                                  </ul>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              stopAllAudio();
                              const ukVoice = availableVoices.find((v) => {
                                const langLower = v.lang.toLowerCase();
                                const nameLower = v.name.toLowerCase();
                                return (langLower === "en-gb" || langLower.startsWith("en-gb")) && 
                                       (nameLower.includes("male") || !nameLower.includes("female"));
                              }) || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en-gb"))
                                 || availableVoices.find((v) => v.lang.toLowerCase().startsWith("en"));

                              if (ukVoice) {
                                setSelectedBrowserVoice(ukVoice.name);
                                setBrowserPitch(0.85); // Sophisticated English pitch
                                setBrowserRate(0.95); // Polite British pace
                                setSpeechLanguage("en-GB");
                                localStorage.setItem("jarvis_speech_lang", "en-GB");
                                setErrorNotice("🎙️ J.A.R.V.I.S. voice preset set to UK English J.A.R.V.I.S. voice.");
                              } else {
                                alert("No local UK English (en-GB) voice profiles detected on this device. Falling back to default system voice.");
                              }
                            }}
                            className="bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 hover:border-cyan-500/50 text-cyan-300 text-[10px] py-2 px-1 rounded font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>🇬🇧 J.A.R.V.I.S. (UK)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              stopAllAudio();
                              const injunVoice = getBestKoVoice(availableVoices);

                              if (injunVoice) {
                                setSelectedBrowserVoice(injunVoice.name);
                                setBrowserPitch(0.85); // Professional Korean male pitch
                                setBrowserRate(0.95); // Polite pace
                                setSpeechLanguage("ko-KR");
                                localStorage.setItem("jarvis_speech_lang", "ko-KR");
                                setTranslateKToEMode(false);
                                localStorage.setItem("jarvis_translate_ktoe_mode", "false");
                                setInputLanguage("ko-KR");
                                localStorage.setItem("jarvis_input_lang", "ko-KR");
                                setErrorNotice("🎙️ J.A.R.V.I.S. voice upgraded to Injun (Korean Male Preset).");
                              } else {
                                alert("No Korean (ko-KR) voice profiles detected on this device.");
                              }
                            }}
                            className="bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 hover:border-cyan-500/50 text-cyan-300 text-[10px] py-2 px-1 rounded font-mono font-bold tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <span>🇰🇷 J.A.R.V.I.S. (INJUN)</span>
                          </button>
                        </div>

                        {/* Speech Synthesis Pitch controller to make voice deep/bold */}
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <label className="text-cyan-500/80">VOICE DEEP PITCH ({browserPitch}):</label>
                            <span className="text-cyan-400 text-[10px]">LOWER = DEEPER</span>
                          </div>
                          <input
                            type="range"
                            min="0.3"
                            max="1.5"
                            step="0.05"
                            value={browserPitch}
                            onChange={(e) => setBrowserPitch(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <label className="text-cyan-500/80">PACING RATE ({browserRate}):</label>
                            <span className="text-[10px] text-cyan-400">DELIBERATE</span>
                          </div>
                          <input
                            type="range"
                            min="0.6"
                            max="1.4"
                            step="0.05"
                            value={browserRate}
                            onChange={(e) => setBrowserRate(parseFloat(e.target.value))}
                            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>

                        {/* J.A.R.V.I.S. Voice Modulator Settings */}
                        <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                          <div className="flex justify-between items-center">
                            <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px]">
                              J.A.R.V.I.S. VOICE MODULATOR:
                            </label>
                            <div className="flex rounded border border-slate-800 overflow-hidden text-[9px] font-mono">
                              <button
                                type="button"
                                onClick={() => setJarvisChirpEnabled(true)}
                                className={`px-2 py-0.5 font-bold transition-all ${
                                  jarvisChirpEnabled
                                    ? "bg-cyan-500/20 text-cyan-300 border-r border-slate-800"
                                    : "bg-transparent text-slate-500 hover:text-slate-400 border-r border-slate-800"
                                }`}
                              >
                                ENGAGED
                              </button>
                              <button
                                type="button"
                                onClick={() => setJarvisChirpEnabled(false)}
                                className={`px-2 py-0.5 font-bold transition-all ${
                                  !jarvisChirpEnabled
                                    ? "bg-rose-950/40 text-rose-300"
                                    : "bg-transparent text-slate-500 hover:text-slate-400"
                                }`}
                              >
                                DRY
                              </button>
                            </div>
                          </div>
                          
                          <p className="text-[9px] text-slate-400 leading-normal font-mono">
                            📟 <strong>무제한 아이언맨 무전 수신기 필터</strong>: 활성화 시 자비스가 말하기 직전/직후에 영화 속 아이언맨 슈트 내부 헬멧 무전 클릭(Chirp/Squelch) 및 노이즈 사운드가 실시간 합성됩니다!
                          </p>

                          <div className="bg-cyan-950/20 border border-cyan-500/20 rounded p-2 text-cyan-400 font-mono text-[9px] flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                              <span>COGNITIVE MATRIX STATUS: UNLIMITED</span>
                            </div>
                            <p className="text-slate-400 text-[8.5px] leading-relaxed">
                              본 브라우저 합성 음성은 Local Web Speech API를 활용하여 <strong>별도의 비용이나 쿼타 소모 없이 100% 무제한</strong>으로 사용하실 수 있습니다.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Honorific & Operator preferences */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                          <label className="text-cyan-500/80 text-[10px]">OPERATOR TITLE:</label>
                          <input
                            type="text"
                            value={userName}
                            onChange={(e) => setUserName(e.target.value)}
                            placeholder="Stark"
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-100 outline-none focus:border-cyan-500/30"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-cyan-500/80 text-[10px]">HONORIFIC:</label>
                          <div className="flex rounded border border-slate-800 overflow-hidden">
                            <button
                              onClick={() => setUserGender("male")}
                              className={`px-2.5 py-1 ${
                                userGender === "male"
                                  ? "bg-cyan-500/20 text-cyan-300"
                                  : "bg-transparent text-slate-500"
                              }`}
                            >
                              Sir
                            </button>
                            <button
                              onClick={() => setUserGender("female")}
                              className={`px-2.5 py-1 ${
                                userGender === "female"
                                  ? "bg-cyan-500/20 text-cyan-300"
                                  : "bg-transparent text-slate-500"
                              }`}
                            >
                              Ma'am
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Stealth Sleep HUD controller */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px]">
                          STEALTH SYSTEM STANDBY (화면 절전 제어):
                        </label>
                      </div>
                      
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsScreenSleep(true);
                            const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
                            speakOutput(`Display powered down. System sleep sequence fully active, ${userHonorific}.`);
                            setErrorNotice("절전 백그라운드 모드에 진입했습니다.");
                          }}
                          className="w-full py-2 bg-rose-950/40 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:text-rose-200 rounded text-[11px] font-bold font-mono transition-all uppercase whitespace-nowrap text-center"
                        >
                          화면 절전(스텔스) 모드 진입 🌙
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        클릭 시 화면 전체가 즉각 검정색 절전 상태(Stealth mode)로 전환됩니다. 화면의 아무 곳이나 터치하거나 마이크에 <strong>"자비스 (Jarvis)"</strong>라고 호출하면 시스템이 즉시 잠금 해제되며 원상 복구됩니다!
                      </p>
                    </div>

                    {/* Always Listening control */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px]">
                          ALWAYS VOICE LISTENING (실시간 상시 마이크 수신):
                        </label>
                        <div className="flex rounded border border-slate-800 overflow-hidden text-[9px] font-mono">
                          <button
                            type="button"
                            onClick={() => setAlwaysListeningEn(true)}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              alwaysListeningEn
                                ? "bg-cyan-500/20 text-cyan-300 border-r border-slate-800"
                                : "bg-transparent text-slate-500 hover:text-slate-400 border-r border-slate-800"
                            }`}
                          >
                            ON
                          </button>
                          <button
                            type="button"
                            onClick={() => setAlwaysListeningEn(false)}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              !alwaysListeningEn
                                ? "bg-rose-950/40 text-rose-300"
                                : "bg-transparent text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        활성화 시 마이크 단추를 누르지 않아도 실시간으로 백그라운드에서 마이크 수신기가 가동되어 지시를 들을 수 있습니다!
                      </p>
                    </div>

                    {/* Speaker Verification (내 목소리 전용 보안 매칭) */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <span className="bg-cyan-500 animate-pulse w-1.5 h-1.5 rounded-full" />
                          SPEAKER MATCHING (내 목소리 전용 반응):
                        </label>
                        <div className="flex rounded border border-slate-800 overflow-hidden text-[9px] font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              if (!voiceProfile) {
                                setErrorNotice("먼저 아래 '음성 지문 등록'을 완료해 주세요.");
                                return;
                              }
                              setSpeakerVerificationEnabled(true);
                              const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
                              speakOutput(`Speaker biometric verification activated, ${userHonorific}. System now locked to your voice print.`);
                            }}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              speakerVerificationEnabled
                                ? "bg-cyan-500/20 text-cyan-300 border-r border-slate-800"
                                : "bg-transparent text-slate-500 hover:text-slate-400 border-r border-slate-800"
                            }`}
                          >
                            ON
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSpeakerVerificationEnabled(false);
                              const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
                              speakOutput(`Speaker biometric verification suspended, ${userHonorific}. System is now open to public speech commands.`);
                            }}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              !speakerVerificationEnabled
                                ? "bg-rose-950/40 text-rose-300"
                                : "bg-transparent text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            OFF
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        활성화 시, 등록된 주인님의 고유 음성 주파수와 음색(Spectral Timbre)이 일치할 때만 자비스가 반응하고 지시를 수행합니다!
                      </p>

                      <div className="mt-2 p-2.5 bg-slate-950/60 rounded border border-slate-800/80 space-y-2 shadow-[0_0_15px_rgba(6,182,212,0.02)]">
                        <div className="flex justify-between items-center text-[9px] font-mono">
                          <span className="text-slate-500">BIOMETRIC PROFILE:</span>
                          {voiceProfile ? (
                            <span className="text-emerald-400 font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              REGISTERED ({voiceProfile.avgPitch}Hz)
                            </span>
                          ) : (
                            <span className="text-rose-400 font-bold uppercase font-mono">UNREGISTERED</span>
                          )}
                        </div>

                        {voiceProfile && (
                          <div className="grid grid-cols-2 gap-1.5 text-[8.5px] font-mono text-slate-400 bg-slate-900/30 p-1.5 rounded border border-cyan-500/5">
                            <div className="border-r border-slate-800/50 pr-1.5">
                              <span className="text-slate-500 block text-[7.5px] uppercase">Registered Pitch</span>
                              <span className="text-cyan-300 font-semibold">{voiceProfile.avgPitch} Hz</span>
                            </div>
                            <div className="pl-0.5">
                              <span className="text-slate-500 block text-[7.5px] uppercase">Timbre Centroid</span>
                              <span className="text-cyan-300 font-semibold">{Math.round(voiceProfile.avgCentroid)} Hz</span>
                            </div>
                          </div>
                        )}

                        {isEnrollingVoice ? (
                          <div className="space-y-1.5 bg-cyan-950/10 p-2 rounded border border-cyan-500/20 animate-pulse">
                            <div className="flex justify-between text-[9px] font-mono text-cyan-400 font-bold">
                              <span>🗣️ ANALYZING VOICE SIGNATURE...</span>
                              <span>{enrollProgress}%</span>
                            </div>
                            <div className="w-full h-1 bg-slate-900 rounded overflow-hidden">
                              <div 
                                className="h-full bg-cyan-500 transition-all duration-100" 
                                style={{ width: `${enrollProgress}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[8px] font-mono text-slate-500">
                              <span>PITCH: {enrollCurrentPitch > 0 ? `${enrollCurrentPitch}Hz` : "Reading..."}</span>
                              <span>TIMBRE: {enrollCurrentCentroid > 0 ? `${Math.round(enrollCurrentCentroid)}Hz` : "Reading..."}</span>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleEnrollVoice}
                            className="w-full py-1.5 bg-cyan-950/30 hover:bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 hover:text-cyan-100 rounded text-[9px] font-bold font-mono transition-all text-center uppercase tracking-wider cursor-pointer"
                          >
                            {voiceProfile ? "Re-Enroll Voice Profile (음성 지문 재등록)" : "Enroll Voice Profile (음성 지문 등록)"}
                          </button>
                        )}

                        {lastVerificationScore !== null && (
                          <div className="flex justify-between items-center text-[9px] font-mono border-t border-slate-900/60 pt-1.5 mt-1.5">
                            <span className="text-slate-500">LAST MATCH COMPLIANCE:</span>
                            <span className={`font-bold px-1.5 py-0.5 rounded text-[8.5px] ${
                              lastVerificationStatus === "success" 
                                ? "text-emerald-400 bg-emerald-500/5 border border-emerald-500/10" 
                                : "text-rose-400 bg-rose-500/5 border border-rose-500/10"
                            }`}>
                              {lastVerificationScore}% ({lastVerificationStatus === "success" ? "VERIFIED" : "BLOCKED"})
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Korean-English Translation engine control */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <span className="bg-emerald-500 animate-pulse w-1.5 h-1.5 rounded-full" />
                          KOREAN-ENGLISH TRANSLATION (한-영 실시간 통역기):
                        </label>
                        <div className="flex rounded border border-cyan-500/30 overflow-hidden text-[9px] font-mono">
                          <span className="px-2 py-0.5 font-bold bg-emerald-500/20 text-emerald-300 cursor-default">
                            ENGAGED (LOCKED ACTIVE)
                          </span>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        한국어로 말씀하시면 메인 프레임이 자동으로 <strong>영어로 실시간 통역 및 처리</strong>하여 영어 버틀러 음성으로 응답합니다. (이 기능은 고정 활성화 상태입니다)
                      </p>
                    </div>

                    {/* Double-Clap Wake control */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px]">
                          CLAP WAKE-UP CONTROL (박수 부팅 제어):
                        </label>
                        <div className="flex rounded border border-slate-800 overflow-hidden text-[9px] font-mono">
                          <button
                            type="button"
                            onClick={() => setClapWakeEnabled(true)}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              clapWakeEnabled
                                ? "bg-cyan-500/20 text-cyan-300 border-r border-slate-800"
                                : "bg-transparent text-slate-500 hover:text-slate-400 border-r border-slate-800"
                            }`}
                          >
                            ON
                          </button>
                          <button
                            type="button"
                            onClick={() => setClapWakeEnabled(false)}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              !clapWakeEnabled
                                ? "bg-rose-950/40 text-rose-300"
                                : "bg-transparent text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            OFF
                          </button>
                        </div>
                      </div>

                      {clapWakeEnabled && (
                        <div className="space-y-1.5 pt-0.5">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono text-slate-400">
                              <span>ACOUSTIC DETECT SENSITIVITY: {clapSensitivity}</span>
                              <span className="text-cyan-400">HIGHER = LIGHTER CLAP</span>
                            </div>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              step="1"
                              value={clapSensitivity}
                              onChange={(e) => setClapSensitivity(parseInt(e.target.value))}
                              className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                            />
                          </div>
                          
                          <p className="text-[9px] text-slate-400 leading-normal font-mono mb-2">
                            👏 <strong>이중 박수(Double Clap)</strong> 감지는 오동작 방지를 위해 오직 <strong>스텔스(절전/화면 꺼짐) 모드</strong>일 때만 활성화됩니다. 스텔스 상태에 있을 때 박수를 빠르게 두 번 치면 감지되어 자비스 화면이 원상 복구됩니다!
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Personal API Key Entry Field */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px]">
                          PERSONAL GEMINI API KEY:
                        </label>
                        {customApiKey.trim() ? (
                          <span className="text-[9px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            영구 고정 저장됨 (SAVED)
                          </span>
                        ) : (
                          <span className="text-[9px] text-amber-500/80 font-semibold bg-amber-500/5 px-1.5 py-0.5 rounded">
                            미기입 (선택 사항)
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1 flex items-center">
                          <input
                            type={showApiKey ? "text" : "password"}
                            value={tempApiKey}
                            onChange={(e) => {
                              setTempApiKey(e.target.value);
                            }}
                            placeholder="AIzaSy... (Personal API Key)"
                            className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 pr-10 text-cyan-100 font-mono text-[11px] outline-none focus:border-cyan-500/40"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute right-2 px-1 text-slate-500 hover:text-cyan-400 transition-colors focus:outline-none"
                          >
                            {showApiKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            disabled={isTestingKey}
                            onClick={async () => {
                              const verified = await handleTestApiKey(tempApiKey);
                              if (verified) {
                                speakOutput("Uplink verification successful, Sir.");
                              } else {
                                speakOutput("Mainframe diagnostic alert. Key verification failed.");
                              }
                            }}
                            className={`px-2 py-1 border text-[10px] font-bold font-mono rounded transition-all uppercase whitespace-nowrap ${
                              isTestingKey
                                ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed animate-pulse"
                                : "bg-cyan-950/50 hover:bg-cyan-500/10 border-cyan-500/30 text-cyan-400 cursor-pointer"
                            }`}
                          >
                            {isTestingKey ? "Testing..." : "연동 테스트"}
                          </button>
                          <button
                            type="button"
                            disabled={isTestingKey}
                            onClick={async () => {
                              const trimmed = tempApiKey.trim();
                              if (trimmed) {
                                const verified = await handleTestApiKey(trimmed);
                                if (verified) {
                                  setCustomApiKey(trimmed);
                                  localStorage.setItem("jarvis_custom_api_key", trimmed);
                                  setOfflineMode(false);
                                  localStorage.setItem("jarvis_offline_mode", "false");
                                  speakOutput("API Key successfully verified and locked to local memory, Sir.");
                                  setErrorNotice("개인 API 키 검증 완료 및 최우선 고정되었습니다.");
                                } else {
                                  speakOutput("Warning, key verification failed. But I have saved it to local arrays per your override.");
                                  setCustomApiKey(trimmed);
                                  localStorage.setItem("jarvis_custom_api_key", trimmed);
                                  setErrorNotice("⚠️ 검증에 실패한 API 키가 수동 저장되었습니다. 키를 다시 한 번 확인해 주십시오.");
                                }
                              } else {
                                setCustomApiKey("");
                                localStorage.setItem("jarvis_custom_api_key", "");
                                setKeyTestResult(null);
                                speakOutput("API Key cleared.");
                                setErrorNotice("개인 API 키가 성공적으로 초기화되었습니다.");
                              }
                            }}
                            className="px-3 bg-cyan-950 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-200 hover:text-cyan-100 rounded text-[10px] font-bold font-mono transition-all uppercase whitespace-nowrap cursor-pointer"
                          >
                            저장 및 고정
                          </button>
                        </div>
                      </div>

                      {/* Key verification result feedback */}
                      {keyTestResult && (
                        <div className={`p-2 rounded text-[10px] font-mono border leading-relaxed ${
                          keyTestResult.success 
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        }`}>
                          {keyTestResult.success ? (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold">✔ Satellite Uplink Active:</span>
                              <span>{keyTestResult.message}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-0.5">
                              <span className="font-bold">✘ Connection Interrupted:</span>
                              <span className="break-words">{keyTestResult.error}</span>
                            </div>
                          )}
                        </div>
                      )}

                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        기기에 안전하게 암호화되어 로컬 저장됩니다. 429 할당량 한도 초과 오류를 완전히 우회합니다.
                      </p>
                    </div>

                    {/* Offline Core Status & Help */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-500/80 animate-pulse">EMERGENCY OFFLINE CORE:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setOfflineMode(!offlineMode);
                          }}
                          className={`px-3 py-1 rounded text-[10px] font-bold tracking-wider transition-all border ${
                            offlineMode
                              ? "bg-amber-500/25 border-amber-500/50 text-amber-300 animate-pulse"
                              : "bg-slate-950/40 border-slate-800 text-slate-500"
                          }`}
                        >
                          {offlineMode ? "ACTIVE (LOCAL CORE)" : "STANDBY (EXT-ONLINE)"}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 leading-normal font-mono">
                        {offlineMode 
                          ? "Offline AI algorithms running locally. I will process scheduling and basic directives from device storage memory without calling the online server."
                          : "My primary logic currently routes requests to the cloud server. Rate limiting can occur on standard free quotas."
                        }
                      </p>
                    </div>

                    {/* SYSTEM SELF-DIAGNOSTIC & AUTOPILOT REPAIR (자가 진단 및 자동 복구) */}
                    <div className="space-y-3 pt-3 border-t border-cyan-500/15">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-cyan-400 font-bold uppercase tracking-wider text-[10px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                          <span>System Self-Diagnostic (자가 진단 및 자동 교정)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDiagnosticSection(!showDiagnosticSection)}
                          className="px-2 py-0.5 bg-cyan-950/40 hover:bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded text-[9px] font-bold font-mono transition-all cursor-pointer"
                        >
                          {showDiagnosticSection ? "HIDE CONSOLE ▲" : "OPEN CONSOLE ▼"}
                        </button>
                      </div>

                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        API 키 연동 오류, 백엔드 연결 상태, 음성 신호 채널을 실시간 진단하고 오기입된 따옴표나 공백 등을 <strong>원클릭 인공지능 자율 오토파일럿(Autopilot)</strong>으로 즉시 자동 수정합니다.
                      </p>

                      <AnimatePresence>
                        {showDiagnosticSection && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-3 border border-cyan-500/20 bg-slate-950/80 p-3.5 rounded-xl overflow-hidden"
                          >
                            {/* Actions bar */}
                            <div className="flex gap-2">
                              <button
                                type="button"
                                disabled={isDiagnosticRunning || repairStatus === "fixing"}
                                onClick={runDiagnostics}
                                className={`flex-1 py-1.5 px-3 rounded text-[10px] font-bold font-mono border transition-all uppercase flex items-center justify-center gap-1.5 ${
                                  isDiagnosticRunning
                                    ? "bg-slate-900 border-slate-800 text-slate-500 cursor-not-allowed"
                                    : "bg-cyan-950/80 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-300 cursor-pointer"
                                }`}
                              >
                                <RefreshCw className={`w-3.5 h-3.5 ${isDiagnosticRunning ? "animate-spin" : ""}`} />
                                <span>{isDiagnosticRunning ? "Scanning..." : "자가 진단 시작"}</span>
                              </button>

                              {detectedErrors.some(e => e.fixable) && (
                                <button
                                  type="button"
                                  disabled={repairStatus === "fixing" || isDiagnosticRunning}
                                  onClick={runAutopilotRepair}
                                  className={`flex-1 py-1.5 px-3 rounded text-[10px] font-bold font-mono border transition-all uppercase flex items-center justify-center gap-1.5 ${
                                    repairStatus === "fixing"
                                      ? "bg-amber-500/10 border-amber-500/20 text-amber-400 cursor-not-allowed animate-pulse"
                                      : "bg-emerald-950/80 hover:bg-emerald-500/20 border-emerald-500/40 text-emerald-300 cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.15)]"
                                  }`}
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{repairStatus === "fixing" ? "Repairing..." : "오토파일럿 자동 복구"}</span>
                                </button>
                              )}
                            </div>

                            {/* Live diagnostic metrics list */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[9.5px]">
                              {diagnosticSteps.map(step => (
                                <div key={step.id} className="bg-slate-900/50 p-2 rounded-lg border border-cyan-500/5 flex items-start gap-2">
                                  {step.status === "pending" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500 mt-1" />
                                  )}
                                  {step.status === "running" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping mt-1" />
                                  )}
                                  {step.status === "success" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981] mt-1" />
                                  )}
                                  {step.status === "error" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_5px_#f43f5e] animate-pulse mt-1" />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="font-bold flex justify-between">
                                      <span className="text-slate-300">{step.name}</span>
                                      <span className={
                                        step.status === "success" ? "text-emerald-400" :
                                        step.status === "error" ? "text-rose-400" :
                                        step.status === "running" ? "text-cyan-400 animate-pulse" : "text-slate-500"
                                      }>
                                        {step.status.toUpperCase()}
                                      </span>
                                    </div>
                                    <p className="text-[8.5px] text-slate-400 truncate mt-0.5">{step.detail}</p>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Detected Diagnostic Vulnerabilities Alerts */}
                            {detectedErrors.length > 0 && (
                              <div className="space-y-1.5 border-t border-cyan-500/10 pt-2.5">
                                <span className="text-[8px] font-bold text-amber-500 uppercase tracking-widest block">
                                  ⚠ DETECTED COMM-GRID VULNERABILITIES ({detectedErrors.length})
                                </span>
                                {detectedErrors.map((err, idx) => (
                                  <div key={idx} className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[9px] leading-relaxed space-y-1">
                                    <div className="font-bold flex items-center gap-1">
                                      <span className="w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                                      <span>[{err.code}] {err.message}</span>
                                    </div>
                                    <p className="text-slate-300 text-[8.5px] pl-2">{err.recommendation}</p>
                                    {err.fixable && (
                                      <div className="pl-2 pt-0.5">
                                        <span className="text-[8px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 py-0.2 rounded">
                                          ✔ 오토파일럿 복구 지원 (Autopilot Fixable)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Tech console logging terminal */}
                            <div className="space-y-1">
                              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider block">
                                LIVE MAINFRAME TELEMETRY LOGS
                              </span>
                              <div className="bg-slate-950 p-2 rounded-lg border border-cyan-500/10 h-28 overflow-y-auto font-mono text-[8px] text-cyan-400/80 space-y-0.5 scrollbar-thin scrollbar-thumb-cyan-500/10">
                                {diagnosticLogs.length === 0 ? (
                                  <span className="text-slate-600 block italic text-center py-4">No telemetry diagnostic logged. Launch scan.</span>
                                ) : (
                                  diagnosticLogs.map((log, idx) => (
                                    <span key={idx} className="block leading-tight break-words">
                                      {log}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
            )}


            {/* Holographic Scheduling or Mathematical Array (Right Column - Expanded to lg:col-span-3) */}
            {showRightPanel && rightPanelMode !== "design" && (
              <motion.div
                initial={{ opacity: 0, y: 35, scale: 0.94, filter: "blur(12px)" }}
                animate={revealStep >= 2 ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : { opacity: 0, y: 35, scale: 0.94, filter: "blur(12px)" }}
                transition={{ type: "spring", stiffness: 60, damping: 14 }}
                className="lg:col-span-3 col-span-12 flex flex-col space-y-4 relative"
                style={{ pointerEvents: revealStep >= 2 ? "auto" : "none" }}
              >
                {revealStep === 2 && (
                  <motion.div
                    initial={{ top: "-5%", opacity: 1 }}
                    animate={{ top: "105%", opacity: [0, 1, 1, 0] }}
                    transition={{ duration: 1.6, ease: "easeInOut" }}
                    className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_rgba(34,211,238,0.95)] z-50 pointer-events-none"
                  />
                )}

                {/* 1. DIGITAL TECH CLOCK (Direct Image Detail!) */}
                <div className="stark-cyber-panel stark-cyber-bottom-decor p-4 flex flex-col items-center justify-center space-y-1 relative overflow-hidden">
                  <span className="text-[7.5px] font-mono text-slate-500 tracking-widest uppercase">STARK CHRONOS SYSTEM</span>
                  <div className="font-mono text-xl font-black text-cyan-300 drop-shadow-[0_0_10px_rgba(34,211,238,0.7)] tracking-wider">
                    {currentLocalTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                  </div>
                  <span className="text-[7.5px] font-mono text-cyan-500/60 uppercase">
                    {currentLocalTime.toLocaleDateString([], { weekday: "long", year: "numeric", month: "short", day: "numeric" })}
                  </span>
                </div>

                {/* 2. AMBIENT WEATHER HUD (Direct Image Detail!) */}
                <div className="stark-cyber-panel stark-cyber-bottom-decor p-4 flex flex-col space-y-3 relative overflow-hidden">
                  <div className="flex justify-between items-center border-b border-cyan-500/10 pb-1.5">
                    <span className="text-[10px] font-bold font-mono text-cyan-300 tracking-widest uppercase">JUAREZ, MX / MALIBU</span>
                    <span className="text-[8px] font-mono text-slate-500">REALTIME</span>
                  </div>

                  <div className="flex items-center justify-between font-mono">
                    <span className="text-2xl font-black text-cyan-100 drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]">30°C</span>
                    <div className="text-right">
                      <span className="text-[10px] font-extrabold text-cyan-300 tracking-widest uppercase block leading-none">FAIR</span>
                      <span className="text-[7px] text-slate-500 tracking-wider">UPDATED SECURE</span>
                    </div>
                  </div>

                  {/* Weather parameters grid */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[8px] font-mono text-slate-400">
                    <div className="flex justify-between border-b border-cyan-500/5 pb-0.5">
                      <span className="text-slate-500">HUMIDITY:</span>
                      <span className="text-cyan-300 font-bold">14%</span>
                    </div>
                    <div className="flex justify-between border-b border-cyan-500/5 pb-0.5">
                      <span className="text-slate-500">FEELS LIKE:</span>
                      <span className="text-cyan-300 font-bold">30°C</span>
                    </div>
                    <div className="flex justify-between border-b border-cyan-500/5 pb-0.5">
                      <span className="text-slate-500">PRECIP:</span>
                      <span className="text-cyan-300 font-bold">0%</span>
                    </div>
                    <div className="flex justify-between border-b border-cyan-500/5 pb-0.5">
                      <span className="text-slate-500">VISIBILITY:</span>
                      <span className="text-cyan-300 font-bold">16.1 KM</span>
                    </div>
                    <div className="flex justify-between border-b border-cyan-500/5 pb-0.5">
                      <span className="text-slate-500">WIND:</span>
                      <span className="text-cyan-300 font-bold">8 KM/H (E)</span>
                    </div>
                    <div className="flex justify-between border-b border-cyan-500/5 pb-0.5">
                      <span className="text-slate-500">PRESSURE:</span>
                      <span className="text-cyan-300 font-bold">1015 MB</span>
                    </div>
                  </div>

                  {/* Moon phase (Direct Image Detail!) */}
                  <div className="flex items-center justify-between text-[7.5px] font-mono bg-cyan-950/20 border border-cyan-500/10 p-1 rounded text-cyan-300">
                    <span>MOON: WANING CRESCENT</span>
                    <span className="w-2 h-2 rounded-full border border-cyan-400 bg-slate-950 flex overflow-hidden">
                      <span className="w-1 h-full bg-cyan-400/40" />
                    </span>
                  </div>
                </div>

                {/* 3. THERMAL SENSORS GAUGE (Direct Image Detail!) */}
                <div className="stark-cyber-panel stark-cyber-bottom-decor p-4 flex flex-col space-y-2 relative overflow-hidden">
                  <div className="flex justify-between items-center border-b border-cyan-500/10 pb-1.5">
                    <span className="text-[10px] font-bold font-mono text-cyan-300 tracking-widest uppercase">THERMAL SENSORS</span>
                    <span className="text-[8px] font-mono text-cyan-400">CORE SAFE</span>
                  </div>

                  <div className="space-y-1.5 font-mono text-[8.5px]">
                    <div className="space-y-0.5">
                      <div className="flex justify-between text-slate-400">
                        <span>CPU TEMP:</span>
                        <span className="text-cyan-300 font-bold">51°C</span>
                      </div>
                      <div className="w-full h-1 bg-slate-950 rounded border border-cyan-500/5">
                        <div className="h-full bg-cyan-400 rounded" style={{ width: "51%" }} />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <div className="flex justify-between text-slate-400">
                        <span>GPU TEMP:</span>
                        <span className="text-cyan-300 font-bold">48°C</span>
                      </div>
                      <div className="w-full h-1 bg-slate-950 rounded border border-cyan-500/5">
                        <div className="h-full bg-cyan-400 rounded" style={{ width: "48%" }} />
                      </div>
                    </div>
                  </div>
                </div>

              {/* Holographic YouTube Stream overlay inside Right Column */}
              <AnimatePresence>
                {activeYoutubeQuery && !isYoutubeFloating && (
                  <motion.div
                    key="holographic-yt-player-inline"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="w-full z-10"
                  >
                    <HolographicYoutubePlayer
                      query={activeYoutubeQuery}
                      type={youtubePlayType === "channel" ? "channel" : "song"}
                      isMinimized={isYoutubeMinimized}
                      isFloating={false}
                      onToggleFloating={(val) => {
                        setIsYoutubeFloating(val);
                        localStorage.setItem("jarvis_yt_floating", String(val));
                      }}
                      onClose={() => {
                        setActiveYoutubeQuery(null);
                        setForceDirectTrackId(null);
                      }}
                      onToggleMinimize={() => setIsYoutubeMinimized(!isYoutubeMinimized)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Holographic Google Map overlay inside Right Column */}
              <AnimatePresence>
                {activeMapQuery && (
                  <motion.div
                    key="holographic-map-locator"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="w-full z-10"
                  >
                    <HolographicMap
                      query={activeMapQuery}
                      isMinimized={isMapMinimized}
                      onClose={() => {
                        setActiveMapQuery(null);
                      }}
                      onToggleMinimize={() => setIsMapMinimized(!isMapMinimized)}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tab Selector Buttons */}
              <div className="flex items-center gap-2 relative z-10">
                <div className="flex-1 grid grid-cols-6 gap-1 bg-slate-950/50 p-1 border border-cyan-500/10 rounded-xl font-mono text-[8px]">
                  <button
                    type="button"
                    onClick={() => setRightPanelMode("math")}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      rightPanelMode === "math"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                        : "border border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Calculator className="w-3 h-3 font-bold" />
                    <span className="hidden xs:inline">MATH CORE</span>
                    <span className="xs:hidden">MATH</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelMode("schedule")}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      rightPanelMode === "schedule"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                        : "border border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span className="hidden xs:inline">AGENDA</span>
                    <span className="xs:hidden">SCHED</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelMode("media")}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      rightPanelMode === "media"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                        : "border border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Headphones className="w-3 h-3" />
                    <span className="hidden xs:inline">AUDIO</span>
                    <span className="xs:hidden">AUDIO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelMode("pybricks")}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      rightPanelMode === "pybricks"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 animate-pulse"
                        : "border border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Cpu className="w-3 h-3 text-cyan-400" />
                    <span>PYBRICKS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelMode("design")}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      rightPanelMode === "design"
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                        : "border border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Compass className="w-3 h-3 text-cyan-400 animate-pulse" />
                    <span className="hidden xs:inline">3D CAD</span>
                    <span className="xs:hidden">3D CAD</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowImageSearchModal(!showImageSearchModal);
                      // Reset rightPanelMode to "math" if we were on images to prevent dead states
                      if (rightPanelMode === "images") {
                        setRightPanelMode("math");
                      }
                    }}
                    className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      showImageSearchModal
                        ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 animate-pulse"
                        : "border border-transparent text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    <Image className="w-3 h-3 text-cyan-400" />
                    <span className="hidden xs:inline">OPTICAL</span>
                    <span className="xs:hidden">OPTI</span>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowRightPanel(false);
                    localStorage.setItem("jarvis_show_right_panel", "false");
                    const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
                    speakOutput(`Powering down auxiliary panel display, ${userHonorific}.`);
                  }}
                  className="p-2 bg-slate-950/50 hover:bg-rose-950/35 border border-slate-800 hover:border-rose-500/30 text-slate-500 hover:text-rose-400 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                  title="Close right panel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {rightPanelMode === "math" ? (
                <MathProcessor onAskJarvis={handleSubmitPrompt} status={status} />
              ) : rightPanelMode === "pybricks" ? (
                <PybricksDeveloperHub onAskJarvis={handleSubmitPrompt} status={status} />
              ) : rightPanelMode === "design" ? (
                <Holographic3DDesigner initialQuery={activeDesignQuery} onAskJarvis={handleSubmitPrompt} status={status} />
              ) : rightPanelMode === "images" ? (
                <HolographicImageSearch
                  initialQuery={activeImageQuery}
                  onAskJarvis={handleSubmitPrompt}
                  onAttachImage={(imgUrlOrBase64) => {
                    setSelectedImage(imgUrlOrBase64);
                  }}
                  status={status}
                />
              ) : rightPanelMode === "media" ? (
                <HolographicMediaLoader
                  onPlaySong={(query, type) => {
                    setActiveYoutubeQuery(query);
                    setYoutubePlayType(type);
                    setIsYoutubeMinimized(false);
                    console.log("Playing song directly via panel preset click:", query);
                  }}
                  onCloseSong={() => {
                    setActiveYoutubeQuery(null);
                    setYoutubePlayType(null);
                  }}
                  activeQuery={activeYoutubeQuery}
                  youtubePlayType={youtubePlayType}
                  isMinimized={isYoutubeMinimized}
                  onToggleMinimize={() => setIsYoutubeMinimized(!isYoutubeMinimized)}
                  autoPlayOfflineCount={autoPlayOfflineCount}
                  forceDirectTrackId={forceDirectTrackId}
                  onClearForceDirectTrack={() => setForceDirectTrackId(null)}
                />
              ) : (
                <div className="stark-cyber-panel stark-cyber-bottom-decor flex-1 flex flex-col p-4 relative overflow-hidden h-[508px]">
                  {/* Holographic glowing scanline effect at the top */}
                  <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent animate-pulse" />
                  
                  {/* Title badge with live connection status */}
                  <div className="flex items-center justify-between border-b border-cyan-500/10 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-cyan-400 animate-pulse" />
                      <div>
                        <h3 className="text-xs font-bold font-mono text-cyan-200 tracking-wider">
                          SCHEDULE MATRIX
                        </h3>
                        <p className="text-[9px] text-cyan-500/60 font-mono uppercase tracking-tight">
                          Host Synchronizer Active
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-cyan-950/40 border border-cyan-400/20 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      <span className="text-[9px] text-cyan-300 font-mono uppercase">ONLINE</span>
                    </div>
                  </div>

                  {/* List Container with Custom Scrollbar */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent pr-1 space-y-2 text-[11px] max-h-[340px]">
                    <AnimatePresence initial={false}>
                      {schedules.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-3 border border-dashed border-slate-800 rounded-xl bg-slate-950/20 py-8">
                          <p className="text-slate-500 font-mono tracking-tight leading-relaxed">
                            No scheduled sequences loaded on active arrays.<br/>
                            <span className="text-cyan-500/45 text-[10px] mt-1.5 block">
                              Tell JARVIS: "내일 아침 10시 세미나 일정 추가해줘" to register automatically.
                            </span>
                          </p>
                        </div>
                      ) : (
                        schedules.map((item) => (
                          <motion.div
                            key={item.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className={`p-2.5 rounded-xl border transition-all flex items-start gap-2 ${
                              item.completed
                                ? "bg-emerald-950/10 border-emerald-500/15 text-slate-400"
                                : "bg-slate-900/40 border-slate-800 hover:border-cyan-500/20 text-slate-200"
                            }`}
                          >
                            {/* Completed status checkbox */}
                            <button
                              type="button"
                              onClick={() => handleToggleScheduleCompleted(item.id)}
                              className={`mt-0.5 p-0.5 rounded transition-all cursor-pointer ${
                                item.completed
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : "bg-slate-950/60 text-slate-600 border border-slate-800 hover:border-cyan-500/30 hover:text-cyan-400"
                              }`}
                              title={item.completed ? "Mark pending" : "Complete agenda"}
                            >
                              <CheckSquare className="w-3.5 h-3.5" />
                            </button>

                            {/* Task details */}
                            <div className="flex-1 min-w-0 font-mono">
                              <p className={`text-xs font-semibold leading-snug break-words ${item.completed ? "line-through text-slate-500" : "text-cyan-100"}`}>
                                {item.task}
                              </p>
                              <span className="text-[9px] text-cyan-500/60 block mt-0.5 flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-cyan-400/50" />
                                {item.time}
                              </span>
                            </div>

                            {/* Delete item button */}
                            <button
                              type="button"
                              onClick={() => handleDeleteSchedule(item.id)}
                              className="p-1 text-slate-600 hover:text-red-400 hover:bg-red-950/20 rounded transition-all ml-auto self-center cursor-pointer"
                              title="Purge record"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footer array cleaner */}
                  {schedules.length > 0 && (
                    <div className="border-t border-cyan-500/10 pt-2.5 mt-auto flex items-center justify-between">
                      <span className="text-[10px] text-slate-500 font-mono uppercase">
                        Count: {schedules.length}
                      </span>
                      <button
                        type="button"
                        onClick={handleClearAllSchedules}
                        className="text-[10px] text-red-400 hover:text-red-300 border border-red-500/20 bg-red-950/10 px-2 py-1 rounded transition-all font-mono uppercase cursor-pointer"
                      >
                        CLEAR HUD
                      </button>
                    </div>
                  )}

                </div>
              )}
            </motion.div>
            )}

            {rightPanelMode === "design" && showRightPanel && (
              <div className="col-span-12 w-full animate-fadeIn">
                <Holographic3DDesigner
                  initialQuery={activeDesignQuery}
                  onAskJarvis={handleSubmitPrompt}
                  status={status}
                  onClose={() => {
                    setRightPanelMode("math");
                    setShowRightPanel(false);
                    localStorage.setItem("jarvis_show_right_panel", "false");
                    const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
                    speakOutput(`Exiting 3D CAD mode, ${userHonorific}. Loading main coprocessor.`);
                  }}
                />
              </div>
            )}
            </div> {/* <-- Closed inner grid container */}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Floating YouTube Player */}
      <AnimatePresence>
        {activeYoutubeQuery && (isYoutubeFloating || !showRightPanel) && (
          <HolographicYoutubePlayer
            query={activeYoutubeQuery}
            type={youtubePlayType === "channel" ? "channel" : "song"}
            isMinimized={isYoutubeMinimized}
            isFloating={true}
            onToggleFloating={(val) => {
              if (showRightPanel) {
                setIsYoutubeFloating(val);
                localStorage.setItem("jarvis_yt_floating", String(val));
              } else {
                setErrorNotice("🖥️ 보조 연산 패널이 꺼져 있어 플레이어가 플로팅 모드로 유지됩니다.");
              }
            }}
            onClose={() => {
              setActiveYoutubeQuery(null);
              setForceDirectTrackId(null);
            }}
            onToggleMinimize={() => setIsYoutubeMinimized(!isYoutubeMinimized)}
          />
        )}
      </AnimatePresence>

      {/* Decoupled Floating Optical Image Search Window */}
      <AnimatePresence>
        {showImageSearchModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            drag
            dragMomentum={false}
            dragHandleClassName="drag-handle"
            className="fixed bottom-10 right-10 z-[100] w-[450px] max-w-[95vw] bg-slate-950/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] flex flex-col overflow-hidden"
          >
            {/* Draggable Drag Handle Bar */}
            <div className="drag-handle bg-gradient-to-r from-slate-950 to-cyan-950/40 px-4 py-2 border-b border-cyan-500/20 flex items-center justify-between cursor-move select-none">
              <div className="flex items-center gap-2 pointer-events-none">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  OPTICAL HUB [DRAGGABLE]
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-cyan-500/50 uppercase tracking-tight mr-2">CO-PROCESSOR</span>
                <button
                  type="button"
                  onClick={() => setShowImageSearchModal(false)}
                  className="p-1 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title="Close Window"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Holographic Search Body */}
            <div className="p-1">
              <HolographicImageSearch
                initialQuery={activeImageQuery}
                onAskJarvis={handleSubmitPrompt}
                onAttachImage={(imgUrlOrBase64) => {
                  setSelectedImage(imgUrlOrBase64);
                }}
                status={status}
                onClose={() => setShowImageSearchModal(false)}
                isFloating={true}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Decoupled Floating Holographic Simulation Window */}
      <AnimatePresence>
        {showSimulationModal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            drag
            dragMomentum={false}
            dragHandleClassName="drag-handle"
            className="fixed bottom-10 left-10 md:left-auto md:right-[500px] z-[100] w-[750px] max-w-[95vw] bg-slate-950/95 backdrop-blur-xl border-2 border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.2)] flex flex-col overflow-hidden"
          >
            {/* Draggable Drag Handle Bar */}
            <div className="drag-handle bg-gradient-to-r from-slate-950 to-cyan-950/40 px-4 py-2.5 border-b border-cyan-500/20 flex items-center justify-between cursor-move select-none">
              <div className="flex items-center gap-2 pointer-events-none">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                  STARK COGNITIVE SIMULATOR [DRAGGABLE]
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-cyan-500/50 uppercase tracking-tight mr-2">MAINFRAME SOLVER ENGAGED</span>
                <button
                  type="button"
                  onClick={() => setShowSimulationModal(false)}
                  className="p-1 bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/30 text-slate-400 hover:text-rose-400 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                  title="Close Window"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Holographic Simulation Body */}
            <div>
              <HolographicSimulation
                initialQuery={activeSimulationQuery}
                onClose={() => setShowSimulationModal(false)}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
