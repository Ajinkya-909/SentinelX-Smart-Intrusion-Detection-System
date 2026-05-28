/**
 * Dashboard Layout
 * Layout wrapper for authenticated pages
 * Provides navigation, user menu, and common dashboard structure
 */

import { ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/Sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, User, Settings, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      navigate("/login");
    } catch (err) {
      toast({
        title: "Logout Error",
        description: "An error occurred while logging out.",
        variant: "destructive",
      });
    }
  };

  return (
    // FIX 1: Changed min-h-screen to h-screen and added overflow-hidden to lock the viewport
    <div className="h-screen w-full overflow-hidden bg-background flex flex-col lg:flex-row">
      
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      {/* FIX 2: Added min-w-0 and overflow-hidden to ensure this wrapper doesn't stretch beyond the screen */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        
        {/* Header - No longer needs sticky top-0 because the container won't scroll past it */}
        <header className="border-b border-border bg-background z-30">
          <div className="px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between gap-4">
              {/* Search Bar */}
              <div className="hidden sm:flex items-center flex-1 max-w-md">
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search logs..."
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              {/* Right Section - Notifications & User Menu */}
              <div className="flex items-center gap-2 sm:gap-4">
                {/* Notifications */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative hover:bg-muted"
                >
                  <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                </Button>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="gap-2 rounded-full hover:bg-muted"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary text-black flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold">
                          {user?.first_name?.charAt(0).toUpperCase()}
                          {user?.last_name?.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="hidden sm:inline text-sm truncate max-w-[120px]">
                        {user?.first_name}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex flex-col space-y-1 py-2">
                      <p className="text-sm font-semibold text-foreground">
                        {user?.first_name} {user?.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user?.email}
                      </p>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="my-2" />

                    <DropdownMenuItem
                      onClick={() => navigate("/profile")}
                      className="cursor-pointer gap-2"
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => navigate("/settings")}
                      className="cursor-pointer gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="my-2" />

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer gap-2 text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        {/* This will now independently scroll if the content is too long */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;