import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp, Flame, Loader2 } from "lucide-react";
import { useHabits } from "@/contexts/HabitContext";
import { useChatState } from "@/contexts/ChatStateContext";
import { streamCoach, ChatMessage } from "@/lib/streamCoach";
import { toast } from "sonner";

export default function CoachChat() {
  const { habits } = useHabits();
  const { coachState, setCoachState } = useChatState();
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
  }, [coachState.messages, scrollToBottom]);

  useEffect(() => {
    if (coachState.initialized) return;

    const habitSummary = habits.length > 0
      ? `The user has ${habits.length} habits: ${habits.map(h => `"${h.name}" (streak: ${h.streak}, completed today: ${h.completedToday})`).join(", ")}.`
      : "The user has no habits yet.";

    const initMessages: ChatMessage[] = [
      { role: "user", content: `Here's my current status: ${habitSummary}\n\nGreet me and ask what's on my mind.` },
    ];

    setIsLoading(true);
    let content = "";
    const msgId = "init";

    streamCoach({
      messages: initMessages,
      mode: "coach",
      onDelta: (chunk) => {
        content += chunk;
        setCoachState(prev => ({
          ...prev,
          messages: [{ id: msgId, role: "coach", content }],
        }));
      },
      onDone: () => {
        setCoachState(prev => ({
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
  }, [coachState.initialized, habits, setCoachState]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    const userInput = input.trim();
    setInput("");

    const userMsg = { id: Date.now().toString(), role: "user" as const, content: userInput };
    setCoachState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
    }));

    const updatedAiMessages: ChatMessage[] = [...coachState.aiMessages, { role: "user", content: userInput }];
    setCoachState(prev => ({ ...prev, aiMessages: updatedAiMessages }));
    setIsLoading(true);

    let content = "";
    const coachId = (Date.now() + 1).toString();

    try {
      await streamCoach({
        messages: updatedAiMessages,
        mode: "coach",
        onDelta: (chunk) => {
          content += chunk;
          setCoachState(prev => {
            const last = prev.messages[prev.messages.length - 1];
            if (last?.id === coachId) {
              return { ...prev, messages: prev.messages.map(m => m.id === coachId ? { ...m, content } : m) };
            }
            return { ...prev, messages: [...prev.messages, { id: coachId, role: "coach", content }] };
          });
        },
        onDone: () => {
          setCoachState(prev => ({
            ...prev,
            aiMessages: [...prev.aiMessages, { role: "assistant", content }],
          }));
          setIsLoading(false);
        },
      });
    } catch (e: any) {
      toast.error(e.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="max-w-md mx-auto w-full flex flex-col flex-1 overflow-hidden">
        <div className="shrink-0 px-5 pt-6 pb-3">
          <h1 className="text-xl font-display text-foreground">Review with Coach</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your personal gaslighter — in a good way.
          </p>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 pb-4 space-y-3">
          <AnimatePresence>
            {coachState.messages.map((msg) => (
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
                  <span className="whitespace-pre-line">{msg.content}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && coachState.messages.length === 0 && (
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
              placeholder="Ask your coach anything..."
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
