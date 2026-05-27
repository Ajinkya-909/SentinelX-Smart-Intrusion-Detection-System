/**
 * Signup Page
 * User registration page with email/password signup and validations
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
import {
  AlertTriangle,
  Loader2,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  validateSignupForm,
  validateFirstName,
  validateLastName,
  validateEmail,
  validatePassword,
  validatePasswordMatch,
} from "@/lib/validation";
import { useToast } from "@/hooks/use-toast";

const Signup = () => {
  const navigate = useNavigate();
  const {
    signup,
    isAuthenticated,
    isLoading: authLoading,
    error: authError,
    clearError,
  } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [passwordStrength, setPasswordStrength] = useState<
    "weak" | "fair" | "good" | "strong" | null
  >(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, navigate]);

  /**
   * Calculate password strength
   */
  const calculatePasswordStrength = (
    pwd: string,
  ): "weak" | "fair" | "good" | "strong" | null => {
    if (!pwd) return null;

    let strength = 0;
    if (pwd.length >= 8) strength++;
    if (pwd.length >= 12) strength++;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) strength++;
    if (/[0-9]/.test(pwd)) strength++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) strength++;

    if (strength <= 1) return "weak";
    if (strength === 2) return "fair";
    if (strength === 3) return "good";
    return "strong";
  };

  /**
   * Handle field change
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Update password strength indicator
    if (name === "password") {
      setPasswordStrength(calculatePasswordStrength(value));
    }

    // Validate field if touched
    if (touched[name]) {
      validateField(name, value);
    }
  };

  /**
   * Handle field blur to mark as touched
   */
  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    validateField(field, formData[field as keyof typeof formData] as string);
  };

  /**
   * Validate individual field
   */
  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case "firstName": {
        const validation = validateFirstName(value);
        if (!validation.isValid) {
          newErrors.firstName = validation.error || "Invalid first name";
        } else {
          delete newErrors.firstName;
        }
        break;
      }

      case "lastName": {
        const validation = validateLastName(value);
        if (!validation.isValid) {
          newErrors.lastName = validation.error || "Invalid last name";
        } else {
          delete newErrors.lastName;
        }
        break;
      }

      case "email": {
        const validation = validateEmail(value);
        if (!validation.isValid) {
          newErrors.email = validation.error || "Invalid email";
        } else {
          delete newErrors.email;
        }
        break;
      }

      case "password": {
        const validation = validatePassword(value, formData.email);
        if (!validation.isValid) {
          newErrors.password = validation.error || "Invalid password";
        } else {
          delete newErrors.password;
        }

        // Also validate confirm password if it's been touched
        if (touched.confirmPassword && formData.confirmPassword) {
          const matchValidation = validatePasswordMatch(
            value,
            formData.confirmPassword,
          );
          if (!matchValidation.isValid) {
            newErrors.confirmPassword =
              matchValidation.error || "Passwords do not match";
          } else {
            delete newErrors.confirmPassword;
          }
        }
        break;
      }

      case "confirmPassword": {
        const matchValidation = validatePasswordMatch(formData.password, value);
        if (!matchValidation.isValid) {
          newErrors.confirmPassword =
            matchValidation.error || "Passwords do not match";
        } else {
          delete newErrors.confirmPassword;
        }
        break;
      }

      default:
        break;
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
    setTouched({
      firstName: true,
      lastName: true,
      email: true,
      password: true,
      confirmPassword: true,
    });

    // Validate entire form
    const validation = validateSignupForm(
      formData.firstName,
      formData.email,
      formData.password,
      formData.confirmPassword,
      formData.lastName || undefined,
    );

    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await signup({
        first_name: formData.firstName,
        last_name: formData.lastName || undefined,
        email: formData.email,
        password: formData.password,
      });

      toast({
        title: "Account Created Successfully",
        description: "Welcome to SentinelX! Redirecting to dashboard...",
      });

      // Navigate to dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Signup failed. Please try again.";
      toast({
        title: "Signup Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthColor = () => {
    switch (passwordStrength) {
      case "weak":
        return "bg-destructive";
      case "fair":
        return "bg-medium";
      case "good":
        return "bg-high";
      case "strong":
        return "bg-primary";
      default:
        return "bg-border";
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

        {/* Signup Card */}
        <Card className="border-border/50">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Create Account</CardTitle>
            <CardDescription>
              Join SentinelX to start analyzing your logs
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
              {/* First Name Field */}
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={handleChange}
                  onBlur={() => handleBlur("firstName")}
                  disabled={isSubmitting || authLoading}
                  className={`${
                    touched.firstName && errors.firstName
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  autoComplete="given-name"
                />
                {touched.firstName && errors.firstName && (
                  <p className="text-sm text-destructive">{errors.firstName}</p>
                )}
              </div>

              {/* Last Name Field */}
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  onBlur={() => handleBlur("lastName")}
                  disabled={isSubmitting || authLoading}
                  className={`${
                    touched.lastName && errors.lastName
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }`}
                  autoComplete="family-name"
                />
                {touched.lastName && errors.lastName && (
                  <p className="text-sm text-destructive">{errors.lastName}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
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
                <Label htmlFor="password" className="text-sm font-medium">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={() => handleBlur("password")}
                    disabled={isSubmitting || authLoading}
                    className={`pr-10 ${
                      touched.password && errors.password
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    autoComplete="new-password"
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

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex gap-1 h-1">
                      <div
                        className={`flex-1 rounded-full ${getPasswordStrengthColor()}`}
                      />
                      <div
                        className={`flex-1 rounded-full ${
                          passwordStrength &&
                          ["good", "strong"].includes(passwordStrength)
                            ? getPasswordStrengthColor()
                            : "bg-border"
                        }`}
                      />
                      <div
                        className={`flex-1 rounded-full ${
                          passwordStrength === "strong"
                            ? getPasswordStrengthColor()
                            : "bg-border"
                        }`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Password strength:{" "}
                      <span
                        className={`font-medium ${passwordStrength === "strong" ? "text-primary" : ""}`}
                      >
                        {passwordStrength}
                      </span>
                    </p>
                  </div>
                )}

                {touched.password && errors.password && (
                  <div className="flex gap-2 items-start">
                    <AlertCircle className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-destructive">
                      {errors.password}
                    </p>
                  </div>
                )}

                {/* Password Requirements */}
                {formData.password && !errors.password && (
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <p className="flex gap-2 items-center">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      At least 8 characters
                    </p>
                    <p className="flex gap-2 items-center">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      Uppercase, lowercase, and numbers
                    </p>
                    <p className="flex gap-2 items-center">
                      <CheckCircle2 className="w-3 h-3 text-primary" />
                      Special characters
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <Label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium"
                >
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={() => handleBlur("confirmPassword")}
                    disabled={isSubmitting || authLoading}
                    className={`pr-10 ${
                      touched.confirmPassword && errors.confirmPassword
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }`}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting || authLoading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={
                      showConfirmPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {touched.confirmPassword && errors.confirmPassword && (
                  <p className="text-sm text-destructive">
                    {errors.confirmPassword}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || authLoading}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium mt-6"
                size="lg"
              >
                {isSubmitting || authLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  "Create Account"
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

              {/* Login Link */}
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-medium text-primary hover:text-primary/90 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Additional Info */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          By creating an account, you agree to our Terms of Service and Privacy
          Policy
        </p>
      </div>
    </div>
  );
};

export default Signup;
