import { useLocation, useNavigate } from "react-router-dom";
import { Home, Plus, MessageCircle, GlassWater, BookOpen, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { useSubscription } from "@/contexts/SubscriptionContext";

const tabs = [
  { path: "/", icon: Home, label: "Home", pro: false },
  { path: "/visualize", icon: GlassWater, label: "Visualise", pro: true },
  { path: "/add", icon: Plus, label: "Add", pro: false },
  { path: "/coach", icon: MessageCircle, label: "Coach", pro: true },
  { path: "/journal", icon: BookOpen, label: "Journal", pro: true },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPro } = useSubscription();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-xl border-t border-border">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-0.5 py-1 px-2"
            >
              {active && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-px inset-x-0 mx-auto w-6 h-0.5 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <div className="relative">
                <tab.icon
                  className={`w-4.5 h-4.5 transition-colors ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                  size={18}
                />
                {tab.pro && !isPro && (
                  <Lock className="absolute -top-1 -right-1.5 w-2.5 h-2.5 text-accent" />
                )}
              </div>
              <span
                className={`text-[9px] font-medium transition-colors ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </div>
  );
}
