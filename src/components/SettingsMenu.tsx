import { Settings, LogOut, Sun, Moon, Monitor, HelpCircle } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function SettingsMenu() {
  const { signOut } = useAuth();
  const { setTheme, theme } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="font-body text-xs">Settings</DropdownMenuLabel>
          <DropdownMenuSeparator />

          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="text-sm">
              {theme === "dark" ? <Moon className="w-3.5 h-3.5 mr-2" /> : theme === "light" ? <Sun className="w-3.5 h-3.5 mr-2" /> : <Monitor className="w-3.5 h-3.5 mr-2" />}
              Display
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => setTheme("system")} className="text-sm">
                <Monitor className="w-3.5 h-3.5 mr-2" /> System
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("light")} className="text-sm">
                <Sun className="w-3.5 h-3.5 mr-2" /> Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme("dark")} className="text-sm">
                <Moon className="w-3.5 h-3.5 mr-2" /> Dark
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>

          <DropdownMenuItem onClick={() => setHelpOpen(true)} className="text-sm">
            <HelpCircle className="w-3.5 h-3.5 mr-2" /> Help
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={signOut} className="text-sm text-destructive focus:text-destructive">
            <LogOut className="w-3.5 h-3.5 mr-2" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">What is Gaslite?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Gaslite helps you gaslight yourself into becoming the person you want to be. Built on the principles of Atomic Habits by James Clear.
            </p>
            <p>
              <strong className="text-foreground">Identity first.</strong> Instead of setting goals, you define who you want to become. Every completed habit is a vote for that identity.
            </p>
            <p>
              <strong className="text-foreground">Make it visible.</strong> Your coach suggests environmental changes so the right cues are impossible to miss. Book on the pillow. Shoes by the door.
            </p>
            <p>
              <strong className="text-foreground">Shrink it down.</strong> Every habit starts laughably small. Two minutes. One page. One pushup. That's not failure, that's strategy.
            </p>
            <p>
              <strong className="text-foreground">Never miss twice.</strong> Missing once is human. Missing twice is a new identity. Gaslite keeps you honest.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
