import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "../../utils/cn";

interface SidebarNavItemProps {
  label: string;
  icon: ReactNode;
  to: string;
}

export function SidebarNavItem({ label, icon, to }: SidebarNavItemProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const selected = location.pathname.startsWith(to);

  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={cn(
        "mx-2 mb-0.5 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
        selected
          ? "bg-brand-teal/15 font-semibold text-white [&_svg]:text-brand-amber"
          : "font-medium text-white/75 hover:bg-white/5",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
