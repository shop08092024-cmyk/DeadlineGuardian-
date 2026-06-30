import { useState, useEffect, useRef, FormEvent } from "react";
import {
  Sun,
  Moon,
  ShieldAlert,
  Clock,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Zap,
  Play,
  Pause,
  Send,
  RefreshCw,
  Sliders,
  Mail,
  FileText,
  Brain,
  Activity,
  Undo2,
  UserCheck,
  ChevronRight,
  Info,
  LogOut,
  Phone,
  Key,
  Chrome,
  Database,
  CheckCircle,
  Download,
  Flame,
  Timer,
  Quote,
  RotateCcw,
  Square,
  Music,
  Volume2,
  VolumeX,
  Radio,
  Mic,
  MicOff
} from "lucide-react";
import { Goal, Task, RadarResult, FutureSimulationResult, AutonomousActResult, UserProfile } from "./types";
import { createClient } from "@supabase/supabase-js";

// ── Module-level Supabase singleton ──────────────────────────────────────────
// Keeping this outside the component prevents React StrictMode from creating
// two GoTrueClient instances (which triggers the "Multiple GoTrueClient" warning).
let _supabaseClient: ReturnType<typeof createClient> | null = null;
function getSupabaseClient(url: string, key: string) {
  if (!_supabaseClient) {
    _supabaseClient = createClient(url, key);
  }
  return _supabaseClient;
}


// Dynamic preset emails/notifs to feed easily into the Deadline Radar Agent
const RADAR_TEMPLATES = [
  {
    name: "Stanford syllabus update",
    type: "email",
    text: `From: CS224n Course Staff <cs224n-coordinators@stanford.edu>
Subject: Class Project Initial Benchmark & Milestone Update

Hello everyone,
As announced on the syllabus, the Initial Dataset Milestone and Model Benchmarking submission is rescheduled. To ensure everyone gets adequate review of their proposed architectures, the final submit deadline is fixed on this coming Friday, Oct 16th at 11:59 PM PDT.

Action items:
1. Complete training set tokenization
2. Produce a baseline loss metrics table
3. Draft a 2-page design summary

Late submissions will lose 10% from the grade per day.`
  },
  {
    name: "Google recruiter chat",
    type: "chat",
    text: `Recruiter (Google APAC): "Hi Shlok! We are excited to push your candidacy for the final SWE internship loop. We scheduled back-to-back algorithmic rounds for you next Tuesday, Oct 20th starting at 9:00 AM IST.

To prepare fully:
- Solve at least 3 medium-level Binary Tree DFS problems
- Brush up on amortized Time Complexities
- Complete the Google coding assessment guide quiz by Sunday, Oct 18th. 

Let me know if this calendar invite looks solid."`
  },
  {
    name: "Hackathon submission portal",
    type: "calendar",
    text: `Calendar Notification: DevPost Innovation Arena Hackathon
Begins: Friday, Oct 23rd at 5:00 PM EST
Submission Portal Closes: Sunday, Oct 25th at 5:00 PM EST

Milestones to coordinate:
- Final landing page design & submission slide pitch deck
- 3-minute video presentation upload
- Github Repo link with completed env configuration`
  }
];

// Motivational quotes pool
const MOTIVATIONAL_QUOTES = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "The harder I work, the luckier I get.", author: "Samuel Goldwyn" },
  { text: "Push yourself, because no one else is going to do it for you.", author: "Unknown" },
  { text: "Great things never come from comfort zones.", author: "Unknown" },
  { text: "Dream it. Wish it. Do it.", author: "Unknown" },
  { text: "Success doesn't just find you. You have to go out and get it.", author: "Unknown" },
  { text: "The key to success is to focus on goals, not obstacles.", author: "Unknown" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
];

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("dg_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("dg_theme", theme);
  }, [theme]);

  // User profile and Supabase states
  const [supabaseConfig, setSupabaseConfig] = useState<{ supabaseUrl: string; supabaseAnonKey: string } | null>(null);
  const [supabase, setSupabase] = useState<any>(null);
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem("dg_active_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Auth Forms State variables
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authProviderTab, setAuthProviderTab] = useState<"email" | "google">("email");
  const [authLoading, setAuthLoading] = useState(false);

  // Supabase Database Connection & Verification diagnostic states
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; tableExists: boolean; errorMsg?: string; errorCode?: string; message: string } | null>(null);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch("/api/db-status");
      const data = await res.json();
      setDbStatus(data);
    } catch (err) {
      console.error("Failed to fetch database status:", err);
    }
  };

  const [goals, setGoals] = useState<Goal[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "tasks" | "schedule" | "radar" | "simulate" | "actions" | "coach">("overview");

  
  // Create state variables for forms and loading
  const [newGoalInput, setNewGoalInput] = useState("");
  const [newDeadlineInput, setNewDeadlineInput] = useState("");
  const [planningMode, setPlanningMode] = useState(false);
  const [actionState, setActionState] = useState<string | null>(null);
  const [goalsLoading, setGoalsLoading] = useState(true);

  // Chat Agent coach state
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Simulation Agent state
  const [simulateSelect, setSimulateSelect] = useState("Procrastinate: Skip today's planned sessions");
  const [customScenario, setCustomScenario] = useState("");
  const [simulationResult, setSimulationResult] = useState<FutureSimulationResult | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Radar Agent state
  const [radarInput, setRadarInput] = useState("");
  const [radarSourceType, setRadarSourceType] = useState("email");
  const [radarResult, setRadarResult] = useState<RadarResult | null>(null);
  const [radarScanning, setRadarScanning] = useState(false);

  // Autonomous Actions state
  const [autonomousResult, setAutonomousResult] = useState<AutonomousActResult | null>(null);
  const [automating, setAutomating] = useState(false);

  // Google Calendar Integration State
  const [gcalToken, setGcalToken] = useState(() => localStorage.getItem("gcal_access_token") || "");
  const [calendarId, setCalendarId] = useState(() => localStorage.getItem("gcal_calendar_id") || "primary");
  const [gcalApiKey, setGcalApiKey] = useState(() => localStorage.getItem("gcal_api_key") || "");
  const [showGcalConfig, setShowGcalConfig] = useState(false);
  const [syncingTaskId, setSyncingTaskId] = useState<string | null>(null);
  const [syncedTasks, setSyncedTasks] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("gcal_synced_tasks");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // ===== NEW FEATURES STATE =====

  // 1. Daily Streak Tracker
  const [streak, setStreak] = useState<number>(() => {
    return parseInt(localStorage.getItem("dg_streak") || "0", 10);
  });
  const [lastCheckIn, setLastCheckIn] = useState<string>(() => {
    return localStorage.getItem("dg_last_checkin") || "";
  });

  const handleDailyCheckIn = () => {
    const today = new Date().toDateString();
    if (lastCheckIn === today) {
      flashHud("Already checked in today! Keep up the streak! 🔥", "info");
      return;
    }
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const newStreak = lastCheckIn === yesterday ? streak + 1 : 1;
    setStreak(newStreak);
    setLastCheckIn(today);
    localStorage.setItem("dg_streak", String(newStreak));
    localStorage.setItem("dg_last_checkin", today);
    flashHud(`🔥 Day ${newStreak} streak! Keep pushing!`, "success");
  };

  // 3. Voice Speech-to-Text Recognition
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";
      
      rec.onstart = () => {
        setIsListening(true);
        flashHud("Listening... Speak now 🎙️", "info");
      };
      
      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setChatInput(prev => (prev ? prev + " " + transcript : transcript));
          flashHud("Speech recognized!", "success");
        }
      };
      
      rec.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== "no-speech") {
          flashHud(`Voice error: ${event.error}`, "error");
        }
        setIsListening(false);
      };
      
      rec.onend = () => {
        setIsListening(false);
      };
      
      recognitionRef.current = rec;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      flashHud("Speech recognition is not supported in this browser.", "error");
      return;
    }
    
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Speech start error:", e);
      }
    }
  };

  // ===== FOCUS MUSIC PLAYER (Web Audio API — no external library) =====
  const MUSIC_TRACKS = [
    { id: "lofi",     label: "Lofi Hip-Hop",    emoji: "🎵", desc: "Warm beats & vinyl crackle",   color: "#a855f7" },
    { id: "rain",     label: "Rain & Thunder",   emoji: "🌧️", desc: "Gentle storm ambience",        color: "#3b82f6" },
    { id: "white",    label: "White Noise",      emoji: "🌊", desc: "Pure broadband static",        color: "#64748b" },
    { id: "brown",    label: "Brown Noise",      emoji: "🍂", desc: "Deep rumble, max focus",       color: "#a16207" },
    { id: "binaural", label: "Binaural Focus",   emoji: "🧠", desc: "10 Hz alpha wave beats",       color: "#0a84ff" },
    { id: "nature",   label: "Forest & Birds",   emoji: "🌿", desc: "Chirping + rustling leaves",   color: "#22c55e" },
  ];

  const [showMusicPlayer, setShowMusicPlayer] = useState(false);
  const [musicPlaying, setMusicPlaying]       = useState(false);
  const [musicTrack, setMusicTrack]           = useState("lofi");
  const [musicVolume, setMusicVolume]         = useState(0.35);
  const audioCtxRef   = useRef<AudioContext | null>(null);
  const gainNodeRef   = useRef<GainNode | null>(null);
  const sourceNodesRef = useRef<AudioNode[]>([]);

  // Tear down any currently playing audio nodes
  const stopAudioNodes = () => {
    sourceNodesRef.current.forEach(n => { try { (n as any).stop?.(); (n as any).disconnect?.(); } catch {} });
    sourceNodesRef.current = [];
  };

  // Create an AudioContext (lazy) and ensure gainNode
  const getAudioCtx = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume();
    if (!gainNodeRef.current) {
      gainNodeRef.current = audioCtxRef.current.createGain();
      gainNodeRef.current.connect(audioCtxRef.current.destination);
    }
    gainNodeRef.current.gain.setTargetAtTime(musicVolume, audioCtxRef.current.currentTime, 0.05);
    return audioCtxRef.current;
  };

  // Helper — buffered looping noise source
  const createNoiseSource = (ctx: AudioContext, bufferSize = 2 * ctx.sampleRate, shaping?: (samples: Float32Array) => void) => {
    const buf = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    if (shaping) shaping(data);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    return src;
  };

  const startTrack = (trackId: string) => {
    const ctx = getAudioCtx();
    const gain = gainNodeRef.current!;
    stopAudioNodes();
    const nodes: AudioNode[] = [];

    if (trackId === "white") {
      const src = createNoiseSource(ctx);
      src.connect(gain); src.start();
      nodes.push(src);

    } else if (trackId === "brown") {
      // Brown noise: integrate white noise
      const src = createNoiseSource(ctx, 2 * ctx.sampleRate, (d) => {
        let last = 0;
        for (let i = 0; i < d.length; i++) { last = (last + 0.02 * d[i]) / 1.02; d[i] = last * 3.5; }
      });
      src.connect(gain); src.start();
      nodes.push(src);

    } else if (trackId === "rain") {
      // Rain: white noise through lowpass + random amplitude LFO
      const src = createNoiseSource(ctx);
      const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 1200; lpf.Q.value = 0.5;
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.3;
      const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.25;
      const modGain = ctx.createGain(); modGain.gain.value = 0.6;
      lfo.connect(lfoGain); lfoGain.connect(modGain.gain);
      src.connect(lpf); lpf.connect(modGain); modGain.connect(gain);
      lfo.start(); src.start();
      nodes.push(src, lpf, lfo, lfoGain, modGain);

    } else if (trackId === "lofi") {
      // Lofi: layered filtered noise + rhythmic amplitude stutters simulating beats
      const src = createNoiseSource(ctx, 3 * ctx.sampleRate, (d) => {
        let last = 0;
        for (let i = 0; i < d.length; i++) { last = (last + 0.04 * d[i]) / 1.04; d[i] = last * 2; }
      });
      const hpf = ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = 80;
      const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 3500;
      const beat = ctx.createOscillator(); beat.frequency.value = 1.37; // ~82 BPM
      const beatGain = ctx.createGain(); beatGain.gain.value = 0.18;
      beat.connect(beatGain); beatGain.connect(gain);
      src.connect(hpf); hpf.connect(lpf); lpf.connect(gain);
      beat.start(); src.start();
      nodes.push(src, hpf, lpf, beat, beatGain);

    } else if (trackId === "binaural") {
      // Binaural: 200 Hz in left, 210 Hz in right → 10 Hz alpha beat
      const merger = ctx.createChannelMerger(2);
      const left = ctx.createOscillator(); left.frequency.value = 200; left.type = "sine";
      const right = ctx.createOscillator(); right.frequency.value = 210; right.type = "sine";
      const lgain = ctx.createGain(); lgain.gain.value = 0.4;
      const rgain = ctx.createGain(); rgain.gain.value = 0.4;
      left.connect(lgain); lgain.connect(merger, 0, 0);
      right.connect(rgain); rgain.connect(merger, 0, 1);
      merger.connect(gain);
      left.start(); right.start();
      nodes.push(left, right, lgain, rgain, merger);

    } else if (trackId === "nature") {
      // Nature: filtered white noise (wind) + high-freq chirp oscillator cluster
      const wind = createNoiseSource(ctx);
      const wpf = ctx.createBiquadFilter(); wpf.type = "bandpass"; wpf.frequency.value = 800; wpf.Q.value = 0.3;
      wind.connect(wpf); wpf.connect(gain);
      const chirpFreqs = [2800, 3400, 4100, 5000];
      const chirpNodes: AudioNode[] = chirpFreqs.map(freq => {
        const osc = ctx.createOscillator(); osc.frequency.value = freq; osc.type = "sine";
        const og = ctx.createGain(); og.gain.value = 0.012;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 4 + Math.random() * 3;
        const lg = ctx.createGain(); lg.gain.value = 0.008;
        lfo.connect(lg); lg.connect(og.gain);
        osc.connect(og); og.connect(gain);
        osc.start(); lfo.start(); wind.start();
        return osc;
      });
      nodes.push(wind, wpf, ...chirpNodes);
    }

    sourceNodesRef.current = nodes;
  };

  // Toggle play/pause
  const toggleMusic = () => {
    if (musicPlaying) {
      stopAudioNodes();
      audioCtxRef.current?.suspend();
      setMusicPlaying(false);
    } else {
      startTrack(musicTrack);
      setMusicPlaying(true);
    }
  };

  // Switch track
  const switchTrack = (id: string) => {
    setMusicTrack(id);
    if (musicPlaying) startTrack(id);
  };

  // Volume change
  useEffect(() => {
    if (gainNodeRef.current && audioCtxRef.current) {
      gainNodeRef.current.gain.setTargetAtTime(musicVolume, audioCtxRef.current.currentTime, 0.05);
    }
  }, [musicVolume]);

  // Clean up on unmount
  useEffect(() => () => { stopAudioNodes(); audioCtxRef.current?.close(); }, []);

  const activeTrackMeta = MUSIC_TRACKS.find(t => t.id === musicTrack)!;

  // 2. Pomodoro Focus Timer
  const [pomodoroActive, setPomodoroActive] = useState(false);
  const [pomodoroSeconds, setPomodoroSeconds] = useState(25 * 60);
  const [pomodoroMode, setPomodoroMode] = useState<"focus" | "break">("focus");
  const [pomodoroSessions, setPomodoroSessions] = useState(0);
  const [showPomodoro, setShowPomodoro] = useState(false);
  const pomodoroRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (pomodoroActive) {
      pomodoroRef.current = setInterval(() => {
        setPomodoroSeconds(prev => {
          if (prev <= 1) {
            clearInterval(pomodoroRef.current!);
            setPomodoroActive(false);
            if (pomodoroMode === "focus") {
              setPomodoroSessions(s => s + 1);
              setPomodoroMode("break");
              setPomodoroSeconds(5 * 60);
              flashHud("🎉 Focus session complete! Take a 5-min break.", "success");
            } else {
              setPomodoroMode("focus");
              setPomodoroSeconds(25 * 60);
              flashHud("☕ Break over! Time to focus again.", "info");
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pomodoroRef.current) clearInterval(pomodoroRef.current);
    }
    return () => { if (pomodoroRef.current) clearInterval(pomodoroRef.current); };
  }, [pomodoroActive, pomodoroMode]);

  const formatPomodoroTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const resetPomodoro = () => {
    setPomodoroActive(false);
    setPomodoroMode("focus");
    setPomodoroSeconds(25 * 60);
  };

  // 3. Live Countdown for selected goal
  const [countdownStr, setCountdownStr] = useState("");
  useEffect(() => {
    if (!selectedGoal) { setCountdownStr(""); return; }
    const tick = () => {
      const diff = new Date(selectedGoal.deadline).getTime() - Date.now();
      if (diff <= 0) { setCountdownStr("⚠️ Deadline Passed"); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdownStr(`${d}d ${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [selectedGoal]);

  // 4. Motivational quote rotator
  const [quoteIndex, setQuoteIndex] = useState(() => Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length));
  useEffect(() => {
    const id = setInterval(() => setQuoteIndex(i => (i + 1) % MOTIVATIONAL_QUOTES.length), 15000);
    return () => clearInterval(id);
  }, []);
  const currentQuote = MOTIVATIONAL_QUOTES[quoteIndex];

  // 5. Export summary as PDF
  const handleExportSummary = () => {
    if (!selectedGoal) return;
    const doneTasks = selectedGoal.tasks.filter(t => t.done);
    const pendingTasks = selectedGoal.tasks.filter(t => !t.done);
    const daysLeft = countDaysLeft(selectedGoal.deadline);
    const riskColor = selectedGoal.risk === "High" ? "#ef4444" : selectedGoal.risk === "Medium" ? "#f97316" : "#22c55e";
    const scoreColor = selectedGoal.successProbability >= 75 ? "#22c55e" : selectedGoal.successProbability >= 50 ? "#f97316" : "#ef4444";

    const getBadgeClass = (priority: string) => {
      if (priority === "Do Now") return "badge-now";
      if (priority === "Do Today") return "badge-today";
      if (priority === "Do This Week") return "badge-week";
      return "badge-wait";
    };

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${selectedGoal.title} — Deadline Guardian Report</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap');
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', sans-serif; background: #fff; color: #0c1222; font-size: 13px; line-height: 1.6; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header { background: linear-gradient(135deg, #0a7aef 0%, #5856d6 100%); color: white; border-radius: 16px; padding: 26px 30px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header-left h1 { font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 4px; }
    .header-left p { font-size: 10px; opacity: 0.75; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .header-right { text-align: right; }
    .header-badge { background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.35); border-radius: 99px; padding: 3px 12px; font-size: 11px; font-weight: 700; display: inline-block; margin-bottom: 8px; }
    .header-date { font-size: 10px; opacity: 0.7; font-family: 'JetBrains Mono', monospace; }
    .metrics-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
    .metric-card { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; text-align: center; }
    .metric-value { font-size: 24px; font-weight: 800; font-family: 'JetBrains Mono', monospace; letter-spacing: -1px; }
    .metric-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-top: 2px; }
    .progress-section { margin-bottom: 18px; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; }
    .progress-section h3 { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #64748b; margin-bottom: 8px; }
    .progress-bar-bg { background: #f1f5f9; border-radius: 99px; height: 10px; overflow: hidden; }
    .progress-bar-fill { height: 100%; border-radius: 99px; background: linear-gradient(90deg, #0a7aef, #5856d6); }
    .progress-labels { display: flex; justify-content: space-between; margin-top: 6px; font-size: 10px; color: #64748b; font-weight: 600; }
    .section { margin-bottom: 18px; }
    .section-title { font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; color: #64748b; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
    .section-title span { display: inline-block; width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .task-list { display: flex; flex-direction: column; gap: 5px; }
    .task-item { display: flex; align-items: center; gap: 10px; padding: 9px 14px; border-radius: 10px; border: 1.5px solid #e2e8f0; }
    .task-item.done { background: #f8fafc; }
    .task-checkbox { width: 15px; height: 15px; border-radius: 50%; border: 2px solid #cbd5e1; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 900; color: white; }
    .task-checkbox.checked { background: #22c55e; border-color: #22c55e; }
    .task-name { font-weight: 600; font-size: 12px; flex: 1; }
    .task-name.done { text-decoration: line-through; color: #94a3b8; }
    .task-meta { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
    .task-badge { font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 99px; text-transform: uppercase; }
    .badge-done { background: #dcfce7; color: #16a34a; }
    .badge-now { background: #fee2e2; color: #dc2626; }
    .badge-today { background: #ffedd5; color: #c2410c; }
    .badge-week { background: #d1fae5; color: #065f46; }
    .badge-wait { background: #ede9fe; color: #6d28d9; }
    .task-hours { font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #64748b; font-weight: 600; }
    .risk-item { display: flex; gap: 10px; align-items: flex-start; padding: 9px 14px; border-radius: 10px; background: #fffbeb; border: 1.5px solid #fde68a; margin-bottom: 5px; }
    .risk-dot { width: 6px; height: 6px; border-radius: 50%; background: #f97316; flex-shrink: 0; margin-top: 5px; }
    .risk-text { font-size: 12px; color: #78350f; }
    .focus-box { background: linear-gradient(135deg, #eff6ff, #eef2ff); border: 1.5px solid #bfdbfe; border-radius: 12px; padding: 14px 18px; display: flex; align-items: center; gap: 16px; }
    .focus-time { font-size: 18px; font-weight: 800; color: #0a7aef; font-family: 'JetBrains Mono', monospace; white-space: nowrap; }
    .focus-desc { font-size: 11px; color: #4a5568; line-height: 1.5; }
    .footer { margin-top: 24px; padding-top: 14px; border-top: 1.5px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
    .footer-brand { font-size: 11px; font-weight: 700; color: #0a7aef; }
    .footer-date { font-size: 10px; color: #94a3b8; font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <p>Deadline Guardian AI — Progress Report</p>
      <h1>${selectedGoal.title}</h1>
    </div>
    <div class="header-right">
      <div class="header-badge" style="background:${riskColor}33;border-color:${riskColor}66;color:${riskColor};">${selectedGoal.risk} Risk</div><br/>
      <div class="header-date">Generated: ${new Date().toLocaleDateString("en-US", { weekday: "short", year: "numeric", month: "long", day: "numeric" })}</div>
    </div>
  </div>
  <div class="metrics-row">
    <div class="metric-card"><div class="metric-value" style="color:#0a7aef">${selectedGoal.progress}%</div><div class="metric-label">Progress</div></div>
    <div class="metric-card"><div class="metric-value" style="color:${scoreColor}">${selectedGoal.successProbability}%</div><div class="metric-label">Success Prob.</div></div>
    <div class="metric-card"><div class="metric-value" style="color:${daysLeft === 0 ? "#ef4444" : "#0c1222"}">${daysLeft}</div><div class="metric-label">Days Left</div></div>
    <div class="metric-card"><div class="metric-value" style="color:#5856d6">${selectedGoal.tasks.length}</div><div class="metric-label">Total Tasks</div></div>
  </div>
  <div class="progress-section">
    <h3>Overall Completion Progress</h3>
    <div class="progress-bar-bg"><div class="progress-bar-fill" style="width:${selectedGoal.progress}%"></div></div>
    <div class="progress-labels"><span>${doneTasks.length} tasks completed</span><span>${pendingTasks.length} remaining</span><span>Due: ${new Date(selectedGoal.deadline).toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric", year: "numeric" })}</span></div>
  </div>
  ${doneTasks.length > 0 ? `
  <div class="section">
    <div class="section-title"><span style="background:#22c55e"></span>Completed Tasks (${doneTasks.length})</div>
    <div class="task-list">${doneTasks.map(t => `<div class="task-item done"><div class="task-checkbox checked">✓</div><div class="task-name done">${t.name}</div><div class="task-meta"><span class="task-hours">${t.hours}h</span><span class="task-badge badge-done">Done</span></div></div>`).join("")}</div>
  </div>` : ""}
  ${pendingTasks.length > 0 ? `
  <div class="section">
    <div class="section-title"><span style="background:#f97316"></span>Pending Tasks (${pendingTasks.length})</div>
    <div class="task-list">${pendingTasks.map(t => `<div class="task-item"><div class="task-checkbox"></div><div class="task-name">${t.name}</div><div class="task-meta"><span class="task-hours">${t.hours}h</span><span class="task-badge ${getBadgeClass(t.priority)}">${t.priority}</span></div></div>`).join("")}</div>
  </div>` : ""}
  <div class="section">
    <div class="section-title"><span style="background:#f97316"></span>Risk Factors Identified</div>
    ${selectedGoal.riskReasons.map(r => `<div class="risk-item"><div class="risk-dot"></div><div class="risk-text">${r}</div></div>`).join("")}
  </div>
  <div class="section">
    <div class="section-title"><span style="background:#0a7aef"></span>Optimal Focus Window</div>
    <div class="focus-box"><div class="focus-time">${selectedGoal.bestWindow}</div><div class="focus-desc">Your Productivity Twin indicates this is your peak performance period. Schedule your highest-priority tasks during this window for maximum throughput and minimal drift.</div></div>
  </div>
  <div class="footer">
    <div class="footer-brand">🛡️ Deadline Guardian AI — Autonomous Productivity Chief of Staff</div>
    <div class="footer-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank", "width=900,height=750");
    if (!printWindow) {
      flashHud("Pop-up blocked! Please allow pop-ups and try again.", "error");
      return;
    }
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
      }, 600);
    };
    flashHud("PDF report ready — choose 'Save as PDF' in the print dialog!", "success");
  };

  const parseSlotDateTime = (dayStr: string, timeStr: string): string => {
    const targetDate = new Date();
    
    if (dayStr.toLowerCase() === "today") {
      // Use current day
    } else if (dayStr.toLowerCase() === "tomorrow") {
      targetDate.setDate(targetDate.getDate() + 1);
    } else {
      // e.g. "Oct 24"
      const parts = dayStr.split(" ");
      if (parts.length === 2) {
        const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
        const mIndex = monthNames.findIndex(m => parts[0].toLowerCase().startsWith(m));
        const dayNum = parseInt(parts[1], 10);
        if (mIndex !== -1 && !isNaN(dayNum)) {
          targetDate.setMonth(mIndex);
          targetDate.setDate(dayNum);
        }
      }
    }

    // Parse time like "4:00 PM"
    const timeRegex = /(\d+):(\d+)\s*(AM|PM)/i;
    const match = (timeStr || "").match(timeRegex);
    if (match) {
      let hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      
      targetDate.setHours(hour, minute, 0, 0);
    }
    return targetDate.toISOString();
  };

  const handleAddToGoogleCalendar = async (task: Task, slotDay: string, slotTime: string) => {
    if (!gcalToken) {
      flashHud("Please configure your Google Calendar Access Token first.", "error");
      setShowGcalConfig(true);
      return;
    }

    setSyncingTaskId(task.id);
    try {
      const startTimeStr = slotTime.split("–")[0]?.trim() || slotTime.split("-")[0]?.trim();
      const endTimeStr = slotTime.split("–")[1]?.trim() || slotTime.split("-")[1]?.trim();
      
      const startISO = parseSlotDateTime(slotDay, startTimeStr);
      const endISO = parseSlotDateTime(slotDay, endTimeStr);

      const event = {
        summary: `🎯 Focus: ${task.name} [Deadline Guardian]`,
        description: `Automated depth workload session allocated by Deadline Guardian AI.\nEstimated Task Duration: ${task.hours} hours.\nGoal: ${selectedGoal?.title}\nPriority: ${task.priority}\nMilestone: ${task.milestone}`,
        start: {
          dateTime: startISO,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        },
        end: {
          dateTime: endISO,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
        }
      };

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`;
      const requestUrl = gcalApiKey ? `${url}?key=${encodeURIComponent(gcalApiKey)}` : url;

      const res = await fetch(requestUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${gcalToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(event)
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const errMsg = errBody.error?.message || `HTTP ${res.status}`;
        throw new Error(errMsg);
      }

      const newSynced = [...syncedTasks, task.id];
      setSyncedTasks(newSynced);
      localStorage.setItem("gcal_synced_tasks", JSON.stringify(newSynced));
      flashHud(`Successfully scheduled "${task.name}" in Google Calendar!`, "success");
    } catch (error: any) {
      console.error("GCal Add Error:", error);
      flashHud(`Sync Failure: ${error.message || "Unknown error"}`, "error");
    } finally {
      setSyncingTaskId(null);
    }
  };

  const handleSaveCredentials = (e: FormEvent) => {
    e.preventDefault();
    localStorage.setItem("gcal_access_token", gcalToken);
    localStorage.setItem("gcal_calendar_id", calendarId);
    localStorage.setItem("gcal_api_key", gcalApiKey);
    flashHud("Google Calendar configurations saved!", "success");
    setShowGcalConfig(false);
  };

  // Status message HUD
  const [hudMessage, setHudMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Trigger quick HUD flash
  const flashHud = (text: string, type: "success" | "error" | "info" = "success") => {
    setHudMessage({ text, type });
    setTimeout(() => setHudMessage(null), 4000);
  };

  // 1. Initial Load of Goals from Express Database
  const fetchAllGoals = async (shouldSelectFirst = false, customUser?: UserProfile | null) => {
    const activeUser = customUser !== undefined ? customUser : user;
    if (!activeUser) {
      setGoalsLoading(false);
      return;
    }
    setGoalsLoading(true);
    try {
      const res = await fetch("/api/goals", {
        headers: {
          "x-user-id": activeUser.id,
          "x-user-email": activeUser.email || ""
        }
      });
      if (!res.ok) throw new Error("Server responded with error status");
      const data: Goal[] = await res.json();
      setGoals(data);
      if (data.length > 0) {
        if (shouldSelectFirst || !selectedGoal) {
          setSelectedGoal(data[0]);
        } else {
          // Sync existing selection
          const current = data.find((g) => g.id === selectedGoal.id);
          setSelectedGoal(current || data[0]);
        }
      } else {
        setSelectedGoal(null);
      }
      fetchDbStatus();
    } catch (err: any) {
      flashHud("Failed to synchronize with server: " + err.message, "error");
    } finally {
      setGoalsLoading(false);
    }
  };

  // Bootstrap Supabase Configuration & Listeners on mount
  useEffect(() => {
    const fetchConfigAndInitSupabase = async () => {
      try {
        const res = await fetch("/api/config");
        const data = await res.json();
        
        // Always trigger database status checks to provide dynamic diagnostics
        await fetchDbStatus();

        if (data.supabaseUrl && data.supabaseAnonKey) {
          setSupabaseConfig(data);
          // Use singleton to avoid "Multiple GoTrueClient instances" warning
          const client = getSupabaseClient(data.supabaseUrl, data.supabaseAnonKey);
          setSupabase(client);
          
          // Check active session
          const { data: { session } } = await client.auth.getSession();
          if (session?.user) {
            const profile: UserProfile = {
              id: session.user.id,
              email: session.user.email,
              phone: session.user.phone,
              name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
              authProvider: (session.user.app_metadata?.provider as any) || "email"
            };
            setUser(profile);
            localStorage.setItem("dg_active_user", JSON.stringify(profile));
          }
          
          // Listen for active authentication events
          client.auth.onAuthStateChange(async (event, session) => {
            if (session?.user) {
              const profile: UserProfile = {
                id: session.user.id,
                email: session.user.email,
                phone: session.user.phone,
                name: session.user.user_metadata?.full_name || session.user.email?.split("@")[0] || "User",
                authProvider: (session.user.app_metadata?.provider as any) || "email"
              };
              setUser(profile);
              localStorage.setItem("dg_active_user", JSON.stringify(profile));
            } else {
              // Ignore local sandbox accounts so we don't clear them on third-party mismatch
              setUser((prevUser) => {
                if (prevUser && prevUser.authProvider !== "local") {
                  localStorage.removeItem("dg_active_user");
                  return null;
                }
                return prevUser;
              });
            }
          });
        }
      } catch (err) {
        console.error("Supabase config parse warning:", err);
      }
    };
    fetchConfigAndInitSupabase();
  }, []);

  // Fetch user goals whenever the active authenticated user profile changes
  useEffect(() => {
    if (user) {
      fetchAllGoals(true, user);
    } else {
      setGoals([]);
      setSelectedGoal(null);
    }
  }, [user]);

  // Sync scroll to chat bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  // Reset demo databases for current user space
  const resetDemoDB = async () => {
    if (!user) return;
    setGoalsLoading(true);
    try {
      const res = await fetch("/api/goals/reset", { 
        method: "POST",
        headers: {
          "x-user-id": user.id,
          "x-user-email": user.email || ""
        }
      });
      const r = await res.json();
      setGoals(r.data);
      setSelectedGoal(r.data[0]);
      flashHud("Your user environment goals have been safely reset to showcase templates!", "success");
    } catch {
      flashHud("Failed to reset database", "error");
    } finally {
      setGoalsLoading(false);
    }
  };

  // 2. Goal Creation (Planner Agent)
  const handleCreateGoal = async (e: FormEvent) => {
    e.preventDefault();
    if (!newGoalInput.trim() || !newDeadlineInput) {
      flashHud("Please complete both the goal objective and deadline.", "error");
      return;
    }

    setPlanningMode(true);
    flashHud("Initializing AI Planner Agent. Analyzing objectives...", "info");
    try {
      const res = await fetch("/api/planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: newGoalInput.trim(), deadline: newDeadlineInput })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to parse planning response");
      }

      const generatedPlan: Goal = await res.json();
      
      // Post model to Express db for persistence
      const saveRes = await fetch("/api/goals", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-email": user?.email || ""
        },
        body: JSON.stringify(generatedPlan)
      });
      const savedGoal = await saveRes.json();

      setGoals((prev) => [...prev, savedGoal]);
      setSelectedGoal(savedGoal);
      setNewGoalInput("");
      setNewDeadlineInput("");
      flashHud("Goal successfully constructed, scoped, and scheduled by AI Architect!", "success");
    } catch (err: any) {
      flashHud(err.message || "Unable to engage AI planner. Please try another prompt.", "error");
    } finally {
      setPlanningMode(false);
    }
  };

  // 3. Delete Goal
  const handleDeleteGoal = async (id: string) => {
    if (!confirm("Are you sure you want to terminate this Deadline Goal?")) return;
    try {
      const res = await fetch(`/api/goals/${id}`, { 
        method: "DELETE",
        headers: {
          "x-user-id": user?.id || "",
          "x-user-email": user?.email || ""
        }
      });
      if (res.ok) {
        flashHud("Goal cancelled from timeline.", "info");
        fetchAllGoals(true);
      }
    } catch {
      flashHud("Failed to delete goal", "error");
    }
  };

  // 4. Toggle Task (Prioritizer & Immediate Scheduler synchronization)
  const handleToggleTask = async (taskId: string) => {
    if (!selectedGoal) return;
    setActionState(taskId);

    const updatedTasks = selectedGoal.tasks.map((t) => {
      if (t.id === taskId) {
        return { ...t, done: !t.done, priority: (!t.done ? "Done" : "Do Today") as any };
      }
      return t;
    });

    // Calculate progression percentage
    const completes = updatedTasks.filter((t) => t.done).length;
    const progress = Math.round((completes / updatedTasks.length) * 100);

    // Dynamic Success & Risk adjustment based on simple linear scaling, wait until user hits re-evaluate or AI update
    let risk = selectedGoal.risk;
    let successProbability = selectedGoal.successProbability;

    if (progress > selectedGoal.progress) {
      successProbability = Math.min(100, successProbability + Math.round((100 - successProbability) * 0.15));
      if (successProbability > 65) risk = "Medium";
      if (successProbability > 85) risk = "Low";
    } else {
      successProbability = Math.max(10, successProbability - Math.round(successProbability * 0.15));
      if (successProbability < 65) risk = "Medium";
      if (successProbability < 45) risk = "High";
    }

    // Toggle Rescue Mode based on new stats
    const rescueMode = risk === "High";

    const updatedGoal: Goal = {
      ...selectedGoal,
      tasks: updatedTasks,
      progress,
      successProbability,
      risk,
      rescueMode
    };

    try {
      const res = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-email": user?.email || ""
        },
        body: JSON.stringify(updatedGoal)
      });
      if (res.ok) {
        const saved: Goal = await res.json();
        setSelectedGoal(saved);
        setGoals((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
        flashHud(progress === 100 ? "Goal achieved! Incredible hustle! 🏆" : "Workflow status modified.", "success");
      }
    } catch {
      flashHud("Failed to modify task state on database.", "error");
    } finally {
      setActionState(null);
    }
  };

  // 5. Accountability Coach Chat Integration
  const handleCoachSendMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || !selectedGoal || chatLoading) return;

    const userMsg = { role: "user" as const, text: chatInput.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/coach/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          currentGoal: selectedGoal
        })
      });

      if (!res.ok) throw new Error("Coach encountered an active block");
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "ai", text: data.reply }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "ai", text: "I hit a transient block on the communications server. Let me know what you want to focus on next!" }]);
    } finally {
      setChatLoading(false);
    }
  };

  // 6. Future Scenario Simulator Integration
  const runSimulation = async () => {
    if (!selectedGoal) return;
    setSimulating(true);
    setSimulationResult(null);
    flashHud("Projecting future workloads...", "info");

    const activeScenario = simulateSelect === "Custom..." ? customScenario : simulateSelect;

    try {
      const res = await fetch("/api/future/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: selectedGoal,
          scenario: activeScenario
        })
      });

      if (!res.ok) throw new Error("Simulation Agent failed to complete iteration");
      const data: FutureSimulationResult = await res.json();
      setSimulationResult(data);
      flashHud("Simulation calculation complete!", "success");
    } catch (err: any) {
      flashHud("Unable to fetch simulation: " + err.message, "error");
    } finally {
      setSimulating(false);
    }
  };

  // 7. Smart Radar Sync Extractor Integration
  const handleRadarScan = async () => {
    if (!radarInput.trim()) {
      flashHud("Please choose a prompt template or write custom notification logs.", "error");
      return;
    }

    setRadarScanning(true);
    setRadarResult(null);
    flashHud("Smart Radar Agent scanning communications...", "info");

    try {
      const res = await fetch("/api/sync/radar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceText: radarInput,
          sourceType: radarSourceType
        })
      });

      if (!res.ok) throw new Error("Scan agent failed");
      const data: RadarResult = await res.json();
      setRadarResult(data);
      flashHud("System successfully extracted new scheduled items & priorities!", "success");
    } catch (err: any) {
      flashHud("Radar failed to identify structure: " + err.message, "error");
    } finally {
      setRadarScanning(false);
    }
  };

  // Inject extracted radar template items immediately to the active project
  const injectExtractedRadarTasks = async () => {
    if (!selectedGoal || !radarResult) return;

    const newTasks: Task[] = radarResult.extractedTasks.map((t, idx) => ({
      id: `task-radar-${Date.now()}-${idx}`,
      name: t.name,
      hours: t.hours,
      priority: t.priority as any,
      done: false,
      milestone: "Radar Alert Sync",
      dependency: "None"
    }));

    const mergedTasks = [...selectedGoal.tasks, ...newTasks];
    const riskReasons = [...selectedGoal.riskReasons, `Injected Task: ${radarResult.detectedEventName || "External event alert"}`];

    // Increase total hours, decrease success rate slightly as load increases
    const addedHours = newTasks.reduce((sum, t) => sum + t.hours, 0);
    const newProb = Math.max(15, selectedGoal.successProbability - Math.round(addedHours * 1.5));
    const newRisk = newProb < 45 ? "High" : newProb < 75 ? "Medium" : "Low";

    const updatedGoal: Goal = {
      ...selectedGoal,
      tasks: mergedTasks,
      riskReasons,
      successProbability: newProb,
      risk: newRisk as any,
      rescueMode: newRisk === "High"
    };

    try {
      const res = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-email": user?.email || ""
        },
        body: JSON.stringify(updatedGoal)
      });
      if (res.ok) {
        const saved: Goal = await res.json();
        setSelectedGoal(saved);
        setGoals((prev) => prev.map((g) => (g.id === saved.id ? saved : g)));
        setRadarResult(null);
        setRadarInput("");
        flashHud(`${newTasks.length} tasks successfully appended into your current active goal!`, "success");
        setActiveTab("tasks");
      }
    } catch {
      flashHud("Failed to append dynamic tasks", "error");
    }
  };

  // 8. Autonomous Action Generator Integration
  const dispatchAutonomousAction = async (actionType: "calendar" | "reminder" | "email" | "roadmap") => {
    if (!selectedGoal) return;
    setAutomating(true);
    setAutonomousResult(null);
    flashHud(`Agent executing: Creating dynamic ${actionType} delivery...`, "info");

    try {
      const res = await fetch("/api/autonomous/act", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: selectedGoal,
          actionType
        })
      });

      if (!res.ok) throw new Error("Autonomous Action Agent error");
      const data: AutonomousActResult = await res.json();
      setAutonomousResult(data);
      flashHud("Dynamic action executed! Code delivery complete.", "success");
    } catch (err: any) {
      flashHud("Autonomous action failed to execute: " + err.message, "error");
    } finally {
      setAutomating(false);
    }
  };

  // 9. Re-assess active goal risk profile with backend AI
  const triggerAIRiskReassessment = async () => {
    if (!selectedGoal) return;
    setGoalsLoading(true);
    flashHud("Collaborative agents scoring active goal progression...", "info");
    try {
      // Re-trigger a fresh breakdown
      const res = await fetch("/api/planner/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: selectedGoal.title, deadline: selectedGoal.deadline })
      });
      if (!res.ok) throw new Error("Fail");
      const generated: Goal = await res.json();
      
      // Preserve done statuses on matching tasks where possible
      const syncedTasksList = generated.tasks.map((newT) => {
        const matched = selectedGoal.tasks.find((oldT) => oldT.name.toLowerCase().trim() === newT.name.toLowerCase().trim());
        if (matched) {
          return { ...newT, done: matched.done, id: matched.id };
        }
        return newT;
      });

      const doneCount = syncedTasksList.filter((t) => t.done).length;
      const progress = Math.round((doneCount / syncedTasksList.length) * 100);

      const mergedGoal: Goal = {
        ...generated,
        id: selectedGoal.id,
        tasks: syncedTasksList,
        progress
      };

      const saveRes = await fetch(`/api/goals/${selectedGoal.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-id": user?.id || "",
          "x-user-email": user?.email || ""
        },
        body: JSON.stringify(mergedGoal)
      });
      const savedGoal = await saveRes.json();
      
      setSelectedGoal(savedGoal);
      setGoals((prev) => prev.map((g) => (g.id === savedGoal.id ? savedGoal : g)));
      flashHud("Agent assessments synchronized! Successful re-schedule calculated.", "success");
    } catch {
      flashHud("Failed to recalculate risk scores.", "error");
    } finally {
      setGoalsLoading(false);
    }
  };

  // Navigation and sidebar items
  const sidebarTabs = [
    { id: "overview", label: "Overview", icon: Activity, desc: "Predictive scorecard & metrics" },
    { id: "tasks", label: "Tasks", icon: CheckCircle2, desc: "Decomposed task categories" },
    { id: "schedule", label: "Schedule", icon: Calendar, desc: "Automatic workflow blocks" },
    { id: "radar", label: "Radar", icon: Sliders, desc: "Input scan & sync integrations" },
    { id: "simulate", label: "Simulate", icon: Sliders, desc: "Simulation scenario metrics" },
    { id: "actions", label: "Actions", icon: Sparkles, desc: "Dynamic calendars, drafts & maps" },
    { id: "coach", label: "Coach", icon: Brain, desc: "Chief of Staff coach interactive" }
  ];

  // Helper values
  const countDaysLeft = (deadlineStr: string) => {
    const days = Math.ceil((new Date(deadlineStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days < 0 ? 0 : days;
  };

  const getRiskMarkupColors = (risk: "High" | "Medium" | "Low") => {
    switch (risk) {
      case "High":
        return { text: "text-rose-500", border: "border-rose-500/20", bg: "bg-rose-500/5", badge: "bg-rose-500/10 text-rose-500" };
      case "Medium":
        return { text: "text-amber-500", border: "border-amber-500/20", bg: "bg-amber-500/5", badge: "bg-amber-500/10 text-amber-500" };
      case "Low":
        return { text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-500/5", badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" };
    }
  };

  const handleAuthSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    
    try {
      if (!supabase) {
        throw new Error("Supabase is not configured. Please add your credentials to .env.local");
      }
      
      if (authProviderTab === "email") {
        if (authMode === "login") {
          const { error } = await supabase.auth.signInWithPassword({
            email: authEmail.trim(),
            password: authPassword
          });
          if (error) throw error;
          flashHud("Logged in successfully!", "success");
        } else {
          const { error } = await supabase.auth.signUp({
            email: authEmail.trim(),
            password: authPassword,
            options: {
              data: {
                full_name: authName.trim() || undefined
              }
            }
          });
          if (error) throw error;
          flashHud("Check your email for confirmation link!", "info");
        }
      }
    } catch (err: any) {
      flashHud(err.message || "Authentication attempt hit an unexpected obstacle", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    try {
      if (!supabase) {
        throw new Error("Supabase is not configured. Please add your credentials to .env.local");
      }
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      flashHud(err.message || "Google Authentication attempt hit an unexpected obstacle", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setUser(null);
      localStorage.removeItem("dg_active_user");
      setSelectedGoal(null);
      setGoals([]);
      flashHud("Logged out successfully.", "info");
    } catch (err: any) {
      flashHud("Sign out failed: " + err.message, "error");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-mat-bg text-mat-text font-sans antialiased flex flex-col items-center justify-center p-6 selection:bg-mat-primary selection:text-white relative overflow-hidden">
        
        {/* HUD FLASHES */}
        {hudMessage && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full border shadow-md bg-mat-secondary border-mat-border">
            <span className={`w-2 h-2 rounded-full ${hudMessage.type === "success" ? "bg-mat-green" : hudMessage.type === "error" ? "bg-mat-pink" : "bg-mat-primary"}`} />
            <p className="text-[11px] font-mono tracking-tight text-mat-text">{hudMessage.text}</p>
          </div>
        )}

        <div className="w-full max-w-md rounded-2xl border border-mat-border bg-mat-secondary p-10 shadow-[0_1px_3px_0_rgba(60,64,67,0.3),_0_4px_8px_3px_rgba(60,64,67,0.15)] relative z-10 animate-fade-in">
          {/* Theme Toggle in Login Screen */}
          <button
            onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-mat-text-secondary hover:bg-mat-tertiary transition-all cursor-pointer"
            title="Toggle Light/Dark Theme"
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-mat-orange" />}
          </button>

          <div className="flex flex-col items-center gap-3 text-center mb-8">
            <div className="flex h-12 w-12 items-center justify-center text-mat-primary mb-2">
              <ShieldAlert className="h-10 w-10" />
            </div>
            <div>
              <span className="text-xl font-medium tracking-tight text-mat-text font-sans flex items-center justify-center gap-1.5">
                Deadline Guardian <span className="bg-mat-primary/10 text-mat-primary text-[10px] px-2 py-0.5 rounded-full font-bold">AI</span>
              </span>
              <p className="text-sm text-mat-text-secondary mt-1">Autonomous Productivity Chief of Staff</p>
            </div>
            
            
          </div>

          {/* Tab Selection */}
          <div className="flex border-b border-mat-border mb-6">
            <button
              onClick={() => setAuthProviderTab("email")}
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                authProviderTab === "email" ? "border-mat-primary text-mat-primary" : "border-transparent text-mat-text-secondary hover:text-mat-text"
              }`}
            >
              Email/Password
            </button>
            <button
              onClick={() => setAuthProviderTab("google")}
              className={`flex-1 py-3 text-sm font-medium transition-all border-b-2 ${
                authProviderTab === "google" ? "border-mat-primary text-mat-primary" : "border-transparent text-mat-text-secondary hover:text-mat-text"
              }`}
            >
              Google
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="flex flex-col gap-5">
            {authProviderTab === "email" && (
              <>
                {authMode === "register" && (
                  <div>
                    <input
                      type="text"
                      required
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="Full Name"
                      className="w-full rounded-md border border-mat-border bg-mat-bg px-4 py-3 text-sm text-mat-text placeholder-mat-text-secondary focus:outline-none focus:border-mat-primary focus:ring-1 focus:ring-mat-primary transition-all"
                    />
                  </div>
                )}
                <div>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="Email Address"
                    className="w-full rounded-md border border-mat-border bg-mat-bg px-4 py-3 text-sm text-mat-text placeholder-mat-text-secondary focus:outline-none focus:border-mat-primary focus:ring-1 focus:ring-mat-primary transition-all"
                  />
                </div>
                <div>
                  <input
                    type="password"
                    required
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full rounded-md border border-mat-border bg-mat-bg px-4 py-3 text-sm text-mat-text placeholder-mat-text-secondary focus:outline-none focus:border-mat-primary focus:ring-1 focus:ring-mat-primary transition-all"
                  />
                </div>
              </>
            )}

            {authProviderTab === "google" && (
              <div className="flex flex-col gap-4 py-2">
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={authLoading}
                  className="w-full flex items-center justify-center gap-3 rounded-full border border-mat-border bg-mat-secondary text-mat-text hover:bg-mat-tertiary font-medium text-sm py-2.5 transition-all cursor-pointer"
                >
                  <Chrome className="h-5 w-5 text-mat-primary" />
                  <span>Sign in with Google</span>
                </button>
                <p className="text-xs text-center text-mat-text-secondary mt-2">
                  Uses Supabase unified Single Sign-On.
                </p>
              </div>
            )}

            {authProviderTab !== "google" && (
              <button
                type="submit"
                disabled={authLoading}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-mat-primary hover:bg-mat-primary-hover text-white font-medium text-sm py-3 transition-all cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>
                    {authMode === "login"
                      ? "Sign in"
                      : "Create account"}
                  </span>
                )}
              </button>
            )}

            {authProviderTab === "email" && (
              <div className="text-center mt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}
                  className="text-sm font-medium text-mat-primary hover:underline"
                >
                  {authMode === "login"
                    ? "Create account"
                    : "Sign in instead"}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Dynamic Productivity Score calculations
  const calculateProductivityScore = () => {
    if (goals.length === 0) return 80; // Default baseline when clear of work
    
    let totalTasks = 0;
    let completedTasks = 0;
    let highRiskCount = 0;
    let medRiskCount = 0;
    
    goals.forEach((g) => {
      totalTasks += g.tasks.length;
      completedTasks += g.tasks.filter((t) => t.done).length;
      if (g.risk === "High") highRiskCount++;
      else if (g.risk === "Medium") medRiskCount++;
    });
    
    const taskCompletionRate = totalTasks > 0 ? (completedTasks / totalTasks) : 0.5;
    
    // Base score shifts from 60 to 90 based on task completions, plus 10 points bonus if all tasks are done
    let score = 60 + (taskCompletionRate * 30);
    if (taskCompletionRate === 1.0 && totalTasks > 0) score += 10;
    
    // Penalize based on active project risk levels
    score -= (highRiskCount * 12);
    score -= (medRiskCount * 4);
    
    // Streak bonus: up to +5 points for consistent daily check-ins
    score += Math.min(5, streak * 0.5);

    return Math.max(15, Math.min(100, Math.round(score)));
  };

  const dynamicScore = calculateProductivityScore();

  // Dynamic Focus window calculations
  const getDynamicFocusWindow = () => {
    if (selectedGoal) {
      return {
        window: selectedGoal.bestWindow,
        multiplier: (2.0 + (selectedGoal.tasks.filter((t) => t.done).length * 0.2)).toFixed(1)
      };
    }
    return {
      window: "7 PM – 10 PM",
      multiplier: "3.2"
    };
  };

  const focusData = getDynamicFocusWindow();

  // Score color based on value
  const scoreColor = dynamicScore >= 75 ? "#30D158" : dynamicScore >= 50 ? "#FF9500" : "#FF453A";

  return (
    <div className="min-h-screen bg-mat-bg text-mat-text font-sans antialiased selection:bg-mat-primary selection:text-white pb-20 lg:pb-6 overflow-x-hidden">
      {/* 1. TOP STATS STATUS HUD */}
      {hudMessage && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full border backdrop-blur-md shadow-md animate-fade-in bg-mat-secondary/90 border-mat-border">
          <span className={`w-2 h-2 rounded-full ${hudMessage.type === "success" ? "bg-mat-green" : hudMessage.type === "error" ? "bg-mat-pink" : "bg-mat-primary"}`} />
          <p className="text-[11px] font-mono tracking-tight text-mat-text">{hudMessage.text}</p>
        </div>
      )}

      {/* POMODORO TIMER OVERLAY */}
      {showPomodoro && (
        <div className="fixed bottom-20 right-3 z-40 w-44 sm:w-52 lg:bottom-6 lg:right-4 rounded-2xl border border-mat-border bg-mat-secondary shadow-md p-3 sm:p-4 flex flex-col items-center gap-2 sm:gap-3 animate-fade-in">
          <div className="flex items-center justify-between w-full">
            <span className="text-[10px] font-bold uppercase tracking-wider text-mat-text-secondary flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {pomodoroMode === "focus" ? "Focus Session" : "Break Time"}
            </span>
            <button onClick={() => setShowPomodoro(false)} className="text-mat-text-secondary hover:text-mat-text text-[10px] font-mono cursor-pointer">✕</button>
          </div>
          <div className={`text-4xl font-bold font-mono tracking-tight ${pomodoroMode === "focus" ? "text-mat-primary" : "text-mat-green"}`}>
            {formatPomodoroTime(pomodoroSeconds)}
          </div>
          <div className="flex gap-2 w-full">
            <button
              onClick={() => setPomodoroActive(!pomodoroActive)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${pomodoroActive ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" : "bg-mat-primary text-white"}`}
            >
              {pomodoroActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {pomodoroActive ? "Pause" : "Start"}
            </button>
            <button onClick={resetPomodoro} className="px-3 py-2 rounded-xl bg-mat-tertiary text-mat-text-secondary hover:text-mat-text transition-all cursor-pointer border border-mat-border">
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
          <div className="text-[10px] text-mat-text-secondary font-mono">
            Sessions today: <span className="text-mat-primary font-bold">{pomodoroSessions}</span>
          </div>
        </div>
      )}

      {/* ===== FOCUS MUSIC PLAYER OVERLAY ===== */}
      {showMusicPlayer && (
        <div className="fixed bottom-20 left-3 z-40 w-56 sm:w-64 lg:w-72 lg:bottom-6 lg:left-4 rounded-2xl border border-mat-border bg-mat-secondary shadow-md overflow-hidden animate-fade-in music-widget-mobile-hidden sm:block">
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: `linear-gradient(135deg, ${activeTrackMeta.color}22, ${activeTrackMeta.color}08)`, borderBottom: `1px solid ${activeTrackMeta.color}30` }}
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: `${activeTrackMeta.color}20` }}>
                <Music className="h-3.5 w-3.5" style={{ color: activeTrackMeta.color }} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: activeTrackMeta.color }}>Focus Music</p>
                <p className="text-[9px] text-mat-text-secondary font-mono">Web Audio Engine</p>
              </div>
            </div>
            <button onClick={() => setShowMusicPlayer(false)} className="text-mat-text-secondary hover:text-mat-text text-xs font-mono cursor-pointer">✕</button>
          </div>

          {/* Now Playing */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs font-bold text-mat-text">{activeTrackMeta.emoji} {activeTrackMeta.label}</p>
                <p className="text-[10px] text-mat-text-secondary mt-0.5">{activeTrackMeta.desc}</p>
              </div>
              {/* Animated waveform bars when playing */}
              <div className="flex items-end gap-0.5 h-6">
                {[1,2,3,4,5].map((_, i) => (
                  <div
                    key={i}
                    className="w-1 rounded-full transition-all"
                    style={{
                      background: activeTrackMeta.color,
                      height: musicPlaying ? `${30 + Math.sin(Date.now()/300 + i) * 20}%` : "20%",
                      opacity: musicPlaying ? 1 : 0.3,
                      animation: musicPlaying ? `waveBar ${0.6 + i * 0.15}s ease-in-out infinite alternate` : "none"
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Big play button */}
            <button
              onClick={toggleMusic}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl font-bold text-sm text-white transition-all cursor-pointer hover:opacity-90 active:scale-[0.97] mb-3"
              style={{ background: `linear-gradient(135deg, ${activeTrackMeta.color}, ${activeTrackMeta.color}bb)`, boxShadow: `0 6px 24px ${activeTrackMeta.color}40` }}
            >
              {musicPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {musicPlaying ? "Pause" : "Play"}
            </button>

            {/* Volume Slider */}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setMusicVolume(0)} className="text-mat-text-secondary hover:text-mat-text cursor-pointer">
                <VolumeX className="h-3.5 w-3.5" />
              </button>
              <input
                type="range" min={0} max={1} step={0.01}
                value={musicVolume}
                onChange={e => setMusicVolume(parseFloat(e.target.value))}
                className="flex-1 h-1.5 rounded-full cursor-pointer accent-[#0A84FF]"
                style={{ accentColor: activeTrackMeta.color }}
              />
              <button onClick={() => setMusicVolume(1)} className="text-mat-text-secondary hover:text-mat-text cursor-pointer">
                <Volume2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Track Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {MUSIC_TRACKS.map(t => (
                <button
                  key={t.id}
                  onClick={() => switchTrack(t.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-2xl border text-center transition-all cursor-pointer hover:scale-[1.03] active:scale-[0.97] ${
                    musicTrack === t.id
                      ? "border-2 shadow-lg"
                      : "border-mat-border bg-mat-bg/40 hover:bg-mat-tertiary"
                  }`}
                  style={musicTrack === t.id ? { borderColor: t.color, background: `${t.color}12`, boxShadow: `0 4px 16px ${t.color}25` } : {}}
                >
                  <span className="text-base">{t.emoji}</span>
                  <span className="text-[9px] font-bold leading-tight" style={{ color: musicTrack === t.id ? t.color : undefined }}>
                    {t.label.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>

            {/* Info note */}
            <p className="text-[9px] text-mat-text-secondary text-center mt-3 font-mono">
              Generated live · Web Audio API · No network needed
            </p>
          </div>
        </div>
      )}

      {/* Waveform animation keyframes */}
      <style>{`
        @keyframes waveBar {
          from { height: 20%; }
          to   { height: 90%; }
        }
      `}</style>

      {/* HEADER BAR */}
      <header className="sticky top-0 z-40 w-full border-b border-mat-border bg-mat-secondary">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center text-mat-primary">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <div>
              <span className="text-xl font-medium tracking-tight text-mat-text font-sans flex items-center gap-2">
                Deadline Guardian <span className="bg-mat-primary/10 text-mat-primary text-[10px] px-2 py-0.5 rounded-full font-bold">AI</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {/* Music Player Toggle */}
            <button
              onClick={() => setShowMusicPlayer(!showMusicPlayer)}
              title="Focus Music"
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer ${
                musicPlaying
                  ? "border-purple-500/40 bg-purple-500/10 text-purple-500 animate-pulse"
                  : "border-mat-border bg-mat-secondary text-mat-text-secondary hover:text-mat-text hover:bg-mat-tertiary"
              }`}
            >
              <Music className="h-3.5 w-3.5" />
            </button>

            {/* Pomodoro Toggle */}
            <button
              onClick={() => setShowPomodoro(!showPomodoro)}
              title="Focus Timer"
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-all cursor-pointer ${pomodoroActive ? "border-mat-primary/40 bg-mat-primary/10 text-mat-primary animate-pulse" : "border-mat-border bg-mat-secondary text-mat-text-secondary hover:text-mat-text hover:bg-mat-tertiary"}`}
            >
              <Timer className="h-3.5 w-3.5" />
            </button>

            {/* Theme Toggle Button */}
            <button
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title={`Switch to ${theme === "light" ? "Dark" : "Light"} Mode`}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-mat-border bg-mat-secondary text-mat-text hover:bg-mat-tertiary transition-all cursor-pointer"
            >
              {theme === "light" ? (
                <Moon className="h-3.5 w-3.5 text-slate-600" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-400" />
              )}
            </button>

            <div className="h-4 w-px bg-mat-border hidden md:block" />
            <button
              onClick={resetDemoDB}
              className="hidden md:flex items-center gap-1.5 rounded-full border border-mat-border bg-mat-secondary px-3 py-1.5 text-[11px] text-mat-primary hover:bg-mat-tertiary transition-all cursor-pointer font-medium"
              title="Reset Demo Timelines"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Reset Demo</span>
            </button>
            <div className="flex items-center gap-1.5" title="Synced to Cloud">
              <span className="h-2 w-2 rounded-full bg-mat-green animate-pulse" />
              <span className="text-[11px] font-mono text-mat-text-secondary hidden md:inline">Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl grid-cols-1 gap-3 p-3 md:p-6 lg:grid-cols-12 w-full">
        {/* ================= SIDEBAR PANEL ================= */}
        <section className="lg:col-span-4 flex flex-col gap-4">
          {/* PROFILE CARD */}
          <div className="rounded-[24px] border border-mat-border bg-mat-secondary p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#0A84FF] to-[#5E5CE6] text-white font-extrabold text-sm shadow-inner uppercase">
                  {user.name ? user.name.slice(0, 2) : "US"}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] uppercase tracking-wider text-mat-text-secondary font-extrabold font-mono flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${user.authProvider === "local" ? "bg-amber-400" : "bg-mat-green"}`} />
                    {user.authProvider === "local" ? "Sandbox Guest" : "Cloud Active"}
                  </span>
                  <h3 className="text-[14px] font-black text-mat-text tracking-tight leading-none mt-1 truncate max-w-[145px]">{user.name}</h3>
                  <span className="text-[9px] text-mat-text-secondary font-mono truncate block mt-0.5 max-w-[145px]">
                    {user.email || user.phone || "Offline Session"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Daily Streak Badge */}
                <button
                  onClick={handleDailyCheckIn}
                  title="Daily Check-In"
                  className="flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-400/10 px-2.5 py-1 text-[10px] font-bold text-orange-500 hover:bg-orange-400/20 transition-all cursor-pointer"
                >
                  <Flame className="h-3 w-3" />
                  {streak}
                </button>
                <button
                  onClick={handleSignOut}
                  title="Log Out Profile"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-mat-border bg-mat-tertiary text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* PRODUCTIVITY HUD */}
            <div className="rounded-2xl border border-mat-border bg-mat-tertiary p-4">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-semibold text-mat-text flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5" style={{ color: scoreColor }} />
                  Productivity Score
                </span>
                <span className="font-bold text-mat-text font-mono">{dynamicScore} / 100</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-mat-bg/60 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${dynamicScore}%`, background: `linear-gradient(90deg, ${scoreColor}, ${scoreColor}aa)` }}
                />
              </div>
              <p className="text-[10px] text-mat-text-secondary mt-3 font-sans leading-relaxed">
                You are <span className="font-semibold" style={{ color: "#30D158" }}>{focusData.multiplier}x more focused</span> between <span className="text-mat-primary font-semibold font-mono">{focusData.window}</span> daily.
              </p>
              {/* Rotating Motivational Quote */}
              <div className="mt-3 pt-3 border-t border-mat-border">
                <div className="flex items-start gap-2">
                  <Quote className="h-3 w-3 text-mat-primary/60 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-mat-text-secondary italic leading-relaxed">"{currentQuote.text}"</p>
                    <p className="text-[9px] text-mat-text-secondary/60 font-mono mt-1">— {currentQuote.author}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Streak Info Row */}
            {streak > 0 && (
              <div className="mt-3 flex items-center justify-between rounded-xl bg-orange-400/5 border border-orange-400/15 px-3 py-2">
                <div className="flex items-center gap-2">
                  <Flame className="h-4 w-4 text-orange-500" />
                  <span className="text-[11px] font-semibold text-mat-text">
                    {streak} day{streak !== 1 ? "s" : ""} streak!
                  </span>
                </div>
                <span className="text-[10px] text-orange-500 font-mono font-bold">
                  {streak >= 7 ? "🏆 Week!" : streak >= 3 ? "🔥 Hot!" : "Keep going!"}
                </span>
              </div>
            )}
          </div>

          {/* ACTIVE GOALS HUB */}
          <div className="rounded-[24px] border border-mat-border bg-mat-secondary p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-mat-border pb-3">
              <h2 className="text-[11px] font-bold tracking-wider text-mat-text-secondary uppercase">Guardian Timelines</h2>
              <span className="rounded-full bg-mat-primary/10 px-2.5 py-0.5 text-[9px] font-extrabold text-mat-primary font-mono">
                {goals.length} ACTIVE
              </span>
            </div>

            {/* CREATE GOAL BOX */}
            <form onSubmit={handleCreateGoal} className="rounded-2xl bg-mat-bg/40 border border-mat-border p-4 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 border-b border-mat-border pb-2.5 text-mat-text">
                <Sparkles className="h-4 w-4 text-[#FFD60A]" />
                <span className="text-xs font-bold">Deploy New Agent Planner</span>
              </div>
              <div>
                <label className="text-[9px] text-mat-text-secondary font-mono uppercase block mb-1.5 tracking-wider">Goal Aim</label>
                <input
                  type="text"
                  required
                  value={newGoalInput}
                  onChange={(e) => setNewGoalInput(e.target.value)}
                  placeholder="e.g. Study for Exam in 6 Days"
                  className="w-full rounded-xl border border-mat-border bg-mat-tertiary px-3 py-2 text-xs text-mat-text placeholder-slate-400 focus:outline-none focus:border-mat-primary/50"
                />
              </div>
              <div>
                <label className="text-[9px] text-mat-text-secondary font-mono uppercase block mb-1.5 tracking-wider">Deadline Date</label>
                <input
                  type="date"
                  required
                  value={newDeadlineInput}
                  onChange={(e) => setNewDeadlineInput(e.target.value)}
                  className="w-full rounded-xl border border-mat-border bg-mat-tertiary px-3 py-2 text-xs text-mat-text focus:outline-none focus:border-mat-primary/50"
                />
              </div>
              <button
                type="submit"
                disabled={planningMode}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-mat-primary hover:opacity-90 text-white font-semibold text-xs py-2.5 shadow-md shadow-mat-primary/10 transition-all cursor-pointer disabled:opacity-55"
              >
                {planningMode ? (
                  <>
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    <span>Analyzing constraints...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-3.5 w-3.5" />
                    <span>Initialize AI Plan</span>
                  </>
                )}
              </button>
            </form>

            {/* GOALS LOOP LIST */}
            {goalsLoading ? (
              <div className="flex py-8 flex-col items-center justify-center text-mat-text-secondary">
                <RefreshCw className="h-6 w-6 animate-spin text-mat-primary mb-2.5" />
                <span className="text-xs font-mono">Synchronizing state...</span>
              </div>
            ) : goals.length === 0 ? (
              <div className="text-center py-8 text-mat-text-secondary">
                <Info className="h-6 w-6 mx-auto mb-2 text-mat-text-secondary/70" />
                <p className="text-xs font-normal">No active goals. Add your first timeline above.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {goals.map((g) => {
                  const daysLeft = countDaysLeft(g.deadline);
                  const isSelected = selectedGoal?.id === g.id;
                  const c = getRiskMarkupColors(g.risk);
                  
                  return (
                    <div
                      key={g.id}
                      onClick={() => {
                        setSelectedGoal(g);
                        setMessages([]); 
                        setSimulationResult(null); 
                        setAutonomousResult(null); 
                      }}
                      className={`relative rounded-2xl border p-4 cursor-pointer transition-all border-l-4 ${
                        isSelected
                          ? "bg-mat-tertiary border-mat-border border-l-mat-primary shadow-lg scale-[1.01]"
                          : "bg-mat-secondary border-mat-border border-l-transparent hover:bg-mat-tertiary"
                      }`}
                    >
                      {g.rescueMode && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-mat-pink/10 px-2 py-0.5 text-[8px] font-bold text-mat-pink border border-mat-pink/20">
                          RESCUE
                        </div>
                      )}
                      
                      <h3 className="text-xs font-bold text-mat-text mb-2 max-w-[70%] line-clamp-1">{g.title}</h3>
                      
                      <div className="flex items-center gap-2 justify-between mb-3">
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                          g.risk === "High" ? "bg-mat-pink/10 text-mat-pink" : g.risk === "Medium" ? "bg-[#FF9500]/10 text-[#FF9500]" : "bg-mat-green/10 text-emerald-600 dark:text-mat-green"
                        }`}>
                          {g.risk} Risk
                        </span>
                        <span className="text-[10px] font-medium text-mat-text-secondary">
                          {daysLeft === 0 ? "⚠️ Passed" : `${daysLeft}d left`}
                        </span>
                      </div>

                      {/* Progress widget */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1 rounded-full bg-mat-bg/40 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-mat-primary"
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-mat-text">{g.progress}%</span>
                      </div>

                      {/* Delete option */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGoal(g.id);
                        }}
                        className="absolute bottom-3 right-3 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 hover:opacity-100 text-mat-text-secondary hover:text-red-500 p-1 rounded hover:bg-mat-tertiary transition-all"
                        title="Delete Goal"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ================= MAIN CONTENT WORKSPACE ================= */}
        <section className="lg:col-span-8 flex flex-col gap-4">
          {selectedGoal ? (
            <div className="flex flex-col gap-4">
              {/* STAGE HEADER METRICS */}
              <div className="rounded-[24px] border border-mat-border bg-mat-secondary p-5 shadow-xl">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-mat-border pb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] text-mat-primary uppercase tracking-widest font-extrabold flex items-center gap-1">
                        <Zap className="h-3 w-3 text-[#FFD60A]" />
                        Live Blueprint Workspace
                      </span>
                    </div>
                    <h1 className="text-lg font-bold text-mat-text tracking-tight leading-tight">{selectedGoal.title}</h1>
                    <p className="text-[11px] text-mat-text-secondary mt-1 font-medium">
                      Due: {new Date(selectedGoal.deadline).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                    </p>
                    {/* Live Countdown */}
                    <div className="flex items-center gap-1.5 mt-2">
                      <Clock className="h-3 w-3 text-[#FF9500]" />
                      <span className="text-[11px] font-mono font-bold text-[#FF9500]">{countdownStr}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-center rounded-2xl bg-mat-bg/45 border border-mat-border px-4 py-2.5 min-w-[80px]">
                      <span className="text-xl font-bold font-mono tracking-tight text-mat-text">{selectedGoal.progress}%</span>
                      <p className="text-[9px] font-bold text-mat-text-secondary uppercase tracking-wider mt-0.5">Done</p>
                    </div>

                    <div className="text-center rounded-2xl bg-mat-bg/45 border border-mat-border px-4 py-2.5 min-w-[80px]">
                      <span className={`text-xl font-bold font-mono tracking-tight ${
                        selectedGoal.risk === "High" ? "text-mat-pink" : selectedGoal.risk === "Medium" ? "text-[#FF9500]" : "text-emerald-600 dark:text-mat-green"
                      }`}>{selectedGoal.successProbability}%</span>
                      <p className="text-[9px] font-bold text-mat-text-secondary uppercase tracking-wider mt-0.5">Success</p>
                    </div>

                    {/* Export Button */}
                    <button
                      onClick={handleExportSummary}
                      title="Export Progress Summary"
                      className="flex h-10 w-10 items-center justify-center rounded-xl border border-mat-border bg-mat-tertiary text-mat-text-secondary hover:text-mat-primary hover:border-mat-primary/30 hover:bg-mat-primary/5 transition-all cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* VISUAL COMPONENT NAVIGATION (Segmented Control) */}
                <div className="bg-mat-bg/40 p-1 rounded-full flex gap-0.5 items-center mt-4 overflow-x-auto select-none no-scrollbar">
                  {sidebarTabs.map((tab) => {
                    const IconComp = tab.icon;
                    const isTabActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all whitespace-nowrap cursor-pointer border ${
                          isTabActive
                            ? "bg-mat-primary text-white border-transparent shadow-sm font-semibold"
                            : "bg-transparent border-transparent text-mat-text-secondary hover:text-mat-text hover:bg-mat-tertiary/50"
                        }`}
                      >
                        <IconComp className="h-3 w-3" />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ACTION HUD ALERT FOR RESCUE MODE */}
              {selectedGoal.rescueMode && (
                <div className="rounded-2xl border border-rose-500/25 bg-rose-500/[0.04] p-5 shadow-inner">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <span className="text-xs font-mono font-extrabold text-rose-500 uppercase tracking-widest">Rescue Mode Engaged</span>
                      <p className="text-xs text-mat-text font-sans mt-1">
                        High milestone congestion and lagging tasks detected. AI agents generated a trimmed contingency plan to save your deadline.
                      </p>
                      
                      {selectedGoal.rescuePlan && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                          <div className="rounded-xl border border-rose-500/20 bg-mat-bg/20 p-3.5">
                            <span className="text-[10px] font-mono text-rose-500 uppercase block mb-2 font-bold">⚠️ CRITICAL MUST-DO TASKS</span>
                            <ul className="flex flex-col gap-1.5">
                              {selectedGoal.rescuePlan.criticalTasks.map((t, idx) => (
                                <li key={idx} className="text-xs flex items-center gap-1.5 text-mat-text">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  <span className="line-clamp-1">{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-mat-border bg-mat-bg/20 p-3.5">
                            <span className="text-[10px] font-mono text-mat-text-secondary uppercase block mb-2 font-bold">🚫 COOLDOWNS / CAN DELAY</span>
                            <ul className="flex flex-col gap-1.5">
                              {selectedGoal.rescuePlan.tasksToSkip.map((t, idx) => (
                                <li key={idx} className="text-xs flex items-center gap-1.5 text-mat-text-secondary">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                  <span className="line-clamp-1">{t}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          <div className="md:col-span-2 rounded-xl border border-mat-border bg-mat-bg/30 p-3">
                            <span className="text-[10px] font-mono text-indigo-500 uppercase block mb-2 font-bold">💡 EMERGENCY ADVISORY HACKS</span>
                            <div className="flex flex-col gap-2">
                              {selectedGoal.rescuePlan.emergencyTips.map((tip, idx) => (
                                <p key={idx} className="text-xs text-mat-text italic">
                                  "{tip}"
                                </p>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= ACTIVE VIEW DISPLAY ================= */}
              <div className="rounded-[24px] border border-mat-border bg-mat-secondary p-5 shadow-xl min-h-[480px]">
                
                {/* 1. OVERVIEW HUD */}
                {activeTab === "overview" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-fadeIn">
                    {/* RISK CENTER & ASSESSMENT REASONS */}
                    <div className="rounded-2xl border border-mat-border bg-mat-bg/45 p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between border-b border-mat-border pb-2.5">
                        <span className="text-[11px] font-bold text-amber-600 dark:text-[#FFD60A] uppercase tracking-wider">Active Risk Analytics</span>
                        <button
                          onClick={triggerAIRiskReassessment}
                          className="flex items-center gap-1.5 text-[10px] bg-mat-primary/10 hover:bg-mat-primary text-mat-primary hover:text-white px-3 py-1.5 rounded-full transition-all font-sans font-medium border border-mat-primary/20"
                        >
                          <RefreshCw className="h-3 w-3" />
                          <span>Run Audit</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-3">
                        {selectedGoal.riskReasons.map((r, i) => (
                          <div key={i} className="flex items-start gap-3 rounded-xl bg-mat-secondary border border-mat-border p-3">
                            <AlertTriangle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-mat-text leading-relaxed font-sans">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* DYNAMIC PROGRESS RADAR VISUALIZER */}
                    <div className="rounded-2xl border border-mat-border bg-mat-bg/45 p-5 flex flex-col items-center justify-center text-center gap-4">
                      <span className="text-[11px] font-bold text-mat-text-secondary uppercase tracking-wider block text-left self-start">Success Probability Dial</span>
                      
                      <div className="relative flex items-center justify-center p-2">
                        {/* Custom SVG speedometer chart */}
                        <svg className="w-36 h-36 transform -rotate-90">
                          <circle
                            cx="72"
                            cy="72"
                            r="50"
                            className="stroke-mat-border"
                            strokeWidth="9"
                            fill="transparent"
                          />
                          <circle
                            cx="72"
                            cy="72"
                            r="50"
                            stroke={selectedGoal.risk === "High" ? "#FF453A" : selectedGoal.risk === "Medium" ? "#FF9500" : "#30D158"}
                            strokeWidth="9"
                            fill="transparent"
                            strokeDasharray={314}
                            strokeDashoffset={314 - (314 * selectedGoal.successProbability) / 100}
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-bold font-sans text-mat-text tracking-tight">
                            {selectedGoal.successProbability}%
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-widest text-mat-text-secondary">
                            probability
                          </span>
                        </div>
                      </div>

                      <div className="rounded-xl bg-mat-secondary border border-mat-border p-3 w-full">
                        <p className="text-[11px] text-mat-text-secondary leading-relaxed select-text italic text-center font-sans font-medium">
                          "Projections suggest completing items <span className="text-mat-primary font-semibold">within {selectedGoal.bestWindow}</span> will avoid timeline drift."
                        </p>
                      </div>
                    </div>

                    {/* PRODUCTIVITY TWIN INSIGHTS */}
                    <div className="md:col-span-2 rounded-2xl border border-mat-border bg-mat-bg/45 p-5 flex flex-col gap-4">
                      <div className="flex items-center gap-2">
                        <Activity className="h-4 w-4 text-emerald-600 dark:text-mat-green" />
                        <span className="text-[11px] font-bold text-mat-text uppercase tracking-wider">Your Productivity Twin Simulation</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        <div className="md:col-span-5 bg-mat-primary/5 border border-mat-primary/15 p-4 rounded-2xl flex flex-col justify-center">
                          <p className="text-[11px] text-mat-text-secondary font-medium">Peak Performance Window</p>
                          <h3 className="text-lg font-bold text-mat-primary tracking-tight my-1">{selectedGoal.bestWindow}</h3>
                          <p className="text-[10px] text-mat-text-secondary leading-relaxed">
                            Your Productivity Twin indicates you are <span className="text-emerald-600 dark:text-mat-green font-semibold">3x more productive</span> during evening slots and handle intense data revisions faster.
                          </p>
                        </div>

                        {/* Interactive focus times bar */}
                        <div className="md:col-span-7 flex flex-col gap-3 justify-center">
                          <span className="text-[9px] font-bold text-mat-text-secondary uppercase tracking-wider">Estimated 24-Hour Focus Pattern</span>
                          <div className="grid grid-cols-24 gap-0.5 sm:gap-1 h-10 w-full items-end bg-mat-secondary rounded-xl p-2 px-2 border border-mat-border">
                            {Array.from({ length: 24 }).map((_, hour) => {
                              const isPeak = selectedGoal.productivityHours.includes(hour);
                              const heightPercentage = isPeak ? "100%" : hour > 10 && hour < 16 ? "20%" : "45%";
                              const colorClass = isPeak ? "bg-mat-primary" : "bg-mat-border";
                              
                              return (
                                <div
                                  key={hour}
                                  title={`${hour}:00 focus block`}
                                  className="rounded-[2px] transition-all duration-500 w-full cursor-help hover:opacity-80"
                                  style={{ height: heightPercentage }}
                                >
                                  <div className={`h-full w-full rounded-[2px] ${colorClass}`} />
                                </div>
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-[9px] font-semibold text-mat-text-secondary tracking-wider uppercase px-1">
                            <span>12 AM</span>
                            <span>6 AM</span>
                            <span>12 PM</span>
                            <span>6 PM</span>
                            <span>11 PM</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PIPELINED TASKS */}
                {activeTab === "tasks" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-mat-border pb-3">
                      <span className="text-xs font-bold text-mat-text uppercase tracking-wide">Adaptive Prioritization Matrix</span>
                      <span className="text-[10px] font-mono text-mat-text-secondary font-semibold">
                        {selectedGoal.tasks.filter((t) => t.done).length} / {selectedGoal.tasks.length} COMPLETE
                      </span>
                    </div>

                    <div className="flex flex-col gap-3 max-h-[480px] overflow-y-auto pr-1">
                      {selectedGoal.tasks.map((task) => {
                        const isTaskUpdating = actionState === task.id;

                        const getFlagColors = () => {
                          if (task.done) return "border-mat-border text-mat-text-secondary bg-mat-tertiary";
                          switch (task.priority) {
                            case "Do Now":
                              return "border-mat-pink/25 text-mat-pink bg-mat-pink/10";
                            case "Do Today":
                              return "border-[#FF9500]/25 text-[#FF9500] bg-[#FF9500]/10";
                            case "Do This Week":
                              return "border-emerald-500/25 text-emerald-600 dark:text-mat-green bg-emerald-500/10";
                            default:
                              return "border-mat-primary/25 text-mat-primary bg-mat-primary/10";
                          }
                        };

                        return (
                          <div
                            key={task.id}
                            onClick={() => handleToggleTask(task.id)}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between border p-4 rounded-2xl cursor-pointer transition-all ${
                              task.done
                                ? "bg-mat-bg/20 border-mat-border opacity-50"
                                : "bg-mat-bg/45 border-mat-border hover:bg-mat-tertiary"
                            } ${isTaskUpdating ? "animate-pulse" : ""}`}
                          >
                            <div className="flex items-start gap-3 flex-1 w-full">
                              <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border transition-all ${
                                task.done ? "border-emerald-500 bg-emerald-500" : "border-mat-border hover:border-mat-primary"
                              }`}>
                                {task.done && <CheckCircle2 className="h-4 w-4 text-white" />}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-xs font-semibold leading-relaxed tracking-tight ${task.done ? "line-through text-mat-text-secondary" : "text-mat-text"}`}>
                                  {task.name}
                                </h3>
                                <div className="flex flex-wrap gap-2.5 mt-1.5">
                                  <span className="text-[10px] text-mat-text-secondary font-medium">
                                    ⏱️ {task.hours}h depth
                                  </span>
                                  {task.dependency !== "None" && (
                                    <span className="text-[10px] text-mat-pink font-semibold">
                                      🔗 Blocks: {task.dependency}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-mat-text-secondary font-medium">
                                    🎯 {task.milestone}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="mt-3 sm:mt-0 flex self-start sm:self-center select-none">
                              <span className={`text-[9px] font-bold border rounded-full px-3 py-1 uppercase tracking-wider ${getFlagColors()}`}>
                                {task.done ? "Done" : task.priority}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. INTELLIGENT SCHEDULE */}
                {activeTab === "schedule" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="flex items-center gap-2 border-b border-mat-border pb-3">
                      <Calendar className="h-4 w-4 text-mat-primary" />
                      <span className="text-xs font-bold text-mat-text uppercase tracking-wide">AI Generated Calendar Slots</span>
                    </div>

                    {/* GCal Integration Panel */}
                    <div className="rounded-2xl border border-mat-border bg-mat-bg/45 p-4 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${gcalToken ? "bg-mat-green" : "bg-[#FF9500] animate-pulse"}`} />
                          <span className="text-xs font-medium text-mat-text">
                            {gcalToken ? "Google Calendar: Active" : "Google Calendar: Not Connected"}
                          </span>
                        </div>
                        <button
                          onClick={() => setShowGcalConfig(!showGcalConfig)}
                          className="text-[10px] uppercase font-bold tracking-wider text-mat-primary bg-mat-primary/10 border border-mat-primary/20 rounded-full px-3.5 py-1.5 hover:bg-mat-primary hover:text-white transition-all cursor-pointer"
                        >
                          {showGcalConfig ? "Close Settings" : "Configure"}
                        </button>
                      </div>

                      {showGcalConfig ? (
                        <form onSubmit={handleSaveCredentials} className="flex flex-col gap-3.5 mt-2 border-t border-mat-border pt-3 animate-fadeIn">
                          <div>
                            <label className="text-[9px] text-mat-text-secondary font-mono uppercase block mb-1.5">
                              Google OAuth 2.0 Access Token <span className="text-mat-primary font-bold">*</span>
                            </label>
                            <input
                              type="password"
                              required
                              value={gcalToken}
                              onChange={(e) => setGcalToken(e.target.value)}
                              placeholder="Paste 'Access Token' (ya29.a0...)"
                              className="w-full rounded-xl border border-mat-border bg-mat-tertiary px-3.5 py-2 text-xs font-mono text-mat-text focus:outline-none focus:border-mat-primary/50"
                            />
                            <p className="text-[10px] text-mat-text-secondary mt-2 font-sans leading-normal">
                              💡 Get token at{" "}
                              <a
                                href="https://developers.google.com/oauthplayground"
                                target="_blank"
                                rel="noreferrer"
                                className="text-mat-primary underline hover:text-mat-indigo font-bold"
                              >
                                Google OAuth Playground
                              </a>
                              , authorize Calendar API, then paste Access Token.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="text-[9px] text-mat-text-secondary font-mono uppercase block mb-1.5">Target Calendar ID</label>
                              <input
                                type="text"
                                value={calendarId}
                                onChange={(e) => setCalendarId(e.target.value)}
                                placeholder="primary"
                                className="w-full rounded-xl border border-mat-border bg-mat-tertiary px-3.5 py-2 text-xs text-mat-text focus:outline-none focus:border-mat-primary/50"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-mat-text-secondary font-mono uppercase block mb-1.5">Google API Key (Optional)</label>
                              <input
                                type="password"
                                value={gcalApiKey}
                                onChange={(e) => setGcalApiKey(e.target.value)}
                                placeholder="AIzaSy..."
                                className="w-full rounded-xl border border-mat-border bg-mat-tertiary px-3.5 py-2 text-xs font-mono text-mat-text focus:outline-none focus:border-mat-primary/50"
                              />
                            </div>
                          </div>

                          <div className="flex justify-end gap-2.5 mt-3 border-t border-mat-border pt-3.5">
                            <button
                              type="button"
                              onClick={() => {
                                setGcalToken("");
                                setCalendarId("primary");
                                setGcalApiKey("");
                                localStorage.removeItem("gcal_access_token");
                                localStorage.removeItem("gcal_calendar_id");
                                localStorage.removeItem("gcal_api_key");
                                flashHud("Credentials cleared from local state!", "info");
                              }}
                              className="text-[11px] font-sans font-medium text-mat-pink hover:bg-mat-pink/10 px-4 py-2 rounded-full border border-mat-pink/15 transition-all cursor-pointer"
                            >
                              Clear Credentials
                            </button>
                            <button
                              type="submit"
                              className="text-[11px] font-sans font-semibold text-white bg-mat-primary hover:bg-[#007AFF] px-5 py-2 rounded-full transition-all cursor-pointer shadow"
                            >
                              Save settings
                            </button>
                          </div>
                        </form>
                      ) : (
                        <p className="text-xs text-mat-text-secondary leading-relaxed">
                          Your focal workloads are allocated automatically on calendar gaps matching your prime productivity slots. Sync slots directly to your real Google Calendar account with one click!
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 mt-2">
                      {selectedGoal.tasks.filter((t) => !t.done).map((task, i) => {
                        const getRelativeDay = (offset: number): string => {
                          if (offset === 0) return "Today";
                          if (offset === 1) return "Tomorrow";
                          const target = new Date();
                          target.setDate(target.getDate() + offset);
                          return target.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        };
                        const slotOptions = [
                          { day: getRelativeDay(0), time: "4:00 PM – 5:30 PM", desc: "Prime focal block" },
                          { day: getRelativeDay(1), time: "7:00 PM – 9:00 PM", desc: "Productivity Twin peak window" },
                          { day: getRelativeDay(2), time: "10:30 AM – 12:00 PM", desc: "Midday routine gap" },
                          { day: getRelativeDay(3), time: "8:00 PM – 9:30 PM", desc: "Contingency wrap session" }
                        ];
                        const slot = slotOptions[i % slotOptions.length];

                        return (
                          <div
                            key={task.id}
                            className="flex flex-col md:flex-row gap-4 border border-mat-border bg-mat-bg/45 hover:bg-mat-tertiary rounded-2xl p-4 border-l-4 border-l-[#0A84FF] items-start md:items-center justify-between transition-all"
                          >
                            <div className="flex flex-col md:flex-row gap-4 flex-1">
                              <div className="md:w-32 flex-shrink-0">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-mat-text-secondary block">SCHEDULED FOR</span>
                                <span className="text-xs font-bold text-mat-primary block mt-0.5">{slot.day}</span>
                                <span className="text-xs font-medium text-mat-text mt-0.5 block">{slot.time}</span>
                              </div>

                              <div className="flex-1 md:border-l md:border-mat-border md:pl-4">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 dark:text-mat-green block">FOCUS TARGET</span>
                                <h3 className="text-xs font-semibold text-mat-text mt-1 leading-relaxed">{task.name}</h3>
                                <p className="text-xs text-mat-text-secondary mt-1 italic">"{slot.desc} · {task.hours}h depth"</p>
                              </div>
                            </div>

                            <div className="mt-3 md:mt-0 flex-shrink-0">
                              {syncedTasks.includes(task.id) ? (
                                <span className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-mat-green text-[10px] font-mono px-3 py-2 rounded-full font-bold">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Added to GCal</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleAddToGoogleCalendar(task, slot.day, slot.time)}
                                  disabled={syncingTaskId !== null}
                                  className="flex items-center gap-1.5 bg-mat-primary hover:bg-[#007AFF] disabled:opacity-50 text-white text-[11px] font-sans px-4 py-2 rounded-full font-semibold transition-all cursor-pointer shadow hover:shadow-lg"
                                >
                                  {syncingTaskId === task.id ? (
                                    <>
                                      <RefreshCw className="h-3 w-3 animate-spin" />
                                      <span>Adding...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Calendar className="h-3.5 w-3.5 text-white/90" />
                                      <span>Add to GCal</span>
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {selectedGoal.tasks.filter((t) => !t.done).length === 0 && (
                        <div className="text-center py-10 text-mat-text-secondary font-semibold font-sans">
                          🏆 No pending tasks scheduled. Plan is clear!
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 4. SMART RADAR INTEGRATION */}
                {activeTab === "radar" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-mat-border pb-3">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-mat-primary" />
                        <span className="text-xs font-bold text-mat-text uppercase tracking-wide">Smart Communication Scanner</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-emerald-600 dark:text-mat-green">
                        Agent: Active
                      </span>
                    </div>

                    <p className="text-xs text-mat-text-secondary leading-relaxed">
                      Proactively scan Gmail updates, professor notifications, Slack schedules, or messages to extract new tasks or sudden modifications straight into your goal schedule!
                    </p>

                    {/* SAMPLE CHIPS */}
                    <div className="flex flex-wrap items-center gap-2.5 mt-2">
                      <span className="text-[11px] font-semibold text-mat-text-secondary">Select Sample Log:</span>
                      {RADAR_TEMPLATES.map((t, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            setRadarInput(t.text);
                            setRadarSourceType(t.type);
                            flashHud(`Loaded: ${t.name}`, "info");
                          }}
                          className="px-3 py-1.5 rounded-full border border-mat-border bg-mat-tertiary text-xs font-sans text-mat-text hover:border-mat-primary/40 transition-all cursor-pointer"
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>

                    {/* LOG CONSOLE INPUT */}
                    <div className="flex flex-col gap-2 mt-2">
                      <textarea
                        required
                        value={radarInput}
                        onChange={(e) => setRadarInput(e.target.value)}
                        placeholder="Paste syllabus notes, slack conversation screenshots transcribed to markdown, recruiter email prompts, or any calendar notifications here..."
                        rows={5}
                        className="w-full rounded-2xl border border-mat-border bg-mat-tertiary p-4 text-xs font-sans leading-relaxed text-mat-text placeholder-slate-400 focus:outline-none focus:border-mat-primary/50"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-mat-text-secondary uppercase tracking-wide">Communication Mode:</span>
                        <select
                          value={radarSourceType}
                          onChange={(e) => setRadarSourceType(e.target.value)}
                          className="rounded-full bg-mat-tertiary text-xs font-medium border border-mat-border text-mat-text p-1 px-4 py-1.5 focus:outline-none cursor-pointer focus:border-mat-primary/50"
                        >
                          <option value="email">Gmail / Course Portal</option>
                          <option value="chat">Slack / Chats</option>
                          <option value="calendar">GCal Calendar Invite</option>
                        </select>
                      </div>

                      <button
                        onClick={handleRadarScan}
                        disabled={radarScanning || !radarInput.trim()}
                        className="flex items-center gap-2 bg-mat-primary hover:opacity-90 text-white font-sans font-semibold text-xs px-5 py-2.5 rounded-full transition-all shadow hover:shadow-lg cursor-pointer disabled:opacity-50"
                      >
                        {radarScanning ? (
                          <>
                            <RefreshCw className="h-3 w-3 animate-spin" />
                            <span>Interpreting deadlines...</span>
                          </>
                        ) : (
                          <>
                            <Sliders className="h-3.5 w-3.5" />
                            <span>Inspect & Extract</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* RADAR DETECTION OUTPUT BOX */}
                    {radarResult && (
                      <div className="rounded-2xl border border-mat-primary/25 bg-mat-primary/5 p-5 shadow-xl mt-4 animate-fadeIn">
                        <div className="flex items-center gap-2 border-b border-mat-border pb-3 mb-4">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-mat-green" />
                          <span className="text-xs font-bold tracking-wider text-mat-primary uppercase">
                            SCAN DETECTOR ANALYSIS
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="flex flex-col gap-3">
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-mat-text-secondary block">SOURCE CONTEXT FOUND</span>
                              <span className="text-xs font-bold text-mat-text block mt-0.5">{radarResult.detectedSource}</span>
                            </div>
                            
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-mat-text-secondary block">ALERT EVENT TARGET</span>
                              <span className="text-xs font-medium text-mat-primary block mt-0.5">{radarResult.detectedEventName}</span>
                            </div>

                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-mat-text-secondary block">EXTRACTED TIMELINE PIN</span>
                              <span className="text-xs font-bold text-mat-text block mt-0.5">{new Date(radarResult.extractedDeadline).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>

                          <div className="rounded-2xl bg-mat-bg/45 border border-mat-border p-4">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-mat-green uppercase block mb-2">🚀 ADVISORY DEEDS EXTRAPOLATED</span>
                            <p className="text-xs text-mat-text italic mb-4">"{radarResult.suggestedAction}"</p>

                            <span className="text-[10px] font-bold text-mat-primary uppercase block mb-2">📋 ACTION CHECKLIST DECOMPOSED</span>
                            <div className="flex flex-col gap-2">
                              {radarResult.extractedTasks.map((t, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs">
                                  <span className="text-mat-text">· {t.name}</span>
                                  <span className="bg-mat-tertiary text-[9px] font-semibold text-mat-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider">{t.priority}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-5 pt-3.5 border-t border-mat-border">
                          <button
                            onClick={() => setRadarResult(null)}
                            className="bg-mat-tertiary hover:bg-mat-bg text-mat-text px-4 py-2 rounded-full text-xs font-medium cursor-pointer transition-all"
                          >
                            Dismiss Scan
                          </button>
                          <button
                            onClick={injectExtractedRadarTasks}
                            className="bg-emerald-600 dark:bg-mat-green hover:opacity-90 text-white font-sans font-semibold text-xs px-5 py-2 rounded-full flex items-center gap-1.5 cursor-pointer shadow"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Inject Tasks</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. FUTURE SIMULATOR */}
                {activeTab === "simulate" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-mat-border pb-3">
                      <div className="flex items-center gap-2">
                        <Sliders className="h-4 w-4 text-mat-primary" />
                        <span className="text-xs font-bold text-mat-text uppercase tracking-wide">Future Timeline Projection</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider rounded bg-emerald-500/10 px-3 py-1 text-emerald-600 dark:text-mat-green border border-emerald-500/20">
                        Agent: Ready
                      </span>
                    </div>

                    <p className="text-xs text-mat-text-secondary leading-relaxed">
                      Select or type custom behavioral scenarios (like skipping a session or doing intensive overtime) to simulate exact drift in completing dates, success chances, and risk parameters.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
                      <div className="flex flex-col gap-4">
                        <div>
                          <label className="text-[10px] text-mat-text-secondary font-bold uppercase tracking-wide block mb-1.5">Proposed Scenario</label>
                          <select
                            value={simulateSelect}
                            onChange={(e) => setSimulateSelect(e.target.value)}
                            className="w-full rounded-xl border border-mat-border bg-mat-tertiary px-3.5 py-2.5 text-xs text-mat-text focus:outline-none focus:border-mat-primary/50"
                          >
                            <option value="Procrastinate: Skip today's planned sessions">Skip today's plan entirely</option>
                            <option value="Shift Focus: Delay high-hour tasks by 2.5 days">Delay high-hour blockages by 2.5 days</option>
                            <option value="Hustle Mode: Crunch 3 extra hours of focused development tonight">Add 3 extra focus hours tonight</option>
                            <option value="Collaboration Block: Teammate delayed critical interface by 48 hours">Teammate blocks active component by 48 hours</option>
                            <option value="Custom...">Write custom scenario...</option>
                          </select>
                        </div>

                        {simulateSelect === "Custom..." && (
                          <div>
                            <label className="text-[10px] text-mat-text-secondary font-bold uppercase tracking-wide block mb-1.5">Scenario description</label>
                            <input
                              type="text"
                              value={customScenario}
                              onChange={(e) => setCustomScenario(e.target.value)}
                              placeholder="e.g. Skip graphs study session tonight while sleeping 8 hours"
                              className="w-full rounded-xl border border-mat-border bg-mat-tertiary px-3.5 py-2.5 text-xs text-mat-text focus:outline-none focus:border-mat-primary/50"
                            />
                          </div>
                        )}

                        <button
                          onClick={runSimulation}
                          disabled={simulating}
                          className="w-full flex items-center justify-center gap-2 rounded-full bg-mat-primary hover:opacity-90 text-white font-sans font-semibold text-xs py-2.5 transition-all shadow hover:shadow-lg cursor-pointer disabled:opacity-55"
                        >
                          {simulating ? (
                            <>
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              <span>Modeling predictive drifts...</span>
                            </>
                          ) : (
                            <>
                              <Play className="h-3.5 w-3.5" />
                              <span>Execute Predictive Model</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="rounded-2xl border border-mat-border bg-mat-bg/45 p-5 flex flex-col justify-between">
                        {simulationResult ? (
                          <div className="h-full flex flex-col justify-between gap-3">
                            <div>
                              <span className="text-[9px] font-bold uppercase tracking-wider text-mat-text-secondary">SIMULATION RESULTS</span>
                              
                              <div className="grid grid-cols-2 gap-4 my-2.5">
                                <div className="p-3 rounded-xl bg-mat-tertiary border border-mat-border">
                                  <span className="text-[9px] font-bold text-mat-text-secondary block text-center uppercase tracking-wide">Chances Now</span>
                                  <span className="text-2xl font-bold font-sans tracking-tight text-mat-primary block text-center mt-1">
                                    {simulationResult.currentProbability}%
                                  </span>
                                </div>
                                <div className="p-3 rounded-xl bg-mat-bg/60 border border-mat-pink/15">
                                  <span className="text-[9px] font-bold text-mat-pink block text-center uppercase tracking-wide">Predicted</span>
                                  <span className={`text-2xl font-bold font-sans tracking-tight block text-center mt-1 ${
                                    simulationResult.projectedProbability > simulationResult.currentProbability
                                      ? "text-emerald-600 dark:text-mat-green"
                                      : "text-mat-pink"
                                  }`}>
                                    {simulationResult.projectedProbability}%
                                  </span>
                                </div>
                              </div>

                              <span className="text-[9px] font-bold uppercase tracking-wider text-mat-text-secondary block mt-1">Completion Timeline drift</span>
                              <span className={`text-xs font-bold block mt-1.5 ${simulationResult.driftDays > 0 ? "text-mat-pink" : simulationResult.driftDays < 0 ? "text-emerald-600 dark:text-mat-green" : "text-mat-text"}`}>
                                {simulationResult.driftDays > 0
                                  ? `🚨 Delay of ${simulationResult.driftDays} days (${simulationResult.projectedCompletionDate})`
                                  : simulationResult.driftDays < 0
                                  ? `🌟 On Track – finishing ${Math.abs(simulationResult.driftDays)} days ahead`
                                  : `✅ Scheduled Completion on Time (${simulationResult.projectedCompletionDate})`
                                }
                              </span>
                            </div>

                            <div className="rounded-xl bg-mat-primary/5 border border-mat-primary/15 p-3 text-xs leading-relaxed text-mat-text">
                              <span className="font-sans text-mat-primary font-bold uppercase block text-[9px] mb-1.5 tracking-wider">COLLABORATIVE ANALYSIS SUMMARY</span>
                              <p className="italic">"{simulationResult.impactAnalysis}"</p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full flex-col justify-center items-center text-mat-text-secondary text-center py-6">
                            <Info className="h-7 w-7 text-mat-border mb-2" />
                            <p className="text-xs font-medium">No active simulation loaded. Push execute above to run modeling.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 6. AUTONOMOUS ACTIONS */}
                {activeTab === "actions" && (
                  <div className="flex flex-col gap-4 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-mat-border pb-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-mat-primary" />
                        <span className="text-xs font-bold text-mat-text uppercase tracking-wide">Autonomous Action Terminal</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider rounded bg-mat-pink/10 px-3 py-1 text-mat-pink border border-mat-pink/20">
                        Auto Mode: On
                      </span>
                    </div>

                    <p className="text-xs text-mat-text-secondary leading-relaxed">
                      Dispatch the Guardian AI to automatically write work templates, calendar events, accountability reports, or project maps ready for downloading or pasting.
                    </p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                      {[
                        { label: "Compile GCal Focus Blocks", action: "calendar" as const, desc: "Detailed work blocks markdown" },
                        { label: "Draft Study Guides", action: "reminder" as const, desc: "Checklists & milestone logs" },
                        { label: "Draft Team Status Email", action: "email" as const, desc: "Update template with milestones" },
                        { label: "Generate Project Roadmap", action: "roadmap" as const, desc: "ASCII visual flow blueprint" }
                      ].map((card, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => dispatchAutonomousAction(card.action)}
                          className="flex flex-col items-center text-center justify-between p-4 rounded-2xl border border-mat-border bg-mat-bg/45 hover:border-mat-primary/30 hover:bg-mat-tertiary transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-mat-primary/10 text-mat-primary">
                            {card.action === "calendar" ? <Calendar className="h-4 w-4" /> : card.action === "reminder" ? <CheckCircle2 className="h-4 w-4" /> : card.action === "email" ? <Mail className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                          </div>
                          <span className="text-[11px] font-semibold mt-3 text-mat-text leading-tight">{card.label}</span>
                          <span className="text-[9px] text-mat-text-secondary block mt-1.5 leading-normal">{card.desc}</span>
                        </button>
                      ))}
                    </div>

                    {/* DRAFT PREVIEW BOX */}
                    <div className="mt-4 rounded-2xl border border-mat-border bg-mat-bg/45 p-4 min-h-[160px] flex flex-col justify-between">
                      {automating ? (
                        <div className="flex flex-col items-center justify-center text-mat-text-secondary py-12">
                          <RefreshCw className="h-7 w-7 animate-spin text-mat-primary mb-2" />
                          <span className="text-xs font-sans">Agent synthesizing target document...</span>
                        </div>
                      ) : autonomousResult ? (
                        <div className="flex flex-col justify-between h-full gap-3">
                          <div>
                            <div className="flex items-center justify-between border-b border-mat-border pb-2.5 mb-3">
                              <span className="text-xs font-sans text-mat-text font-semibold">
                                {autonomousResult.title || "Output.md"}
                              </span>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(autonomousResult.formattedOutput);
                                  flashHud("Draft output copied successfully to clipboard!", "success");
                                }}
                                className="text-[10px] font-sans font-bold text-mat-primary bg-mat-primary/10 hover:bg-mat-primary hover:text-white px-3.5 py-1.5 rounded-full transition-all cursor-pointer border border-mat-primary/20"
                              >
                                Copy Document
                              </button>
                            </div>
                            
                            <pre className="rounded-xl overflow-x-auto bg-mat-bg p-4 text-xs font-mono text-mat-text leading-relaxed scrollbar-thin max-h-72 select-text whitespace-pre-wrap">
                              {autonomousResult.formattedOutput}
                            </pre>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col justify-center items-center text-mat-text-secondary py-12 text-center">
                          <Sparkles className="h-7 w-7 text-mat-primary/30 mb-2" />
                          <p className="text-xs font-sans font-medium">No action dispatched. Choose an objective above to trigger automation.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 7. VOICE/TEXT AI COACH */}
                {activeTab === "coach" && (
                  <div className="flex flex-col h-[460px] justify-between animate-fadeIn">
                    
                    {/* CHAT SESSION LOGGER */}
                    <div className="flex items-center gap-1.5 border-b border-mat-border pb-2.5 mb-3.5">
                      <Brain className="h-4 w-4 text-mat-primary" />
                      <span className="text-xs font-bold text-mat-text uppercase tracking-wider">
                        Chief of Staff Coach Chat Log
                      </span>
                    </div>

                    <div className="flex-1 overflow-y-auto flex flex-col gap-3.5 pr-2 pl-1 mb-4">
                      {messages.length === 0 && (
                        <div className="rounded-2xl border border-mat-border bg-mat-tertiary p-4 text-xs leading-relaxed text-mat-text font-sans italic self-start max-w-[85%] mb-2 select-text rounded-tl-none">
                          "Greetings! I am tracking your tasks on <strong className="text-mat-primary font-semibold">'{selectedGoal.title}'</strong>. Ask me details about completion drifts, requested timelines, or help rearranging blocks if delayed."
                        </div>
                      )}

                      {messages.map((m, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 max-w-[85%] ${
                            m.role === "user" ? "self-end flex-row-reverse" : "self-start"
                          }`}
                        >
                          <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
                            m.role === "user" ? "bg-mat-primary/20 text-mat-primary" : "bg-mat-primary text-white"
                          }`}>
                            {m.role === "user" ? "ME" : "AI"}
                          </div>

                          <div className={`rounded-2xl p-3 text-xs leading-relaxed select-text ${
                            m.role === "user"
                              ? "bg-mat-primary text-white rounded-tr-none px-4"
                              : "bg-mat-tertiary text-mat-text rounded-tl-none px-4"
                          }`}>
                            {m.text}
                          </div>
                        </div>
                      ))}

                      {chatLoading && (
                        <div className="flex gap-3 max-w-[85%] self-start">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-mat-primary text-white text-[10px] font-bold flex-shrink-0">
                            AI
                          </div>
                          <div className="rounded-2xl bg-mat-tertiary px-4 py-3 text-xs flex gap-1.5 items-center text-mat-text-secondary rounded-tl-none">
                            <div className="w-1.5 h-1.5 rounded-full bg-mat-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-mat-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="w-1.5 h-1.5 rounded-full bg-mat-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      )}
                      
                      <div ref={chatBottomRef} />
                    </div>

                    {/* PROMPT SUGGESTED CHIPS */}
                    <div className="flex gap-2 mb-3.5 overflow-x-auto no-scrollbar flex-nowrap py-1 select-none w-full">
                      {[
                        "How can I shift tasks to bypass high risk?",
                        "What is my heaviest scheduled block next week?",
                        "Suggest a study routine around my work times",
                        "Show procrastination patterns"
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => {
                            setChatInput(chip);
                            flashHud("Form loaded", "info");
                          }}
                          className="px-3 py-1.5 rounded-full border border-mat-border bg-mat-bg text-[10px] font-sans font-medium text-mat-text hover:text-white hover:bg-mat-primary hover:border-mat-primary transition-all cursor-pointer whitespace-nowrap"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* INPUT FORM FIELD */}
                    <form onSubmit={handleCoachSendMessage} className="flex gap-2.5">
                      <input
                        type="text"
                        required
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Discuss completion plans or triggers with your dynamic chief coach..."
                        className="flex-1 rounded-full border border-mat-border bg-mat-tertiary px-4 py-3 text-xs text-mat-text focus:outline-none focus:border-mat-primary/50 placeholder-slate-400"
                      />
                      <button
                        type="button"
                        onClick={toggleListening}
                        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all cursor-pointer flex-shrink-0 self-center ${
                          isListening 
                            ? "bg-[#FF3B30] text-white animate-pulse" 
                            : "bg-mat-primary/10 hover:bg-mat-primary/20 text-mat-primary border border-mat-primary/20"
                        }`}
                        title="Voice Input (Speech-to-Text)"
                      >
                        {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                      </button>
                      <button
                        type="submit"
                        disabled={chatLoading || !chatInput.trim()}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-mat-primary hover:opacity-90 text-white transition-all cursor-pointer disabled:opacity-50 flex-shrink-0 self-center"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-mat-border bg-mat-bg/30 p-12 text-center flex flex-col items-center justify-center min-h-[480px]">
              <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-4 border border-mat-border">
                <ShieldAlert className="h-8 w-8 self-center" />
              </div>
              <h2 className="text-mat-text font-bold text-lg">Select or Create a Goal Workspace</h2>
              <p className="text-xs text-mat-text-secondary my-2 max-w-[320px] leading-relaxed">
                Initialize your autonomous productivity agents by typing your first deadline goal in the deploy planner.
              </p>
            </div>
          )}
        </section>
      </main>

      {/* ===== MOBILE BOTTOM NAVIGATION BAR ===== */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-mat-border bg-mat-secondary shadow-[0_-1px_3px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-16 px-2">
          {selectedGoal ? sidebarTabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex flex-col items-center justify-center gap-1 w-16 h-14 rounded-2xl transition-all cursor-pointer ${
                  isActive ? "text-mat-text" : "text-mat-text-secondary hover:text-mat-text"
                }`}
              >
                <div className={`flex items-center justify-center w-14 h-8 rounded-full transition-all ${isActive ? "bg-mat-primary/15 text-mat-primary" : "bg-transparent"}`}>
                  <IconComp className="h-5 w-5" />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "font-bold text-mat-text" : ""}`}>{tab.label}</span>
              </button>
            );
          }) : (
            <div className="flex items-center gap-2 text-mat-text-secondary text-sm py-2">
              <ShieldAlert className="h-5 w-5" />
              <span>Create a goal to start</span>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
}
