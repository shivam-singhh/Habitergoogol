import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toLocalDateStr } from "@/lib/dateUtils";

export interface Habit {
  id: string;
  name: string;
  identity: string;
  anchor: string;
  description: string;
  activeDays: number[];
  streak: number;
  completedToday: boolean;
  history: { date: string; completed: boolean; active: boolean }[];
  createdAt: string;
  sortOrder: number;
}

interface HabitContextType {
  habits: Habit[];
  loading: boolean;
  toggleHabit: (id: string) => Promise<void>;
  addHabit: (habit: { name: string; identity: string; anchor: string; description?: string }) => Promise<void>;
  updateHabit: (id: string, updates: { name?: string; description?: string; anchor?: string; active_days?: number[] }) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  reorderHabits: (orderedIds: string[]) => Promise<void>;
  refetch: () => Promise<void>;
}

const HabitContext = createContext<HabitContextType | null>(null);

export function HabitProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHabits = useCallback(async () => {
    if (!user) { setHabits([]); setLoading(false); return; }

    try {
      const { data: habitsData } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", user.id)
        .eq("archived", false)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (!habitsData) { setLoading(false); return; }

      const today = new Date();
      const todayStr = toLocalDateStr(today);

      const { data: completions } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("user_id", user.id)
        .lte("completed_date", todayStr);

      const completionMap = new Map<string, Set<string>>();
      (completions ?? []).forEach((c: any) => {
        if (!completionMap.has(c.habit_id)) completionMap.set(c.habit_id, new Set());
        completionMap.get(c.habit_id)!.add(c.completed_date);
      });

      const mapped: Habit[] = habitsData.map((h: any) => {
        const activeDays: number[] = h.active_days ?? [0, 1, 2, 3, 4, 5, 6];
        const dates = completionMap.get(h.id) ?? new Set<string>();

        // Build history for current week Mon-Sun
        const history: { date: string; completed: boolean; active: boolean }[] = [];
        const todayDay = today.getDay(); // 0=Sun
        const mondayOffset = todayDay === 0 ? -6 : 1 - todayDay;
        for (let i = 0; i < 7; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() + mondayOffset + i);
          const dateStr = toLocalDateStr(d);
          const dayOfWeek = d.getDay();
          history.push({
            date: dateStr,
            completed: dates.has(dateStr),
            active: activeDays.includes(dayOfWeek),
          });
        }

        // Calculate streak: consecutive completed active days going backward from today
        let streak = 0;
        const checkDate = new Date(today);
        const todayIsActive = activeDays.includes(today.getDay());
        const todayCompleted = dates.has(todayStr);
        if (todayIsActive && !todayCompleted) {
          checkDate.setDate(checkDate.getDate() - 1);
        }
        for (let i = 0; i < 3650; i++) {
          const dStr = toLocalDateStr(checkDate);
          const dow = checkDate.getDay();
          if (activeDays.includes(dow)) {
            if (dates.has(dStr)) {
              streak++;
            } else {
              break;
            }
          }
          checkDate.setDate(checkDate.getDate() - 1);
        }

        return {
          id: h.id,
          name: h.name,
          identity: h.identity,
          anchor: h.anchor,
          description: h.description ?? "",
          activeDays,
          streak,
          completedToday: dates.has(todayStr),
          history,
          createdAt: h.created_at,
          sortOrder: h.sort_order ?? 0,
        };
      });

      setHabits(mapped);
    } catch (err) {
      console.error("Failed to fetch habits:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const toggleHabit = useCallback(async (id: string) => {
    if (!user) return;
    const todayStr = toLocalDateStr(new Date());
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;

    if (habit.completedToday) {
      await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", id)
        .eq("completed_date", todayStr);
    } else {
      await supabase
        .from("habit_completions")
        .insert({ habit_id: id, user_id: user.id, completed_date: todayStr });
    }
    await fetchHabits();
  }, [user, habits, fetchHabits]);

  const addHabit = useCallback(async (habit: { name: string; identity: string; anchor: string; description?: string }) => {
    if (!user) return;
    // Get max sort_order
    const maxOrder = habits.reduce((max, h) => Math.max(max, h.sortOrder), 0);
    await supabase
      .from("habits")
      .insert({
        user_id: user.id,
        name: habit.name,
        identity: habit.identity,
        anchor: habit.anchor,
        description: habit.description ?? "",
        sort_order: maxOrder + 1,
      });
    await fetchHabits();
  }, [user, habits, fetchHabits]);

  const updateHabit = useCallback(async (id: string, updates: { name?: string; description?: string; anchor?: string; active_days?: number[] }) => {
    if (!user) return;
    await supabase
      .from("habits")
      .update(updates)
      .eq("id", id)
      .eq("user_id", user.id);
    await fetchHabits();
  }, [user, fetchHabits]);

  const deleteHabit = useCallback(async (id: string) => {
    if (!user) return;
    await supabase.from("habit_completions").delete().eq("habit_id", id).eq("user_id", user.id);
    await supabase.from("habits").delete().eq("id", id).eq("user_id", user.id);
    await fetchHabits();
  }, [user, fetchHabits]);

  const reorderHabits = useCallback(async (orderedIds: string[]) => {
    if (!user) return;
    // Optimistic update
    setHabits(prev => {
      const map = new Map(prev.map(h => [h.id, h]));
      return orderedIds.map((id, i) => ({ ...map.get(id)!, sortOrder: i }));
    });
    // Persist
    const updates = orderedIds.map((id, i) =>
      supabase.from("habits").update({ sort_order: i }).eq("id", id).eq("user_id", user.id)
    );
    await Promise.all(updates);
  }, [user]);

  return (
    <HabitContext.Provider value={{ habits, loading, toggleHabit, addHabit, updateHabit, deleteHabit, reorderHabits, refetch: fetchHabits }}>
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error("useHabits must be used within HabitProvider");
  return ctx;
}
