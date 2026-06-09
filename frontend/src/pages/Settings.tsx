/**
 * Settings Page
 * User and application settings
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Save, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";

function Settings() {
  const { user, updateProfile, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [formData, setFormData] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Keep form fields synced when user updates
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        firstName: user.first_name || "",
        lastName: user.last_name || "",
        email: user.email || "",
      }));
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSaveProfile = async () => {
    if (!formData.firstName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name is required.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingProfile(true);
    try {
      await updateProfile({
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
      });
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update profile.",
        variant: "destructive",
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (!formData.currentPassword) {
      toast({
        title: "Validation Error",
        description: "Current password is required to change password.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.newPassword) {
      toast({
        title: "Validation Error",
        description: "New password is required.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateProfile({
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully.",
      });
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
    } catch (err) {
      toast({
        title: "Update Failed",
        description: err instanceof Error ? err.message : "Failed to update password.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      toast({
        title: "Account Deleted",
        description: "Your account has been deleted successfully.",
      });
      navigate("/login");
    } catch (err) {
      toast({
        title: "Deletion Failed",
        description: err instanceof Error ? err.message : "Failed to delete account.",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAccount(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Settings */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-foreground">
                  First Name
                </Label>
                <Input
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  disabled={isSavingProfile}
                  className="border-border/50 bg-background text-foreground"
                  placeholder="John"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-foreground">
                  Last Name
                </Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isSavingProfile}
                  className="border-border/50 bg-background text-foreground"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground">
                Email Address
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                disabled
                className="border-border/50 bg-background text-muted-foreground"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {isSavingProfile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isSavingProfile ? "Saving Changes..." : "Save Changes"}
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword" className="text-foreground">
                Current Password
              </Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showPassword ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={handleChange}
                  disabled={isUpdatingPassword}
                  className="border-border/50 bg-background text-foreground pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isUpdatingPassword}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-foreground">
                New Password
              </Label>
              <Input
                id="newPassword"
                name="newPassword"
                type={showPassword ? "text" : "password"}
                value={formData.newPassword}
                onChange={handleChange}
                disabled={isUpdatingPassword}
                className="border-border/50 bg-background text-foreground"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-foreground">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={handleChange}
                disabled={isUpdatingPassword}
                className="border-border/50 bg-background text-foreground"
                placeholder="••••••••"
              />
            </div>

            <Button
              onClick={handleChangePassword}
              disabled={isUpdatingPassword}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              {isUpdatingPassword ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isUpdatingPassword ? "Updating Password..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preferences */}
      <Card className="border-border/50 bg-card/50">
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              Notifications
            </h4>
            <p className="text-sm text-muted-foreground">
              Email notifications for job completions and security alerts
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-foreground">
              Analysis Mode
            </h4>
            <p className="text-sm text-muted-foreground">
              Automatic analysis with ML models enabled
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/30 bg-destructive/5 hover:bg-destructive/10 transition-colors duration-200">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="w-5 h-5" />
            Danger Zone
          </CardTitle>
          <CardDescription className="text-destructive/80">
            Permanently delete your account and all associated data. This action cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="w-full sm:w-auto bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="border-border/50 bg-card">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  This action is permanent and cannot be undone. It will delete your account
                  and remove your data from our servers.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-border/50 bg-background text-foreground hover:bg-accent">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 animate-pulse"
                >
                  {isDeletingAccount ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  {isDeletingAccount ? "Deleting..." : "Yes, Delete My Account"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}

export default Settings;
