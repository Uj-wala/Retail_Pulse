import {
  LayoutDashboard,
  BarChart3,
  ShoppingCart,
  Package,
  Tags,
  Boxes,
  FileText,
  Users,
  Settings,
  User,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../hooks/useTheme";
import { useAuth } from "../../hooks/useAuth";
import { SidebarNavItem } from "./SidebarNavItem";

interface SidebarProps {
  onNavigate?: () => void;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function Sidebar({ onNavigate, collapsed, onCollapsedChange }: SidebarProps) {
  const { mode, toggleMode } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const handleNavigation = () => {
    onNavigate?.();
  };

  const isAdmin = user?.role === "COMPANY_ADMIN" || user?.role === "SUPER_ADMIN";

  return (
    <div
      className="flex h-full min-h-screen w-full shrink-0 flex-col border-r border-white/10 bg-brand-navy"
    >
      <div className={collapsed ? "flex items-center justify-center px-3 py-6" : "flex items-center gap-2.5 px-5 py-6"}>
        <Sparkles className="h-7 w-7 shrink-0 text-brand-amber" />
        <div className={collapsed ? "w-0 overflow-hidden opacity-0 transition-all duration-200" : "opacity-100 transition-opacity duration-300"}>
          <p className="text-sm font-bold leading-tight text-white">RetailPulse</p>
          <p className="text-xs text-white/50">Analytics</p>
        </div>
      </div>

      <div className="h-px bg-white/10" />

      <div className="px-2 py-2">
        <button
          type="button"
          onClick={() => onCollapsedChange(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="icon-action-btn flex w-full items-center justify-center rounded-lg p-2 text-white/70 hover:bg-white/5 hover:text-white"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
        <SidebarNavItem collapsed={collapsed} label="Dashboard" icon={<LayoutDashboard className="h-4 w-4" />} to="/dashboard" onNavigate={handleNavigation} />
        <SidebarNavItem collapsed={collapsed} label="Analytics" icon={<BarChart3 className="h-4 w-4" />} to="/analytics" onNavigate={handleNavigation} />
        <SidebarNavItem collapsed={collapsed} label="Sales" icon={<ShoppingCart className="h-4 w-4" />} to="/sales" onNavigate={handleNavigation} />
        <SidebarNavItem collapsed={collapsed} label="Products" icon={<Package className="h-4 w-4" />} to="/products" onNavigate={handleNavigation} />
        <SidebarNavItem collapsed={collapsed} label="Categories" icon={<Tags className="h-4 w-4" />} to="/categories" onNavigate={handleNavigation} />
        <SidebarNavItem collapsed={collapsed} label="Inventory" icon={<Boxes className="h-4 w-4" />} to="/inventory" onNavigate={handleNavigation} />
        <SidebarNavItem collapsed={collapsed} label="Reports" icon={<FileText className="h-4 w-4" />} to="/reports" onNavigate={handleNavigation} />
        {isAdmin && <SidebarNavItem collapsed={collapsed} label="Users" icon={<Users className="h-4 w-4" />} to="/users" onNavigate={handleNavigation} />}
        {isAdmin && <SidebarNavItem collapsed={collapsed} label="Settings" icon={<Settings className="h-4 w-4" />} to="/settings" onNavigate={handleNavigation} />}
        <SidebarNavItem collapsed={collapsed} label="Profile" icon={<User className="h-4 w-4" />} to="/profile" onNavigate={handleNavigation} />
      </nav>

      <div className="mt-auto h-px bg-white/10" />

      <div className={collapsed ? "flex flex-col items-center gap-2 px-2 py-3" : "flex items-center justify-between px-4 py-3"}>
        <button
          type="button"
          onClick={toggleMode}
          title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          className="icon-action-btn rounded-lg bg-brand-teal/10 p-2 text-white/80 hover:bg-brand-teal/20"
        >
          {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={handleLogout}
          title="Log out"
          className="icon-action-btn rounded-lg p-2 text-white/70 hover:bg-white/5"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
