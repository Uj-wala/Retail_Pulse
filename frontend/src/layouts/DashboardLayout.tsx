import { Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "../components/layout/Sidebar";

export function DashboardLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= 1024
  );
  const sidebarWidth = sidebarCollapsed ? "70px" : "min(260px, calc(100vw - 3rem))";

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)");
    const handleChange = () => setIsDesktop(mql.matches);
    handleChange();
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden flex-col lg:flex-row">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="icon-action-btn fixed top-4 left-4 z-50 rounded-lg bg-brand-navy p-2 text-white lg:hidden"
        title={mobileMenuOpen ? "Close menu" : "Open menu"}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-40 transform bg-brand-navy transition-[width,transform] duration-300 ease-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ width: sidebarWidth }}
      >
        <Sidebar
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
          onNavigate={() => setMobileMenuOpen(false)}
        />
      </div>

      {/* Main Content */}
      <main
        className="relative min-h-screen min-w-0 flex-1 overflow-hidden bg-transparent px-4 pb-6 pt-16 transition-[margin] duration-300 sm:px-6 sm:pb-8 lg:p-8"
        style={{ marginLeft: isDesktop ? sidebarWidth : 0 }}
      >
        <div
          className="animate-grid-drift pointer-events-none fixed inset-0 opacity-40 [mask-image:linear-gradient(90deg,transparent_0%,black_16%,black_74%,transparent_100%)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(20,184,166,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.10) 1px, transparent 1px)",
            backgroundSize: "52px 52px",
          }}
        />
        <div className="relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
