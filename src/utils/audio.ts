/**
 * JARVIS Audio Utility
 * Manages Speech Recognition, Speech Synthesis, and Gemini PCM audio decoding and playback.
 */

// Decode 16-bit PCM little-endian audio returned by Gemini and play it via Web Audio API
export function playRawPCM(base64Data: string, sampleRate = 24000): Promise<{ audioCtx: AudioContext; source: AudioBufferSourceNode }> {
  return new Promise((resolve, reject) => {
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx = new AudioCtxClass();
      
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 16-bit PCM is 2 bytes per sample
      const int16Array = new Int16Array(bytes.buffer);
      const numSamples = int16Array.length;
      
      const buffer = audioCtx.createBuffer(1, numSamples, sampleRate);
      const channelData = buffer.getChannelData(0);
      
      for (let i = 0; i < numSamples; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }
      
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);
      
      source.onended = () => {
        audioCtx.close();
      };
      
      source.start(0);
      resolve({ audioCtx, source });
    } catch (error) {
      console.error("Failed to decode and play PCM audio:", error);
      reject(error);
    }
  });
}

// Speak using browser's built-in Web Speech API SpeechSynthesis
export function speakWithBrowser(
  text: string,
  options: {
    pitch?: number;
    rate?: number;
    voiceName?: string;
    onEnd?: () => void;
    onError?: (err: any) => void;
  } = {}
): SpeechSynthesisUtterance | null {
  if (!("speechSynthesis" in window)) {
    console.error("Speech Synthesis is not supported in this browser");
    if (options.onError) options.onError(new Error("Not supported"));
    return null;
  }

  // Cancel any running speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  const containsKorean = /[\uac00-\ud7af]/.test(text);
  utterance.lang = containsKorean ? "ko-KR" : "en-US";

  // Deep pitch and deliberate pace for bold male assistant vibe
  if (containsKorean) {
    utterance.pitch = options.pitch ?? 0.70; // Hard-coded deeper pitch for Korean bold male vibe
    utterance.rate = options.rate ?? 0.88;   // Slightly calmer rate for comfortable bold presence
  } else {
    utterance.pitch = options.pitch ?? 0.8;  // Deeper English pitch too for JARVIS
    utterance.rate = options.rate ?? 0.95;   // Delicate rate
  }

  // Attempt to select a suitable voice
  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = null;

  if (containsKorean) {
    const koreanVoices = voices.filter((v) => v.lang.startsWith("ko"));
    // Try to find a male voice first
    selectedVoice = koreanVoices.find((v) => {
      const nameLower = v.name.toLowerCase();
      return (
        nameLower.includes("male") ||
        nameLower.includes("남성") ||
        nameLower.includes("minsu") ||
        nameLower.includes("민수") ||
        nameLower.includes("junwoo") ||
        nameLower.includes("준우") ||
        nameLower.includes("chinho") ||
        nameLower.includes("진호") ||
        nameLower.includes("injun") ||
        nameLower.includes("인준") ||
        nameLower.includes("gildong") ||
        nameLower.includes("길동") ||
        (nameLower.includes("siri") && (nameLower.includes("남자") || nameLower.includes("male")))
      );
    });

    // If no male-specific matching voice, select a voice excluding obvious female names
    if (!selectedVoice) {
      selectedVoice = koreanVoices.find((v) => {
        const nameLower = v.name.toLowerCase();
        return !nameLower.includes("female") && 
               !nameLower.includes("여성") && 
               !nameLower.includes("heami") && 
               !nameLower.includes("혜미") && 
               !nameLower.includes("yuna") && 
               !nameLower.includes("유나") && 
               !nameLower.includes("suna") && 
               !nameLower.includes("선아") && 
               !nameLower.includes("seoyeon") && 
               !nameLower.includes("서연");
      });
    }

    // Fallback to the first available Korean voice
    if (!selectedVoice) {
      selectedVoice = koreanVoices[0];
    }
  } else if (options.voiceName) {
    selectedVoice = voices.find((v) => v.name === options.voiceName);
  }

  if (!selectedVoice && !containsKorean) {
    // Look for Google UK English Male voice
    selectedVoice = voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("male") && v.name.toLowerCase().includes("uk"));
  }
  if (!selectedVoice && !containsKorean) {
    // Any UK English voice (has beautiful JARVIS accents)
    selectedVoice = voices.find((v) => v.lang === "en-GB");
  }
  if (!selectedVoice && !containsKorean) {
    // Standard male English voice
    selectedVoice = voices.find((v) => v.lang.startsWith("en") && v.name.toLowerCase().includes("male"));
  }
  if (!selectedVoice && !containsKorean) {
    // Default English voice
    selectedVoice = voices.find((v) => v.lang.startsWith("en"));
  }

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  if (options.onEnd) {
    utterance.onend = options.onEnd;
  }
  if (options.onError) {
    utterance.onerror = options.onError;
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

// Check if browser Speech Recognition is supported
export function getSpeechRecognition(): any {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
}
