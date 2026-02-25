import { motion } from "framer-motion";
import { Check, Info } from "lucide-react";
import { useHabits, Habit } from "@/contexts/HabitContext";
import { useNavigate } from "react-router-dom";

interface HabitCardProps {
  habit: Habit;
  index: number;
}

const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export default function HabitCard({ habit, index }: HabitCardProps) {
  const { toggleHabit } = useHabits();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.4 }}
      className="bg-card rounded-lg p-4 border border-border"
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => toggleHabit(habit.id)}
          className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
            habit.completedToday
              ? "bg-habit-complete border-habit-complete"
              : "border-muted-foreground/30 hover:border-primary/50"
          }`}
        >
          {habit.completedToday && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Check className="w-4 h-4 text-primary-foreground" />
            </motion.div>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-sm leading-snug transition-all ${
              habit.completedToday ? "text-muted-foreground line-through" : "text-foreground"
            }`}
          >
            {habit.name}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{habit.anchor}</p>
          {habit.description && (
            <p className="text-xs text-accent mt-0.5 italic">💡 {habit.description}</p>
          )}

          {/* Day-by-day dots */}
          <div className="flex gap-1.5 mt-2 items-center">
            {habit.history.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-0.5">
                <span className="text-[8px] text-muted-foreground leading-none">
                  {DAY_LABELS[i]}
                </span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    !day.active
                      ? "bg-transparent"
                      : day.completed
                        ? "bg-habit-complete"
                        : "bg-border"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-shrink-0 flex flex-col items-end gap-1">
          {habit.streak > 0 && (
            <span className="text-xs font-medium text-warm-glow">{habit.streak}d 🔥</span>
          )}
          <button
            onClick={() => navigate(`/habit/${habit.id}`)}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Edit habit"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
