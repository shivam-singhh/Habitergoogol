import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Pencil, Eye, Save, Trash2, CalendarPlus, Lock, Crown, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon } from "lucide-react";
import { useHabits } from "@/contexts/HabitContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { handleUpgrade } from "@/lib/androidBridge";
import { toLocalDateStr } from "@/lib/dateUtils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function HabitDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { habits, updateHabit, deleteHabit, refetch } = useHabits();
  const { user } = useAuth();
  const { isPro } = useSubscription();

  const habit = habits.find((h) => h.id === id);
  const [editing, setEditing] = useState(searchParams.get("mode") === "edit");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [anchor, setAnchor] = useState("");
  const [activeDays, setActiveDays] = useState<number[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  useEffect(() => {
    if (habit) {
      setName(habit.name);
      setDescription(habit.description);
      setAnchor(habit.anchor);
      setActiveDays(habit.activeDays);
    }
  }, [habit]);

  const fetchCompletions = useCallback(() => {
    if (!user || !id) return;
    // Fetch completions for the selected year
    const start = `${selectedYear}-01-01`;
    const end = `${selectedYear}-12-31`;

    supabase
      .from("habit_completions")
      .select("completed_date")
      .eq("habit_id", id)
      .eq("user_id", user.id)
      .gte("completed_date", start)
      .lte("completed_date", end)
      .then(({ data }) => {
        setCompletions(new Set((data ?? []).map((c: any) => c.completed_date)));
      });
  }, [user, id, selectedYear]);

  useEffect(() => {
    fetchCompletions();
  }, [fetchCompletions]);

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    await updateHabit(id, { name, description, anchor, active_days: activeDays });
    setSaving(false);
    setEditing(false);
  };

  const toggleDay = (day: number) => {
    setActiveDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const createdDate = habit?.createdAt ? new Date(habit.createdAt) : new Date();
  const createdDateOnly = new Date(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate());
  const todayStr = toLocalDateStr(new Date());

  // Retroactive punch: only add completions for missed days (no unpunching)
  const handleRetroPunch = useCallback(async (dateStr: string) => {
    if (!user || !id || !editing) return;
    if (completions.has(dateStr)) return;
    const parts = dateStr.split("-");
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    if (d < createdDateOnly || dateStr > todayStr) return;

    await supabase
      .from("habit_completions")
      .insert({ habit_id: id, user_id: user.id, completed_date: dateStr });
    fetchCompletions();
    refetch();
  }, [user, id, editing, completions, createdDateOnly, todayStr, fetchCompletions, refetch]);

  // Generate month grid for selected month/year
  const monthGrid = useMemo(() => {
    const year = selectedYear;
    const month = selectedMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: { date: string; day: number; completed: boolean; active: boolean; beforeCreation: boolean }[] = [];

    for (let d = 1; d <= daysInMonth; d++) {
      const dt = new Date(year, month, d);
      const dateStr = toLocalDateStr(dt);
      const dayOfWeek = dt.getDay();
      const beforeCreation = dt < createdDateOnly;
      days.push({
        date: dateStr,
        day: d,
        completed: completions.has(dateStr),
        active: activeDays.includes(dayOfWeek),
        beforeCreation,
      });
    }
    return days;
  }, [completions, activeDays, createdDateOnly, selectedYear, selectedMonth]);

  // Generate year grid for selected year
  const yearGrid = useMemo(() => {
    const year = selectedYear;
    const months: { month: number; name: string; days: { date: string; completed: boolean; active: boolean; beforeCreation: boolean }[] }[] = [];

    for (let m = 0; m < 12; m++) {
      const daysInMonth = new Date(year, m + 1, 0).getDate();
      const days: { date: string; completed: boolean; active: boolean; beforeCreation: boolean }[] = [];
      for (let d = 1; d <= daysInMonth; d++) {
        const dt = new Date(year, m, d);
        const dateStr = toLocalDateStr(dt);
        const beforeCreation = dt < createdDateOnly;
        days.push({
          date: dateStr,
          completed: completions.has(dateStr),
          active: activeDays.includes(dt.getDay()),
          beforeCreation,
        });
      }
      months.push({ month: m, name: MONTH_NAMES[m], days });
    }
    return months;
  }, [completions, activeDays, createdDateOnly, selectedYear]);

  // Available years: from habit creation to current year
  const availableYears = useMemo(() => {
    const startYear = createdDateOnly.getFullYear();
    const endYear = new Date().getFullYear();
    const years: number[] = [];
    for (let y = endYear; y >= startYear; y--) years.push(y);
    return years;
  }, [createdDateOnly]);

  if (!habit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Habit not found.</p>
      </div>
    );
  }

  const activeDayCount = activeDays.length;

  // Completion: punched / total active days for selected month
  const endOfSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0);
  const monthCompleted = monthGrid.filter((d) => !d.beforeCreation && d.active && d.completed).length;
  const monthTotal = monthGrid.filter((d) => {
    if (d.beforeCreation || !d.active) return false;
    const parts = d.date.split("-");
    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return dt >= createdDateOnly && dt <= endOfSelectedMonth;
  }).length;

  const canPunch = (dateStr: string, beforeCreation: boolean, active: boolean) => {
    if (!editing || beforeCreation || !active) return false;
    if (completions.has(dateStr)) return false;
    if (dateStr > todayStr) return false;
    return true;
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-md mx-auto px-5 pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className={`p-2 rounded-lg transition-colors ${editing ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}
            >
              {editing ? <Eye className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          {/* Editable fields */}
          {editing ? (
            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Habit name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Environment tip</label>
                <input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Put the book on your pillow"
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Anchor (After...)</label>
                <input
                  value={anchor}
                  onChange={(e) => setAnchor(e.target.value)}
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Active days</label>
                <div className="flex gap-2">
                  {DAY_NAMES.map((dayName, i) => (
                    <button
                      key={i}
                      onClick={() => toggleDay(i)}
                      className={`w-9 h-9 rounded-full text-xs font-medium transition-all ${
                        activeDays.includes(i)
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {dayName.charAt(0)}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">💡 Tap any missed day in the calendar below to mark it complete</p>
              {monthGrid.filter(d => !d.beforeCreation && d.active && !d.completed && d.date <= todayStr).length > 0 && (
                <button
                  onClick={() => navigate(`/habit/${id}/missing-logs`)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-accent/10 text-accent text-sm font-medium hover:bg-accent/20 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Add missing logs
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 bg-primary text-primary-foreground rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete habit?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete "{habit.name}" and all its completion history. This can't be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={async () => {
                          await deleteHabit(habit.id);
                          navigate("/");
                        }}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h1 className="text-xl font-display text-foreground">{habit.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">{habit.anchor}</p>
              {habit.description && (
                <p className="text-sm text-accent mt-1 italic">💡 {habit.description}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {activeDayCount} days/week · {habit.streak}d streak 🔥
              </p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-3 mb-6">
            <div className="flex-1 bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-lg font-display text-foreground">{monthCompleted}</p>
              <p className="text-[10px] text-muted-foreground">This month</p>
            </div>
            <div className="flex-1 bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-lg font-display text-foreground">{monthTotal > 0 ? Math.round((monthCompleted / monthTotal) * 100) : 0}%</p>
              <p className="text-[10px] text-muted-foreground">Completion</p>
            </div>
            <div className="flex-1 bg-card border border-border rounded-lg p-3 text-center">
              <p className="text-lg font-display text-foreground">{habit.streak}</p>
              <p className="text-[10px] text-muted-foreground">Streak</p>
            </div>
          </div>

          {/* View toggle + Year selector */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode("month")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  viewMode === "month" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                Month
              </button>
              <button
                onClick={() => setViewMode("year")}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                  viewMode === "year" ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}
              >
                Year
                {!isPro && <Lock className="w-3 h-3" />}
              </button>
            </div>
            {availableYears.length > 1 && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="bg-secondary text-foreground text-xs font-medium rounded-lg px-2 py-1.5 outline-none border border-border"
              >
                {availableYears.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}
          </div>

          {/* Grid */}
          {viewMode === "month" ? (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={() => {
                    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
                    else setSelectedMonth(m => m - 1);
                  }}
                  disabled={selectedYear <= createdDateOnly.getFullYear() && selectedMonth <= createdDateOnly.getMonth()}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <p className="text-xs font-medium text-muted-foreground">
                  {MONTH_NAMES[selectedMonth]} {selectedYear}
                </p>
                <button
                  onClick={() => {
                    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
                    else setSelectedMonth(m => m + 1);
                  }}
                  disabled={selectedYear >= new Date().getFullYear() && selectedMonth >= new Date().getMonth()}
                  className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-30"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {DAY_NAMES.map((d) => (
                  <span key={d} className="text-[9px] text-muted-foreground text-center">{d.charAt(0)}</span>
                ))}
                {/* Offset for first day of month */}
                {monthGrid.length > 0 && Array.from({ length: new Date(selectedYear, selectedMonth, 1).getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {monthGrid.map((day) => {
                  const isPunchable = canPunch(day.date, day.beforeCreation, day.active);
                  return (
                    <div
                      key={day.date}
                      onClick={() => isPunchable && handleRetroPunch(day.date)}
                      className={`aspect-square rounded-sm flex items-center justify-center text-[9px] transition-all ${
                        day.beforeCreation
                          ? "opacity-15 text-muted-foreground"
                          : !day.active
                            ? "opacity-20"
                            : day.completed
                              ? "bg-habit-complete text-primary-foreground font-medium"
                              : day.date <= todayStr
                                ? `bg-secondary text-muted-foreground ${isPunchable ? "cursor-pointer ring-1 ring-primary/30 hover:ring-primary hover:bg-primary/10" : ""}`
                                : "bg-secondary/30 text-muted-foreground/30"
                      }`}
                    >
                      {day.day}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            !isPro ? (
              <div className="bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3 text-center">
                <div className="w-12 h-12 rounded-full bg-accent/15 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-accent" />
                </div>
                <p className="text-sm font-medium text-foreground">Yearly View</p>
                <p className="text-xs text-muted-foreground">See your entire year of completions at a glance. Spot patterns, track monthly progress, and stay motivated with the big picture.</p>
                <button
                  onClick={handleUpgrade}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent text-accent-foreground text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Upgrade to GasPro
                </button>
              </div>
            ) : (
            <div className="space-y-3">
              {yearGrid.map((month) => {
                const eligible = month.days.filter((d) => !d.beforeCreation && d.active);
                const completed = eligible.filter((d) => d.completed).length;
                const total = eligible.length;
                return (
                  <div key={month.month} className="bg-card border border-border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-foreground">{month.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {completed}/{total}
                      </span>
                    </div>
                    <div className="flex gap-[2px] flex-wrap">
                      {month.days.map((day) => {
                        const isPunchable = canPunch(day.date, day.beforeCreation, day.active);
                        return (
                          <div
                            key={day.date}
                            onClick={() => isPunchable && handleRetroPunch(day.date)}
                            className={`w-2.5 h-2.5 rounded-[2px] transition-all ${
                              day.beforeCreation
                                ? "bg-border/20"
                                : !day.active
                                  ? "opacity-0"
                                  : day.completed
                                    ? "bg-habit-complete"
                                    : day.date <= todayStr
                                      ? `bg-border ${isPunchable ? "cursor-pointer ring-1 ring-primary/30 hover:ring-primary hover:bg-primary/20" : ""}`
                                      : "bg-border/30"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            )
          )}
        </motion.div>
      </div>
    </div>
  );
}
