import { SignUp } from "@clerk/nextjs";
import Image from "next/image";
import Link from "next/link";
import AuthTelemetryPanel from "@/components/custom/AuthTelemetryPanel";
import { clerkAuthAppearance } from "@/components/custom/authAppearance";
import { ShieldCheck } from "lucide-react";

export default function SignUpPage() {
  return (
    <main className="min-h-screen w-full bg-slate-950 text-slate-100 grid grid-cols-1 lg:grid-cols-2 overflow-x-hidden">
      {/* Left Panel (Auth Form) */}
      <section className="flex flex-col justify-between min-h-screen p-6 sm:p-10 lg:p-12 relative z-10 bg-slate-950 border-r border-slate-800/80">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative flex items-center justify-center rounded-xl bg-slate-900 border border-slate-700/80 p-1.5 transition-transform duration-200 group-hover:scale-105 shadow-sm">
              <Image
                src="/logo.png"
                alt="TestPilot Logo"
                width={34}
                height={34}
                className="object-contain"
                priority
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              TestPilot
            </span>
          </Link>

          {/* Brand Badge */}
          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-[11px] font-semibold text-emerald-300 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            <span>AI QA ENGINE</span>
          </div>
        </div>

        {/* Auth Form Center */}
        <div className="my-auto py-8 flex flex-col items-center justify-center w-full">
          <div className="w-full max-w-md">
            <SignUp appearance={clerkAuthAppearance} />
          </div>
        </div>

        {/* Footer */}
        <footer className="pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Protected by isolated execution environments.</span>
          </div>
          <span className="text-slate-400 font-medium">© 2026 TestPilot</span>
        </footer>
      </section>

      {/* Right Panel (Product Telemetry & Live Terminal Preview) */}
      <AuthTelemetryPanel />
    </main>
  );
}
