import { useMemo, useState, useCallback } from "react";
import { motion, Reorder } from "framer-motion";
import { useHabits } from "@/contexts/HabitContext";
import HabitCard from "@/components/HabitCard";
import CoachMessage from "@/components/CoachMessage";
import SettingsMenu from "@/components/SettingsMenu";
import { coachInsights } from "@/data/sampleData";
import { Loader2, ArrowUpDown, GripVertical } from "lucide-react";

export default function Dashboard() {
  const { habits, loading, reorderHabits } = useHabits();
  const [reordering, setReordering] = useState(false);
  const [localOrder, setLocalOrder] = useState<string[]>([]);

  const completedCount = habits.filter((h) => h.completedToday).length;

  const insight = useMemo(
    () => coachInsights[Math.floor(Math.random() * coachInsights.length)],
    []
  );

  const missedHabits = habits.filter((h) => !h.completedToday && h.streak === 0);
  const showCoachNudge = missedHabits.length > 0;

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const startReorder = useCallback(() => {
    setLocalOrder(habits.map((h) => h.id));
    setReordering(true);
  }, [habits]);

  const stopReorder = useCallback(async () => {
    await reorderHabits(localOrder);
    setReordering(false);
  }, [localOrder, reorderHabits]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-md mx-auto px-5 pt-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6 flex items-start justify-between"
        >
          <div>
            <h1 className="text-2xl font-display text-foreground">{greeting}.</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {completedCount}/{habits.length} habits today · <span className="text-accent font-medium">Gaslite</span>
            </p>
          </div>
          <SettingsMenu />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mb-6"
        >
          <CoachMessage message={insight} type="insight" />
        </motion.div>

        {reordering ? (
          <Reorder.Group
            axis="y"
            values={localOrder}
            onReorder={setLocalOrder}
            className="space-y-2"
          >
            {localOrder.map((id) => {
              const habit = habits.find((h) => h.id === id);
              if (!habit) return null;
              return (
                <Reorder.Item
                  key={id}
                  value={id}
                  className="select-none touch-none"
                  whileDrag={{ scale: 1.03, boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                >
                  <div className="bg-card rounded-lg p-4 border border-border flex items-center gap-3 cursor-grab active:cursor-grabbing">
                    <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">{habit.name}</span>
                  </div>
                </Reorder.Item>
              );
            })}
          </Reorder.Group>
        ) : (
          <div className="space-y-3">
            {habits.map((habit, i) => (
              <div key={habit.id}>
                <HabitCard habit={habit} index={i} />
                {showCoachNudge && habit.id === missedHabits[0]?.id && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="mt-2 mb-1"
                  >
                    <CoachMessage
                      message="This one's gone quiet. You were doing it. You ARE that person. Let's shrink it even smaller — that's not failure, that's strategy."
                    />
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}

        {habits.length > 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 flex justify-center"
          >
            <button
              onClick={reordering ? stopReorder : startReorder}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium transition-colors ${
                reordering
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {reordering ? "Done" : "Reorder"}
            </button>
          </motion.div>
        )}

        {habits.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <p className="text-muted-foreground text-sm">
              No habits found for this account. If your old data is missing, check you logged in with the same Google account.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
