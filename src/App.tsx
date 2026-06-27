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
} from "lucide-react";
import ArcReactor from "./components/ArcReactor";
import AudioVisualizer from "./components/AudioVisualizer";
import { ChatMessage } from "./components/JarvisConsole";
import { getSpeechRecognition, speakWithBrowser, playRawPCM, playBootSound } from "./utils/audio";
import MathProcessor from "./components/MathProcessor";
import HolographicYoutubePlayer from "./components/HolographicYoutubePlayer";
import HolographicMediaLoader from "./components/HolographicMediaLoader";
import HolographicMap from "./components/HolographicMap";
import ClapSensor from "./components/ClapSensor";

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
  const [revealStep, setRevealStep] = useState<number>(0);
  const [isBooting, setIsBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLogs, setBootLogs] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

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
  const [translateKToEMode, setTranslateKToEMode] = useState<boolean>(
    () => localStorage.getItem("jarvis_translate_ktoe_mode") === "true"
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
  const [rightPanelMode, setRightPanelMode] = useState<"schedule" | "math" | "media">("math");

  // YouTube Media States
  const [activeYoutubeQuery, setActiveYoutubeQuery] = useState<string | null>(null);
  const [youtubePlayType, setYoutubePlayType] = useState<"song" | "channel" | null>(null);
  const [isYoutubeMinimized, setIsYoutubeMinimized] = useState<boolean>(false);

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

  // Bypass wake word: directly hear commands without saying "자비스 / Jarvis" (Enabled by default based on operator request)
  const [bypassWakeWord, setBypassWakeWord] = useState<boolean>(
    () => localStorage.getItem("jarvis_bypass_wakeword") !== "false"
  );

  useEffect(() => {
    localStorage.setItem("jarvis_bypass_wakeword", bypassWakeWord.toString());
  }, [bypassWakeWord]);

  const manualPauseListeningRef = useRef<boolean>(false);

  // Continuous conversational mic stream loop states & active tracking references
  const [continuousVoiceMode, setContinuousVoiceMode] = useState<boolean>(false);
  const continuousVoiceModeRef = useRef(continuousVoiceMode);
  useEffect(() => {
    continuousVoiceModeRef.current = continuousVoiceMode;
  }, [continuousVoiceMode]);

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

  // Voice-activated Jarvis (자비스) continuous wake-word & attention system
  useEffect(() => {
    if (!initialized) return;

    // We only trigger this wake detector if:
    // 1. isScreenSleep is true OR
    // 2. alwaysListeningEn is true, status is "idle", isListening is false, and bypassWakeWord is false
    const shouldWakeListen = isScreenSleep || (alwaysListeningEn && status === "idle" && !isListening && !bypassWakeWord);
    if (!shouldWakeListen) return;

    let wakeRecognition: any = null;
    let active = true;

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
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const rawTranscript = event.results[i][0].transcript;
          const transcript = rawTranscript.toLowerCase().trim();
          const cleanTranscript = transcript.replace(/\s+/g, ""); // Remove spaces for super high sensitivity
          console.log(`[Always-Listening Continuous Buffer]: "${transcript}" (clean: "${cleanTranscript}")`);

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
            console.log(`✨ [WAKE WORD MATCHED via "${matchedWord}"!]`);
            setContinuousVoiceMode(true); // Activate persistent continuous convo mode
            
            // 1. If screen is asleep, restore it!
            if (isScreenSleep) {
              setIsScreenSleep(false);
              const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
              speakOutput(`Yes ${userHonorific}, J.A.R.V.I.S. protocol is active. Core systems are fully online and ready.`);
              setErrorNotice("🎙️ Wake word detected: Screen restored in online mode. Continuous dialog loop engaged.");
              active = false;
              try { recognition.stop(); } catch (e) {}
              break;
            }

            // 2. If screen is already awake, let's extract the command or trigger active listening
            // Build space-insensitive regex to capture the exact matched part of raw transcript
            const regexStr = matchedWord.split("").map(char => {
              return char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\s*";
            }).join("");
            const regex = new RegExp(regexStr, "i");
            const match = transcript.match(regex);
            
            let afterWord = "";
            if (match) {
              const matchedSegmentOnTranscript = match[0];
              const index = transcript.indexOf(matchedSegmentOnTranscript);
              afterWord = transcript.substring(index + matchedSegmentOnTranscript.length).trim();
            } else {
              // Fallback
              const index = transcript.indexOf(matchedWord);
              if (index !== -1) {
                afterWord = transcript.substring(index + matchedWord.length).trim();
              }
            }

            active = false;
            try { recognition.stop(); } catch (e) {}

            if (afterWord.length > 1) {
              // They said Jarvis + the command right away!
              console.log(`[Jarvis Continuous] Executing direct inline command: "${afterWord}"`);
              handleSubmitPrompt(afterWord);
            } else {
              // They just said "자비스".
              console.log("[Jarvis Continuous] Wake word heard with no command. Triggering speech capture feedback loop.");
              const userHonorific = userGender === "female" ? "Ma'am" : "Sir";
              const alertMsg = `At your service, ${userHonorific}. Go ahead.`;
              speakOutput(alertMsg);
              setErrorNotice(inputLanguage === "ko-KR"
                ? `🎙️ 자비스: 예 주인님, 말씀하십시오.`
                : `🎙️ JARVIS: Yes, ${userHonorific}. Continuous voice interceptor is active.`);
            }
            break;
          }
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
      const greetingText = "Welcome home, sir.";
      
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
        ? "👏 이중 박수 감지: Welcome home, sir!"
        : "👏 Double clap detected: Welcome home, sir!");
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
            handleSubmitPrompt(sttTranscriptRef.current.trim());
          }
        }, 2000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("STT sequence error:", event.error);
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
          handleSubmitPrompt(finalClean);
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
    if (continuousVoiceModeRef.current) {
      console.log("[Jarvis Continuous Convo] Conversation active. Re-triggering microphone...");
      setTimeout(() => {
        if (continuousVoiceModeRef.current && statusRef.current === "idle" && !isListeningRef.current) {
          startVoiceInputExplicit();
        }
      }, 400); // 400ms pause so there is a natural rhythm and no microphone chime clipping
    }
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
            handleSpeechFinished();
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
      handleSpeechFinished();
    }
  };

  const triggerBrowserSpeech = (text: string) => {
    const utterance = speakWithBrowser(text, {
      pitch: browserPitch,
      rate: browserRate,
      voiceName: selectedBrowserVoice,
      onEnd: () => handleSpeechFinished(),
      onError: () => handleSpeechFinished(),
    });
    activeUtteranceRef.current = utterance;
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
        const isKorean = inputLanguage === "ko-KR" || /[\uac00-\ud7af]/.test(item.task);
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

    // Explicitly set language to English and set premium voice engine on first start as requested
    setInputLanguage("en-US");
    localStorage.setItem("jarvis_input_lang", "en-US");
    
    setVoiceEngine("premium");
    localStorage.setItem("jarvis_voice_engine", "premium");

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

      const primaryWelcome = "Welcome home, sir.";
      
      const setupMsg: ChatMessage = {
        id: "sys_init_welcome",
        role: "jarvis",
        text: primaryWelcome,
        timestamp: new Date(),
      };
      setMessages([setupMsg]);
      speakOutput(primaryWelcome);
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

        const querySuffix = isChannel ? " channel" : "";
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(extractedQuery + querySuffix)}`;
        window.open(ytUrl, "_blank");

        reply = isChannel
          ? `Certainly, ${honorific}. Redirecting you to YouTube in a new tab for '${extractedQuery}' channel.`
          : `Of course, ${honorific}. Redirecting you to YouTube in a new tab for '${extractedQuery}'.`;
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

        reply = `Command received, ${honorific}. Securing schedule in local mainframe sectors. I have registered: '${extractedTask}' for '${extractedTime}' on your terminal map.`;
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

        reply = `Mainframe identity updating completed, ${honorific}. Auxiliary registers are updated to address you as ${detectedName}. Ready to assist you.`;
      } else {
        if (lowerText.includes("안녕") || lowerText.includes("hello") || lowerText.includes("hi") || lowerText.includes("반갑")) {
          reply = `Welcome back, ${nameInSpeech}. Auxiliary offline core is fully operating. The secondary power units stabilized at 100%.`;
        } else if (lowerText.includes("상태") || lowerText.includes("status") || lowerText.includes("검사") || lowerText.includes("진단")) {
          reply = `Diagnostics completed, ${honorific}. Subsystems: Local Arc Reactor [92%], Schedules Matrix [ONLINE], Speech Synthesizer [ENGAGED]. Main model quota is depleted—personal API keys would fully restore online systems.`;
        } else if (lowerText.includes("고마") || lowerText.includes("감사") || lowerText.includes("thank")) {
          reply = `At your service, ${honorific}. JARVIS backup circuits are always loyal to your command.`;
        } else if (lowerText.includes("누구") || lowerText.includes("who are you") || lowerText.includes("너는")) {
          reply = `I am J.A.R.V.I.S., the auxiliary local firmware backup of Tony Stark's personal assistant. Standing by.`;
        } else {
          const defaultsEn = [
            `Auxiliary backup protocol is active, ${honorific}. Your request is stored locally, but main cognitive arrays require a personal GEMINI_API_KEY in the settings to restore the active cloud link.`,
            `Offline system is fully secure, ${honorific}. Under standard power limits, I can handle scheduling and local database queries on this control panel.`,
            `The primary neural network is in offline standby mode, ${honorific}. Access to my full artificial intelligence is temporarily gated until personal API keys are populated.`
          ];
          const defaultsKo = [
            `알겠습니다 주인님. 오프라인 메인프레임 코어가 완벽하게 가동 중입니다. 대시보드 스케줄러 등록 및 화면 제어 명령은 정상 작동하고 있으나, 복잡한 실시간 원격 AI 대화는 API key 입력을 요합니다.`,
            `시스템 로컬 백업 파워 서플라이가 안정화되었습니다. 개인용 API Key를 설정하시면 실시간 자비스 인공지능을 완전히 복구해 가동할 수 있습니다.`,
            `비상 파워 프로토콜이 유지 중입니다 주인님. 메인 인공지능과의 신호 연결은 대기 상태이며, 현재로선 오프라인 로컬 데이터 제어 장치만 이용 가능합니다.`
          ];
          
          reply = containsKo 
            ? defaultsKo[Math.floor(Math.random() * defaultsKo.length)]
            : defaultsEn[Math.floor(Math.random() * defaultsEn.length)];
        }
      }

      const jarvisMsg: ChatMessage = {
        id: `m_${Date.now()}_offline_resp`,
        role: "jarvis",
        text: reply,
        timestamp: new Date()
      };

      setMessages((prev) => [...prev, jarvisMsg]);
      setStatus("idle");
      speakOutput(reply);
    }, 1000);
  };

  // Submit absolute prompt to Backend Chat API or process local commands
  const handleSubmitPrompt = async (text: string) => {
    if (!text.trim()) return;

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
      const replyMsg = inputLanguage === "ko-KR" 
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
      const replyMsg = `Certainly, ${userHonorific}. Accessing meteorological satellite channels and redirecting you to the weather forecast.`;
      
      const jarvisWeatherMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_weather`,
        role: "jarvis",
        text: replyMsg,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisWeatherMsg]);
      setInputText("");
      setStatus("idle");
      
      speakOutput(replyMsg);
      
      const weatherUrl = "https://search.naver.com/search.naver?query=오늘날씨";
      window.open(weatherUrl, "_blank");
      
      setErrorNotice("🌤️ Opening weather forecast window!");
      return;
    }


    // Translate command intercept
    const cleanNoSpaces = cleanLower.replace(/\?/g, "");
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

    if (isTurnOnTranslation) {
      setTranslateKToEMode(true);
      setContinuousVoiceMode(true); // Turn on continuous listening too so they can keep speaking easily!
      setInputLanguage("ko-KR");
      
      const confirmationText = "Understood, Sir. Real-time Korean-to-English translation protocol is now fully engaged. Speak in Korean, and I will record and translate your voice instantly into high-fidelity English. You may begin, Sir.";
      
      const jarvisTranslateMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_trans_on`,
        role: "jarvis",
        text: confirmationText,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisTranslateMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(confirmationText);
      setErrorNotice("🎙️ Translation Core ENGAGED & Auto-mic is Armed!");
      return;
    }

    if (isTurnOffTranslation) {
      setTranslateKToEMode(false);
      
      const confirmationText = "Yes, Sir. Deactivating real-time translation and restoring standard database assistant parameters on this interface.";
      
      const jarvisTranslateMsg: ChatMessage = {
        id: `m_${Date.now()}_jarvis_trans_off`,
        role: "jarvis",
        text: confirmationText,
        timestamp: new Date(),
      };
      
      setMessages((prev) => [...prev, userMsg, jarvisTranslateMsg]);
      setInputText("");
      setStatus("idle");
      speakOutput(confirmationText);
      setErrorNotice("🎙️ Standard assistant mode restored.");
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
          translateKToEMode,
          inputLanguage,
          image: imagePayload,
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
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
        window.open(ytUrl, "_blank");
        console.log("JARVIS playing song in new window:", query);
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[YOUTUBE_PLAY:\s*.+?\]/gi, "").trim();
      }

      // Parse potential YouTube channel command inside generated text
      const ytChannelMatch = newJarvisText.match(/\[YOUTUBE_CHANNEL:\s*(.+?)\]/i);
      if (ytChannelMatch && ytChannelMatch[1]) {
        const query = ytChannelMatch[1].trim();
        const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + " channel")}`;
        window.open(ytUrl, "_blank");
        console.log("JARVIS playing channel in new window:", query);
        
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

      // Parse potential Stealth Mode command inside generated text
      if (newJarvisText.includes("[STEALTH_MODE]")) {
        setIsScreenSleep(true);
        console.log("JARVIS entering stealth screen sleep.");
        
        // Strip out the pattern marker so that it's clean on UI terminal and text-to-speech audio
        newJarvisText = newJarvisText.replace(/\[STEALTH_MODE\]/gi, "").trim();
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
            handleSubmitPrompt(sttTranscriptRef.current.trim());
          }
        }, 2000);
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
          handleSubmitPrompt(finalClean);
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
                🎙️ "자비스" (Jarvis) 호출, 👏 박수 두번, 또는 화면을 터치해서 깨워보세요
              </p>
            </div>
          </div>
        </div>
      )}

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
            <div className="w-full grid grid-cols-1 md:grid-cols-12 gap-6 relative">
              {/* Large HUD Controls (Left Column) */}
              <motion.div
                initial={{ opacity: 0, y: 35, scale: 0.94, filter: "blur(12px)" }}
                animate={revealStep >= 1 ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : { opacity: 0, y: 35, scale: 0.94, filter: "blur(12px)" }}
                transition={{ type: "spring", stiffness: 60, damping: 14 }}
                className="md:col-span-6 flex flex-col space-y-4 relative"
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
                              TRANSMITTING VOCAL COMMANDS
                            </span>
                            <p className="text-xs font-semibold text-slate-100 font-sans tracking-wide leading-relaxed select-text">
                              {transitText ? `"${transitText}"` : "Listening... Speak now, Sir"}
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
                            <motion.circle
                              className="absolute w-full h-full rounded-full border-2 border-cyan-400/10 border-t-cyan-400"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                            />
                            <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                          </div>
                          <span className="text-[7px] font-mono text-cyan-400 tracking-[0.2em] uppercase block animate-pulse">
                            CALCULATING QUANTUM SYNAPSE...
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
                              <div className="space-y-0.5 select-text">
                                <span className="text-[7px] font-mono font-bold text-cyan-500/60 tracking-[0.2em] uppercase block">
                                  COGNITIVE DIALOGUE FEEDback
                                </span>
                                <p className="text-[11.5px] font-sans font-medium text-cyan-50 md:text-xs tracking-wide leading-relaxed filter drop-shadow-[0_0_6px_rgba(34,211,238,0.15)] max-h-[140px] overflow-y-auto pr-0.5 scrollbar-thin">
                                  {lastMsg.text}
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
                          <Cpu className="w-5 h-5 stroke-[1.2] animate-pulse" />
                          <span className="text-[7px] font-mono tracking-[0.2em] uppercase">SYSTEM STANDBY</span>
                          <p className="text-[9px] font-sans text-cyan-500/50">"Say '자비스' or tap TRANSMIT button to begin, Sir."</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                              availableVoices.map((v, idx) => (
                                <option key={`${v.name}_${idx}`} value={v.name}>
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

                    {/* Bypass Wake Word control */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px]">
                          BYPASS WAKE WORD (호출어 "자비스" 생략):
                        </label>
                        <div className="flex rounded border border-slate-800 overflow-hidden text-[9px] font-mono">
                          <button
                            type="button"
                            onClick={() => setBypassWakeWord(true)}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              bypassWakeWord
                                ? "bg-cyan-500/20 text-cyan-300 border-r border-slate-800"
                                : "bg-transparent text-slate-500 hover:text-slate-400 border-r border-slate-800"
                            }`}
                          >
                            BYPASS ACTIVE
                          </button>
                          <button
                            type="button"
                            onClick={() => setBypassWakeWord(false)}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              !bypassWakeWord
                                ? "bg-cyan-500/20 text-cyan-300"
                                : "bg-transparent text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            WAKE WORD
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        <strong>BYPASS ACTIVE (호출어 생략)</strong> 설정 시, "자비스"라고 부르지 않고 편소처럼 편하게 말씀하셔도 마이크가 기기상에서 상시 수신되어 질문을 즉각 가공 처리합니다!
                      </p>
                    </div>

                    {/* Korean-English Translation engine control */}
                    <div className="space-y-2 pt-2 border-t border-cyan-500/10">
                      <div className="flex justify-between items-center">
                        <label className="text-cyan-500/80 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
                          <span className={`${translateKToEMode ? "bg-emerald-500 animate-pulse" : "bg-slate-600"} w-1.5 h-1.5 rounded-full`} />
                          KOREAN-ENGLISH TRANSLATION (한-영 실시간 통역기):
                        </label>
                        <div className="flex rounded border border-slate-800 overflow-hidden text-[9px] font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              setTranslateKToEMode(true);
                              setContinuousVoiceMode(true);
                              setInputLanguage("ko-KR");
                            }}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              translateKToEMode
                                ? "bg-emerald-500/20 text-emerald-300 border-r border-slate-800"
                                : "bg-transparent text-slate-500 hover:text-slate-400 border-r border-slate-800"
                            }`}
                          >
                            ENGAGED
                          </button>
                          <button
                            type="button"
                            onClick={() => setTranslateKToEMode(false)}
                            className={`px-2 py-0.5 font-bold transition-all ${
                              !translateKToEMode
                                ? "bg-rose-950/40 text-rose-300"
                                : "bg-transparent text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            STANDBY
                          </button>
                        </div>
                      </div>
                      <p className="text-[9px] text-slate-400 leading-normal font-mono">
                        활성화 시 한국어로 말하면 자동으로 <strong>영어로 실시간 번역 및 대화 처리</strong>하여 영어 합성 음성으로 즉각 대답해드립니다. ("번역 모드 켜줘", "번역 꺼줘" 지시어 작동)
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
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>


            {/* Holographic Scheduling or Mathematical Array (Right Column - Expanded to md:col-span-6) */}
            <motion.div
              initial={{ opacity: 0, y: 35, scale: 0.94, filter: "blur(12px)" }}
              animate={revealStep >= 2 ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : { opacity: 0, y: 35, scale: 0.94, filter: "blur(12px)" }}
              transition={{ type: "spring", stiffness: 60, damping: 14 }}
              className="md:col-span-6 flex flex-col h-auto min-h-[560px] space-y-3 relative"
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

              {/* Holographic YouTube Stream overlay inside Right Column */}
              <AnimatePresence>
                {activeYoutubeQuery && (
                  <motion.div
                    key="holographic-yt-player"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    className="w-full z-10"
                  >
                    <HolographicYoutubePlayer
                      query={activeYoutubeQuery}
                      type={youtubePlayType === "channel" ? "channel" : "song"}
                      isMinimized={isYoutubeMinimized}
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
              <div className="grid grid-cols-3 gap-1 bg-slate-950/50 p-1 border border-cyan-500/10 rounded-xl font-mono text-[9px] relative z-10">
                <button
                  type="button"
                  onClick={() => setRightPanelMode("math")}
                  className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                    rightPanelMode === "math"
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-200"
                      : "border border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  <Calculator className="w-3.5 h-3.5 font-bold" />
                  <span>MATH CORE</span>
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
                  <Calendar className="w-3.5 h-3.5" />
                  <span>AGENDA TRACK</span>
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
                  <Headphones className="w-3.5 h-3.5" />
                  <span>AUDIO FEED</span>
                </button>
              </div>

              {rightPanelMode === "math" ? (
                <MathProcessor onAskJarvis={handleSubmitPrompt} status={status} />
              ) : rightPanelMode === "media" ? (
                <HolographicMediaLoader
                  onPlaySong={(query, type) => {
                    const searchSuffix = type === "channel" ? " channel" : "";
                    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query + searchSuffix)}`;
                    window.open(ytUrl, "_blank");
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
            </div> {/* <-- Closed inner grid container */}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
