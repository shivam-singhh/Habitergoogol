import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { HabitProvider } from "@/contexts/HabitContext";
import { ChatStateProvider } from "@/contexts/ChatStateContext";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import ProGate from "@/components/ProGate";
import Index from "./pages/Index";
import AddHabit from "./pages/AddHabit";
import CoachChat from "./pages/CoachChat";
import HabitDetail from "./pages/HabitDetail";
import MissingLogs from "./pages/MissingLogs";
import Visualize from "./pages/Visualize";
import Journal from "./pages/Journal";
import Pricing from "./pages/Pricing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  return (
    <>
      <Routes>
        <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/add" element={<ProtectedRoute><AddHabit /></ProtectedRoute>} />
        <Route path="/habit/:id" element={<ProtectedRoute><HabitDetail /></ProtectedRoute>} />
        <Route path="/habit/:id/missing-logs" element={<ProtectedRoute><MissingLogs /></ProtectedRoute>} />
        <Route path="/coach" element={<ProtectedRoute><ProGate featureName="AI Habit Coach" description="Get personalised guidance, motivation, and strategy from your AI coach. It knows your habits, your streaks, and what you need to hear."><CoachChat /></ProGate></ProtectedRoute>} />
        <Route path="/visualize" element={<ProtectedRoute><ProGate featureName="Visualise Growth" description="Watch a 3D glass fill up as you stay consistent. Each day you log adds water. Miss too many days in a row and it drains. A beautiful way to see your progress."><Visualize /></ProGate></ProtectedRoute>} />
        <Route path="/journal" element={<ProtectedRoute><ProGate featureName="Habit Journal" description="Reflect on your journey with daily notes tied to each habit. Look back on what worked, what didn't, and how far you've come."><Journal /></ProGate></ProtectedRoute>} />
        <Route path="/pricing" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && <BottomNav />}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <HabitProvider>
              <ChatStateProvider>
                <Toaster />
                <Sonner />
                <BrowserRouter>
                  <AppRoutes />
                </BrowserRouter>
              </ChatStateProvider>
            </HabitProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
