import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface CoachMessageProps {
  message: string;
  type?: "inline" | "insight";
}

export default function CoachMessage({ message, type = "inline" }: CoachMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`rounded-lg px-4 py-3 ${
        type === "insight"
          ? "bg-coach border border-coach-border"
          : "bg-coach/50 border border-coach-border/50"
      }`}
    >
      <div className="flex gap-2.5 items-start">
        <Flame className="w-4 h-4 text-coach-foreground mt-0.5 flex-shrink-0 animate-breathe" />
        <p className="text-sm text-coach-foreground leading-relaxed">{message}</p>
      </div>
    </motion.div>
  );
}
