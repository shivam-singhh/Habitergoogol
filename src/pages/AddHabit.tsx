import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Flame, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHabits } from "@/contexts/HabitContext";
import { useChatState } from "@/contexts/ChatStateContext";
import { streamCoach, ChatMessage } from "@/lib/streamCoach";
import { toast } from "sonner";

const STEPS = ["Identity", "Action", "Anchor", "Environment", "Confirm"];

export default function AddHabit() {
  const navigate = useNavigate();
  const { addHabit } = useHabits();
  const { addHabitState, setAddHabitState, resetAddHabit } = useChatState();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [addHabitState.messages, scrollToBottom]);

  useEffect(() => {
    if (addHabitState.initialized) return;

    const initMessages: ChatMessage[] = [
      { role: "user", content: "I want to create a new habit. Start the conversation." },
    ];

    setIsLoading(true);
    let content = "";
    const msgId = "init";

    streamCoach({
      messages: initMessages,
      mode: "add_habit",
      onDelta: (chunk) => {
        content += chunk;
        setAddHabitState(prev => ({
          ...prev,
          messages: [{ id: msgId, role: "coach", content }],
        }));
      },
      onDone: () => {
        setAddHabitState(prev => ({
          ...prev,
          aiMessages: [...initMessages, { role: "assistant", content }],
          initialized: true,
        }));
        setIsLoading(false);
      },
    }).catch((e) => {
      toast.error(e.message);
      setIsLoading(false);
    });
  }, [addHabitState.initialized, setAddHabitState]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userInput = input.trim();
    setInput("");

    const newUserMsgCount = addHabitState.userMessageCount + 1;
    const newStep = Math.min(newUserMsgCount, STEPS.length - 1);

    const userMsg = { id: Date.now().toString(), role: "user" as const, content: userInput };

    setAddHabitState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      step: newStep,
      userMessageCount: newUserMsgCount,
    }));

    const updatedAiMessages: ChatMessage[] = [...addHabitState.aiMessages, { role: "user", content: userInput }];
    setAddHabitState(prev => ({ ...prev, aiMessages: updatedAiMessages }));
    setIsLoading(true);

    let content = "";
    const coachId = (Date.now() + 1).toString();

    try {
      await streamCoach({
        messages: updatedAiMessages,
        mode: "add_habit",
        onDelta: (chunk) => {
          content += chunk;
          setAddHabitState(prev => {
            const last = prev.messages[prev.messages.length - 1];
            if (last?.id === coachId) {
              return { ...prev, messages: prev.messages.map(m => m.id === coachId ? { ...m, content } : m) };
            }
            return { ...prev, messages: [...prev.messages, { id: coachId, role: "coach", content }] };
          });
        },
        onDone: () => {
          setAddHabitState(prev => ({
            ...prev,
            aiMessages: [...prev.aiMessages, { role: "assistant", content }],
          }));
          setIsLoading(false);

          const jsonMatch = content.match(/```json\s*\n?([\s\S]*?)\n?```/);
          if (jsonMatch) {
            try {
              const data = JSON.parse(jsonMatch[1]);
              if (data.habit_ready) {
                setAddHabitState(prev => ({ ...prev, step: STEPS.length }));
                setTimeout(async () => {
                  await addHabit({
                    name: data.name,
                    identity: data.identity,
                    anchor: data.anchor,
                    description: data.description || "",
                  });
                  resetAddHabit();
                  navigate("/");
                }, 2000);
              }
            } catch { /* ignore */ }
          }
        },
      });
    } catch (e: any) {
      toast.error(e.message);
      setIsLoading(false);
    }
  };

  const progress = Math.min((addHabitState.step / STEPS.length) * 100, 100);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 overflow-hidden">
        <div className="shrink-0 bg-background px-5 pt-6 pb-2 z-10">
          <h1 className="text-xl font-display text-foreground">New Habit</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Let's gaslight you into greatness.</p>

          <div className="mt-3 mb-1">
            <div className="flex justify-between mb-1">
              {STEPS.map((s, i) => (
                <span
                  key={s}
                  className={`text-[9px] font-medium transition-colors ${
                    i <= addHabitState.step ? "text-primary" : "text-muted-foreground/40"
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
          <AnimatePresence>
            {addHabitState.messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-md"
                      : "bg-coach text-coach-foreground rounded-bl-md"
                  }`}
                >
                  {msg.role === "coach" && (
                    <Flame className="w-3.5 h-3.5 inline-block mr-1.5 -mt-0.5 opacity-60" />
                  )}
                  <span className="whitespace-pre-line">{msg.content.replace(/```json[\s\S]*?```/g, "").trim()}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && addHabitState.messages.length === 0 && (
            <div className="flex justify-start">
              <div className="bg-coach text-coach-foreground rounded-2xl rounded-bl-md px-4 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-5 pb-24 pt-2">
          <div className="flex gap-2 items-end bg-card border border-border rounded-2xl px-4 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your answer..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-1"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-30 transition-opacity"
            >
              <ArrowUp className="w-4 h-4 text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
