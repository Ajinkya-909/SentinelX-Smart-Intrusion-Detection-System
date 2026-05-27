/**
 * Auth Context
 * Manages authentication state and provides auth methods throughout the app
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import authService, {
  User,
  SignupRequest,
  LoginRequest,
} from "@/services/auth";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  signup: (data: SignupRequest) => Promise<void>;
  login: (data: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialize auth state on mount
   * Check if user is already logged in via stored token
   */
useEffect(() => {
    const initializeAuth = async () => {
      const token = authService.getAuthToken();
      const storedUser = authService.getUser();

      // 1. If we have a token and user, set them immediately
      if (token && storedUser) {
        setUser(storedUser);
        setIsLoading(false); // <-- STOP LOADING IMMEDIATELY

        // 2. Fetch fresh data silently in the background
        try {
          const response = await authService.getCurrentUser();
          if (response.success) {
            setUser(response.data);
            authService.setUser(response.data);
          }
        } catch (err) {
          // If the background check fails (e.g., token expired), log them out
          authService.clearAuthToken();
          setUser(null);
        }
      } else {
        // No local data, stop loading
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);
  /**
   * Handle user signup
   */
  const signup = useCallback(async (data: SignupRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.signup(data);

      if (!response.success) {
        throw new Error(response.message || "Signup failed");
      }

      // Store token and user
      authService.setAuthToken(response.data.token);
      authService.setUser(response.data.user);
      setUser(response.data.user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during signup";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle user login
   */
  const login = useCallback(async (data: LoginRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await authService.login(data);

      if (!response.success) {
        throw new Error(response.message || "Login failed");
      }

      // Store token and user
      authService.setAuthToken(response.data.token);
      authService.setUser(response.data.user);
      setUser(response.data.user);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during login";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handle user logout
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Call logout endpoint if available
      try {
        await authService.logout();
      } catch (err) {
        // Even if logout endpoint fails, clear local data
        console.warn("Logout endpoint failed:", err);
      }

      // Clear local data
      authService.clearAuthToken();
      setUser(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred during logout";
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh user data
   */
  const refreshUser = useCallback(async () => {
    try {
      const response = await authService.getCurrentUser();
      if (response.success) {
        setUser(response.data);
        authService.setUser(response.data);
      }
    } catch (err) {
      console.error("Error refreshing user:", err);
    }
  }, []);

  /**
   * Clear error message
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const isAuthenticated = !!user && authService.isAuthenticated();

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    error,
    signup,
    login,
    logout,
    clearError,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Hook to use Auth Context
 * Must be used within AuthProvider
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
