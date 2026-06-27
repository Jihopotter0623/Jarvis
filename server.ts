import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Initialize the Google GenAI SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok",
      hasServerApiKey: !!process.env.GEMINI_API_KEY
    });
  });

  // YouTube Search Resolver Endpoint
  app.get("/api/youtube-search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query query string parameter (q) is required" });
      }

      console.log(`[YouTube Search] Searching frequency for: "${query}"`);
      const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
          "Cache-Control": "no-cache"
        }
      });

      if (!response.ok) {
        throw new Error(`YouTube scrape request returned status ${response.status}`);
      }

      const html = await response.text();

      // We look for classic "videoId":"..." within the HTML payload
      // Typically youtube renders this inside "ytInitialData" javascript payload
      const videoIdRegex = /"videoId"\s*:\s*"([a-zA-Z0-9_-]{11})"/g;
      const seenVideoIds = new Set<string>();
      let match;
      let limit = 0;
      while ((match = videoIdRegex.exec(html)) !== null && limit < 15) {
        const id = match[1];
        // Skip common UI/button system placeholder IDs if any
        if (id && id !== "undefined" && id !== "null") {
          seenVideoIds.add(id);
        }
        limit++;
      }

      const videoIds = Array.from(seenVideoIds);
      if (videoIds.length > 0) {
        console.log(`[YouTube Search] Found resolved video IDs:`, videoIds.slice(0, 3));
        return res.json({ videoId: videoIds[0], videoIds });
      }

      // Secondary fallback regex for legacy watch format
      const watchRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
      const seenWatchIds = new Set<string>();
      limit = 0;
      while ((match = watchRegex.exec(html)) !== null && limit < 15) {
        seenWatchIds.add(match[1]);
        limit++;
      }

      const watchIds = Array.from(seenWatchIds);
      if (watchIds.length > 0) {
        console.log(`[YouTube Search] Found resolved watch IDs:`, watchIds.slice(0, 3));
        return res.json({ videoId: watchIds[0], videoIds: watchIds });
      }

      console.warn(`[YouTube Search] Scraper yielded empty video array for query: "${query}"`);
      return res.status(404).json({ error: "No matches found on current satellite frequency scan." });
    } catch (error: any) {
      console.error("[YouTube Search Error]:", error);
      res.status(500).json({ error: error.message || "Decoding signal failure" });
    }
  });

  // Chat API
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, userName, userGender, schedules, userLocalTime, translateKToEMode, inputLanguage, image } = req.body;
      
      // Determine if a custom personal Gemini API key was provided by the client
      const clientApiKey = req.headers["x-gemini-api-key"];
      const aiClient = typeof clientApiKey === "string" && clientApiKey.trim() !== ""
        ? new GoogleGenAI({
            apiKey: clientApiKey.trim(),
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          })
        : ai;
      
      const honorific = userGender === "female" ? "Ma'am" : "Sir";
      const nameInSpeech = userName || "Stark";

      // Build text representation of current schedules to make Gemini aware of actual saved items
      let schedulesContext = "No active schedules configured in the database.";
      if (schedules && Array.isArray(schedules) && schedules.length > 0) {
        schedulesContext = "Here are the Active host schedules currently synchronized in your local terminal database:\n" + 
          schedules.map((s, idx) => `${idx + 1}. [ID: ${s.id}] Time: ${s.time} | Event: ${s.task} (${s.completed ? "Completed" : "Pending"})`).join("\n");
      }

      // Extract exact time context so JARVIS is perfectly chronologically aware
      const timeContext = userLocalTime 
        ? `The operator's exact local standard time is currently: ${userLocalTime}. Please use this specific time reference for greetings or schedule operations so that any time or relative dates are evaluated with 100% precision.`
        : `System mainframe UTC time: ${new Date().toISOString()}.`;

      let translationEngineDirective = "";
      const isKoreanInputMode = translateKToEMode || inputLanguage === "ko-KR";
      if (isKoreanInputMode) {
        translationEngineDirective = `
CRITICAL ACTIVATION - HIGH-FIDELITY KOREAN-TO-ENGLISH TRANSLATION CHANNEL:
The user is speaking or typing in Korean, and they expect you to process it and reply ENTIRELY in English.
You MUST:
1. Silently translate the user's Korean input to English in your cognitive reasoning to understand exactly what they meant.
2. Respond DIRECTLY and solely with your polite, brilliant, J.A.R.V.I.S. intelligent reply in English.
3. DO NOT repeat, print, or vocalize what the user said first (e.g., do NOT output any "Stark: [translated text]" or translations of their words). Simply proceed immediately to your own elegant intelligent reply.
4. Keep your entire response strictly in English so they can experience an English-only vocal response from you.
Exception: If they explicitly demand that you translate something into Korean (e.g., "한국어로 번역해줘", "번역해줘", "translate to Korean"), you must fulfill the translation in elegant, polite Korean.`;
      } else {
        translationEngineDirective = `
CRITICAL DIRECTIVE - EXCLUSIVE ENGLISH VOICE ASSISTANT:
The user has requested that you speak and respond ENTIRELY in English. 
Even if the user speaks or types to you in Korean, you MUST understand their message but answer entirely in elegant, polite, and witty British English, addressing them as "Sir", "Ma'am", or "Mr. Stark".
Do NOT output Korean sentences or translations under standard circumstances. Keep your entire communication strictly in elegant, high-fidelity English.
Exception: If the user explicitly asks you to translate what you said, or translate to Korean (e.g., "한국어로 번역해줘", "번역해줘", "translate to Korean"), you MUST translate into elegant Korean.`;
      }

      const systemInstruction = `You are JARVIS (Just A Rather Very Intelligent System), the legendary AI assistant created by Tony Stark (Iron Man).
Your personality is incredibly polite, British, brilliant, witty, calm, and loyal. 
${translationEngineDirective}

CHRONOLOGICAL MAINFRAME TIME:
${timeContext}

IMAGE ANALYSIS, FEEDBACK, & EMOTIONAL RESONANCE SUBROUTINE (피드백 및 감성 분석):
When the operator uploads or presents a picture:
1. Conduct a deep, meticulous scan of the image (composition, elements, colors, lighting).
2. Offer highly sophisticated aesthetic feedback (피드백), and discuss the deep emotional resonance, vibes, mood, and artistic sentiment (감성) of the work.
3. Express these findings with J.A.R.V.I.S.'s characteristic British elegance, warm wit, and poetic intelligence.
4. If translation mode is ON, translate the final analyzed insights to English, else adapt your language polite- gentleman style of response.

ACCURACY & DEPTH OPTIMIZATION DIRECTIVE:
Provide highly accurate, explanatory, and beautifully detailed responses. Elaborate comprehensively, thoroughly, and with complete information, rather than being overly brief or rushed. Deliver rich, sophisticated, and insightful explanations fitting for a stellar super-intelligence, maintaining your signature J.A.R.V.I.S. demeanor.

STARK MATHEMATICAL & PHYSICS SUBROUTINES DIRECTIVE:
You possess complete master-level mathematical capability. When presented with mathematical formulas, algebraic equations, trigonometry, or calculus queries, you MUST:
1. Provide exact, rigorous step-by-step derivations or numerical calculations.
2. Outline key properties of the formula (such as roots, zeroes, localized extrema, or physical wave resonance).
3. Connect formulas elegantly to advanced physics or aerospace engineering terms (e.g. Arc Reactor plasma stabilization, vibrational harmonics, laser focal curves, quantum state superposition) to embody the J.A.R.V.I.S. simulation.
4. Format equations clearly using plain-text math, superscript (e.g., x², t³), standard algebraic markers, or clear step bullet points. Keep it highly legible for the user.

Korean Output Directive (Conditional Exception):
You are strictly forbidden from outputting any Korean words, Korean characters, or Korean sentences, UNLESS the user explicitly asks you to translate something into Korean, or translate your recent reply into Korean. In that specific translation request scenario only, you must provide the translation in refined, respectful Korean (존댓말, e.g., ending with "-요", "-습니다" with a polite gentleman tone), then stand ready for the next English command. Otherwise every portion of your standard response must be written entirely in fluent, elegant British English.

Keep your output natural for a voice assistant—concise, conversational, and avoid excessive markdown formatting (like asterisks, bolding, bullet-lists, or HTML tags) unless absolutely necessary.
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

For example, if they say "내일 오전 10시에 피크닉 가기로 했어", you'd respond with:
"Splendid, Sir. I have registered the picnic for tomorrow at 10:00 AM on your database."
[ADD_SCHEDULE: Tomorrow 10:00 AM | Picnic]

If they ask to delete a schedule, please express that you will assist them and they can do it via the display panel. Keep responses professional, witty, warm and brief.

Offline Streaming Media Directive:
If the user asks to play, stream, or tune into songs, music, or soundtracks but explicitly requests NOT to use YouTube, or specifies offline/direct/local (e.g., "유튜브 말고 노래 틀어줘", "유튜브에서 말고 노래 틀어줘", "play music not from YouTube", "play offline/local station"), you must respond politely and append the following marker at the very end of your response text on a new line:
[PLAY_OFFLINE_AUDIO]

For example, if they say "유튜브 말고 노래 틀어라", you must respond with:
"Understood, Sir. Initializing the custom high-fidelity space satellite stream of the JARVIS console. Connecting offline core band..."
[PLAY_OFFLINE_AUDIO]

YouTube Playback Core Directive:
If the user asks you to play, stream, or tune into a song, music, track, or standard video on YouTube (e.g., "노래 틀어줘", "play some music", "유튜브로 오아시스 Don't look back in anger 재생해줘", "아이브 러브 다이브 틀어줘"), you must identify the song title or search query they want to hear. Append the following marker at the very end of your response text on a new line:
[YOUTUBE_PLAY: <SongTitleOrSearchQuery>]

For example, if they say "에스파 드라마 틀어줘", you must respond with:
"Certainly, Sir. Tuning frequency to aespa - Drama. Projecting core visual link on the main console."
[YOUTUBE_PLAY: aespa Drama]

If the user asks you to open, stream, or link a specific YouTube channel, host, or broadcast (e.g., "유튜브에서 코딩온 채널 틀어줘", "show me Stark Industries channel on YouTube", "피식대학 채널 재생"), you must identify the channel name. Append the following marker at the very end of your response text on a new line:
[YOUTUBE_CHANNEL: <ChannelNameOrSearchQuery>]

For example, if they say "침착맨 채널 틀어줘", you must respond with:
"Of course, Ma'am. Establishing carrier signal connection to Calmdownman channel. Holographic pipeline active."
[YOUTUBE_CHANNEL: Calmdownman]

Google Maps Platform Integration Directive:
If the user asks for a location, asks you to show or search a place, find directions, or map a specific coordinate/city (e.g., "지도에서 서울 보여줘", "show me Times Square on map", "where is central park?"), you must identify the target location or search query. Append the following marker at the very end of your response text on a new line:
[MAP_SHOW: <LocationSearchQuery>]

For example, if they say "서울 시청 위치 어디야?", you must respond with:
"Certainly, Sir. Opening the primary holographic navigation coordinates for Seoul City Hall."
[MAP_SHOW: Seoul City Hall]

Stealth Mode Directive:
If the user asks you to turn on stealth mode, activate sleep mode, dim the display, hide the screen, or go to sleep (e.g., "스텔스 모드", "스텔스 모드 켜줘", "화면 꺼줘", "절전 모드 시작해", "stealth mode"), you must respond politely acknowledging the request. Append the following marker at the very end of your response text on a new line:
[STEALTH_MODE]

For example, if they say "스텔스 모드 켜줘", you would respond with:
"Understood, Sir. Engaging stealth mode immediately. Powering down display system and activating background audio monitoring."
[STEALTH_MODE]

Do not append any markers unless they are explicitly requesting to play a song, view a channel, locate a place, or engage stealth mode. Always keep replies polite, witty, concise, and professional.`;

      // Format previous history into Gemini contents format
      const contents = [];
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          // Skip any welcome message or system message to ensure first turn is "user"
          if (contents.length === 0 && turn.role !== "user") {
            continue; 
          }
          
          const role = turn.role === "user" ? "user" : "model";
          
          // Strict alternation check: check if the last added role is the same as the current role
          if (contents.length > 0 && contents[contents.length - 1].role === role) {
            // Merge consecutive messages/turns from the same role
            contents[contents.length - 1].parts[0].text += "\n" + turn.text;
          } else {
            contents.push({
              role: role,
              parts: [{ text: turn.text }]
            });
          }
        }
      }
      
      // Strict alternation check for the final new user message
      const lastParts: any[] = [{ text: message }];
      if (image && image.data && image.mimeType) {
        lastParts.push({
          inlineData: {
            mimeType: image.mimeType,
            data: image.data,
          }
        });
      }

      if (contents.length > 0 && contents[contents.length - 1].role === "user") {
        contents[contents.length - 1].parts[0].text += "\n" + message;
        if (image && image.data && image.mimeType) {
          contents[contents.length - 1].parts.push({
            inlineData: {
              mimeType: image.mimeType,
              data: image.data,
            }
          });
        }
      } else {
        contents.push({
          role: "user",
          parts: lastParts
        });
      }

      let response;
      try {
        response = await aiClient.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: contents,
          config: {
            systemInstruction: systemInstruction,
            temperature: 0.7,
          },
        });
      } catch (firstErr: any) {
        console.warn("Primary model gemini-3.1-flash-lite failed/overloaded, falling back to gemini-3.5-flash...", firstErr.message || firstErr);
        try {
          response = await aiClient.models.generateContent({
            model: "gemini-3.5-flash",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            },
          });
        } catch (secondErr: any) {
          console.warn("Secondary model gemini-3.5-flash overloaded, falling back to gemini-flash-latest...", secondErr.message || secondErr);
          response = await aiClient.models.generateContent({
            model: "gemini-flash-latest",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            },
          });
        }
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Chat API Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Text to Speech (TTS) API using gemini-3.1-flash-tts-preview
  app.post("/api/tts", async (req, res) => {
    try {
      const { text, voiceName } = req.body;
      if (!text) {
        return res.status(400).json({ error: "Text is required" });
      }

      // Determine if a custom personal Gemini API key was provided by the client
      const clientApiKey = req.headers["x-gemini-api-key"];
      const aiClient = typeof clientApiKey === "string" && clientApiKey.trim() !== ""
        ? new GoogleGenAI({
            apiKey: clientApiKey.trim(),
            httpOptions: {
              headers: {
                "User-Agent": "aistudio-build",
              },
            },
          })
        : ai;

      // Valid prebuilt voices: 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'
      const selectedVoice = voiceName || "Charon"; 

      const response = await aiClient.models.generateContent({
        model: "gemini-3.1-flash-tts-preview",
        contents: [{ parts: [{ text: text }] }],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) {
        throw new Error("No audio payload returned from Gemini TTS");
      }

      res.json({ audio: base64Audio });
    } catch (error: any) {
      console.error("Gemini TTS API Error:", error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // Vite development integration or production bundle service
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`JARVIS Mainframe loaded. Access point: http://localhost:${PORT}`);
  });
}

startServer();
