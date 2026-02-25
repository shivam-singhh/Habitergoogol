import { Crown, Check } from "lucide-react";
import { handleUpgrade, isAndroidWebView } from "@/lib/androidBridge";

const features = [
  "AI Habit Coach — personalised guidance",
  "Visualise Growth — 3D glass tracker",
  "Journal — reflect on your journey",
  "Yearly habit heatmap view",
  "Priority support & future features",
];

export default function Pricing() {
  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-md mx-auto px-5 pt-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center mx-auto mb-4">
            <Crown className="w-7 h-7 text-accent" />
          </div>
          <h1 className="text-2xl font-display text-foreground">Upgrade to GasPro</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Unlock the full power of Gaslite.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
          <ul className="space-y-3">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm text-foreground">
                <Check className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleUpgrade}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-accent text-accent-foreground text-sm font-medium shadow-lg hover:opacity-90 transition-opacity"
          >
            <Crown className="w-4 h-4" />
            {isAndroidWebView() ? "Subscribe via Google Play" : "Get GasPro"}
          </button>

          <p className="text-[11px] text-muted-foreground text-center">
            {isAndroidWebView()
              ? "Payment handled securely by Google Play."
              : "Secure payment. Cancel anytime."}
          </p>
        </div>
      </div>
    </div>
  );
}
