import { createContext, useContext, useState, useRef, ReactNode } from "react";
import { ChatMessage } from "@/lib/streamCoach";

interface Message {
  id: string;
  role: "coach" | "user";
  content: string;
}

interface ChatState {
  messages: Message[];
  aiMessages: ChatMessage[];
  initialized: boolean;
}

interface AddHabitState extends ChatState {
  step: number;
  userMessageCount: number;
}

interface ChatStateContextType {
  // Coach chat
  coachState: ChatState;
  setCoachState: React.Dispatch<React.SetStateAction<ChatState>>;
  // Add habit chat
  addHabitState: AddHabitState;
  setAddHabitState: React.Dispatch<React.SetStateAction<AddHabitState>>;
  resetAddHabit: () => void;
}

const initialCoachState: ChatState = {
  messages: [],
  aiMessages: [],
  initialized: false,
};

const initialAddHabitState: AddHabitState = {
  messages: [],
  aiMessages: [],
  initialized: false,
  step: 0,
  userMessageCount: 0,
};

const ChatStateContext = createContext<ChatStateContextType | null>(null);

export function ChatStateProvider({ children }: { children: ReactNode }) {
  const [coachState, setCoachState] = useState<ChatState>(initialCoachState);
  const [addHabitState, setAddHabitState] = useState<AddHabitState>(initialAddHabitState);

  const resetAddHabit = () => setAddHabitState({ ...initialAddHabitState });

  return (
    <ChatStateContext.Provider value={{ coachState, setCoachState, addHabitState, setAddHabitState, resetAddHabit }}>
      {children}
    </ChatStateContext.Provider>
  );
}

export function useChatState() {
  const ctx = useContext(ChatStateContext);
  if (!ctx) throw new Error("useChatState must be used within ChatStateProvider");
  return ctx;
}
