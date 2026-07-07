/**
 * JARVIS Audio Utility
 * Manages Speech Recognition, Speech Synthesis, and Gemini PCM audio decoding and playback.
 */

// Decode 16-bit PCM little-endian audio returned by Gemini and play it via Web Audio API
export function playRawPCM(
  base64Data: string, 
  sampleRate = 24000,
  useJarvisFilter = true
): Promise<{ audioCtx: AudioContext; source: AudioBufferSourceNode }> {
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
      
      if (useJarvisFilter) {
        // 1. Cinematic high-pass filter to simulate a high-tech armor transmitter (cuts mud, adds crisp radio feel)
        const highpass = audioCtx.createBiquadFilter();
        highpass.type = "highpass";
        highpass.frequency.value = 160; // Clean, lightweight helmet radio frequency

        // 2. High-frequency digital presence sheen filter for advanced HUD system clarity
        const presenceFilter = audioCtx.createBiquadFilter();
        presenceFilter.type = "peaking";
        presenceFilter.frequency.value = 3400; // Boost high-mid clarity (presence band)
        presenceFilter.Q.value = 1.5;
        presenceFilter.gain.value = 4.5; // Clear, high-end high-fidelity detail

        // 3. Cybernetic peaking filter to simulate the metallic suit/helmet intercom resonance
        const peakFilter = audioCtx.createBiquadFilter();
        peakFilter.type = "peaking";
        peakFilter.frequency.value = 1800; // Perfect radio intercom metallic resonance frequency
        peakFilter.Q.value = 4.0; // Sharp resonance peaks for micro-metallics
        peakFilter.gain.value = 5.0; // Rich +5dB metallic bite

        // 4. Precision Feedback Comb Filter (Creates the iconic hollow metal-helmet ringing effect from the MCU movies)
        const delayNode = audioCtx.createDelay();
        delayNode.delayTime.value = 0.015; // 15 milliseconds - absolute sweet spot for hollow suit reflection
        
        const feedbackNode = audioCtx.createGain();
        feedbackNode.gain.value = 0.32; // Metallic feedback ringing tail

        const delayGain = audioCtx.createGain();
        delayGain.gain.value = 0.30; // Elegant cinematic mix of cybernetic echo

        // Connect feedback comb loop
        delayNode.connect(feedbackNode);
        feedbackNode.connect(delayNode);

        // Connect main dry path to final audio out for crisp, clean intelligible speech
        source.connect(audioCtx.destination);

        // Connect wet processed metallic reflection path
        source.connect(highpass);
        highpass.connect(presenceFilter);
        presenceFilter.connect(peakFilter);
        peakFilter.connect(delayNode);
        delayNode.connect(delayGain);
        delayGain.connect(audioCtx.destination);
      } else {
        source.connect(audioCtx.destination);
      }
      
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

// Romanize Korean text so English voices can speak it in an English-accented J.A.R.V.I.S. voice!
export function romanizeText(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    if (charCode >= 0xAC00 && charCode <= 0xD7A3) {
      const syllableIndex = charCode - 0xAC00;
      const initial = Math.floor(syllableIndex / 588);
      const medial = Math.floor((syllableIndex % 588) / 28);
      const finalConsonant = syllableIndex % 28;

      const initials = ["g", "kk", "n", "d", "tt", "r", "m", "b", "pp", "s", "ss", "", "j", "jj", "ch", "k", "t", "p", "h"];
      const medials = ["a", "ae", "ya", "yae", "eo", "e", "yeo", "ye", "o", "wa", "wae", "oe", "yo", "u", "wo", "we", "wi", "yu", "eu", "ui", "i"];
      const finals = ["", "g", "g", "g", "n", "n", "n", "d", "l", "l", "m", "l", "l", "l", "l", "l", "m", "b", "b", "t", "t", "ng", "t", "t", "k", "t", "p", "t"];

      const sep = (i < text.length - 1 && text.charCodeAt(i + 1) >= 0xAC00 && text.charCodeAt(i + 1) <= 0xD7A3) ? "-" : "";
      
      const initialStr = initials[initial];
      const medialStr = medials[medial];
      const finalStr = finals[finalConsonant];

      let smoothMedial = medialStr;
      if (smoothMedial === "eu") smoothMedial = "u";
      if (smoothMedial === "eo") smoothMedial = "uh";
      if (smoothMedial === "ae") smoothMedial = "ay";
      if (smoothMedial === "yeo") smoothMedial = "yo";
      
      result += initialStr + smoothMedial + finalStr + sep;
    } else {
      result += text.charAt(i);
    }
  }
  return result
    .replace(/-+/g, "-")
    .replace(/-\s+/g, " ")
    .replace(/\s+-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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
    lang?: string;
    emotion?: string;
  } = {}
): SpeechSynthesisUtterance | null {
  if (!("speechSynthesis" in window)) {
    console.error("Speech Synthesis is not supported in this browser");
    if (options.onError) options.onError(new Error("Not supported"));
    return null;
  }

  // Cancel any running speech
  window.speechSynthesis.cancel();

  // Dynamically check if we are speaking Korean
  const containsKorean = options.lang === "ko-KR" || /[\uac00-\ud7af\u1100-\u11ff\u3130-\u318f\uffa0-\uffdf]/.test(text);

  let textToSpeak = text;

  // Attempt to select a suitable voice
  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = null;
  let isManuallySelected = false;

  // 1. First priority: Check if a specific voice has been manually requested/selected.
  // We respect the user's manual choice directly!
  if (options.voiceName) {
    const candidateVoice = voices.find((v) => v.name === options.voiceName);
    if (candidateVoice) {
      selectedVoice = candidateVoice;
      isManuallySelected = true;
    }
  }

  // 2. Second priority: If no manual voice was selected or it wasn't found in current browser context,
  // we do intelligent language auto-detection and fallbacks.
  if (!selectedVoice) {
    if (!containsKorean) {
      // Lock strictly to English UK Male voice
      const gbVoices = voices.filter(v => {
        const langLower = v.lang.toLowerCase().replace('_', '-');
        return langLower.startsWith('en-gb') || langLower.startsWith('en-uk');
      });
      
      // 1. Look for explicit "male" inside en-GB voices
      selectedVoice = gbVoices.find(v => v.name.toLowerCase().includes("male"));
      
      // 2. Look for known UK male names
      if (!selectedVoice) {
        const ukMaleNames = ["george", "daniel", "arthur", "oliver", "thomas", "ryan", "harry"];
        for (const name of ukMaleNames) {
          selectedVoice = gbVoices.find(v => v.name.toLowerCase().includes(name));
          if (selectedVoice) break;
        }
      }
      
      // 3. Look for "uk" or "united kingdom" or "great britain" and "male" in any English voice
      if (!selectedVoice) {
        const allEnVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
        selectedVoice = allEnVoices.find(v => {
          const nameLower = v.name.toLowerCase();
          return (nameLower.includes("uk") || nameLower.includes("united kingdom") || nameLower.includes("great britain") || nameLower.includes("gb")) && nameLower.includes("male");
        });
      }


      // 4. Look for ANY English Male voice (including en-US, en-AU, etc.) with explicit "male" keyword or known male names
      if (!selectedVoice) {
        const allEnVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
        selectedVoice = allEnVoices.find(v => {
          const nameLower = v.name.toLowerCase();
          return nameLower.includes("male") || 
                 nameLower.includes("daniel") || 
                 nameLower.includes("george") || 
                 nameLower.includes("oliver") || 
                 nameLower.includes("david") || 
                 nameLower.includes("alex") || 
                 nameLower.includes("fred") || 
                 nameLower.includes("tom") || 
                 nameLower.includes("james");
        });
      }

      // 5. Any en-GB voice that is NOT obviously female
      if (!selectedVoice && gbVoices.length > 0) {
        selectedVoice = gbVoices.find(v => {
          const nameLower = v.name.toLowerCase();
          const femaleNames = ["female", "hazel", "susan", "zira", "stephanie", "serena", "kate", "fiona", "moira", "veena", "tessa", "samantha", "karen", "victoria", "heather", "siri"];
          return !femaleNames.some(femaleName => nameLower.includes(femaleName));
        });
        if (!selectedVoice) {
          selectedVoice = gbVoices[0];
        }
      }

      // 6. Any general English voice that is NOT obviously female
      if (!selectedVoice) {
        const allEnVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
        selectedVoice = allEnVoices.find(v => {
          const nameLower = v.name.toLowerCase();
          const femaleNames = ["female", "hazel", "susan", "zira", "stephanie", "serena", "kate", "fiona", "moira", "veena", "tessa", "samantha", "karen", "victoria", "heather", "siri"];
          return !femaleNames.some(femaleName => nameLower.includes(femaleName));
        });
      }

      // 7. Last resort: Any English voice
      if (!selectedVoice) {
        selectedVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
      }
    } else {
      const koreanVoices = voices.filter((v) => v.lang.toLowerCase().startsWith("ko"));
      
      // 1. Prioritize Injun voice specifically (excluding any female match just in case)
      selectedVoice = koreanVoices.find((v) => {
        const nameLower = v.name.toLowerCase();
        const uriLower = (v.voiceURI || "").toLowerCase();
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

      // 2. Try to find other male voices with extensive matching
      if (!selectedVoice) {
        selectedVoice = koreanVoices.find((v) => {
          const nameLower = v.name.toLowerCase();
          const uriLower = (v.voiceURI || "").toLowerCase();
          
          // Reject obvious female voices
          const femaleKeywords = [
            "female", "여성", "heami", "혜미", "yumi", "유미", "yuna", "유나", 
            "seoyeon", "서연", "suna", "선아", "suri", "수리", "yuri", "유리", 
            "sujin", "수진", "hyeryun", "혜련", "subin", "수빈", "sunhee", 
            "sun-hee", "선희", "jimin", "ji-min", "지민", "bora", "보라", "hana", "하나"
          ];
          if (femaleKeywords.some(kw => nameLower.includes(kw) || uriLower.includes(kw))) {
            return false;
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
            (nameLower.includes("han") && !nameLower.includes("hangul") && !nameLower.includes("hangeul") && !nameLower.includes("hannah")) ||
            (nameLower.includes("한") && !nameLower.includes("한국어") && !nameLower.includes("대한민국")) ||
            nameLower.includes("ism-local") ||
            nameLower.includes("ism-network") ||
            nameLower.includes("kdf-local") ||
            nameLower.includes("kdf-network") ||
            (nameLower.includes("siri") && (
              nameLower.includes("남자") || 
              nameLower.includes("male") || 
              nameLower.includes("2") || 
              nameLower.includes("3") || 
              nameLower.includes("4")
            ))
          );
        });
      }

      // 3. If no male-specific matching voice, select a voice excluding obvious female names
      if (!selectedVoice) {
        selectedVoice = koreanVoices.find((v) => {
          const nameLower = v.name.toLowerCase();
          const uriLower = (v.voiceURI || "").toLowerCase();
          const femaleKeywords = [
            "female", "여성", "heami", "혜미", "yumi", "유미", "yuna", "유나", 
            "seoyeon", "서연", "suna", "선아", "suri", "수리", "yuri", "유리", 
            "sujin", "수진", "hyeryun", "혜련", "subin", "수빈", "sunhee", 
            "sun-hee", "선희", "jimin", "ji-min", "지민", "bora", "보라", "hana", "하나"
          ];
          return !femaleKeywords.some(kw => nameLower.includes(kw) || uriLower.includes(kw));
        });
      }

      // 4. Fallback to the first available Korean voice
      if (!selectedVoice) {
        selectedVoice = koreanVoices[0];
      }
    }
  }

  // If the chosen voice is non-Korean (e.g., English), but the input contains Korean, we Romanize the text to let the English voice speak it!
  const isSelectedVoiceKorean = selectedVoice ? selectedVoice.lang.toLowerCase().startsWith("ko") : containsKorean;
  if (containsKorean && !isSelectedVoiceKorean) {
    textToSpeak = romanizeText(textToSpeak);
  }

  const utterance = new SpeechSynthesisUtterance(textToSpeak);
  utterance.lang = containsKorean && isSelectedVoiceKorean ? "ko-KR" : (selectedVoice ? selectedVoice.lang : "en-GB");

  if (selectedVoice) {
    utterance.voice = selectedVoice;
    utterance.lang = selectedVoice.lang;
  }

  // Determine if the active voice is male to apply appropriate deep pitch adjustments
  const activeVoiceName = selectedVoice ? selectedVoice.name.toLowerCase() : "";
  const isMaleVoice = 
    activeVoiceName.includes("male") ||
    activeVoiceName.includes("남성") ||
    activeVoiceName.includes("minsu") ||
    activeVoiceName.includes("민수") ||
    activeVoiceName.includes("junwoo") ||
    activeVoiceName.includes("준우") ||
    activeVoiceName.includes("chinho") ||
    activeVoiceName.includes("진호") ||
    activeVoiceName.includes("injun") ||
    activeVoiceName.includes("인준") ||
    activeVoiceName.includes("gildong") ||
    activeVoiceName.includes("길동") ||
    activeVoiceName.includes("himchan") ||
    activeVoiceName.includes("힘찬") ||
    activeVoiceName.includes("tae-hoon") ||
    activeVoiceName.includes("taehoon") ||
    activeVoiceName.includes("min-ho") ||
    activeVoiceName.includes("minho") ||
    activeVoiceName.includes("chul-soo") ||
    activeVoiceName.includes("chulsoo") ||
    activeVoiceName.includes("철수") ||
    (activeVoiceName.includes("han") && !activeVoiceName.includes("hangul") && !activeVoiceName.includes("hangeul") && !activeVoiceName.includes("hannah")) ||
    (activeVoiceName.includes("한") && !activeVoiceName.includes("한국어") && !activeVoiceName.includes("대한민국")) ||
    activeVoiceName.includes("ism-local") ||
    activeVoiceName.includes("ism-network") ||
    activeVoiceName.includes("kdf-local") ||
    activeVoiceName.includes("kdf-network") ||
    activeVoiceName.includes("george") ||
    activeVoiceName.includes("david") ||
    activeVoiceName.includes("puck") ||
    activeVoiceName.includes("charon") ||
    activeVoiceName.includes("daniel") ||
    (activeVoiceName.includes("siri") && (
      activeVoiceName.includes("남자") || 
      activeVoiceName.includes("male") || 
      activeVoiceName.includes("2") || 
      activeVoiceName.includes("3") || 
      activeVoiceName.includes("4")
    ));

  if (isManuallySelected) {
    // For manually chosen voices, respect the exact slider pitch and rate directly!
    utterance.pitch = options.pitch ?? 1.0;
    utterance.rate = options.rate ?? 1.0;

    // For Korean, if a female voice is selected, force a deep baritone simulation if pitch is set to a default/high value (> 0.7)
    if (containsKorean && !isMaleVoice && utterance.pitch > 0.7) {
      utterance.pitch = 0.40; // Force deep baritone simulation
      utterance.rate = Math.min(utterance.rate, 0.90);
    }
  } else {
    // Apply automatic J.A.R.V.I.S. voice tuning/simulation only for auto-detected fallbacks
    if (containsKorean) {
      if (isMaleVoice) {
        utterance.pitch = options.pitch ?? 0.85; // Dignified, polite Korean male baritone
        utterance.rate = options.rate ?? 0.94;
      } else {
        // If the auto-detected fallback voice is female, we shift the pitch down to simulate a deep male baritone
        const basePitch = options.pitch ?? 0.85;
        if (basePitch <= 0.5) {
          utterance.pitch = Math.max(0.3, basePitch);
        } else {
          utterance.pitch = Math.max(0.35, Math.min(0.60, basePitch - 0.35)); 
        }
        utterance.rate = options.rate ?? 0.88; // Slower pace for deeper resonance
      }
    } else {
      if (isMaleVoice) {
        const basePitch = options.pitch ?? 0.88;
        utterance.pitch = basePitch;
        utterance.rate = options.rate ?? 0.95; // Elegant J.A.R.V.I.S. cadence
      } else {
        utterance.pitch = 1.0; // Natural pitch for standard non-male fallback
        utterance.rate = options.rate ?? 0.98;
      }
    }
  }

  // Apply emotional voice modifications if an emotion is set!
  if (options.emotion && options.emotion !== "calm") {
    switch (options.emotion) {
      case "happy":
        utterance.pitch = Math.min(2.0, utterance.pitch * 1.12);
        utterance.rate = Math.min(2.0, utterance.rate * 1.06);
        break;
      case "proud":
        utterance.pitch = Math.max(0.1, utterance.pitch * 0.94);
        utterance.rate = Math.max(0.1, utterance.rate * 0.92);
        break;
      case "concerned":
        utterance.pitch = Math.max(0.1, utterance.pitch * 0.91);
        utterance.rate = Math.max(0.1, utterance.rate * 0.83);
        break;
      case "excited":
        utterance.pitch = Math.min(2.0, utterance.pitch * 1.18);
        utterance.rate = Math.min(2.0, utterance.rate * 1.15);
        break;
      case "sarcastic":
        utterance.pitch = Math.max(0.1, utterance.pitch * 0.94);
        utterance.rate = Math.max(0.1, utterance.rate * 0.96);
        break;
      case "curious":
        utterance.pitch = Math.min(2.0, utterance.pitch * 1.06);
        utterance.rate = Math.min(2.0, utterance.rate * 1.00);
        break;
    }
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

// Generate cinematic high-tech radio transceiver beep/squelch effect
export function playRadioChirp(isStart: boolean): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    
    if (isStart) {
      // 1. Double pitch-sweep for a futuristic electronic hand-shake chime
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(550, ctx.currentTime);
      osc1.frequency.exponentialRampToValueAtTime(1450, ctx.currentTime + 0.08);
      
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(800, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(1900, ctx.currentTime + 0.08);
      
      gainNode.gain.setValueAtTime(0.0, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.04, ctx.currentTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.1);
      
      // 2. High-passed short static radio burst
      const bufferSize = ctx.sampleRate * 0.05; // 50ms of static
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(2500, ctx.currentTime);
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.015, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      
      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noiseSource.start();
      noiseSource.stop(ctx.currentTime + 0.05);
    } else {
      // End Transceiver Squelch: High-passed white-noise discharge + downward pitch sweep
      const bufferSize = ctx.sampleRate * 0.12; // 120ms of static
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = "highpass";
      filter.frequency.setValueAtTime(1800, ctx.currentTime);
      
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.02, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      
      noiseSource.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      
      noiseSource.start();
      noiseSource.stop(ctx.currentTime + 0.12);
      
      // Downward pitch-sweep click
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(220, ctx.currentTime + 0.08);
      
      oscGain.gain.setValueAtTime(0.025, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.08);
      
      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.09);
    }
  } catch (e) {
    console.error("Radio transceiver sound failed:", e);
  }
}

// Generate high-tech J.A.R.V.I.S. boot-up beep sequence
export function playBootSound(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    
    const playBeep = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0.08, startTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    playBeep(880, ctx.currentTime, 0.12);
    playBeep(1200, ctx.currentTime + 0.14, 0.12);
    playBeep(1600, ctx.currentTime + 0.28, 0.25);
  } catch (e) {
    console.error("Boot sound generation failed:", e);
  }
}

// Autocorrelation-based pitch detector for speech frequency tracking
export function detectPitch(buffer: Uint8Array, sampleRate: number): number {
  const SIZE = buffer.length;
  let sumOfSquares = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = (buffer[i] - 128) / 128;
    sumOfSquares += val * val;
  }
  if (sumOfSquares < 0.01) return -1; // too quiet

  const r = new Float32Array(SIZE);
  for (let lag = 0; lag < SIZE; lag++) {
    let sum = 0;
    for (let i = 0; i < SIZE - lag; i++) {
      const val1 = (buffer[i] - 128) / 128;
      const val2 = (buffer[i + lag] - 128) / 128;
      sum += val1 * val2;
    }
    r[lag] = sum;
  }

  // Find the first dip (local minimum) to avoid matching the central peak
  let dipIndex = 0;
  for (let i = 0; i < SIZE - 1; i++) {
    if (r[i] < r[i + 1]) {
      dipIndex = i;
      break;
    }
  }

  // If no clear dip was found, search after the lag of 10 samples
  const startIndex = dipIndex > 0 ? dipIndex : 10;
  
  // Find the peak of autocorrelation after the dip
  let maxVal = -1;
  let maxIndex = -1;
  for (let i = startIndex; i < SIZE; i++) {
    if (r[i] > maxVal) {
      maxVal = r[i];
      maxIndex = i;
    }
  }

  if (maxIndex > 0 && maxVal > 0.15) {
    const pitch = sampleRate / maxIndex;
    // Human voice speaking frequency ranges from 60Hz to 800Hz typically
    if (pitch >= 65 && pitch <= 700) {
      return pitch;
    }
  }
  return -1;
}

// Calculate the spectral centroid (voice brightness/timbre signature)
export function getSpectralCentroid(freqData: Uint8Array, sampleRate: number): number {
  const numBins = freqData.length;
  const binWidth = (sampleRate / 2) / numBins;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < numBins; i++) {
    const freq = i * binWidth;
    const amplitude = freqData[i];
    numerator += freq * amplitude;
    denominator += amplitude;
  }
  return denominator > 0 ? numerator / denominator : 0;
}

// Structure for voice feature profiles
export interface VoiceProfile {
  avgPitch: number;
  avgCentroid: number;
  enrolled: boolean;
  sampleCount: number;
}

// Function to run real-time analyzer on a media stream for a given duration
export async function analyzeVoiceStream(
  stream: MediaStream,
  durationMs: number,
  onProgress?: (data: { currentPitch: number; currentCentroid: number; progress: number }) => void
): Promise<VoiceProfile> {
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  const ctx = new AudioContextClass();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  
  analyser.fftSize = 2048;
  source.connect(analyser);

  const sampleRate = ctx.sampleRate;
  const timeBuffer = new Uint8Array(analyser.fftSize);
  const freqBuffer = new Uint8Array(analyser.frequencyBinCount);

  const pitches: number[] = [];
  const centroids: number[] = [];

  const startTime = Date.now();
  const checkInterval = 100; // ms between analysis frames

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed >= durationMs) {
        clearInterval(interval);
        
        // Clean up audio nodes
        try {
          source.disconnect();
          analyser.disconnect();
          ctx.close();
        } catch (e) {
          console.error("Error during analyser cleanup:", e);
        }

        // Calculate averages
        const validPitches = pitches.filter(p => p > 0);
        const validCentroids = centroids.filter(c => c > 0);

        const avgPitch = validPitches.length > 0
          ? validPitches.reduce((sum, p) => sum + p, 0) / validPitches.length
          : 150; // default backup frequency

        const avgCentroid = validCentroids.length > 0
          ? validCentroids.reduce((sum, c) => sum + c, 0) / validCentroids.length
          : 1200; // default backup timbre

        resolve({
          avgPitch: Math.round(avgPitch * 10) / 10,
          avgCentroid: Math.round(avgCentroid * 10) / 10,
          enrolled: true,
          sampleCount: validPitches.length
        });
        return;
      }

      analyser.getByteTimeDomainData(timeBuffer);
      analyser.getByteFrequencyData(freqBuffer);

      const currentPitch = detectPitch(timeBuffer, sampleRate);
      const currentCentroid = getSpectralCentroid(freqBuffer, sampleRate);

      if (currentPitch > 0) {
        pitches.push(currentPitch);
      }
      if (currentCentroid > 100) {
        centroids.push(currentCentroid);
      }

      if (onProgress) {
        onProgress({
          currentPitch,
          currentCentroid,
          progress: Math.min(100, Math.round((elapsed / durationMs) * 100))
        });
      }
    }, checkInterval);
  });
}

// Function to calculate similarity percentage between current and enrolled profiles
export function calculateVoiceSimilarity(
  current: { pitch: number; centroid: number },
  enrolled: VoiceProfile
): number {
  if (!enrolled.enrolled) return 0;

  // Let's compare pitch (fundamental frequency) - weight is 55%
  const pitchDiffPct = Math.abs(current.pitch - enrolled.avgPitch) / enrolled.avgPitch;
  // A difference of 25% or more gets 0 score on pitch
  const pitchScore = Math.max(0, 1 - (pitchDiffPct / 0.25)) * 100;

  // Let's compare spectral centroid (timbre brightness) - weight is 45%
  const centroidDiffPct = Math.abs(current.centroid - enrolled.avgCentroid) / enrolled.avgCentroid;
  // A difference of 35% or more gets 0 score on timbre
  const centroidScore = Math.max(0, 1 - (centroidDiffPct / 0.35)) * 100;

  const totalScore = (pitchScore * 0.55) + (centroidScore * 0.45);
  return Math.round(totalScore);
}
