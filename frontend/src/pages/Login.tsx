/**
 * Login Page
 * User authentication page with email/password login
 */

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Eye, EyeOff, Shield } from "lucide-react";
import { validateLoginForm, validateEmail } from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const {
    login,
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    clearError,
  } = useAuth();
  const { toast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  /**
   * Handle field blur to mark as touched
   */
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field);
  };

  /**
   * Validate individual field
   */
  const validateField = (field: string) => {
    const newErrors = { ...errors };

    if (field === "email") {
      const validation = validateEmail(email);
      if (!validation.isValid) {
        newErrors.email = validation.error || "Invalid email";
      } else {
        delete newErrors.email;
      }
    }

    if (field === "password") {
      if (!password) {
        newErrors.password = "Password is required";
      } else {
        delete newErrors.password;
      }
    }

    setErrors(newErrors);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Mark all fields as touched
    setTouched({ email: true, password: true });

    // Validate form
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setErrors({ email: "", password: validation.error || "" });
      toast({
        title: "Validation Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await login({ email, password });

      toast({
        title: "Login Successful",
        description: "Welcome back to SentinelX!",
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Login failed. Please try again.";
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      {/* Background gradient accents */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-gradient-primary">
              SentinelX
            </h1>
          </div>
          <p className="text-muted-foreground">
            Log-based Intrusion Detection System
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Error Alert */}
            {authError && (
              <Alert variant="destructive" className="mb-6">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (touched.email) validateField("email");
                  }}
                  onBlur={() => handleBlur("email")}
                  disabled={isSubmitting || authLoading}
                  className={`${
                    touched.email && errors.email
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  autoComplete="email"
                />
                {touched.email && errors.email && (
                  <p className="text-sm text-destructive">{errors.email}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (touched.password) validateField("password");
                    }}
                    onBlur={() => handleBlur("password")}
                    disabled={isSubmitting || authLoading}
                    className={`pr-10 ${
                      touched.password && errors.password
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting || authLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {touched.password && errors.password && (
                  <p className="text-sm text-destructive">{errors.password}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                size="lg"
              >
                {isSubmitting || authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              {/* Sign Up Link */}
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link
                  to="/signup"
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Login;
