import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Cpu, VolumeX, Volume2 } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "jarvis";
  text: string;
  timestamp: Date;
  voiceUrl?: string; // If premium audio generated
}

interface JarvisConsoleProps {
  messages: ChatMessage[];
  isListening: boolean;
  transitText: string; // Real-time transcript for STT
  isOutputtingVoice: boolean;
  voiceEngine: "premium" | "browser" | "silent";
  honorific: string;
}

export default function JarvisConsole({
  messages,
  isListening,
  transitText,
  isOutputtingVoice,
  voiceEngine,
  honorific,
}: JarvisConsoleProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transitText, isListening]);

  return (
    <div
      id="jarvis-terminal-mainframe"
      className="stark-cyber-panel stark-cyber-bottom-decor flex flex-col overflow-hidden h-[400px]"
    >
      {/* Console Top Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-cyan-500/10 text-xs font-mono text-cyan-400">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span>JARVIS COMMUNICATIONS MATRIX</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="opacity-60 text-[10px]">ENGINE:</span>
          <span className="uppercase text-[11px] font-semibold text-cyan-200">
            {voiceEngine === "premium" ? "Neural Core (AI)" : voiceEngine === "browser" ? "Local Syn (Browser)" : "Muted"}
          </span>
          {voiceEngine !== "silent" ? (
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
      </div>

      {/* Message List Body */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent"
      >
        <AnimatePresence initial={false}>
          {messages.length === 0 && !transitText && !isListening && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              className="h-full flex flex-col justify-center items-center text-center p-6 text-cyan-500/50 font-mono text-xs space-y-2 select-none"
            >
              <Cpu className="w-10 h-10 stroke-[1.2] animate-pulse mb-1" />
              <p>Mainframe Online. Standing by for command inputs...</p>
              <p className="text-[10px]">"Speak in English, Sir."</p>
            </motion.div>
          )}

          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 max-w-[85%] ${
                msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Avatar Icon */}
              <div
                className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.1)] ${
                  msg.role === "user"
                    ? "bg-sky-950 border-sky-500/30 text-sky-400"
                    : "bg-cyan-950 border-cyan-500/30 text-cyan-404"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="w-4 h-4 text-sky-400" />
                ) : (
                  <Cpu className="w-4 h-4 text-cyan-400" />
                )}
              </div>

              {/* Message Box */}
              <div className="flex flex-col space-y-1">
                <div
                  className={`px-3 py-2 rounded-xl text-sm font-sans select-text ${
                    msg.role === "user"
                      ? "bg-sky-900/40 border border-sky-400/20 text-sky-100"
                      : "bg-slate-900/60 border border-cyan-400/20 text-cyan-100 shadow-[0_2px_10px_rgba(6,182,212,0.05)]"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>
                {/* Meta details */}
                <span
                  className={`text-[9px] font-mono opacity-50 px-1 ${
                    msg.role === "user" ? "text-right text-sky-400" : "text-left text-cyan-400"
                  }`}
                >
                  {msg.role === "user" ? `OPERATOR (${honorific.toUpperCase()})` : "J.A.R.V.I.S."} •{" "}
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            </motion.div>
          ))}

          {/* Active Listening / Speech Recognition Transcript overlay card */}
          {isListening && transitText && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse"
            >
              <div className="w-7 h-7 rounded-lg border border-red-500/30 bg-red-950/20 text-red-400 flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-red-400 animate-pulse" />
              </div>
              <div className="flex flex-col space-y-1">
                <div className="px-3 py-2 rounded-xl text-sm font-sans font-medium bg-red-950/25 border border-red-500/30 text-red-200">
                  <p className="italic">{transitText}...</p>
                </div>
                <span className="text-[9px] font-mono text-red-400 opacity-60 text-right px-1">
                  TRANSCRIBING IN REALTIME
                </span>
              </div>
            </motion.div>
          )}

          {/* Listening State Placeholder */}
          {isListening && !transitText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 max-w-[80%] ml-auto flex-row-reverse"
            >
              <div className="w-7 h-7 rounded-lg border border-red-500/30 bg-red-950/40 text-red-400 flex items-center justify-center shrink-0 animate-pulse">
                <User className="w-4 h-4 text-red-400" />
              </div>
              <div className="px-3 py-2 rounded-xl text-xs font-mono bg-red-950/15 border border-red-500/20 text-red-400 animate-pulse">
                Listening for voice input... Speak now
              </div>
            </motion.div>
          )}

          {/* JARVIS Thinking State indicator */}
          {isOutputtingVoice && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3 max-w-[80%] mr-auto"
            >
              <div className="w-7 h-7 rounded-lg border border-cyan-500/30 bg-cyan-950/40 text-cyan-400 flex items-center justify-center shrink-0 animate-bounce">
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="px-3 py-2 rounded-xl text-xs font-mono bg-cyan-950/15 border border-cyan-500/20 text-cyan-400 flex items-center gap-2">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                </div>
                <span>Generating voice transmission...</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
