import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Activity, Wifi, WifiOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/context/AuthContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

type ServerStatus = "checking" | "live" | "offline";

export function Navbar() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [serverStatus, setServerStatus] = useState<ServerStatus>("checking");
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkHealth = async () => {
    setServerStatus("checking");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout

    try {
      const response = await fetch(`${API_BASE_URL}/health`, {
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
        },
      });
      clearTimeout(timeoutId);
      if (response.ok) {
        setServerStatus("live");
      } else {
        setServerStatus("offline");
      }
    } catch (error) {
      clearTimeout(timeoutId);
      setServerStatus("offline");
    } finally {
      setLastChecked(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    checkHealth();

    // Poll status every 10 seconds
    const interval = setInterval(checkHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleScroll = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border/40 bg-[#040811]/70 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Left Side: Brand Logo & Name */}
        <div 
          className="flex cursor-pointer items-center gap-2.5 transition-opacity hover:opacity-90"
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 text-primary">
            <Shield className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-sans">
            Sentinel<span className="text-primary">X</span>
          </span>
        </div>

        {/* Center: Scroll Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <button
            onClick={() => handleScroll("pipeline-section")}
            className="transition-colors hover:text-white"
          >
            Pipeline
          </button>
          <button
            onClick={() => handleScroll("engines-section")}
            className="transition-colors hover:text-white"
          >
            Engines
          </button>
          <button
            onClick={() => handleScroll("formats-section")}
            className="transition-colors hover:text-white"
          >
            Log Formats
          </button>
        </nav>

        {/* Right Side: Health Status Badge & CTA Button */}
        <div className="flex items-center gap-4">
          {/* Health Status Badge with Tooltip */}
          <TooltipProvider>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <div 
                  onClick={checkHealth}
                  className="cursor-pointer select-none"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      checkHealth();
                    }
                  }}
                >
                  {serverStatus === "checking" && (
                    <Badge variant="secondary" className="gap-1.5 py-1 px-3 border border-border bg-[#091020]">
                      <Loader2 className="h-3 w-3 animate-spin text-accent" />
                      <span className="text-[11px] font-mono text-muted-foreground">Checking Backend...</span>
                    </Badge>
                  )}

                  {serverStatus === "live" && (
                    <Badge 
                      variant="low" 
                      className="gap-1.5 py-1 px-3 border border-emerald-500/20 bg-emerald-950/10 text-emerald-400 hover:bg-emerald-950/20 shadow-[0_0_10px_rgba(16,185,129,0.05)] transition-all duration-300"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[11px] font-mono font-bold tracking-wide">Server is Live</span>
                    </Badge>
                  )}

                  {serverStatus === "offline" && (
                    <Badge 
                      variant="critical" 
                      className="gap-1.5 py-1 px-3 border border-destructive/20 bg-destructive/10 text-destructive hover:bg-destructive/20 shadow-[0_0_10px_rgba(239,68,68,0.05)] transition-all duration-300"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-destructive"></span>
                      </span>
                      <span className="text-[11px] font-mono font-bold tracking-wide">Server Offline</span>
                    </Badge>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="border-border bg-[#091020] text-[11px] font-mono py-2 px-3 shadow-xl">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-accent" />
                    <span className="text-white font-semibold">Backend Endpoint Status</span>
                  </div>
                  {lastChecked && (
                    <div className="text-muted-foreground/80 text-[10px]">Last checked: {lastChecked}</div>
                  )}
                  <div className="text-[10px] text-accent/80 mt-1 italic border-t border-border/40 pt-1">
                    Click badge to refresh status manually
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* CTA Button */}
          <Button
            size="sm"
            className="hidden sm:inline-flex bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-wide rounded-md transition-all duration-300 shadow-[0_0_10px_rgba(132,255,13,0.15)]"
            onClick={() => navigate(isAuthenticated ? "/dashboard" : "/login")}
          >
            {isAuthenticated ? "Dashboard" : "Launch Console"}
          </Button>
        </div>

      </div>
    </header>
  );
}
