export interface Habit {
  id: string;
  name: string;
  identity: string;
  anchor: string;
  description: string;
  activeDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
  streak: number;
  completedToday: boolean;
  history: { date: string; completed: boolean; active: boolean }[]; // last 7 active days
  createdAt: string;
}

export interface CoachMessage {
  id: string;
  role: "coach" | "user";
  content: string;
  timestamp: string;
}
