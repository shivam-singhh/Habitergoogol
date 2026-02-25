import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useHabits } from "@/contexts/HabitContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toLocalDateStr } from "@/lib/dateUtils";
import { toast } from "sonner";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function MissingLogs() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { habits, refetch } = useHabits();
  const { user } = useAuth();
  const habit = habits.find(h => h.id === id);

  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [pendingAdds, setPendingAdds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const fetchCompletions = useCallback(async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("habit_completions")
      .select("completed_date")
      .eq("habit_id", id)
      .eq("user_id", user.id);
    setCompletions(new Set((data ?? []).map((c: any) => c.completed_date)));
  }, [user, id]);

  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  const createdDate = habit?.createdAt ? new Date(habit.createdAt) : new Date();
  const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
  const todayStr = toLocalDateStr(new Date());
  const activeDays = habit?.activeDays ?? [0, 1, 2, 3, 4, 5, 6];

  // Build calendar months from creation to today
  const calendarMonths = useMemo(() => {
    const today = new Date();
    const months: { year: number; month: number; label: string; days: { date: string; day: number; selectable: boolean; completed: boolean }[] }[] = [];

    let m = createdDateOnly.getMonth();
    let y = createdDateOnly.getFullYear();

    while (y < today.getFullYear() || (y === today.getFullYear() && m <= today.getMonth())) {
      const daysInMonth = new Date(y, m + 1, 0).getDate();
      const days: { date: string; day: number; selectable: boolean; completed: boolean }[] = [];

      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(y, m, d);
        const dateStr = toLocalDateStr(dt);
        const isActive = activeDays.includes(dt.getDay());
        const afterCreation = dt >= createdDateOnly;
        const notFuture = dateStr <= todayStr;
        const alreadyCompleted = completions.has(dateStr);

        days.push({
          date: dateStr,
          day: d,
          selectable: isActive && afterCreation && notFuture && !alreadyCompleted,
          completed: alreadyCompleted,
        });
      }

      months.push({ year: y, month: m, label: `${MONTH_NAMES[m]} ${y}`, days });

      m++;
      if (m > 11) { m = 0; y++; }
    }

    return months;
  }, [createdDateOnly, todayStr, activeDays, completions]);

  const togglePending = (dateStr: string) => {
    setPendingAdds(prev => {
      const next = new Set(prev);
      if (next.has(dateStr)) next.delete(dateStr);
      else next.add(dateStr);
      return next;
    });
  };

  const saveAll = async () => {
    if (!user || !id || pendingAdds.size === 0) return;
    setSaving(true);
    const rows = Array.from(pendingAdds).map(date => ({
      habit_id: id,
      user_id: user.id,
      completed_date: date,
    }));
    const { error } = await supabase.from("habit_completions").insert(rows);
    if (error) {
      toast.error("Failed to save logs");
    } else {
      toast.success(`${rows.length} log${rows.length > 1 ? "s" : ""} added`);
      await refetch();
      navigate(`/habit/${id}`);
    }
    setSaving(false);
  };

  if (!habit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Habit not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-md mx-auto px-5 pt-6">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(`/habit/${id}?mode=edit`)} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-display text-foreground">Add Missing Logs</h1>
            <p className="text-xs text-muted-foreground">{habit.name}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          Tap any missed day to select it. Already completed days can't be changed.
        </p>

        <div className="space-y-6">
          {calendarMonths.map(month => (
            <div key={`${month.year}-${month.month}`} className="bg-card border border-border rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3">{month.label}</p>
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_NAMES.map(d => (
                  <span key={d} className="text-[9px] text-muted-foreground text-center">{d.charAt(0)}</span>
                ))}
                {Array.from({ length: new Date(month.year, month.month, 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {month.days.map(day => {
                  const isPending = pendingAdds.has(day.date);
                  return (
                    <button
                      key={day.date}
                      disabled={!day.selectable}
                      onClick={() => day.selectable && togglePending(day.date)}
                      className={`aspect-square rounded-sm flex items-center justify-center text-[9px] transition-all ${
                        day.completed
                          ? "bg-habit-complete text-primary-foreground font-medium"
                          : isPending
                            ? "bg-primary text-primary-foreground font-medium ring-2 ring-primary/50"
                            : day.selectable
                              ? "bg-secondary text-muted-foreground hover:bg-primary/10 cursor-pointer"
                              : "opacity-20 text-muted-foreground cursor-default"
                      }`}
                    >
                      {day.completed ? <Check className="w-2.5 h-2.5" /> : day.day}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {pendingAdds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-20 left-0 right-0 flex justify-center z-50"
          >
            <button
              onClick={saveAll}
              disabled={saving}
              className="bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : `Add ${pendingAdds.size} log${pendingAdds.size > 1 ? "s" : ""}`}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
