import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, LogOut, Moon, Settings, Sun, User } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../hooks/useTheme";
import { NotificationBell } from "./NotificationBell";

export function Header() {
  const { user, logout } = useAuth();
  const { mode, toggleMode } = useTheme();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAdmin = user?.role === "COMPANY_ADMIN" || user?.role === "SUPER_ADMIN";
  const initial = user?.name?.trim()?.[0]?.toUpperCase() ?? "?";

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="mb-4 flex items-center justify-end gap-3">
      <NotificationBell />
      <div className="h-6 w-px bg-content/15" />
      <button
        type="button"
        onClick={toggleMode}
        title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="icon-action-btn rounded-lg p-2 text-content-muted hover:bg-surface-elevated hover:text-content"
      >
        {mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          className="icon-action-btn flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-surface-elevated"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-teal text-sm font-bold text-[#042F2E]">
            {initial}
          </span>
          <span className="hidden text-sm font-semibold text-content sm:inline">{user?.name}</span>
          <ChevronDown className="h-4 w-4 text-content-muted" />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-border/15 bg-surface p-1.5 shadow-2xl">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                navigate("/profile");
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-content hover:bg-surface-elevated"
            >
              <User className="h-4 w-4" />
              Profile
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/settings");
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-content hover:bg-surface-elevated"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
            )}
            <div className="my-1 h-px bg-border/15" />
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-500 hover:bg-red-500/10"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
