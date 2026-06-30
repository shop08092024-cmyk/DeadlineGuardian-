import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Server-side Supabase client (lazy initialized)
let supabaseServerInstance: any = null;
function getSupabaseServer() {
  if (supabaseServerInstance === null) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      console.log("Supabase configured, initializing server-side client...");
      supabaseServerInstance = createClient(url, key);
    } else {
      console.log("Supabase credentials not configured in environment. Using Local Sandbox Mode.");
      supabaseServerInstance = undefined;
    }
  }
  return supabaseServerInstance;
}

// File-based simple data store in the project directory for robust persistence
const DB_FILE = path.join(process.cwd(), "data.json");

// Define TypeScript structures for our multi-agent model
interface Task {
  id: string;
  name: string;
  hours: number;
  priority: "Do Now" | "Do Today" | "Do This Week" | "Can Wait" | "Done";
  done: boolean;
  milestone: string;
  dependency: string;
}

interface RescuePlan {
  criticalTasks: string[];
  tasksToSkip: string[];
  emergencyTips: string[];
}

interface Goal {
  id: string;
  title: string;
  deadline: string;
  progress: number;
  risk: "High" | "Medium" | "Low";
  successProbability: number;
  tasks: Task[];
  riskReasons: string[];
  productivityHours: number[];
  bestWindow: string;
  rescueMode: boolean;
  rescuePlan?: RescuePlan;
  userId?: string; // partition goals per authenticated user
}

// Default initial high-fidelity Goals for the hackathon showcase
const DEFAULT_GOALS: Goal[] = [

  {
    id: "goal-1",
    title: "Build Smart College Recommendation Platform",
    deadline: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 33,
    risk: "High",
    successProbability: 42,
    tasks: [
      { id: "task-1-1", name: "Dataset Research & Collection", hours: 4, priority: "Done", done: true, milestone: "Research Phase", dependency: "None" },
      { id: "task-1-2", name: "Backend API and Express Server Integration", hours: 8, priority: "Do Now", done: false, milestone: "Development Phase", dependency: "Dataset Research" },
      { id: "task-1-3", name: "Gemini AI Core Agent Orchestrator Setup", hours: 6, priority: "Do Now", done: false, milestone: "Development Phase", dependency: "Backend API" },
      { id: "task-1-4", name: "React Frontend Dashboard with Glassmorphic design", hours: 6, priority: "Do Today", done: false, milestone: "Development Phase", dependency: "Backend API" },
      { id: "task-1-5", name: "Comprehensive system integration & API route testing", hours: 3, priority: "Do This Week", done: false, milestone: "Testing Phase", dependency: "React Frontend" },
      { id: "task-1-6", name: "Cloud Run Deployment & Slide Pitch Prep", hours: 4, priority: "Can Wait", done: false, milestone: "Deployment Phase", dependency: "Testing Phase" }
    ],
    riskReasons: [
      "3 missed work sessions noted in historical tracking",
      "Only 33% progress with 6 days remaining",
      "Stuck on Backend API integration which blocks 3 subsequent client-side views",
      "Required effort (27 hours total) exceeds remaining active free time slots"
    ],
    productivityHours: [7, 8, 9, 10, 14, 19, 20, 21],
    bestWindow: "7 PM – 10 PM",
    rescueMode: true,
    rescuePlan: {
      criticalTasks: [
        "Backend API and Express Server Integration",
        "React Frontend Dashboard with Glassmorphic design"
      ],
      tasksToSkip: [
        "Gemini AI Core Agent Orchestrator Setup (Using simple structured rules as contingency)",
        "Slide Pitch Prep (Using automated outlines to save 3 hours)"
      ],
      emergencyTips: [
        "Consolidate development into a single-file server deployment to bypass complex CI pipelines.",
        "Shift focus hours to morning slots (9 AM - 11 AM) which currently have 0 tasks allocated, boosting capacity by 2 hours daily."
      ]
    }
  },
  {
    id: "goal-2",
    title: "Prepare for Google SWE Interview",
    deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    progress: 50,
    risk: "Medium",
    successProbability: 71,
    tasks: [
      { id: "task-2-1", name: "Review Core Data Structures (Graphs & Trees)", hours: 6, priority: "Done", done: true, milestone: "Revision", dependency: "None" },
      { id: "task-2-2", name: "Solve LeetCode Arrays and Dynamic Programming (15 problems)", hours: 10, priority: "Done", done: true, milestone: "Practice", dependency: "Core Data Structures" },
      { id: "task-2-3", name: "System Design Study (Load Balancers & Caching)", hours: 8, priority: "Do Now", done: false, milestone: "Practice", dependency: "None" },
      { id: "task-2-4", name: "Draft answers for common behavioral questions", hours: 4, priority: "Do Today", done: false, milestone: "Preparation", dependency: "None" },
      { id: "task-2-5", name: "Mock Interview Sessions with Peer Feedback", hours: 6, priority: "Do This Week", done: false, milestone: "Testing", dependency: "System Design" }
    ],
    riskReasons: [
      "1 skipped system design session last night",
      "Mock interview sessions remain unscheduled as of current radar sweep."
    ],
    productivityHours: [9, 10, 11, 20, 21, 22],
    bestWindow: "9 AM – 11 AM",
    rescueMode: false
  }
];

// Helper to safely load database data
function loadGoals(): Goal[] {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("Database reading error, using defaults:", error);
  }
  return DEFAULT_GOALS;
}

// Helper to safely save database data
function saveGoals(data: Goal[]) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Database saving error:", error);
  }
}

// Initialize database file with defaults if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  saveGoals(DEFAULT_GOALS);
}

// Lazy initialization pattern for the Gemini Client to prevent server boot failure when key is absent
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured. Please define it in your Secrets module.");
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return geminiClient;
}

// ── Central Gemini call wrapper ───────────────────────────────────────────────
// Converts quota/rate-limit/503 errors into a clean QUOTA_EXCEEDED signal
// so every route can detect it and serve a fallback without leaking raw JSON.
async function callGemini(params: Parameters<GoogleGenAI["models"]["generateContent"]>[0]): Promise<any> {
  const ai = getGemini();
  try {
    return await ai.models.generateContent(params);
  } catch (err: any) {
    const msg: string = err?.message || JSON.stringify(err) || "";
    const status: number = err?.status || 0;
    // Quota / rate-limit / service unavailable → throw clean sentinel
    if (
      status === 429 || status === 503 ||
      msg.includes("RESOURCE_EXHAUSTED") ||
      msg.includes("quota") ||
      msg.includes("rate limit") ||
      msg.includes("UNAVAILABLE")
    ) {
      const e = new Error("QUOTA_EXCEEDED");
      (e as any).isQuota = true;
      throw e;
    }
    throw err; // re-throw unknown errors as-is
  }
}


// Helper to load goals for a specific user, partitioned in Supabase or local sandbox
async function loadGoalsForUser(userId: string): Promise<Goal[]> {
  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId);
      
      if (!error && data) {
        return data.map((row: any) => ({
          id: row.id,
          title: row.title,
          deadline: row.deadline,
          progress: parseInt(row.progress) || 0,
          risk: row.risk || "Medium",
          successProbability: parseInt(row.success_probability) || 50,
          tasks: typeof row.tasks === "string" ? JSON.parse(row.tasks) : (row.tasks || []),
          riskReasons: typeof row.risk_reasons === "string" ? JSON.parse(row.risk_reasons) : (row.risk_reasons || []),
          productivityHours: typeof row.productivity_hours === "string" ? JSON.parse(row.productivity_hours) : (row.productivity_hours || []),
          bestWindow: row.best_window || "",
          rescueMode: !!row.rescue_mode,
          rescuePlan: typeof row.rescue_plan === "string" ? JSON.parse(row.rescue_plan) : (row.rescue_plan || null)
        }));
      }
      console.warn("Supabase read table issue, using local storage fallback:", error);
    } catch (err) {
      console.error("Supabase load goals error:", err);
    }
  }

  // Local fallback: filter local JSON by userId
  const allGoals = loadGoals();
  const userGoals = allGoals.filter((g) => g.userId === userId);
  if (userGoals.length === 0) {
    // Copy visual showcase goals for this new account
    const copiedDefaults = DEFAULT_GOALS.map((g) => ({
      ...g,
      id: `${g.id}-${userId}`,
      userId
    }));
    saveGoals([...allGoals, ...copiedDefaults]);
    return copiedDefaults;
  }
  return userGoals;
}

// Helper to save/update a specific goal for a user
async function saveGoalForUser(goal: Goal, userId: string) {
  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      const dbRow = {
        id: goal.id,
        user_id: userId,
        title: goal.title,
        deadline: goal.deadline,
        progress: goal.progress,
        risk: goal.risk,
        success_probability: goal.successProbability,
        tasks: JSON.stringify(goal.tasks),
        risk_reasons: JSON.stringify(goal.riskReasons),
        productivity_hours: JSON.stringify(goal.productivityHours),
        best_window: goal.bestWindow,
        rescue_mode: goal.rescueMode,
        rescue_plan: goal.rescuePlan ? JSON.stringify(goal.rescuePlan) : null
      };

      const { error } = await supabase
        .from("goals")
        .upsert(dbRow, { onConflict: "id" });

      if (!error) return;
      console.warn("Supabase save issue, writing to local database instead:", error);
    } catch (err) {
      console.error("Supabase upsert goal error:", err);
    }
  }

  // Local static file backup
  const allGoals = loadGoals();
  const idx = allGoals.findIndex((g) => g.id === goal.id);
  const goalToSave = { ...goal, userId };
  if (idx !== -1) {
    allGoals[idx] = goalToSave;
  } else {
    allGoals.push(goalToSave);
  }
  saveGoals(allGoals);
}

// Helper to delete a goal
async function deleteGoalForUser(goalId: string, userId: string) {
  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goalId)
        .eq("user_id", userId);

      if (!error) return;
      console.warn("Supabase delete failed, removing locally:", error);
    } catch (err) {
      console.error("Supabase delete goal error:", err);
    }
  }

  // Local backup
  const allGoals = loadGoals();
  const filtered = allGoals.filter((g) => g.id !== goalId);
  saveGoals(filtered);
}

// ==================== API ENDPOINTS ====================

// 0. Expose non-sensitive Supabase credentials dynamically to client
app.get("/api/config", (req, res) => {
  res.json({
    supabaseUrl: process.env.SUPABASE_URL || "",
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY || ""
  });
});

// 0.1 Check Supabase real connection and schema health status
app.get("/api/db-status", async (req, res) => {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) {
    return res.json({
      configured: false,
      tableExists: false,
      message: "Supabase credentials are not specified in the environment settings (use Settings menu)."
    });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return res.json({
      configured: false,
      tableExists: false,
      message: "Supabase client failed to initialize."
    });
  }

  try {
    // Attempt a lightweight select query on goals to verify if table is created
    const { error } = await supabase
      .from("goals")
      .select("id")
      .limit(1);

    if (error) {
      return res.json({
        configured: true,
        tableExists: false,
        errorMsg: error.message,
        errorCode: error.code,
        message: `Connected to Supabase, but the 'goals' table was not detected or is inaccessible. Error: ${error.message}`
      });
    }

    return res.json({
      configured: true,
      tableExists: true,
      message: "Supabase cloud connectivity is fully active! Data is replicated perfectly."
    });
  } catch (err: any) {
    return res.json({
      configured: true,
      tableExists: false,
      errorMsg: err.message || err,
      message: `Failed to query table: ${err.message || err}`
    });
  }
});

// 1. Fetch user-wise active goals
app.get("/api/goals", async (req, res) => {
  const userId = req.headers["x-user-id"] as string || "default_sandbox_user";
  const data = await loadGoalsForUser(userId);
  res.json(data);
});

// 2. Clear / Reset DB to default state for this active user
app.post("/api/goals/reset", async (req, res) => {
  const userId = req.headers["x-user-id"] as string || "default_sandbox_user";

  const supabase = getSupabaseServer();
  if (supabase) {
    try {
      // Clear Supabase goals
      await supabase.from("goals").delete().eq("user_id", userId);
      
      // Seed premium defaults
      for (const g of DEFAULT_GOALS) {
        const row = {
          id: `${g.id}-${userId}-${Date.now()}`,
          user_id: userId,
          title: g.title,
          deadline: g.deadline,
          progress: g.progress,
          risk: g.risk,
          success_probability: g.successProbability,
          tasks: JSON.stringify(g.tasks),
          risk_reasons: JSON.stringify(g.riskReasons),
          productivity_hours: JSON.stringify(g.productivityHours),
          best_window: g.bestWindow,
          rescue_mode: g.rescueMode,
          rescue_plan: g.rescuePlan ? JSON.stringify(g.rescuePlan) : null
        };
        await supabase.from("goals").upsert(row);
      }
      const freshList = await loadGoalsForUser(userId);
      return res.json({ message: "Supabase account goals reset successfully", data: freshList });
    } catch (error) {
      console.error("Supabase reset seed failure, doing client fallback:", error);
    }
  }

  // Local fallback
  const allGoals = loadGoals();
  const remaining = allGoals.filter((g) => g.userId !== userId);
  const freshDefaults = DEFAULT_GOALS.map((g) => ({
    ...g,
    id: `${g.id}-${userId}-${Date.now()}`,
    userId
  }));
  saveGoals([...remaining, ...freshDefaults]);
  res.json({ message: "Sandbox account goals reset successfully", data: freshDefaults });
});

// 3. Create a user-wise goal
app.post("/api/goals", async (req, res) => {
  const userId = req.headers["x-user-id"] as string || "default_sandbox_user";
  const newGoal: Goal = req.body;
  if (!newGoal.id || !newGoal.title) {
    return res.status(400).json({ error: "Missing goal context parameters" });
  }

  await saveGoalForUser(newGoal, userId);
  res.json(newGoal);
});

// 4. Update a user-wise goal
app.put("/api/goals/:id", async (req, res) => {
  const userId = req.headers["x-user-id"] as string || "default_sandbox_user";
  const updatedGoal: Goal = req.body;
  
  await saveGoalForUser(updatedGoal, userId);
  res.json(updatedGoal);
});

// 5. Delete a user-wise goal
app.delete("/api/goals/:id", async (req, res) => {
  const userId = req.headers["x-user-id"] as string || "default_sandbox_user";
  const { id } = req.params;
  
  await deleteGoalForUser(id, userId);
  res.json({ status: "success" });
});


// 6. Planner Agent: Decompose a goal and construct complete project schedule in JSON
app.post("/api/planner/generate", async (req, res) => {
  const { goal, deadline } = req.body;
  if (!goal || !deadline) {
    return res.status(400).json({ error: "Please offer both goal and deadline constraints." });
  }
  
  try {
    const daysLeft = Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));

    // Dynamic task count based on goal timeline — avoids generic 6-task dumps
    const taskCount = daysLeft <= 3 ? 3 : daysLeft <= 7 ? 4 : daysLeft <= 14 ? 5 : daysLeft <= 30 ? 6 : 7;
    const systemPrompt = `You are a productivity planner AI. Given a goal and deadline, return a JSON plan.
Rules:
- Generate EXACTLY ${taskCount} tasks. Each task name must be SPECIFIC to the actual goal (not generic like "Phase 1" or "Implementation").
- Hours per task: realistic estimate for that specific work (1-8h).
- priority: assign based on urgency order: "Do Now" -> "Do Today" -> "Do This Week" -> "Can Wait"
- milestone: phase name for this goal (e.g. Research, Design, Build, Test, Deploy)
- dependency: the task that must be completed first, or "None"
- successProbability: 0-100 integer. Lower if total task hours exceeds daysLeft * 4.
- Risk: "High" if >4h/day needed, "Medium" if 2-4h/day, "Low" otherwise
- rescueMode: true if daysLeft <= 5 OR risk is "High"
- rescuePlan (always include): criticalTasks (2 specific task names), tasksToSkip (1-2 task names that can be cut), emergencyTips (2 actionable tips)
- productivityHours: array of 6-8 integers 0-23 for peak focus times
- Return ONLY valid raw JSON, no markdown, no backticks.`;

    const userPrompt = `Goal: "${goal}" | Deadline: ${deadline} | Days left: ${daysLeft} | Today: ${new Date().toDateString()}`;
    // Race callGemini against a 12-second timeout — whichever resolves first wins
    const aiCall = callGemini({
      model: "gemini-2.0-flash-lite",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.4,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            risk: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
            successProbability: { type: Type.INTEGER },
            tasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hours: { type: Type.INTEGER },
                  priority: { type: Type.STRING, enum: ["Do Now", "Do Today", "Do This Week", "Can Wait"] },
                  milestone: { type: Type.STRING },
                  dependency: { type: Type.STRING }
                },
                required: ["name", "hours", "priority", "milestone", "dependency"]
              }
            },
            riskReasons: { type: Type.ARRAY, items: { type: Type.STRING } },
            productivityHours: { type: Type.ARRAY, items: { type: Type.INTEGER } },
            bestWindow: { type: Type.STRING },
            rescueMode: { type: Type.BOOLEAN },
            rescuePlan: {
              type: Type.OBJECT,
              properties: {
                criticalTasks: { type: Type.ARRAY, items: { type: Type.STRING } },
                tasksToSkip: { type: Type.ARRAY, items: { type: Type.STRING } },
                emergencyTips: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["criticalTasks", "tasksToSkip", "emergencyTips"]
            }
          },
          required: ["title", "risk", "successProbability", "tasks", "riskReasons", "productivityHours", "bestWindow", "rescueMode", "rescuePlan"]
        }
      }
    });

    // 12-second hard timeout — generates a smart fallback plan instantly
    const timeoutPromise = new Promise<any>((_, reject) =>
      setTimeout(() => reject(new Error("TIMEOUT")), 12000)
    );

    let parsedData: any;
    try {
      const response = await Promise.race([aiCall, timeoutPromise]);
      parsedData = JSON.parse((response as any).text || "{}");
    } catch (err: any) {
      if (err.message === "TIMEOUT" || err.message === "QUOTA_EXCEEDED" || (err as any).isQuota) {
        // Smart instant fallback — deterministic plan based on goal + deadline
        console.warn(`Planner fallback triggered (${err.message}) — serving instant plan`);
        const isHighRisk = daysLeft <= 5;
        // Build a goal-keyword-aware fallback task list, scaled to daysLeft
        const fallbackGoalKeyword = goal.split(" ").slice(0, 3).join(" ");
        const allFallbackTasks = [
          { name: `Define scope & success criteria for "${fallbackGoalKeyword}"`, hours: 2, priority: "Do Now",       milestone: "Planning",    dependency: "None" },
          { name: `Research best approach and gather resources`,                   hours: 3, priority: "Do Now",       milestone: "Planning",    dependency: "None" },
          { name: `Build core deliverable — Part 1`,                               hours: 5, priority: "Do Now",       milestone: "Execution",   dependency: "Research" },
          { name: `Build core deliverable — Part 2`,                               hours: 4, priority: "Do Today",     milestone: "Execution",   dependency: "Part 1" },
          { name: `Review, test and refine output`,                                hours: 3, priority: "Do This Week", milestone: "QA",          dependency: "Build" },
          { name: `Final polish and delivery`,                                     hours: 2, priority: "Do This Week", milestone: "Delivery",    dependency: "Review" },
          { name: `Submit / deploy / present`,                                     hours: 1, priority: "Can Wait",     milestone: "Delivery",    dependency: "Polish" },
        ];
        const fallbackCount = daysLeft <= 3 ? 3 : daysLeft <= 7 ? 4 : daysLeft <= 14 ? 5 : 6;
        parsedData = {
          title: goal,
          risk: isHighRisk ? "High" : daysLeft <= 10 ? "Medium" : "Low",
          successProbability: isHighRisk ? 45 : daysLeft <= 10 ? 65 : 80,
          tasks: allFallbackTasks.slice(0, fallbackCount),
          riskReasons: [
            `Only ${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining — dense schedule required`,
            "Estimated 3–5 focused hours per day needed to stay on track",
            "Procrastination risk is highest in first 48 hours — start immediately"
          ],
          productivityHours: [9, 10, 11, 19, 20, 21],
          bestWindow: "7 PM – 10 PM",
          rescueMode: isHighRisk,
          rescuePlan: {
            criticalTasks: ["Core Implementation — Phase 1", "Core Implementation — Phase 2"],
            tasksToSkip: ["Review & Final Polish"],
            emergencyTips: [
              "Use 25-min Pomodoro sessions — lock phone away during each block",
              "Do the hardest task first every morning to avoid decision fatigue"
            ]
          }
        };
      } else {
        throw err;
      }
    }

    // Enrich into full frontend Goal structure
    const fullPlan: Goal = {
      id: "goal-" + Date.now(),
      title: parsedData.title || goal,
      deadline,
      progress: 0,
      risk: parsedData.risk || "Medium",
      successProbability: parsedData.successProbability || 70,
      tasks: (parsedData.tasks || []).map((t: any, idx: number) => ({
        id: `task-${Date.now()}-${idx}`,
        name: t.name,
        hours: t.hours || 3,
        priority: t.priority || "Do Today",
        done: false,
        milestone: t.milestone || "General",
        dependency: t.dependency || "None"
      })),
      riskReasons: parsedData.riskReasons || ["Tight deadline", "High work density per day required"],
      productivityHours: parsedData.productivityHours || [19, 20, 21],
      bestWindow: parsedData.bestWindow || "7 PM – 10 PM",
      rescueMode: parsedData.rescueMode || false,
      rescuePlan: parsedData.rescuePlan || null
    };

    res.json(fullPlan);
  } catch (error: any) {
    console.error("Planner generation fail:", error);

    // On API/network error (503, rate-limit, etc.) — serve smart fallback so UI never hangs
    const daysLeft2 = Math.max(1, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000));
    const isHighRisk2 = daysLeft2 <= 5;
    const fallbackCount2 = daysLeft2 <= 3 ? 3 : daysLeft2 <= 7 ? 4 : daysLeft2 <= 14 ? 5 : 6;
    const goalKeyword2 = goal.split(" ").slice(0, 3).join(" ");
    const allTasks2: Task[] = [
      { id: `t-${Date.now()}-0`, name: `Define scope & success criteria for "${goalKeyword2}"`, hours: 2, priority: "Do Now",       done: false, milestone: "Planning",   dependency: "None" },
      { id: `t-${Date.now()}-1`, name: `Research best approach and gather resources`,           hours: 3, priority: "Do Now",       done: false, milestone: "Planning",   dependency: "None" },
      { id: `t-${Date.now()}-2`, name: `Build core deliverable — Part 1`,                       hours: 5, priority: "Do Now",       done: false, milestone: "Execution",  dependency: "Research" },
      { id: `t-${Date.now()}-3`, name: `Build core deliverable — Part 2`,                       hours: 4, priority: "Do Today",     done: false, milestone: "Execution",  dependency: "Part 1" },
      { id: `t-${Date.now()}-4`, name: `Review, test and refine output`,                        hours: 3, priority: "Do This Week", done: false, milestone: "QA",         dependency: "Build" },
      { id: `t-${Date.now()}-5`, name: `Submit / deploy / present`,                             hours: 1, priority: "Can Wait",     done: false, milestone: "Delivery",   dependency: "Review" },
    ];
    const fallback: Goal = {
      id: "goal-" + Date.now(),
      title: goal,
      deadline,
      progress: 0,
      risk: isHighRisk2 ? "High" : daysLeft2 <= 10 ? "Medium" : "Low",
      successProbability: isHighRisk2 ? 45 : daysLeft2 <= 10 ? 65 : 80,
      tasks: allTasks2.slice(0, fallbackCount2),
      riskReasons: [
        `${daysLeft2} day${daysLeft2 !== 1 ? "s" : ""} remaining — requires consistent daily focus`,
        "Estimated 3–5 hours of deep work per day needed",
        "Procrastination in the first 48 hours dramatically raises failure risk"
      ],
      productivityHours: [9, 10, 11, 19, 20, 21],
      bestWindow: "7 PM – 10 PM",
      rescueMode: isHighRisk2,
      rescuePlan: {
        criticalTasks: ["Core Implementation — Phase 1", "Core Implementation — Phase 2"],
        tasksToSkip: ["Review & Final Polish"],
        emergencyTips: [
          "Use 25-min Pomodoro blocks — silence your phone for each session",
          "Start with the hardest task every morning to avoid decision fatigue"
        ]
      }
    };
    res.json(fallback);
  }
});

// 7. Future Simulation Agent: Estimate impact of skipping or modifying workflow
app.post("/api/future/simulate", async (req, res) => {
  const { goal, scenario } = req.body;
  if (!goal || !scenario) {
    return res.status(400).json({ error: "Missing goal state or scenario text." });
  }
  
  try {
    const systemPrompt = `You are a future simulation agent. Given a project goal and a scenario, return JSON:
{"currentProbability":number,"projectedProbability":number,"driftDays":number,"projectedCompletionDate":string,"impactAnalysis":string}
impactAnalysis max 60 words. Return ONLY valid JSON.`;

    const userPrompt = `Goal: "${goal.title}" | Progress: ${goal.progress}% | Probability: ${goal.successProbability}% | Deadline: ${goal.deadline} | Scenario: "${scenario}"`;

    const response = await callGemini({
      model: "gemini-2.0-flash-lite",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.3,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            currentProbability: { type: Type.INTEGER },
            projectedProbability: { type: Type.INTEGER },
            driftDays: { type: Type.INTEGER },
            projectedCompletionDate: { type: Type.STRING },
            impactAnalysis: { type: Type.STRING }
          },
          required: ["currentProbability", "projectedProbability", "driftDays", "projectedCompletionDate", "impactAnalysis"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Simulation failed:", error);
    if ((error as any).isQuota || error.message === "QUOTA_EXCEEDED") {
      res.json({
        currentProbability: goal.successProbability || 65,
        projectedProbability: Math.max(10, (goal.successProbability || 65) - 15),
        driftDays: 2,
        projectedCompletionDate: "~2 days late (estimated)",
        impactAnalysis: "AI quota exceeded — showing estimate. Skipping planned sessions typically reduces success probability by 10–20% and adds 1–3 days of deadline drift."
      });
    } else {
      res.status(500).json({ error: "Simulation temporarily unavailable. Please try again shortly." });
    }
  }
});

// 8. Smart Radar Agent
app.post("/api/sync/radar", async (req, res) => {
  const { sourceText, sourceType } = req.body;
  if (!sourceText) return res.status(400).json({ error: "No input text provided." });


  try {
    const systemPrompt = `You are a deadline radar agent. Extract deadlines and tasks from a communication snippet.
Return ONLY valid JSON:
{"detectedSource":string,"detectedEventName":string,"extractedDeadline":string,"suggestedAction":string,"extractedTasks":[{"name":string,"hours":number,"priority":"Do Now"|"Do Today"|"Do This Week"|"Can Wait"}]}`;

    const userPrompt = `Type: "${sourceType}"\nContent:\n"""\n${sourceText}\n"""\nToday: ${new Date().toDateString()}`;

    const response = await callGemini({
      model: "gemini-2.0-flash-lite",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.2,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            detectedSource: { type: Type.STRING },
            detectedEventName: { type: Type.STRING },
            extractedDeadline: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            extractedTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  hours: { type: Type.INTEGER },
                  priority: { type: Type.STRING, enum: ["Do Now", "Do Today", "Do This Week", "Can Wait"] }
                },
                required: ["name", "hours", "priority"]
              }
            }
          },
          required: ["detectedSource", "detectedEventName", "extractedDeadline", "suggestedAction", "extractedTasks"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Radar sync failed:", error);
    if ((error as any).isQuota || error.message === "QUOTA_EXCEEDED") {
      res.status(429).json({ error: "AI quota temporarily exceeded. Please wait 60 seconds and try again." });
    } else {
      res.status(500).json({ error: "Radar scan temporarily unavailable." });
    }
  }
});

// 9. Coach Agent: Conversational assistant API
app.post("/api/coach/chat", async (req, res) => {
  const { messages, currentGoal } = req.body;
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing conversational message logs array." });
  }

  try {
    const ai = getGemini();
    const pendingTasks = currentGoal
      ? currentGoal.tasks.filter((t: any) => !t.done).map((t: any) => `${t.name} (${t.hours}h, ${t.priority})`).join(", ")
      : "None";

    const systemPrompt = `You are Deadline Guardian AI's Chief of Staff Accountability Coach. Be sharp, specific, encouraging. Max 150 words per response.
Active goal: "${currentGoal?.title || "None"}" | Deadline: ${currentGoal?.deadline || "N/A"} | Progress: ${currentGoal?.progress || 0}% | Risk: ${currentGoal?.risk || "N/A"} | Pending: ${pendingTasks}`;

    const chat = ai.chats.create({
      model: "gemini-2.0-flash-lite",
      config: { systemInstruction: systemPrompt }
    });

    let currentResponse = "";
    for (let i = 0; i < messages.length; i++) {
      const isLast = i === messages.length - 1;
      const m = messages[i];
      if (isLast) {
        const resObj = await chat.sendMessage({ message: m.text });
        currentResponse = resObj.text || "";
      } else {
        await chat.sendMessage({ message: m.text });
      }
    }

    res.json({ reply: currentResponse });
  } catch (error: any) {
    console.error("Coaching chat failed:", error);
    const msg: string = error?.message || "";
    if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota") || msg.includes("QUOTA_EXCEEDED") || error?.status === 429) {
      res.json({ reply: "I'm temporarily rate-limited by the AI provider (free tier quota). Please wait 60 seconds and try again — I'll be right back!" });
    } else {
      res.json({ reply: "I hit a transient block. Let me know what you want to focus on next!" });
    }
  }
});

// 10. Autonomous Action Agent
app.post("/api/autonomous/act", async (req, res) => {
  const { goal, actionType } = req.body;
  if (!goal) return res.status(400).json({ error: "Needs goal context to complete operation." });

  try {
    const systemPrompt = `You are an autonomous productivity action agent. Generate a professional deliverable for the requested action type.
Return JSON: {"actionType":string,"title":string,"formattedOutput":string}
formattedOutput should be markdown-formatted and professional. Include real dates and task names.`;

    const userPrompt = `Goal: "${goal.title}" | Deadline: ${goal.deadline} | Progress: ${goal.progress}% | Tasks: ${goal.tasks.filter((t: any) => !t.done).map((t: any) => t.name).join(", ")} | Action: "${actionType}"`;

    const response = await callGemini({
      model: "gemini-2.0-flash-lite",
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        temperature: 0.5,
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actionType: { type: Type.STRING },
            title: { type: Type.STRING },
            formattedOutput: { type: Type.STRING }
          },
          required: ["actionType", "title", "formattedOutput"]
        }
      }
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Autonomous execution failed:", error);
    if ((error as any).isQuota || error.message === "QUOTA_EXCEEDED") {
      res.status(429).json({ error: "AI quota temporarily exceeded. Please wait 60 seconds and try again." });
    } else {
      res.status(500).json({ error: "Action agent temporarily unavailable." });
    }
  }
});


// ==================== VITE SERVER GATEWAY ====================

// Export the Express app for Vercel Serverless Functions
export default app;

// Local Development Server (only runs if not on Vercel)
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  async function startServer() {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server launched successfully at http://localhost:${PORT}`);
    });
  }
  startServer();
}
