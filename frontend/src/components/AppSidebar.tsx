import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Bell, Brain, BarChart3, Settings, HelpCircle, LogOut } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: FileText, label: 'Logs', path: '/logs' },
  { icon: Bell, label: 'Alerts', path: '/alerts' },
  { icon: Brain, label: 'Threat Analysis', path: '/threats' },
  { icon: BarChart3, label: 'Reports', path: '/reports' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

export default function AppSidebar() {
  const location = useLocation();
  const { user, logout } = useAuthStore();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      <div className="p-6 flex items-center gap-3">
        <img src="/logo.PNG" alt="SentinelX" className="w-8 h-8" />
        <span className="font-bold text-lg text-sidebar-accent-foreground">SentinelX</span>
      </div>

      <div className="px-4 mb-4">
        <div className="flex items-center gap-2 bg-sidebar-accent rounded-lg px-3 py-2">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span className="text-sm text-muted-foreground">Search</span>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-sidebar-accent text-sidebar-primary font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Link to="/settings" className="flex items-center gap-3 px-3 py-2 text-sm text-sidebar-foreground hover:text-sidebar-accent-foreground rounded-lg hover:bg-sidebar-accent transition-colors">
          <Settings className="w-4 h-4" />
          Settings
        </Link>
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="w-9 h-9 rounded-full gradient-amber flex items-center justify-center text-sm font-bold text-primary-foreground">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-accent-foreground truncate">{user?.name || 'Ajinkya'}</p>
            <p className="text-xs text-muted-foreground">{user?.role || 'admin'}</p>
          </div>
          <button onClick={logout} className="text-muted-foreground hover:text-destructive transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <button className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-sidebar-accent-foreground">
          <HelpCircle className="w-3.5 h-3.5" />
          Help Responder <span className="text-primary">★</span>
        </button>
      </div>
    </aside>
  );
}
