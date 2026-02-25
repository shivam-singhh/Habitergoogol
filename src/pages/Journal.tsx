import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Plus, ChevronLeft, Loader2, Search } from "lucide-react";
import { useHabits } from "@/contexts/HabitContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toLocalDateStr } from "@/lib/dateUtils";

type JournalEntry = {
  id: string;
  habit_id: string;
  entry_date: string;
  content: string;
  created_at: string;
};

type ViewMode = "list" | "write";

export default function Journal() {
  const { habits } = useHabits();
  const { user } = useAuth();
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState("");

  // Write mode state
  const [writeDate, setWriteDate] = useState(() => toLocalDateStr(new Date()));
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  const activeHabitId = selectedHabit || habits[0]?.id;
  const activeHabit = habits.find(h => h.id === activeHabitId);

  const fetchEntries = useCallback(async () => {
    if (!user || !activeHabitId) return;
    setLoading(true);
    const { data } = await supabase
      .from("journal_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("habit_id", activeHabitId)
      .order("entry_date", { ascending: false });

    setEntries(data || []);
    setLoading(false);
  }, [user, activeHabitId]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openWrite = (date: string, entry?: JournalEntry) => {
    setWriteDate(date);
    setContent(entry?.content || "");
    setExistingId(entry?.id || null);
    setViewMode("write");
  };

  const saveEntry = async () => {
    if (!user || !activeHabitId) return;
    setSaving(true);
    if (existingId) {
      await supabase
        .from("journal_entries")
        .update({ content })
        .eq("id", existingId);
    } else if (content.trim()) {
      const { data } = await supabase
        .from("journal_entries")
        .insert({ user_id: user.id, habit_id: activeHabitId, entry_date: writeDate, content })
        .select()
        .single();
      if (data) setExistingId(data.id);
    }
    setSaving(false);
  };

  const handleBack = async () => {
    if (content.trim() || existingId) await saveEntry();
    setViewMode("list");
    fetchEntries();
  };

  const formatDate = (dateStr: string) => {
    const parts = dateStr.split("-");
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const formatDateLong = (dateStr: string) => {
    const parts = dateStr.split("-");
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  };

  const getRelativeDate = (dateStr: string) => {
    const todayStr = toLocalDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);
    if (dateStr === todayStr) return "Today";
    if (dateStr === yesterdayStr) return "Yesterday";
    return formatDate(dateStr);
  };

  const getPreview = (text: string, maxLen = 80) => {
    const firstLine = text.split("\n")[0];
    return firstLine.length > maxLen ? firstLine.slice(0, maxLen) + "…" : firstLine;
  };

  const todayStr = toLocalDateStr(new Date());
  const hasTodayEntry = entries.some(e => e.entry_date === todayStr);

  const filtered = searchQuery.trim()
    ? entries.filter(e => e.content.toLowerCase().includes(searchQuery.toLowerCase()))
    : entries;

  // Group entries by month
  const grouped = filtered.reduce<Record<string, JournalEntry[]>>((acc, entry) => {
    const parts = entry.entry_date.split("-");
    const key = `${parts[0]}-${parts[1]}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const monthLabel = (key: string) => {
    const [y, m] = key.split("-");
    const d = new Date(parseInt(y), parseInt(m) - 1);
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  if (viewMode === "write") {
    return (
      <div className="h-screen flex flex-col overflow-hidden bg-background">
        <div className="max-w-md mx-auto w-full flex flex-col flex-1 overflow-hidden">
          <div className="shrink-0 px-5 pt-6 pb-3">
            <button onClick={handleBack} className="flex items-center gap-1 text-sm text-primary font-medium mb-3">
              <ChevronLeft className="w-4 h-4" /> Notes
            </button>
            <p className="text-xs text-muted-foreground">{formatDateLong(writeDate)}</p>
            {activeHabit && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{activeHabit.name}</p>
            )}
          </div>
          <div className="flex-1 px-5 pb-24 overflow-hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing…"
                className="w-full h-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
                style={{ fontSize: "16px" }}
                autoFocus
              />
            </motion.div>
            {saving && <p className="text-[10px] text-muted-foreground text-center mt-1">Saving…</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 pt-6 pb-1">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-2xl font-display text-foreground">Notes</h1>
            <span className="text-xs text-muted-foreground">{entries.length} note{entries.length !== 1 ? "s" : ""}</span>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-secondary/80 rounded-xl pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              style={{ fontSize: "16px" }}
            />
          </div>
        </div>

        {/* Habit filter */}
        {habits.length > 1 && (
          <div className="px-5 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
            {habits.map(h => (
              <button
                key={h.id}
                onClick={() => setSelectedHabit(h.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  h.id === activeHabitId
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {h.name}
              </button>
            ))}
          </div>
        )}

        {/* Write today */}
        <div className="px-5 pb-3">
          <button
            onClick={() => {
              const todayEntry = entries.find(e => e.entry_date === todayStr);
              openWrite(todayStr, todayEntry);
            }}
            className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl bg-primary/10 text-primary text-sm font-medium transition-colors hover:bg-primary/15"
          >
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <Plus className="w-4 h-4 text-primary-foreground" />
            </div>
            {hasTodayEntry ? "Continue today's note" : "New note"}
          </button>
        </div>

        {/* Entries */}
        <div className="flex-1 px-5 pb-24 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <BookOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {searchQuery ? "No matching notes" : "No notes yet. Start writing!"}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.keys(grouped).map(monthKey => (
                <div key={monthKey}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    {monthLabel(monthKey)}
                  </p>
                  <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
                    {grouped[monthKey].map((entry) => (
                      <motion.button
                        key={entry.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => openWrite(entry.entry_date, entry)}
                        className="w-full text-left px-4 py-3 hover:bg-secondary/50 transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-foreground">{getRelativeDate(entry.entry_date)}</p>
                          <p className="text-[10px] text-muted-foreground flex-shrink-0">{formatDate(entry.entry_date)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                          {getPreview(entry.content)}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
