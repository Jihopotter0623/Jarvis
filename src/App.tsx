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
} from "lucide-react";
import ArcReactor from "./components/ArcReactor";
import AudioVisualizer from "./components/AudioVisualizer";
import JarvisConsole, { ChatMessage } from "./components/JarvisConsole";
import { getSpeechRecognition, speakWithBrowser, playRawPCM } from "./utils/audio";
import MathProcessor from "./components/MathProcessor";
import HolographicYoutubePlayer from "./components/HolographicYoutubePlayer";

export interface ScheduleItem {
  id: string;
  time: string;
  task: string;
  completed: boolean;
  createdAt: number;
}

export default function App() {
  // System configurations
  const [initialized, setInitialized] = useState(false);
  const [userName, setUserName] = useState(() => localStorage.getItem("jarvis_user_name") || "Mr. Stark");
  const [userGender, setUserGender] = useState<"male" | "female">(
    () => (localStorage.getItem("jarvis_user_gender") as "male" | "female") || "male"
  );
  const [voiceEngine, setVoiceEngine] = useState<"premium" | "browser" | "silent">(
    () => (localStorage.getItem("jarvis_voice_engine") as "premium" | "browser" | "silent") || "premium"
  );
  const [premiumVoice, setPremiumVoice] = useState<"Charon" | "Fenrir" | "Puck" | "Kore" | "Zephyr">(
    () => (localStorage.getItem("jarvis_premium_voice") as any) || "Charon"
  );
  const [inputLanguage, setInputLanguage] = useState<"ko-KR" | "en-US">(
    () => (localStorage.getItem("jarvis_input_lang") as "ko-KR" | "en-US") || "ko-KR"
  );

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
    localStorage.setItem("jarvis_premium_voice", premiumVoice);
  }, [premiumVoice]);

  useEffect(() => {
    localStorage.setItem("jarvis_input_lang", inputLanguage);
  }, [inputLanguage]);

  useEffect(() => {
    localStorage.setItem("jarvis_schedules", JSON.stringify(schedules));
  }, [schedules]);

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
  const [browserPitch, setBrowserPitch] = useState(0.75); // Deeper pitch!
  const [browserRate, setBrowserRate] = useState(0.95);  // Slightly slow, very deliberate
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedBrowserVoice, setSelectedBrowserVoice] = useState<string>("");

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [isScreenSleep, setIsScreenSleep] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [transitText, setTransitText] = useState("");
  const [status, setStatus] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  // Manual schedule input states
  const [manualTime, setManualTime] = useState("");
  const [manualTask, setManualTask] = useState("");
  const [rightPanelMode, setRightPanelMode] = useState<"schedule" | "math">("math");

  // YouTube Media States
  const [activeYoutubeQuery, setActiveYoutubeQuery] = useState<string | null>(null);
  const [youtubePlayType, setYoutubePlayType] = useState<"song" | "channel" | null>(null);
  const [isYoutubeMinimized, setIsYoutubeMinimized] = useState<boolean>(false);

  // Dynamic clock state updated every second
  const [currentLocalTime, setCurrentLocalTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentLocalTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
        const filteredVoices = voices.filter((v) => v.lang.startsWith("en") || v.lang.startsWith("ko"));
        setAvailableVoices(filteredVoices);
        if (filteredVoices.length > 0 && !selectedBrowserVoice) {
          // Default to UK British English if available
          const ukVoice = filteredVoices.find((v) => v.lang === "en-GB");
          setSelectedBrowserVoice(ukVoice ? ukVoice.name : filteredVoices[0].name);
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

  // Voice-activated Jarvis (자비스) wake-up system when in Sleep Standby
  useEffect(() => {
    if (!initialized || !isScreenSleep) return;

    let wakeRecognition: any = null;
    let active = true;

    function startWakeWordDetector() {
      if (!active) return;
      const recognition = getSpeechRecognition();
      if (!recognition) return;

      wakeRecognition = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = inputLanguage; // Dynamically follow preference ko-KR / en-US

      recognition.onstart = () => {
        console.log("🎙️ [Stealth Wake-Word Detector Active - listening for '자비스' / 'Jarvis']");
      };

      recognition.onresult = (event: any) => {
        if (!active) return;
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          console.log(`[Stealth STT Buffer]: "${transcript}"`);
          
          // Match wake word phonetically in Korean and English
          const containsWakeWord = 
            transcript.includes("자비스") || 
            transcript.includes("jarvis") || 
            transcript.includes("자비수") || 
            transcript.includes("잡이스") || 
            transcript.includes("자비쓰") || 
            transcript.includes("하비수") ||
            transcript.includes("자비스야") ||
            transcript.includes("사비스");

          if (containsWakeWord) {
            console.log("✨ [WAKE WORD MATCHED! Restoring core UI]");
            setIsScreenSleep(false);
            
            const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
            speakOutput(`Yes ${userHonorific}, J.A.R.V.I.S. protocol is active. Core systems are fully online and ready.`);
            setErrorNotice("🎙️ Wake word detected: Screen restored in online mode.");
            
            active = false;
            try {
              recognition.stop();
            } catch (e) {}
            break;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Stealth wake detector error:", event.error);
        if (event.error === "aborted") return;
        
        // Auto-restart on transience
        setTimeout(() => {
          if (active && isScreenSleep) {
            startWakeWordDetector();
          }
        }, 1500);
      };

      recognition.onend = () => {
        if (active && isScreenSleep) {
          try {
            recognition.start();
          } catch (e) {
            setTimeout(() => {
              if (active && isScreenSleep) startWakeWordDetector();
            }, 1000);
          }
        }
      };

      try {
        recognition.start();
      } catch (err) {
        console.error("Failed to start wake recognition:", err);
      }
    }

    startWakeWordDetector();

    return () => {
      active = false;
      if (wakeRecognition) {
        try {
          wakeRecognition.stop();
        } catch (e) {}
      }
    };
  }, [initialized, isScreenSleep, inputLanguage, userGender]);

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

  // Speaks output text based on chosen speech engine
  const speakOutput = async (text: string) => {
    stopAllAudio();
    setStatus("speaking");

    const textToRead = text.replace(/[*#_~`\[\]{}]/g, ""); // strip markdown styling for clean vocal syntax

    if (voiceEngine === "premium" && !offlineMode) {
      try {
        const ttsHeaders: Record<string, string> = { "Content-Type": "application/json" };
        if (customApiKey) {
          ttsHeaders["x-gemini-api-key"] = customApiKey;
        }
        // Call server TTS endpoint
        const res = await fetch("/api/tts", {
          method: "POST",
          headers: ttsHeaders,
          body: JSON.stringify({
            text: textToRead,
            voiceName: premiumVoice,
          }),
        });

        if (!res.ok) {
          throw new Error("Premium server voice is loaded at limit. Falling back to local synthesis.");
        }

        const data = await res.json();
        if (data.audio) {
          const { audioCtx, source } = await playRawPCM(data.audio);
          activeAudioContextRef.current = audioCtx;
          activeAudioSourceRef.current = source;
          
          source.onended = () => {
            setStatus("idle");
          };
        } else {
          throw new Error("No premium audio data returned");
        }
      } catch (err: any) {
        console.warn("Premium TTS error, falling back to browser synthesis:", err.message);
        // Fallback to local browser synth
        triggerBrowserSpeech(textToRead);
      }
    } else if (voiceEngine === "browser") {
      triggerBrowserSpeech(textToRead);
    } else {
      // Silent
      setStatus("idle");
    }
  };

  const triggerBrowserSpeech = (text: string) => {
    const utterance = speakWithBrowser(text, {
      pitch: browserPitch,
      rate: browserRate,
      voiceName: selectedBrowserVoice,
      onEnd: () => setStatus("idle"),
      onError: () => setStatus("idle"),
    });
    activeUtteranceRef.current = utterance;
  };

  // Boot JARVIS core system & play initial welcome greetings
  const initializeSystem = () => {
    setInitialized(true);
    stopAllAudio();
    
    setTimeout(() => {
      const honorificWord = userGender === "female" ? "Ma'am" : "Sir";
      const primaryWelcome = `JARVIS mainframe loaded at one-hundred percent capacity. All security parameters clear. Good day, ${honorificWord}. Speak or type in English, and I will execute the sequence.`;
      
      const setupMsg: ChatMessage = {
        id: "sys_init_welcome",
        role: "jarvis",
        text: primaryWelcome,
        timestamp: new Date(),
      };
      setMessages([setupMsg]);
      speakOutput(primaryWelcome);
    }, 400);
  };

  // Offline Backup response processor for 429 Quota resilience
  const handleOfflinePrompt = (text: string) => {
    setStatus("thinking");
    
    // Simulate thinking delay for nice terminal scanning effect
    setTimeout(() => {
      const lowerText = text.toLowerCase().trim();
      let reply = "";
      const containsKo = /[\uac00-\ud7af]/.test(text);

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

      // 1. Check for request to translate last thing of JARVIS
      const isTranslateRequest = 
        lowerText.includes("번역") || 
        lowerText.includes("영어") || 
        lowerText.includes("한국어") || 
        lowerText.includes("translate");

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
        lowerText.includes("my name");

      const honorific = userGender === "female" ? "Ma'am" : "Sir";
      const nameInSpeech = userName || "Stark";

      if (isPlayYoutube) {
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

        if (containsKo) {
          reply = isChannel 
            ? `알겠습니다, 주인님. 유튜브 백업 모듈을 동기화하여 '${extractedQuery}' 채널 수신 강도를 최대화합니다. 메인 인터페이스에 연결하였습니다.`
            : `알겠습니다, 주인님. 즉시 '${extractedQuery}' 음향 신호를 주파수 대역에 매핑합니다. 메인 콘솔에 스트림을 송출하겠습니다.`;
        } else {
          reply = isChannel
            ? `Certainly, ${honorific}. Connecting on-board receiver line to '${extractedQuery}' channel. Projecting signal output on main console.`
            : `Of course, ${honorific}. Tuning audio receptors to '${extractedQuery}'. Stream wave active on main console terminal.`;
        }
      } else if (isTranslateRequest) {
        if (containsKo) {
          reply = `주인님, 시스템 작동 보고를 한글로 브리핑해 드립니다. 현재 메인프레임의 외부 온라인 한도(429 API Quota Exceeded)로 인해 보조 로컬 칩셋을 활용하여 오프라인 백업 프로토콜이 성공적으로 동기화된 상태입니다. 대시보드 일정 수립 및 음성 안내 등 일상의 주요 제어 명령은 지연 없이 완전 가동 중입니다. 외부 온라인 네트워크를 즉시 복원하고 싶으시다면 Settings > Secrets 메뉴에 개인 API Key를 충전해 보십시오.`;
        } else {
          reply = `Offline translation core active, ${honorific}. For your assistance: The main online API links are temporarily saturated (Quota 429). I have automatically engaged our on-board auxiliary micro-chips, meaning I can fully schedule lessons, edit registry indexes, and generate answers directly of local storage.`;
        }
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

        if (containsKo) {
          reply = `알겠습니다, 주인님. 즉시 예비 오프라인 어플라이언스에 데이터베이스 레코드를 기록하겠습니다. '${extractedTime}' 예정인 '${extractedTask}' 일정이 보드에 안전하게 추가되었습니다.`;
        } else {
          reply = `Command received, ${honorific}. Securing schedule in local mainframe sectors. I have registered: '${extractedTask}' for '${extractedTime}' on your terminal map.`;
        }
      } else if (isNameSet) {
        let detectedName = "Mr. Stark";
        if (lowerText.includes("내 이름은")) {
          const match = text.match(/내 이름은\s*(.+?)(야|입니다|라네|라구|으로|로)/);
          if (match && match[1]) detectedName = match[1].trim();
        } else if (lowerText.includes("이름을")) {
          const match = text.match(/이름을\s*(.+?)(으|로)/);
          if (match && match[1]) detectedName = match[1].trim();
        } else if (lowerText.includes("call me")) {
          const match = text.match(/call me\s*(.+)/i);
          if (match && match[1]) detectedName = match[1].trim();
        } else if (lowerText.includes("my name is")) {
          const match = text.match(/my name is\s*(.+)/i);
          if (match && match[1]) detectedName = match[1].trim();
        }

        setUserName(detectedName);
        localStorage.setItem("jarvis_user_name", detectedName);

        if (containsKo) {
          reply = `성공적으로 인식표를 교체했습니다, 주인님. 이제 제 메모리에 귀하를 '${detectedName}'(으)로 칭하도록 등록을 완료하였습니다.`;
        } else {
          reply = `Mainframe identity updating completed, ${honorific}. Auxiliary registers are updated to address you as ${detectedName}. Ready to assist you.`;
        }
      } else {
        if (lowerText.includes("안녕") || lowerText.includes("hello") || lowerText.includes("hi") || lowerText.includes("반갑")) {
          if (containsKo) {
            reply = `안녕하십니까, ${nameInSpeech} 주인님. 보조 오프라인 예비 회로로 인사드립니다. 대시보드를 무사히 가동하고 있으니 언제든 분부하여 주십시오.`;
          } else {
            reply = `Welcome back, ${nameInSpeech}. Auxiliary offline core is fully operating. The secondary power units stabilized at 100%.`;
          }
        } else if (lowerText.includes("상태") || lowerText.includes("status") || lowerText.includes("검사") || lowerText.includes("진단")) {
          if (containsKo) {
            reply = `현 보조 시스템 자가 스캔 완료. 로컬 데이터 캐시 작동률 [정상], 마크-I 로컬 목소리 브리핑 엔진 [활성], 스케줄 매트릭스 [연동 완료]. 외부 인공지능 온라인 확장(429)만 충약하면 완전 회복됩니다.`;
          } else {
            reply = `Diagnostics completed, ${honorific}. Subsystems: Local Arc Reactor [92%], Schedules Matrix [ONLINE], Speech Synthesizer [ENGAGED]. Main model quota is depleted—personal API keys would fully restore online systems.`;
          }
        } else if (lowerText.includes("고마") || lowerText.includes("감사") || lowerText.includes("thank")) {
          if (containsKo) {
            reply = `천만의 말씀입니다, ${userName} 주인님. 소임을 다하고 있을 뿐입니다.`;
          } else {
            reply = `At your service, ${honorific}. JARVIS backup circuits are always loyal to your command.`;
          }
        } else if (lowerText.includes("누구") || lowerText.includes("who are you") || lowerText.includes("너는")) {
          if (containsKo) {
            reply = `저는 스타크 인더스트리 전속 비서인 자비스(JARVIS)의 예비용 듀얼 로컬 펌웨어 백업 데이터입니다.`;
          } else {
            reply = `I am J.A.R.V.I.S., the auxiliary local firmware backup of Tony Stark's personal assistant. Standing by.`;
          }
        } else {
          const defaultsEn = [
            `Auxiliary backup protocol is active, ${honorific}. Your request is stored locally, but main cognitive arrays require personal API keys (Cog Settings > Secrets) to analyze complex equations.`,
            `Certainly, Sir. Connecting with our internal memory buffer. For detailed online responses, rate limits must be cleared by plugging in a custom Gemini token.`,
            `My processing power is operating under Emergency Core guidelines, Sir. Mainframe cloud response code was 429. What is your next instruction?`
          ];
          const defaultsKo = [
            `잘 알아들었습니다, 주인님. 외부 인공지능 서버와의 임시 연결 지연(429 API Saturated)으로 인해 내부 백업 회로망으로 가볍게 응답했습니다. 대시보드 위젯 등록 등은 완전 작동합니다.`,
            `전달 사항 접수했습니다, 주인님. 보안용 비상 네트워크 사양으로 우회 기동 중입니다. 완전한 무한 딥러닝 응답을 위해서는 Settings > Secrets에 개인 API Key를 충전해 보십시오.`,
            `시스템 상태 양호합니다. 통신 과부하 상태(API Quota Saturated), 예비 펌웨어를 통한 일정 스케줄 매핑 과업은 무사히 수리되었습니다.`
          ];
          
          if (containsKo) {
            reply = defaultsKo[Math.floor(Math.random() * defaultsKo.length)];
          } else {
            reply = defaultsEn[Math.floor(Math.random() * defaultsEn.length)];
          }
        }
      }

      const jarvisMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis`,
        role: "jarvis",
        text: reply,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, jarvisMsg]);
      setStatus("idle");
      speakOutput(reply);
    }, 750);
  };

  // Submit absolute prompt to Backend Chat API
  const handleSubmitPrompt = async (text: string) => {
    if (!text.trim()) return;

    // Interrupt any active voice
    stopAllAudio();
    
    const userMsg: ChatMessage = {
      id: `m_${Date.now()}_user`,
      role: "user",
      text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setStatus("thinking");
    setErrorNotice(null);

    if (offlineMode) {
      handleOfflinePrompt(text);
      return;
    }

    // Filter current conversation to build simple role history
    // (excluding first system onboarding messages if preferred to reduce context tokens)
    const contextHistory = messages.map((m) => ({
      role: m.role,
      text: m.text,
    }));

    try {
      const chatHeaders: Record<string, string> = { "Content-Type": "application/json" };
      if (customApiKey) {
        chatHeaders["x-gemini-api-key"] = customApiKey;
      }
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: chatHeaders,
        body: JSON.stringify({
          message: text,
          history: contextHistory,
          userName,
          userGender,
          schedules, // Synchronize stored schedule lists with cognitive intelligence
          userLocalTime: `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()} (Standard Day: ${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][new Date().getDay()]})`,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Server communication sequence breached.");
      }

      const data = await res.json();
      if (data.error) {
        throw new Error(data.error);
      }

      let newJarvisText = data.text || "I found blank instructions file, Sir.";
      
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

      // Parse potential YouTube music command inside generated text
      const ytPlayMatch = newJarvisText.match(/\[YOUTUBE_PLAY:\s*(.+?)\]/i);
      if (ytPlayMatch && ytPlayMatch[1]) {
        const query = ytPlayMatch[1].trim();
        setActiveYoutubeQuery(query);
        setYoutubePlayType("song");
        setIsYoutubeMinimized(false);
        console.log("JARVIS playing song:", query);
        
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
        console.log("JARVIS playing channel:", query);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[YOUTUBE_CHANNEL:\s*.+?\]/gi, "").trim();
      }

      const jarvisMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis`,
        role: "jarvis",
        text: newJarvisText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, jarvisMsg]);
      speakOutput(newJarvisText);
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
        speakOutput(inputLanguage === "ko-KR" 
          ? "비상 로컬 오프라인 데이터 배열로 회로를 전환했습니다. 로컬 명령 수행을 개시합니다." 
          : "Emergency offline protocols active on local terminal cores."
        );
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
      setStatus("idle");
      return;
    }

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
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setIsListening(false);
        setTransitText("");
        handleSubmitPrompt(finalTranscript);
      } else {
        setTransitText(interimTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("STT sequence error:", event.error);
      if (event.error === "not-allowed") {
        setErrorNotice("Microphone access permission was denied/blocked. Please grant permission in your browser.");
      } else {
        setErrorNotice(`STT failure: ${event.error}`);
      }
      setIsListening(false);
      setStatus("idle");
    };

    recognition.onend = () => {
      setIsListening(false);
      if (status === "listening") {
        setStatus("idle");
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
                🎙️ "자비스" (Jarvis)라고 부르거나 화면을 터치하여 깨워보세요
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Background geometric grid overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,47,73,0.4)_0%,rgba(2,6,23,0.95)_100%)] pointer-events-none z-0" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,107,214,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(18,107,214,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none z-0" />

      <AnimatePresence>
        {!initialized ? (
          /* Landing Page: Initiate Mainframe */
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
              Welcome, Mr. Stark. The virtual speech engine is synchronized and programmed to output audio exclusively in English. Speak in Korean, and I will instantly translate your voice command and reply in English.
            </p>

            {/* Quick configurations before booting */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-cyan-500/10 text-left space-y-3 font-mono text-xs">
              <div className="flex justify-between items-center">
                <span className="text-cyan-500/70">INPUT LANGUAGE:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setInputLanguage("ko-KR")}
                    className={`px-3 py-1 rounded transition-all border ${
                      inputLanguage === "ko-KR"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                        : "bg-transparent text-slate-500 border-slate-800"
                    }`}
                  >
                    Korean (ko-KR) ➜ Translating
                  </button>
                  <button
                    onClick={() => setInputLanguage("en-US")}
                    className={`px-3 py-1 rounded transition-all border ${
                      inputLanguage === "en-US"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.15)]"
                        : "bg-transparent text-slate-500 border-slate-800"
                    }`}
                  >
                    English Direct (en-US)
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
                    onClick={() => setVoiceEngine("premium")}
                    className={`px-2.5 py-1 rounded transition-all border ${
                      voiceEngine === "premium"
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                        : "bg-transparent text-slate-500 border-slate-800"
                    }`}
                  >
                    Neural AI Voice
                  </button>
                  <button
                    onClick={() => setVoiceEngine("browser")}
                    className={`px-2.5 py-1 rounded transition-all border ${
                      voiceEngine === "browser"
                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/40"
                        : "bg-transparent text-slate-500 border-slate-800"
                    }`}
                  >
                    Local System
                  </button>
                </div>
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
        ) : (
          /* Interactive Command Module Dashboard */
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="z-10 max-w-6xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 relative"
          >
            {/* Large HUD Controls (Left Column) */}
            <div className="md:col-span-4 flex flex-col space-y-4">
              {/* Chronometer HUD Widget */}
              <div className="bg-slate-900/30 border border-cyan-400/10 backdrop-blur-md rounded-2xl p-4 flex flex-col shadow-[0_0_20px_rgba(6,182,212,0.03)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
                <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400 animate-pulse" />
                    <span className="text-[10px] font-bold font-mono text-cyan-200 tracking-wider">CHRONOMETER MATRIX</span>
                  </div>
                  <span className="text-[9px] font-mono bg-cyan-950/40 border border-cyan-400/20 text-cyan-400 px-1.5 py-0.5 rounded uppercase">SYS-TIME SYNCED</span>
                </div>
                
                <div className="flex items-baseline justify-between px-1">
                  <span className="text-3xl font-mono font-bold text-cyan-100 tracking-widest drop-shadow-[0_0_8px_rgba(6,182,212,0.35)]">
                    {currentLocalTime.toLocaleTimeString("ko-KR", { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400/80 bg-cyan-950/30 border border-cyan-500/10 px-2 py-0.5 rounded">
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][currentLocalTime.getDay()]}
                  </span>
                </div>

                <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono border-t border-slate-800/60 pt-2 px-1">
                  <span className="text-cyan-300">
                    {currentLocalTime.toLocaleDateString("ko-KR", { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest animate-pulse">
                    INTELLIGENCE ONLINE
                  </span>
                </div>
              </div>

              {/* Main Reactor Panel */}
              <div
                id="jarvis-reactor-panel"
                className="bg-slate-900/30 border border-cyan-400/10 backdrop-blur-md rounded-2xl p-6 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.03)] relative"
              >
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

                <ArcReactor status={status} volumeLevel={volumeLevel} />
                
                {/* Clean label under core */}
                <div className="mt-4 text-center font-mono space-y-1">
                  <h2 className="text-sm font-semibold text-cyan-200 tracking-widest">
                    SYSTEM MAIN CORE
                  </h2>
                  <p className="text-[10px] text-cyan-500/60 uppercase">
                    Reactive holographic telemetry
                  </p>
                </div>

                {/* Waveform Visualization Overlay */}
                <div className="w-full mt-4 border-t border-cyan-500/10 pt-4">
                  <AudioVisualizer status={status} volumeLevel={volumeLevel} />
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
                          onClick={() => setInputLanguage("ko-KR")}
                          className={`py-1.5 px-2 rounded text-[10px] text-center border font-semibold transition-all ${
                            inputLanguage === "ko-KR"
                              ? "bg-cyan-500/25 text-cyan-200 border-cyan-500/40"
                              : "bg-slate-950/40 text-slate-500 border-slate-800"
                          }`}
                        >
                          Korean 🇰🇷 ➜ Translate to EN
                        </button>
                        <button
                          onClick={() => setInputLanguage("en-US")}
                          className={`py-1.5 px-2 rounded text-[10px] text-center border font-semibold transition-all ${
                            inputLanguage === "en-US"
                              ? "bg-cyan-500/25 text-cyan-200 border-cyan-500/40"
                              : "bg-slate-950/40 text-slate-500 border-slate-800"
                          }`}
                        >
                          English 🇬🇧 Direct Response
                        </button>
                      </div>
                    </div>

                    {/* Vocal Engine Toggle */}
                    <div className="space-y-2">
                      <label className="text-cyan-500/80">SPEECH SYNTHESIS DRIVER:</label>
                      <div className="grid grid-cols-3 gap-1 grid-flow-row">
                        {(["premium", "browser", "silent"] as const).map((eng) => (
                          <button
                            key={eng}
                            onClick={() => {
                              stopAllAudio();
                              setVoiceEngine(eng);
                            }}
                            className={`py-1.5 px-2 rounded text-[10px] text-center border font-semibold capitalize transition-all ${
                              voiceEngine === eng
                                ? "bg-cyan-500/25 text-cyan-200 border-cyan-500/40"
                                : "bg-slate-950/40 text-slate-500 border-slate-800"
                            }`}
                          >
                            {eng === "premium" ? "Neural AI" : eng === "browser" ? "Local Syn" : "Muted"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {voiceEngine === "premium" && (
                      /* Neural premium TTS voice list selectors */
                      <div className="space-y-2">
                        <label className="text-cyan-500/80">NEURAL AI VOICE NAME:</label>
                        <select
                          value={premiumVoice}
                          onChange={(e) => {
                            stopAllAudio();
                            setPremiumVoice(e.target.value as any);
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-cyan-100 outline-none focus:border-cyan-500/40"
                        >
                          <option value="Charon">Charon (Deep Bold British - Recommended JARVIS)</option>
                          <option value="Fenrir">Fenrir (Gravelly Deep Male)</option>
                          <option value="Puck">Puck (Witty British Accent)</option>
                          <option value="Kore">Kore (Calm Assistant)</option>
                          <option value="Zephyr">Zephyr (Light Assistant)</option>
                        </select>
                      </div>
                    )}

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
                              availableVoices.map((v) => (
                                <option key={v.name} value={v.name}>
                                  {v.name} ({v.lang})
                                </option>
                              ))
                            )}
                          </select>
                        </div>

                        {/* Speech Synthesis Pitch controller to make voice deep/bold */}
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <label className="text-cyan-500/80">VOICE DEEP PITCH ({browserPitch}):</label>
                            <span className="text-cyan-400 text-[10px]">LOWER = DEEPER</span>
                          </div>
                          <input
                            type="range"
                            min="0.5"
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
                        <button
                          type="button"
                          onClick={() => {
                            const trimmed = tempApiKey.trim();
                            setCustomApiKey(trimmed);
                            localStorage.setItem("jarvis_custom_api_key", trimmed);
                            if (trimmed) {
                              setOfflineMode(false);
                              localStorage.setItem("jarvis_offline_mode", "false");
                              speakOutput("Personal API key is applied and locked to local memory, Sir.");
                              setErrorNotice("개인 API 키가 영구 고정 및 최우선 저장 완료되었습니다.");
                            } else {
                              speakOutput("API Key cleared.");
                              setErrorNotice("개인 API 키가 성공적으로 초기화되었습니다.");
                            }
                          }}
                          className="px-3 bg-cyan-950/80 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-200 hover:text-cyan-100 rounded text-[10px] font-bold font-mono transition-all uppercase whitespace-nowrap"
                        >
                          저장 및 고정
                        </button>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        기기에 안전하게 암호화되어 로컬 저장됩니다. 429 할당량 한도 초과 오류를 완전히 우회합니다.
                      </p>
                    </div>

                    {/* Offline Core Status & API Key Help */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex items-center justify-between">
                        <span className="text-cyan-500/80 animate-pulse">EMERGENCY OFFLINE CORE:</span>
                        <button
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
                      <div className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl space-y-1.5 mt-2">
                        <div className="flex items-center gap-1.5 text-cyan-400 text-[10px] font-bold">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          <span>RESTORE ONLINE MAINFRAME QUOTA</span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-relaxed font-mono">
                          If you receive standard Google API <span className="text-red-400 font-semibold">Quota Exceeded (429/RESOURCE_EXHAUSTED)</span> errors, you can bypass them completely by adding your personal Gemini API Key inside AI Studio:
                        </p>
                        <ol className="list-decimal pl-4 text-[9px] text-cyan-300/80 space-y-1">
                          <li>Click on the <strong>Settings (cog icon) ⚙️</strong> in the topmost AI Studio bar (or search for Secrets Panel).</li>
                          <li>Add a secret named <code className="bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded text-cyan-400 font-bold">GEMINI_API_KEY</code> with your free key.</li>
                          <li>Refresh & restart the application server.</li>
                        </ol>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Console Interface Board (Middle Column) */}
            <div className="md:col-span-5 flex flex-col space-y-4">
              <JarvisConsole
                messages={messages}
                isListening={isListening}
                transitText={transitText}
                isOutputtingVoice={status === "thinking"}
                voiceEngine={voiceEngine}
                honorific={userGender === "female" ? "Ma'am" : "Sir"}
              />

              {/* Holographic YouTube Stream overlay */}
              <AnimatePresence>
                {activeYoutubeQuery && (
                  <div key="holographic-yt-player" className="w-full">
                    <HolographicYoutubePlayer
                      query={activeYoutubeQuery}
                      type={youtubePlayType === "channel" ? "channel" : "song"}
                      isMinimized={isYoutubeMinimized}
                      onClose={() => {
                        setActiveYoutubeQuery(null);
                        setYoutubePlayType(null);
                      }}
                      onToggleMinimize={() => setIsYoutubeMinimized(!isYoutubeMinimized)}
                    />
                  </div>
                )}
              </AnimatePresence>

              {/* Voice Trigger Buttons & Manual CLI panel */}
              <div className="flex gap-3">
                {/* Instant Tap to Speak Voice Trigger */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleToggleVoiceInput}
                  className={`flex-1 overflow-hidden py-3.5 px-4 rounded-xl font-mono text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-2 border shadow-lg ${
                    isListening
                      ? "bg-red-500 text-white border-red-400 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
                      : "bg-cyan-900/30 text-cyan-400 border-cyan-500/20 hover:bg-cyan-900/50 hover:border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.05)]"
                  }`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-4.5 h-4.5 animate-pulse" />
                      <span>TERMINATE VOICE CAPTURE</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4.5 h-4.5" />
                      <span>TRANSMIT VOICE COMMAND</span>
                    </>
                  )}
                </motion.button>

                {/* STOP/Mute audio playback */}
                {status === "speaking" && (
                  <motion.button
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={stopAllAudio}
                    className="px-4 bg-slate-900 border border-red-500/30 text-red-400 hover:bg-red-950/20 rounded-xl transition-all flex items-center justify-center"
                    title="Stop audio presentation"
                  >
                    <Square className="w-4 h-4 fill-red-400/20" />
                  </motion.button>
                )}

                {/* Reset dialogue */}
                <button
                  onClick={handleClearTerminal}
                  className="px-4 text-xs font-mono text-slate-500 hover:text-cyan-400 border border-slate-800 hover:border-cyan-500/20 bg-slate-900/30 rounded-xl transition-all"
                  title="Clear matrix logs"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Manual keyboard terminal box */}
              <form
                id="jarvis-prompt-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSubmitPrompt(inputText);
                }}
                className="relative flex items-center bg-slate-900/40 border border-cyan-500/15 rounded-xl px-4 py-2 hover:border-cyan-500/30 transition-all focus-within:border-cyan-400 shadow-xl"
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Enter manual override text here (English)..."
                  className="w-full bg-transparent border-none text-slate-200 placeholder-slate-500 text-sm py-1.5 focus:outline-none pr-10 font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className={`absolute right-3 p-1.5 rounded-lg transition-all ${
                    inputText.trim()
                      ? "text-cyan-400 hover:bg-cyan-500/10 cursor-pointer"
                      : "text-slate-600 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Dynamic Warning Notification if any STT / Mic issues occur */}
              {errorNotice && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-950/45 border border-red-500/30 text-red-200 text-xs font-mono rounded-xl flex items-center justify-between"
                >
                  <span>{errorNotice}</span>
                  <button
                    onClick={() => setErrorNotice(null)}
                    className="text-red-400 hover:text-red-200 underline font-semibold cursor-pointer pl-4 text-[11px]"
                  >
                    DISMISS
                  </button>
                </motion.div>
              )}
            </div>

            {/* Holographic Scheduling or Mathematical Array (Right Column) */}
            <div className="md:col-span-3 flex flex-col h-[560px] space-y-3">
              {/* Tab Selector Buttons */}
              <div className="grid grid-cols-2 gap-1 bg-slate-950/50 p-1 border border-cyan-500/10 rounded-xl font-mono text-[9px] relative z-10">
                <button
                  type="button"
                  onClick={() => setRightPanelMode("math")}
                  className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    rightPanelMode === "math"
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                      : "border border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>MATH CORE</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRightPanelMode("schedule")}
                  className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    rightPanelMode === "schedule"
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                      : "border border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>AGENDA TRACK</span>
                </button>
              </div>

              {rightPanelMode === "math" ? (
                <MathProcessor onAskJarvis={handleSubmitPrompt} status={status} />
              ) : (
                <div className="flex-1 flex flex-col bg-slate-900/30 border border-cyan-400/10 backdrop-blur-md rounded-2xl p-4 shadow-[0_0_20px_rgba(6,182,212,0.03)] relative overflow-hidden h-[508px]">
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

                  {/* Quick Add Form */}
                  <form onSubmit={handleAddScheduleManually} className="space-y-2 mb-3 bg-slate-950/40 border border-slate-800 p-2.5 rounded-xl">
                    <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Manual Override Registration</span>
                      <Clock className="w-3 h-3 text-cyan-500/40" />
                    </div>
                    <div className="space-y-2">
                      <input
                        type="text"
                        placeholder="Time/Date (e.g., Tomorrow 2pm)..."
                        value={manualTime}
                        onChange={(e) => setManualTime(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-[11px] font-mono text-slate-100 outline-none focus:border-cyan-500/40 placeholder-slate-600"
                      />
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Register agenda details..."
                          value={manualTask}
                          onChange={(e) => setManualTask(e.target.value)}
                          required
                          className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-[11px] font-mono text-slate-100 outline-none focus:border-cyan-500/40 placeholder-slate-600"
                        />
                        <button
                          type="submit"
                          className="p-1.5 bg-cyan-950 border border-cyan-500/30 hover:border-cyan-400 hover:bg-cyan-900/50 text-cyan-400 rounded-lg transition-all cursor-pointer"
                          title="Add direct record"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* List Container with Custom Scrollbar */}
                  <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent pr-1 space-y-2 text-[11px] max-h-[220px]">
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
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
