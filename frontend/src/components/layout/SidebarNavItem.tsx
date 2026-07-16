import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../utils/cn";

interface SidebarNavItemProps {
  label: string;
  icon: ReactNode;
  to: string;
  collapsed?: boolean;
}

export function SidebarNavItem({ label, icon, to, collapsed = false }: SidebarNavItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const selected = location.pathname.startsWith(to);

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      title={collapsed ? label : undefined}
      className={cn(
        "mx-2 mb-0.5 flex w-[calc(100%-1rem)] items-center rounded-lg px-3 py-2.5 text-sm transition-colors",
        collapsed ? "justify-center gap-0" : "gap-3",
        selected
          ? "bg-brand-teal/15 font-semibold text-white [&_svg]:text-brand-amber"
          : "font-medium text-white/75 hover:bg-white/5",
      )}
    >
      <span className="grid h-5 w-5 shrink-0 place-items-center">{icon}</span>
      <span
        className={cn(
          "overflow-hidden whitespace-nowrap transition-all duration-300",
          collapsed ? "w-0 opacity-0" : "w-auto opacity-100",
        )}
      >
        {label}
      </span>
    </button>
  );
}
