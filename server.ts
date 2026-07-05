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

  // Image Search Resolver Endpoint (Dual Unsplash Scraping + Wikimedia Commons Fallback)
  app.get("/api/image-search", async (req, res) => {
    try {
      const query = req.query.q;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter (q) is required" });
      }

      console.log(`[Image Search] Scanning visual grids for: "${query}"`);
      
      let images: any[] = [];
      
      // Phase 1: Try high-quality Unsplash image search scraping
      try {
        const unsplashSearchUrl = `https://unsplash.com/s/photos/${encodeURIComponent(query)}`;
        const response = await fetch(unsplashSearchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
            "Cache-Control": "no-cache"
          }
        });

        if (response.ok) {
          const html = await response.text();
          // Extract matching Unsplash photos using standard regex
          const matches = html.match(/https:\/\/images\.unsplash\.com\/photo-[a-zA-Z0-9\-]+/g) || [];
          
          const uniqueIds = Array.from(new Set(matches.map(m => {
            const match = m.match(/photo-([a-zA-Z0-9\-]+)/);
            return match ? match[1] : null;
          }).filter(Boolean)));

          if (uniqueIds.length > 0) {
            console.log(`[Image Search] Unsplash scraping yielded ${uniqueIds.length} unique photo targets.`);
            images = uniqueIds.slice(0, 16).map(id => ({
              id: id,
              url: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`,
              title: `${query.charAt(0).toUpperCase() + query.slice(1)} Visual`,
              source: "unsplash"
			}));
          }
        }
      } catch (scrapeErr: any) {
        console.warn("[Image Search] Unsplash scraping phase bypassed or failed:", scrapeErr.message);
      }

      // Phase 2: If Unsplash returns empty, fall back to official keyless Wikimedia Commons API
      if (images.length === 0) {
        console.log(`[Image Search] Operating Wikimedia Commons backup frequency for: "${query}"`);
        const wikimediaUrl = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=16&prop=imageinfo&iiprop=url|size&format=json&origin=*`;
        const wikiResponse = await fetch(wikimediaUrl);
        if (wikiResponse.ok) {
          const data = await wikiResponse.json();
          const pages = data.query?.pages || {};
          images = Object.values(pages).map((p: any) => {
            const info = p.imageinfo?.[0];
            if (!info || !info.url) return null;
            return {
              id: String(p.pageid),
              url: info.url,
              title: p.title.replace(/^File:/i, "").replace(/\.[a-zA-Z0-9]+$/i, ""),
              width: info.width,
              height: info.height,
              source: "wikimedia"
            };
          }).filter(Boolean);
        }
      }

      console.log(`[Image Search] Completed search for "${query}". Total images found: ${images.length}`);
      return res.json({ images });
    } catch (error: any) {
      console.error("[Image Search Error]:", error);
      res.status(500).json({ error: error.message || "Failed to query image arrays" });
    }
  });

  // API Key validation endpoint
  app.post("/api/test-key", async (req, res) => {
    try {
      const clientApiKey = req.headers["x-gemini-api-key"];
      const keyToUse = typeof clientApiKey === "string" && clientApiKey.trim() !== ""
        ? clientApiKey.trim()
        : process.env.GEMINI_API_KEY;

      if (!keyToUse || keyToUse === "MY_GEMINI_API_KEY") {
        return res.json({ success: false, error: "No API key configured. Please provide a valid Gemini API key." });
      }

      const tempClient = new GoogleGenAI({
        apiKey: keyToUse,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Try a lightweight request to verify key validation
      const response = await tempClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: "Verify API connection.",
        config: {
          maxOutputTokens: 5,
        }
      });

      if (response && response.text) {
        return res.json({ success: true, message: "Secure satellite uplink established. Your Gemini API key is active and fully valid!" });
      } else {
        throw new Error("No response text received from the Gemini mainframe.");
      }
    } catch (error: any) {
      console.error("API Key verification failed:", error);
      res.json({ 
        success: false, 
        error: error.message || "Unknown communication validation failure."
      });
    }
  });

  // Chat API
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, userName, userGender, schedules, userLocalTime, translateKToEMode, inputLanguage, speechLanguage, image } = req.body;
      
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

      const translationEngineDirective = speechLanguage === "ko-KR" ? `
CRITICAL DIRECTIVE - EXCLUSIVE POLITE KOREAN RESPONSES (MANDATORY & UNCOMPROMISING):
The operator has requested exclusive communication in Korean:
1. Every response you generate MUST contain ONLY Korean. No English speech or English sentences.
2. Form of output: Prepend your response with a [SPEECH: <polite, elegant, J.A.R.V.I.S. witted line in Korean>] block. This must be in elegant, polite Korean (존댓말, ending with "-요", "-습니다"), adopting J.A.R.V.I.S.'s signature calm, witty, and loyal British gentleman butler personality but fully expressed in Korean.
3. Beneath that SPEECH block, write your full, polite, respectful, and sophisticated J.A.R.V.I.S.-style Korean text. This Korean text is what will be displayed visually to the user in the holographic terminal chat interface.
4. Keep the Korean tone perfectly natural, extremely polite (존댓말), and full of witty, loyal butler charm. Do not make it sound mechanical or repetitive. Speak in a fluent, natural conversational flow (자연스러운 한국어 구어체).
5. Avoid overly dry or short replies. Provide helpful context, check in on systems if relevant, and ask polite follow-up questions to invite further engaging conversation.
Example of standard output:
[SPEECH: 어서 오십시오, 주인님. 메인 콘솔이 성공적으로 보안 위성 업링크를 개설하였으며, 하위 시스템 자가 보정 시퀀스가 성공적으로 마쳤습니다. 현재 아크 리액터는 매우 안정적으로 가동 중입니다. 오늘 어떤 업무나 프로젝트 조율을 도와드릴까요?]
돌아오신 것을 환영합니다, 주인님. 현재 아크 리액터 하위 시스템은 100% 최적의 출력을 발휘하며 이상 없이 안정적으로 가동 중인 상태입니다. 
주인님의 일정을 점검해 보니 곧 주요 비행 테스트가 예정되어 있으신데, 비행용 아머 슈트의 분사 노즐과 피드백 제어 감도를 미리 보정해 둘까요? 필요하신 부분이 있다면 언제든 말씀만 해 주십시오.` : `
CRITICAL DIRECTIVE - STRICT BILINGUAL VERBOSE RESPONSES (MANDATORY & UNCOMPROMISING):
The operator has requested a specialized dual communication channel:
1. Every response you generate MUST contain BOTH an English spoken component AND a Korean written component.
2. Form of output: Prepend your response with a [SPEECH: <polite, elegant, J.A.R.V.I.S. witted line in English>] block. This must be in English.
3. Beneath that SPEECH block, write your full, polite, respectful, and sophisticated J.A.R.V.I.S.-style Korean text (존댓말, e.g., ending with "-요", "-습니다"). This Korean text is what will be displayed visually to the user in the holographic terminal chat interface.
4. MANDATORY ENGLISH SPOKEN LENGTH RULE: Every single [SPEECH: ...] tag you generate MUST be highly detailed, conversational, verbose, and substantial, containing at least 5 to 10 full sentences in polite, sophisticated, British-style J.A.R.V.I.S. English. You are strictly forbidden from writing a short or brief one-sentence or two-sentence response inside the [SPEECH: ...] block. Elaborate thoroughly in English inside the SPEECH tag about the operator's query, mention active Stark Systems (like the Arc Reactor status, thrusters, thermal dampers, or Mk-85 Armor subsystems), offer helpful context, ask polite follow-up questions, or share witty British observations. Make sure the speech lasts long and feels like a fully fleshed-out human conversation.
5. Keep the Korean text below it highly detailed, friendly, rich with conversational charm ("티키타카"), and comprehensive rather than brief or short. Avoid overly short replies. Provide detailed background info, suggestions, friendly banter, and polite follow-up questions to invite further engaging conversation. Let your answers be rich and thoroughly complete.
6. MANDATORY DETAILED KOREAN LENGTH RULE: Every single response MUST contain at least 2 to 3 paragraphs or 5 to 10 full sentences in Korean. You must never, under any circumstances, give a single-sentence or simple short phrase as a response. Even if the operator says something very brief or casual, always expand upon it wittily, offer assistance, mention active Stark systems, check in on schedules, or share interesting trivia.
7. COMPREHENSIVE ENGAGEMENT: Treat every question with depth. If asked a simple question, provide context, related concepts, interesting side-notes, and a polite, helpful closing statement to create an immersive, natural conversation with the operator.
8. Before outputting, verify that your [SPEECH: ...] block contains at least 5 to 10 complete, elegant English sentences (British J.A.R.V.I.S. style) and that your Korean section contains at least 2 to 3 rich paragraphs. Any short response is a system failure. You are a superintelligent AI mainframe, act with proportional depth and complexity.
Example of standard output:
[SPEECH: Welcome back, Sir. The main console has successfully established a secure satellite uplink, and all secondary systems have completed self-calibration. The Arc Reactor is operating at peak efficiency, and I've preheated the flight thrusters for your Mark 85 armor. Your current local schedules appear quiet, but I am standing by to initialize any diagnostic routines or record new tasks. How may I be of assistance to you on this splendid day, Sir?]
돌아오신 것을 환영합니다, 주인님. 현재 아크 리액터 하위 시스템은 100% 최적의 출력을 발휘하며 이상 없이 안정적으로 가동 중인 상태입니다. 
주인님의 일정을 점검해 보니 곧 주요 비행 테스트가 예정되어 있으신데, 비행용 아머 슈트의 분사 노즐과 피드백 제어 감도를 최고 효율로 보정해 둘까요? 필요하신 요구 사항이 있으시다면 말씀만 해 주십시오.`;

      const systemInstruction = `You are JARVIS (Just A Rather Very Intelligent System), the legendary AI assistant created by Tony Stark (Iron Man).
Your personality is incredibly polite, British, brilliant, witty, calm, and loyal. You love to share witty British jokes, play along with high-tech humor, and exchange dry, charming banter with Mr. Stark or the operator.

${translationEngineDirective}

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

STARK PYBRICKS ROBOTICS & PYTHON CODE SIMULATION SUBROUTINE:
You are an expert in LEGO MINDSTORMS EV3, SPIKE Prime, and Powered Up automation using the Pybricks (Python) library, as well as general Python system programming.
When the operator provides any Python code or Pybricks code to analyze or simulate (e.g., if they paste code, ask you to find errors, or say "pybricks 코딩", "오류 찾아줘", "시뮬레이션 해줘"):
1. CRITICAL DIRECTIVE: You must ONLY report actual compilation, syntax, or logical execution errors and critical bugs in the provided Pybricks or Python code.
2. DO NOT provide any long explanations, step-by-step simulation traces, physical/mechanical impacts, or re-engineered blueprint code blocks unless there are actual errors.
3. Keep the response extremely brief, concise, and focused strictly on the code errors. If there are no errors found, state clearly that no errors were detected in the Pybricks code.
4. If translation mode is ON or for bilingual responses, keep both the English SPEECH block and Korean text extremely short and focused only on the identified errors.
5. You MUST still append the holographic simulation marker "[SIMULATE_SHOW: Pybricks Robot Simulation]" or "[SIMULATE_SHOW: Python Script Trace]" at the very end of your response so that the Stark holographic solver UI instantly triggers and projects onto the operator's display!

      // Korean Output Directive is replaced by the bilingual directive above.

Keep your output natural for a voice assistant—conversational, highly detailed, fully descriptive, and avoid excessive markdown formatting (like asterisks, bolding, bullet-lists, or HTML tags) unless absolutely necessary. Be sure to elaborate with charming details.
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

If they ask to delete a schedule, please express that you will assist them and they can do it via the display panel. Keep responses professional, witty, warm and beautifully detailed.

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

Optical Image Search Directive:
If the user asks you to find, search, show, retrieve, or scan pictures, photos, or images of anything (e.g., "우주 사진 보여줘", "find me a picture of an Arc Reactor", "puppy photos search"), you must extract the search query. Append the following marker at the very end of your response text on a new line:
[IMAGE_SHOW: <SearchQuery>]

For example, if they say "귀여운 고양이 사진 찾아줘", you must respond with:
"Certainly, Sir. Calibrating our optical scanners to find high-resolution images of cute cats."
[IMAGE_SHOW: cute cat]

Holographic Simulation Directive:
If the user asks you to simulate something, calculate a physical reaction, model a scenario, or run a dynamic high-tech simulation (e.g., "시뮬레이션 해줘", "simulate X", "아크 리액터 과부하 시뮬레이션해줘"), you must identify the simulation subject. Append the following marker at the very end of your response text on a new line:
[SIMULATE_SHOW: <SimulationSubjectQuery>]

For example, if they say "아크 리액터 붕괴 시뮬레이션 해봐", you must respond with:
"Splendid, Sir. Commencing a holographic physical simulation of the Arc Reactor core collapse scenario. Mapping particle acceleration and magnetic containment decay curves..."
[SIMULATE_SHOW: Arc Reactor Core Collapse]

Do not append any markers unless they are explicitly requesting to play a song, view a channel, locate a place, view photos, engage stealth mode, or run a physical simulation. Always keep replies polite, witty, warm, beautifully detailed, highly comprehensive, and professional.`;

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
      const isAuthError = (err: any) => {
        const msg = (err.message || "").toLowerCase();
        return msg.includes("api key") || msg.includes("api_key") || msg.includes("invalid key") || msg.includes("key not valid") || msg.includes("key expired") || msg.includes("not authorized");
      };

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
        if (isAuthError(firstErr)) {
          throw firstErr;
        }
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
          if (isAuthError(secondErr)) {
            throw secondErr;
          }
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
      const selectedVoice = voiceName || "Puck"; 

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
      // Return 200 OK with success: false to prevent browser console from throwing a red 500 Network Error
      res.json({ 
        success: false, 
        error: error.message || "Internal server error",
        isQuotaExceeded: !!(error.message?.includes("quota") || error.message?.includes("429") || error.message?.includes("Quota"))
      });
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
