import React, { useState, useEffect, useRef } from "react";
import { 
  Music, 
  Search, 
  Disc, 
  Headphones, 
  Sparkles, 
  Square, 
  Volume2, 
  Play, 
  Pause, 
  SkipForward, 
  Settings,
  Radio,
  Sliders,
  Zap,
  Activity,
  VolumeX
} from "lucide-react";

interface DirectSong {
  id: string;
  title: string;
  url: string;
  genre: string;
  icon: string;
  description: string;
}

const OFFLINE_STATION_TRACKS: DirectSong[] = [
  { 
    id: "stark_grid", 
    title: "Stark Grid Core Loop 🌌", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", 
    genre: "Space Synthwave", 
    icon: "🌌",
    description: "Futuristic energetic electric guitar synthwave groove."
  },
  { 
    id: "jarvis_rest", 
    title: "JARVIS Cozy Coffee ☕", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", 
    genre: "Chill Lofi", 
    icon: "☕",
    description: "Laidback acoustic piano and percussion lofi vibe."
  },
  { 
    id: "avengers_assemble", 
    title: "Vanguard Tech Suite 🎷", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", 
    genre: "Heroic Cyberpunk", 
    icon: "🎷",
    description: "Uplifting futuristic electronic beat with epic drums."
  },
  { 
    id: "shield_hq", 
    title: "S.H.I.E.L.D. Secure Bunker 📻", 
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3", 
    genre: "Ambient Drone", 
    icon: "📻",
    description: "Calm, slow-paced synthetic string and key soundscape."
  }
];

interface OnlinePreset {
  id: string;
  title: string;
  query: string;
  genre: string;
  icon: string;
  description: string;
}

const STARK_CLOUD_PRESETS: OnlinePreset[] = [
  {
    id: "acdc_back_in_black",
    title: "AC/DC - Back In Black ⚡",
    query: "AC/DC Back in Black official audio",
    genre: "Stark Heavy Rock",
    icon: "⚡",
    description: "Legendary opening riff to fuel your Iron Man armor."
  },
  {
    id: "sabbath_iron_man",
    title: "Black Sabbath - Iron Man 🦾",
    query: "Black Sabbath Iron Man official audio",
    genre: "Classic Heavy Metal",
    icon: "🦾",
    description: "The classic heavy metal rhythm of Tony Stark."
  },
  {
    id: "zeppelin_kashmir",
    title: "Led Zeppelin - Kashmir 🥁",
    query: "Led Zeppelin Kashmir official remastered audio",
    genre: "Orchestral Hard Rock",
    icon: "🥁",
    description: "Atmospheric, majestic space rock progression."
  },
  {
    id: "shoot_to_thrill",
    title: "AC/DC - Shoot to Thrill 🚀",
    query: "AC/DC Shoot to Thrill Iron Man",
    genre: "Stark combat theme",
    icon: "🚀",
    description: "The definitive opening theme of the Stark Expo."
  }
];

interface HolographicMediaLoaderProps {
  onPlaySong: (query: string, type: "song" | "channel") => void;
  onCloseSong: () => void;
  activeQuery: string | null;
  youtubePlayType: "song" | "channel" | null;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  autoPlayOfflineCount?: number;
  forceDirectTrackId?: string | null;
  onClearForceDirectTrack?: () => void;
}

export default function HolographicMediaLoader({
  onPlaySong,
  onCloseSong,
  activeQuery,
  youtubePlayType,
  isMinimized,
  onToggleMinimize,
  autoPlayOfflineCount = 0,
  forceDirectTrackId = null,
  onClearForceDirectTrack,
}: HolographicMediaLoaderProps) {
  // Modes: "direct" (Direct HQ mp3 streams) or "synth" (Offline Web Audio Stark Synthesizer)
  const [playerTab, setPlayerTab] = useState<"direct" | "synth">("direct");
  const [satelliteMode, setSatelliteMode] = useState<"offline" | "cloud">("offline");

  // State for direct audio stream
  const [currentDirectTrack, setCurrentDirectTrack] = useState<DirectSong>(OFFLINE_STATION_TRACKS[0]);
  const [isDirectPlaying, setIsDirectPlaying] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  // References
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stark procedural synthesizer state
  const [synthFrequency, setSynthFrequency] = useState<number>(220); // A3 frequency
  const [synthType, setSynthType] = useState<OscillatorType>("sine");
  const [synthIsPlaying, setSynthIsPlaying] = useState<boolean>(false);
  const [synthLfoFrequency, setSynthLfoFrequency] = useState<number>(6); // Speed of vibration
  const [synthArpeggioSpeed, setSynthArpeggioSpeed] = useState<number>(300); // ms per step
  
  // Synthesizer Web Audio API references
  const audioCtxRef = useRef<AudioContext | null>(null);
  const synthOscRef = useRef<OscillatorNode | null>(null);
  const synthLfoRef = useRef<OscillatorNode | null>(null);
  const synthGainRef = useRef<GainNode | null>(null);
  const synthLfoGainRef = useRef<GainNode | null>(null);
  const arpeggioIntervalRef = useRef<number | null>(null);

  // Direct Audio Event Handlers inside continuous React layout
  useEffect(() => {
    // Create direct Audio Element
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => {
      // Loop to next track automatically
      const currentIndex = OFFLINE_STATION_TRACKS.findIndex(t => t.id === currentDirectTrack.id);
      const nextIndex = (currentIndex + 1) % OFFLINE_STATION_TRACKS.length;
      handlePlayDirectTrack(OFFLINE_STATION_TRACKS[nextIndex]);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audioRef.current = null;
    };
  }, [currentDirectTrack]);

  // Adjust volume / mute triggers
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
    if (synthGainRef.current) {
      synthGainRef.current.gain.value = isMuted ? 0 : volume * 0.15; // Keep synthesizer volume balanced
    }
  }, [volume, isMuted]);

  // Cleanup synthesizer on component unmount
  useEffect(() => {
    return () => {
      stopSynth();
    };
  }, []);

  // Direct MP3 song starter helper
  const handlePlayDirectTrack = (track: DirectSong) => {
    // Stop any synthesizer immediately to avoid overlapping noise
    stopSynth();
    // Stop YouTube player if running in parent component
    onCloseSong();

    setCurrentDirectTrack(track);

    if (audioRef.current) {
      audioRef.current.src = track.url;
      audioRef.current.load();
      audioRef.current.play()
        .then(() => {
          setIsDirectPlaying(true);
        })
        .catch(err => {
          console.error("Direct audio play failure:", err);
          setIsDirectPlaying(false);
        });
    }
  };

  // Cloud preset triggers standard central holographic player (cancels local audio)
  const handlePlayCloudPreset = (preset: OnlinePreset) => {
    stopSynth();
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setIsDirectPlaying(false);
    onPlaySong(preset.query, "song");
  };



  // Listen to force direct track play requests (e.g., from AC/DC Back in Black voice command)
  useEffect(() => {
    if (forceDirectTrackId) {
      const match = OFFLINE_STATION_TRACKS.find(t => t.id === forceDirectTrackId);
      if (match) {
        console.log("⚡ [Stark Local Player]: Forcing offline song playback of:", match.title);
        setPlayerTab("direct");
        handlePlayDirectTrack(match);
      }
      if (onClearForceDirectTrack) {
        onClearForceDirectTrack();
      }
    }
  }, [forceDirectTrackId, onClearForceDirectTrack]);

  // Listen to outer voice control autoplay trigger
  useEffect(() => {
    if (autoPlayOfflineCount > 0) {
      setPlayerTab("direct");
      const randomTrack = OFFLINE_STATION_TRACKS[Math.floor(Math.random() * OFFLINE_STATION_TRACKS.length)];
      handlePlayDirectTrack(randomTrack);
    }
  }, [autoPlayOfflineCount]);

  const handleTogglePlayDirect = () => {
    if (!audioRef.current) return;
    
    stopSynth();
    onCloseSong();

    if (isDirectPlaying) {
      audioRef.current.pause();
      setIsDirectPlaying(false);
    } else {
      // Set source if not started
      if (!audioRef.current.src) {
        audioRef.current.src = currentDirectTrack.url;
      }
      audioRef.current.play()
        .then(() => setIsDirectPlaying(true))
        .catch(err => console.error("Play resume failed:", err));
    }
  };

  const handleSkipDirectTrack = () => {
    const currentIndex = OFFLINE_STATION_TRACKS.findIndex(t => t.id === currentDirectTrack.id);
    const nextIndex = (currentIndex + 1) % OFFLINE_STATION_TRACKS.length;
    handlePlayDirectTrack(OFFLINE_STATION_TRACKS[nextIndex]);
  };

  const handleProgressBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // ----------------------------------------------------
  // Stark Procedural Web Audio Synthesizer Engine
  // ----------------------------------------------------
  const startSynth = () => {
    if (synthIsPlaying) return;

    // Pause direct streaming song
    if (audioRef.current) {
      audioRef.current.pause();
      setIsDirectPlaying(false);
    }
    onCloseSong(); // Stop parent YouTube

    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtxClass();
      audioCtxRef.current = ctx;

      // Root main envelope/gain node
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(isMuted ? 0 : volume * 0.15, ctx.currentTime);
      mainGain.connect(ctx.destination);
      synthGainRef.current = mainGain;

      // Main Oscillator
      const osc = ctx.createOscillator();
      osc.type = synthType;
      osc.frequency.setValueAtTime(synthFrequency, ctx.currentTime);
      
      // Low Frequency Oscillator (LFO) for deep space vibration
      const lfo = ctx.createOscillator();
      lfo.frequency.setValueAtTime(synthLfoFrequency, ctx.currentTime);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(30, ctx.currentTime); // Vibrato depth (pitch change range)

      // Connect LFO modulation to Main Oscillator Frequency
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      osc.connect(mainGain);

      // Start all nodes
      lfo.start();
      osc.start();

      synthOscRef.current = osc;
      synthLfoRef.current = lfo;
      synthLfoGainRef.current = lfoGain;
      setSynthIsPlaying(true);

      // Trigger Stark Cyber Arpeggiator simulation
      startArpeggiator(osc);

    } catch (err) {
      console.error("Synthesizer initiation failed:", err);
    }
  };

  const stopSynth = () => {
    if (arpeggioIntervalRef.current) {
      clearInterval(arpeggioIntervalRef.current);
      arpeggioIntervalRef.current = null;
    }
    try {
      if (synthOscRef.current) {
        synthOscRef.current.stop();
        synthOscRef.current.disconnect();
        synthOscRef.current = null;
      }
      if (synthLfoRef.current) {
        synthLfoRef.current.stop();
        synthLfoRef.current.disconnect();
        synthLfoRef.current = null;
      }
      if (synthLfoGainRef.current) {
        synthLfoGainRef.current.disconnect();
        synthLfoGainRef.current = null;
      }
      if (synthGainRef.current) {
        synthGainRef.current.disconnect();
        synthGainRef.current = null;
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    } catch (e) {
      // Ignored
    }
    setSynthIsPlaying(false);
  };

  // Cool arpeggiator algorithm that creates dynamic cyber pattern melodies
  const startArpeggiator = (oscNode: OscillatorNode) => {
    if (arpeggioIntervalRef.current) {
      clearInterval(arpeggioIntervalRef.current);
    }

    // Classic holographic chord tones (Minor 7th, major chords suited for space vibe)
    const notesMultiplier = [1.0, 1.2, 1.25, 1.5, 1.6, 1.875, 2.0, 1.5];
    let step = 0;

    arpeggioIntervalRef.current = window.setInterval(() => {
      if (!oscNode || !audioCtxRef.current) return;
      const baseFreq = synthFrequency;
      const nextFreq = baseFreq * notesMultiplier[step % notesMultiplier.length];
      
      // Slide sound transition (glide/portamento)
      const now = audioCtxRef.current.currentTime;
      oscNode.frequency.exponentialRampToValueAtTime(nextFreq, now + 0.12);
      
      step++;
    }, synthArpeggioSpeed);
  };

  // Handle synth parameter adjustments runtime
  useEffect(() => {
    if (synthOscRef.current && audioCtxRef.current) {
      synthOscRef.current.type = synthType;
      const now = audioCtxRef.current.currentTime;
      synthOscRef.current.frequency.exponentialRampToValueAtTime(synthFrequency, now + 0.05);
    }
  }, [synthFrequency, synthType]);

  useEffect(() => {
    if (synthLfoRef.current && audioCtxRef.current) {
      const now = audioCtxRef.current.currentTime;
      synthLfoRef.current.frequency.setValueAtTime(synthLfoFrequency, now);
    }
  }, [synthLfoFrequency]);

  // Restart arpeggiator step if speed is dialed in real-time
  useEffect(() => {
    if (synthIsPlaying && synthOscRef.current) {
      startArpeggiator(synthOscRef.current);
    }
  }, [synthArpeggioSpeed]);

  const toggleSynthPower = () => {
    if (synthIsPlaying) {
      stopSynth();
    } else {
      startSynth();
    }
  };

  // Helper formatting for audio timestamps
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="stark-cyber-panel stark-cyber-bottom-decor flex-1 flex flex-col p-4  relative overflow-hidden h-[508px]">
      {/* Laser grids / glows */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
      <div className="absolute -bottom-24 -left-20 w-52 h-52 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Sub-header tabs for Direct Stream vs Synth Lab */}
      <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2.5 mb-3 shrink-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              stopSynth();
              setPlayerTab("direct");
            }}
            className={`px-3 py-1 text-[10px] font-bold font-mono rounded-lg border transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
              playerTab === "direct"
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>SATELLITE STREAM</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.pause();
                setIsDirectPlaying(false);
              }
              setPlayerTab("synth");
            }}
            className={`px-3 py-1 text-[10px] font-bold font-mono rounded-lg border transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
              playerTab === "synth"
                ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                : "bg-transparent border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>JARVIS SYNTH LAB</span>
          </button>


        </div>

        {/* Global Volume Overlay */}
        <div className="flex items-center gap-2 hover:bg-slate-950/40 py-1 px-2.5 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="text-cyan-400/80 hover:text-cyan-400 cursor-pointer"
            title={isMuted ? "Unmute Master Audio" : "Mute Master Audio"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 animate-pulse text-red-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-12 accent-cyan-400 h-1 rounded bg-slate-950 cursor-pointer"
            title="Adjust Master Gain"
          />
        </div>
      </div>

      {/* Tab 1: Direct High-Quality Offline Streams */}
      {playerTab === "direct" && (
        <div className="flex-1 flex flex-col min-h-0 space-y-4">
          
          {/* Active Audio Visual Card */}
          <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/10 relative overflow-hidden shrink-0">
            {/* Pulsing light */}
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 bg-cyan-950/50 border border-cyan-400/20 px-2 py-0.5 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${isDirectPlaying ? "bg-cyan-400 animate-ping" : "bg-slate-600"}`} />
              <span className="text-[8px] text-cyan-300 font-mono tracking-widest uppercase">
                {isDirectPlaying ? "PLAYING STREAM" : "PAUSED"}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="relative w-11 h-11 bg-cyan-950/50 border border-cyan-500/25 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                <Music className={`w-5 h-5 text-cyan-400 ${isDirectPlaying ? "animate-spin" : ""}`} style={{ animationDuration: "5s" }} />
              </div>

              <div className="min-w-0 flex-1">
                <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-widest block leading-none mb-0.5">
                  OFFLINE DIRECT AUDIO
                </span>
                <h4 className="text-[12px] font-bold text-cyan-100 font-mono truncate leading-snug">
                  {currentDirectTrack.title}
                </h4>
                <p className="text-[9px] text-slate-500 font-mono truncate uppercase leading-relaxed">
                  {currentDirectTrack.genre} • {currentDirectTrack.description}
                </p>
              </div>
            </div>

            {/* Custom Interactive Wave progress bar */}
            <div className="mt-3.5 space-y-1">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={handleProgressBarChange}
                className="w-full accent-cyan-400 h-1 bg-slate-950 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[8px] font-mono text-cyan-500/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Micro Controls row */}
            <div className="mt-2.5 flex justify-between items-center bg-slate-950/40 p-1.5 rounded-lg border border-cyan-500/5">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 bg-cyan-400/80 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                <span className="w-1 h-2.5 bg-cyan-400/60 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                <span className="w-1 h-4 bg-cyan-400/90 rounded-full animate-bounce" style={{ animationDelay: "0.5s" }} />
                <span className="text-[8px] text-cyan-400/70 font-mono ml-1 uppercase">PCM 256KBPS</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleTogglePlayDirect}
                  className="p-1 px-[10px] bg-cyan-950/50 border border-cyan-500/20 hover:border-cyan-400 text-cyan-300 hover:text-cyan-100 rounded-lg text-[9px] font-mono uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                >
                  {isDirectPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-cyan-400/10" />}
                  <span>{isDirectPlaying ? "Pause" : "Play"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkipDirectTrack}
                  className="p-1 px-2 hover:bg-cyan-950/30 border border-transparent hover:border-cyan-500/20 text-cyan-400 rounded-lg text-[9px] font-mono transition-all cursor-pointer"
                  title="Next Sound Station"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* List of stations */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Sub-bar toggle for Offline vs Cloud presets */}
            <div className="flex items-center justify-between border-b border-cyan-500/5 pb-2 mb-2 shrink-0">
              <div className="text-[9px] text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-cyan-500/70" />
                <span>{satelliteMode === "offline" ? "SATELLITE FREQUENCY BAND" : "STARK CLOUD MUSIC REPOSITORY"}</span>
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setSatelliteMode("offline")}
                  className={`px-2 py-0.5 text-[8px] font-bold font-mono rounded transition-all cursor-pointer border ${
                    satelliteMode === "offline"
                      ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                      : "bg-slate-950/20 border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  OFFLINE
                </button>
                <button
                  type="button"
                  onClick={() => setSatelliteMode("cloud")}
                  className={`px-2 py-0.5 text-[8px] font-bold font-mono rounded transition-all cursor-pointer border ${
                    satelliteMode === "cloud"
                      ? "bg-cyan-500/15 border-cyan-500/30 text-cyan-200"
                      : "bg-slate-950/20 border-transparent text-slate-500 hover:text-slate-300"
                  }`}
                >
                  CLOUD PRESETS
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5 scrollbar-thin scrollbar-thumb-cyan-500/10 scrollbar-track-transparent">
              {satelliteMode === "offline" ? (
                OFFLINE_STATION_TRACKS.map((track) => {
                  const isActive = currentDirectTrack.id === track.id && isDirectPlaying;
                  const isSelected = currentDirectTrack.id === track.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => handlePlayDirectTrack(track)}
                      className={`w-full text-left p-2 rounded-xl border flex items-center justify-between transition-all font-mono group cursor-pointer ${
                        isActive
                          ? "bg-cyan-950/20 border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.05)]"
                          : isSelected
                          ? "bg-slate-900 border-slate-700 text-slate-100"
                          : "bg-slate-950/40 border-slate-800/60 hover:bg-slate-900 hover:border-cyan-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[13px] shrink-0">{track.icon}</span>
                        <div className="min-w-0 text-left">
                          <div className={`text-[11px] font-semibold truncate leading-snug ${isActive ? "text-cyan-300 font-bold" : "text-slate-300 group-hover:text-cyan-200"}`}>
                            {track.title}
                          </div>
                          <p className="text-[8px] text-slate-500 group-hover:text-slate-400 leading-none mt-0.5 truncate uppercase">
                            {track.genre} • Click to tune
                          </p>
                        </div>
                      </div>
                      
                      <div className="shrink-0 pl-2">
                        {isActive ? (
                          <div className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-ping" />
                            <span className="text-[7.5px] text-cyan-400 font-bold">STREAM</span>
                          </div>
                        ) : (
                          <span className="text-[8px] text-slate-500 group-hover:text-cyan-400/80 uppercase font-bold border border-transparent group-hover:border-cyan-500/15 bg-slate-900/40 px-1.5 py-0.5 rounded leading-none transition-all">
                            TUNE
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                STARK_CLOUD_PRESETS.map((preset) => {
                  const isCurrentActive = activeQuery === preset.query;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handlePlayCloudPreset(preset)}
                      className={`w-full text-left p-2 rounded-xl border flex items-center justify-between transition-all font-mono group cursor-pointer ${
                        isCurrentActive
                          ? "bg-cyan-950/20 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.08)]"
                          : "bg-slate-950/40 border-slate-800/60 hover:bg-slate-900 hover:border-cyan-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[13px] shrink-0">{preset.icon}</span>
                        <div className="min-w-0 text-left">
                          <div className={`text-[11px] font-semibold truncate leading-snug ${isCurrentActive ? "text-cyan-300 font-bold animate-pulse" : "text-slate-300 group-hover:text-cyan-200"}`}>
                            {preset.title}
                          </div>
                          <p className="text-[8px] text-slate-500 group-hover:text-slate-400 leading-none mt-0.5 truncate uppercase">
                            {preset.genre} • {preset.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="shrink-0 pl-2">
                        {isCurrentActive ? (
                          <span className="text-[7.5px] text-cyan-400 font-bold tracking-wider animate-pulse">STREAMING</span>
                        ) : (
                          <span className="text-[8px] text-slate-500 group-hover:text-cyan-400/80 uppercase font-bold border border-transparent group-hover:border-cyan-500/15 bg-slate-900/40 px-1.5 py-0.5 rounded leading-none transition-all">
                            PLAY
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: JARVIS Web Audio Procedural Synthesizer Lab */}
      {playerTab === "synth" && (
        <div className="flex-1 flex flex-col min-h-0 space-y-4 justify-between">
          
          {/* Main Synth Wave Monitor Panel */}
          <div className="p-3.5 rounded-xl border border-cyan-500/20 bg-cyan-950/10 relative overflow-hidden">
            <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-cyan-900/30 border border-cyan-500/20 px-2 py-0.5 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${synthIsPlaying ? "bg-amber-400 animate-pulse" : "bg-slate-600"}`} />
              <span className="text-[8px] text-amber-300 font-mono uppercase tracking-widest leading-none">
                {synthIsPlaying ? "SYNTH ENGAGEMENT ACTIVE" : "SYNTH POWER DOWN"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/20 flex items-center justify-center">
                <Zap className={`w-5 h-5 text-cyan-300 ${synthIsPlaying ? "animate-pulse" : ""}`} />
              </div>
              <div>
                <span className="text-[8px] font-mono font-bold text-cyan-400 uppercase tracking-widest block leading-none mb-0.5">
                  SYSTEM SYNTHESIZER
                </span>
                <h4 className="text-[12px] font-bold text-cyan-100 font-mono uppercase leading-snug">
                  Ark Audioscape Processor (Offline)
                </h4>
              </div>
            </div>

            {/* Live Frequency Oscillator feedback wave */}
            <div className="mt-3.5 bg-slate-950/80 border border-cyan-400/10 height-[50px] p-2 rounded-lg flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-x-0 h-[1px] bg-cyan-500/20" />
              {synthIsPlaying ? (
                <div className="flex items-center gap-0.5 w-full justify-around h-9 relative z-10">
                  {Array.from({ length: 24 }).map((_, i) => {
                    const durationRatio = (i % 4) + 1;
                    return (
                      <span
                        key={i}
                        className="w-[1.5px] bg-cyan-400/80 rounded-full"
                        style={{
                          height: `${Math.sin(i + (Date.now() / 200)) * 40 + 50}%`,
                          animation: `hologram-bounce ${0.4 + durationRatio * 0.15}s ease-in-add infinite alternate`
                        }}
                      />
                    );
                  })}
                </div>
              ) : (
                <span className="text-[8.5px] text-slate-500 font-mono uppercase tracking-widest z-10 py-1.5">
                  STANDBY • PRESS ENGAGE
                </span>
              )}
            </div>

            {/* Core Synth Switch Trigger */}
            <div className="mt-3.5 flex justify-center">
              <button
                type="button"
                onClick={toggleSynthPower}
                className={`w-full py-2 border rounded-xl font-mono text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  synthIsPlaying
                    ? "bg-amber-500/15 border-amber-500/40 hover:bg-amber-500/25 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.1)]"
                    : "bg-cyan-500/10 border-cyan-500/30 hover:border-cyan-400 text-cyan-300"
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{synthIsPlaying ? "DISENGAGE ARK OSCILLATORS" : "ENGAGE OFFLINE ARK SYNTH"}</span>
              </button>
            </div>
          </div>

          {/* Synth Sliders & Oscillators config */}
          <div className="space-y-3 bg-slate-950/30 border border-slate-800/80 p-3 rounded-xl flex-1 flex flex-col justify-center">
            
            {/* Wave Type Grid */}
            <div className="grid grid-cols-4 gap-1">
              {(["sine", "triangle", "sawtooth", "square"] as OscillatorType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setSynthType(type)}
                  className={`py-1 text-[8px] font-bold font-mono rounded border uppercase transition-all tracking-wider cursor-pointer ${
                    synthType === type
                      ? "bg-cyan-500/15 border-cyan-500/40 text-cyan-200"
                      : "bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Interactive Sliders */}
            <div className="space-y-2">
              {/* Frequency slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-400 uppercase">
                  <span>Root Carrier Frequency</span>
                  <span className="text-cyan-400">{synthFrequency} Hz (A-{Math.round(synthFrequency/55)})</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="440"
                  value={synthFrequency}
                  onChange={(e) => setSynthFrequency(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* LFO Modulator Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-400 uppercase">
                  <span>Sub-Vibrato (LFO) Speed</span>
                  <span className="text-cyan-400">{synthLfoFrequency} Hz / sec</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  value={synthLfoFrequency}
                  onChange={(e) => setSynthLfoFrequency(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* Arpeggio Tempo Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-mono text-slate-400 uppercase">
                  <span>Arpeggiator Pulse Delay</span>
                  <span className="text-cyan-400">{synthArpeggioSpeed} ms</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="800"
                  step="50"
                  value={synthArpeggioSpeed}
                  onChange={(e) => setSynthArpeggioSpeed(parseInt(e.target.value))}
                  className="w-full accent-cyan-400 h-1 bg-slate-900 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}


      
      {/* Dynamic Keyframes for procedural visuals */}
      <style>{`
        @keyframes hologram-bounce {
          from {
            height: 15%;
          }
          to {
            height: 95%;
          }
        }
      `}</style>
    </div>
  );
}
