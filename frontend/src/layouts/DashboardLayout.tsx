import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/layout/Sidebar";

export function DashboardLayout() {
  return (
    <div className="flex">
      <Sidebar />
      <main className="relative min-h-screen flex-1 overflow-hidden bg-transparent p-8">
        <div
          className="pointer-events-none fixed inset-0 opacity-40 [mask-image:linear-gradient(90deg,transparent_0%,black_16%,black_74%,transparent_100%)]"
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
