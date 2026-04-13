import DashboardLayout from '@/layouts/DashboardLayout';
import { useAuthStore } from '@/store/authStore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

export default function SettingsPage() {
  const { user } = useAuthStore();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in max-w-2xl">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
        </div>

        <div className="gradient-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Profile</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input defaultValue={user?.name || 'Ajinkya'} className="bg-secondary border-border" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input defaultValue={user?.email || 'admin@sentinelx.com'} className="bg-secondary border-border" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Input value={user?.role || 'admin'} disabled className="bg-secondary border-border opacity-60" />
          </div>
          <Button className="gradient-amber text-primary-foreground hover:opacity-90">Save Changes</Button>
        </div>

        <div className="gradient-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground">Preferences</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Dark Theme</p>
              <p className="text-xs text-muted-foreground">Use dark theme across the app</p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">Email Notifications</p>
              <p className="text-xs text-muted-foreground">Receive alert notifications via email</p>
            </div>
            <Switch />
          </div>
        </div>

        <div className="gradient-card border border-border rounded-xl p-6 space-y-4">
          <h3 className="font-semibold text-foreground">API Keys</h3>
          <p className="text-sm text-muted-foreground">API key management will be available in V2</p>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input value="sk-•••••••••••••••••••••••••" disabled className="bg-secondary border-border opacity-60 font-mono" />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
