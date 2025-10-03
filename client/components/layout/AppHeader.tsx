import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, Moon, SunMedium, LogOut } from "lucide-react";
import { BackButton } from "@/components/ui/back-button";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth";

export function AppHeader() {
  const [dark, setDark] = useState(false);
  const { logout } = useAuth();

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  const toggleTheme = () => {
    const el = document.documentElement;
    const next = !el.classList.contains("dark");
    el.classList.toggle("dark", next);
    setDark(next);
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <SidebarTrigger />
      <BackButton className="ml-1" />
      <div className="ml-1 text-sm font-medium text-muted-foreground">
        Admin Portal
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {dark ? (
            <SunMedium className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Logout"
          className="sm:hidden"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:inline-flex"
          onClick={logout}
        >
          Logout
        </Button>
        <Avatar>
          <AvatarFallback>AD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
