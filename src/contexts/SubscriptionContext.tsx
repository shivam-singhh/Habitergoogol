import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";

const DEV_EMAILS = ["shivamsingh31121999@gmail.com"];

interface SubscriptionState {
  isPro: boolean;
  setPro: (v: boolean) => void;
}

const SubscriptionContext = createContext<SubscriptionState>({ isPro: false, setPro: () => {} });

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const isDev = !!user?.email && DEV_EMAILS.includes(user.email);

  const [isPro, setIsPro] = useState(() => {
    try {
      return localStorage.getItem("gasPro") === "true";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("gasPro", String(isPro));
    } catch {}
  }, [isPro]);

  // Listen for Android bridge pro status updates
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "gasPro" && typeof e.data.isPro === "boolean") {
        setIsPro(e.data.isPro);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const effectivePro = isDev || isPro;

  return (
    <SubscriptionContext.Provider value={{ isPro: effectivePro, setPro: setIsPro }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
