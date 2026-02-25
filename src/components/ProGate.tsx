import { Lock, Crown } from "lucide-react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { handleUpgrade } from "@/lib/androidBridge";
import type { ReactNode } from "react";

interface ProGateProps {
  children: ReactNode;
  featureName?: string;
  description?: string;
}

export default function ProGate({ children, featureName, description }: ProGateProps) {
  const { isPro } = useSubscription();

  if (isPro) return <>{children}</>;

  return (
    <div className="relative min-h-screen">
      {/* Blurred content behind */}
      <div className="pointer-events-none select-none blur-sm opacity-40">
        {children}
      </div>

      {/* Glass overlay */}
      <div className="absolute inset-0 z-40 flex items-center justify-center bg-background/60 backdrop-blur-md">
        <div className="flex flex-col items-center gap-4 px-8 py-10 max-w-xs text-center">
          <div className="w-16 h-16 rounded-full bg-accent/15 flex items-center justify-center">
            <Lock className="w-7 h-7 text-accent" />
          </div>
          <h2 className="text-lg font-display text-foreground">
            {featureName || "This feature"}
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {description || "Unlock the full experience with GasPro."}
          </p>
          <button
            onClick={handleUpgrade}
            className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <Crown className="w-4 h-4" />
            Upgrade to GasPro
          </button>
        </div>
      </div>
    </div>
  );
}
