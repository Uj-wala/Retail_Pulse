import { Outlet } from "react-router-dom";
import { Sparkles, TrendingUp, ShoppingCart } from "lucide-react";

export function AuthLayout() {
  return (
    <div className="auth-mesh-bg dark flex min-h-screen items-center justify-center p-4 text-content md:p-8">
      <div className="grid w-full items-stretch gap-3 md:min-h-[640px] md:w-[62vw] md:min-w-[900px] md:max-w-[1140px] md:grid-cols-[1.05fr_0.95fr] md:gap-5">
        <div
          className="relative hidden flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 via-transparent to-black/30 p-10 text-white shadow-2xl shadow-black/50 backdrop-blur-2xl md:flex"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 15% 10%, rgba(20,184,166,0.14), transparent 40%), radial-gradient(circle at 10% 95%, rgba(245,158,11,0.22), transparent 45%)",
            }}
          />

          <div className="relative flex items-center gap-3">
            <Sparkles className="h-8 w-8 text-brand-amber" />
            <div>
              <p className="text-xl font-extrabold leading-tight">RetailPulse</p>
              <p className="text-sm text-white/65">Analytics</p>
            </div>
          </div>

          <div className="relative">
            <h1 className="mb-3 max-w-sm text-3xl font-extrabold">
              Retail decisions with clean company data.
            </h1>
            <p className="max-w-sm text-white/70">
              Monitor sales, products, users, and analytics in one protected workspace.
            </p>
          </div>

          <div className="relative flex items-center gap-4">
            <div className="grid h-24 w-24 place-items-center rounded-2xl border border-brand-teal/25 bg-brand-teal/15">
              <TrendingUp className="h-14 w-14 text-brand-teal" />
            </div>
            <div className="grid h-24 w-24 place-items-center rounded-2xl border border-brand-amber/25 bg-brand-amber/15">
              <ShoppingCart className="h-12 w-12 text-brand-amber" />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 items-center justify-center [&>*]:w-full [&>*]:max-w-none [&>*]:!border-white/10 [&>*]:!bg-gradient-to-br [&>*]:!from-[#0d1420] [&>*]:!to-[#05070d] [&>*]:!shadow-2xl [&>*]:!shadow-black/50">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
