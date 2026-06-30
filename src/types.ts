export interface Task {
  id: string;
  name: string;
  hours: number;
  priority: "Do Now" | "Do Today" | "Do This Week" | "Can Wait" | "Done";
  done: boolean;
  milestone: string;
  dependency: string;
}

export interface RescuePlan {
  criticalTasks: string[];
  tasksToSkip: string[];
  emergencyTips: string[];
}

export interface Goal {
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
  rescuePlan?: RescuePlan | null;
}

export interface FutureSimulationResult {
  currentProbability: number;
  projectedProbability: number;
  driftDays: number;
  projectedCompletionDate: string;
  impactAnalysis: string;
}

export interface RadarResult {
  detectedSource: string;
  detectedEventName: string;
  extractedDeadline: string;
  suggestedAction: string;
  extractedTasks: {
    name: string;
    hours: number;
    priority: "Do Now" | "Do Today" | "Do This Week" | "Can Wait";
  }[];
}

export interface AutonomousActResult {
  actionType: "calendar" | "reminder" | "email" | "roadmap";
  title: string;
  formattedOutput: string;
}

export interface UserProfile {
  id: string;
  email?: string;
  phone?: string;
  name: string;
  avatarUrl?: string;
  authProvider: "email" | "phone" | "google" | "local";
}

