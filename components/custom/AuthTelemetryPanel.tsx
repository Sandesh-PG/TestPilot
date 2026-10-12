import React from 'react';
import { Terminal, CheckCircle2, PlayCircle, ShieldCheck, Zap } from 'lucide-react';

export default function AuthTelemetryPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-[#0a0d14] to-slate-950 p-8 xl:p-12 text-slate-100 border-l border-slate-800/80">
      {/* Background glow meshes */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-cyan-500/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/3 h-64 w-64 -translate-y-1/2 rounded-full bg-indigo-500/10 blur-3xl" />

      {/* Top Value Proposition */}
      <div className="relative z-10 space-y-4 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-950/60 px-3.5 py-1.5 text-xs font-semibold text-emerald-300 backdrop-blur-md">
          <Zap className="h-3.5 w-3.5 text-emerald-400" />
          <span>Next-Gen Autonomous QA</span>
        </div>

        <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-tight">
          Deterministic code analysis meets cloud browser automation.
        </h2>

        <p className="text-sm xl:text-base leading-relaxed text-slate-300 font-normal">
          Connect your repository to extract critical route surfaces, generate end-to-end test cases with AI reasoning, and execute in ephemeral cloud browser sessions.
        </p>
      </div>

      {/* Center Mock Terminal / Live Execution Feed */}
      <div className="relative z-10 my-8 w-full max-w-2xl rounded-xl border border-slate-700/80 bg-[#06080e]/95 shadow-2xl backdrop-blur-xl overflow-hidden font-mono text-xs">
        {/* Terminal Titlebar */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <div className="ml-2 flex items-center gap-1.5 text-slate-200 text-[11px] font-medium">
              <Terminal className="h-3.5 w-3.5 text-slate-300" />
              <span>testpilot-agent — browserbase-us-east-1</span>
            </div>
          </div>

          {/* Running status with pulsing emerald badge */}
          <div className="flex items-center gap-2 rounded-full bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span>Live Session</span>
          </div>
        </div>

        {/* Terminal Logs & Telemetry Feed */}
        <div className="space-y-2 p-5 text-slate-200 leading-relaxed max-h-[380px] overflow-y-auto repo-inspection-scrollbar">
          <div>
            <span className="text-slate-400 font-mono">[09:42:11]</span> <span className="text-cyan-400 font-semibold">[context]</span> Ingested tree for <span className="text-white font-medium">main</span> branch (48 source files, 0 binaries)
          </div>

          <div>
            <span className="text-slate-400 font-mono">[09:42:12]</span> <span className="text-cyan-400 font-semibold">[analyzer]</span> Detected Next.js App Router • 14 routes • Clerk Auth • Neon DB
          </div>

          <div>
            <span className="text-slate-400 font-mono">[09:42:13]</span> <span className="text-purple-300 font-semibold">[ai-engine]</span> Synthesizing test cases with Groq schema validation...
          </div>

          <div>
            <span className="text-slate-400 font-mono">[09:42:14]</span> <span className="text-indigo-300 font-semibold">[browserbase]</span> Provisioned isolated Chromium container <span className="text-slate-300 font-mono">(id: bb_sess_9a2f1c)</span>
          </div>

          <div className="my-2 border-t border-slate-800" />

          {/* Pass Logs */}
          <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 rounded p-2 border border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-400">● [PASS] AUTH_FLOW:</span>
              <span className="text-slate-100 ml-1">/sign-in Clerk SSO redirect & session barrier verified</span>
              <span className="text-emerald-400 text-[11px] ml-2 font-mono font-semibold">394ms</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 rounded p-2 border border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-400">● [PASS] STRIPE_CHECKOUT:</span>
              <span className="text-slate-100 ml-1">/api/checkout valid session URL generation & webhook handshake</span>
              <span className="text-emerald-400 text-[11px] ml-2 font-mono font-semibold">612ms</span>
            </div>
          </div>

          <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 rounded p-2 border border-emerald-500/30">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-400">● [PASS] WORKSPACE_GUARD:</span>
              <span className="text-slate-100 ml-1">Repository inspection state machine & CSRF headers valid</span>
              <span className="text-emerald-400 text-[11px] ml-2 font-mono font-semibold">278ms</span>
            </div>
          </div>

          <div className="pt-1">
            <span className="text-slate-400 font-mono">[09:42:19]</span> <span className="text-emerald-400 font-semibold">[telemetry]</span> All 3 suites completed • Full video recording saved • 0 leaks
          </div>
        </div>

        {/* Terminal Footer Metrics Bar */}
        <div className="grid grid-cols-3 border-t border-slate-800 bg-slate-950/95 px-4 py-2.5 text-[11px] text-slate-300">
          <div>
            Coverage: <span className="font-bold text-emerald-400">98.4%</span>
          </div>
          <div className="text-center">
            Avg Latency: <span className="font-bold text-cyan-400">428ms</span>
          </div>
          <div className="text-right">
            Sandbox: <span className="font-bold text-slate-100">Ephemeral</span>
          </div>
        </div>
      </div>

      {/* Feature Highlight Chips */}
      <div className="relative z-10 flex flex-wrap items-center gap-3 pt-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 shadow-sm backdrop-blur-md">
          <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>OAuth read-only access</span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 shadow-sm backdrop-blur-md">
          <PlayCircle className="h-4 w-4 text-cyan-400 shrink-0" />
          <span>Full session replay</span>
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3.5 py-2 text-xs font-medium text-slate-200 shadow-sm backdrop-blur-md">
          <Zap className="h-4 w-4 text-amber-400 shrink-0" />
          <span>Instant test generation</span>
        </div>
      </div>
    </div>
  );
}
