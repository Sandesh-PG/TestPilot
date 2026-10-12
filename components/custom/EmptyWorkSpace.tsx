'use client';

import React from 'react';
import { BookOpen, ArrowRight } from 'lucide-react';

const Github = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
    </svg>
);

export default function EmptyWorkSpace() {
    const handleConnectGithub = () => {
        window.location.href = '/api/github';
    };

    return (
        <div className="border border-slate-800/80 bg-slate-900/30 rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center backdrop-blur-sm shadow-xl">
                <div className="relative mb-6 flex items-center justify-center">
                    <svg width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="80" cy="60" r="45" fill="url(#glow-grad)" opacity="0.12" />
                        <path d="M20 35C20 31.6863 22.6863 29 26 29H54.5858C56.177 29 57.703 29.6321 58.8284 30.7574L68.1716 40.1005C69.297 41.2259 70.823 41.858 72.4142 41.858H114C117.314 41.858 120 44.5437 120 47.858V89C120 92.3137 117.314 95 114 95H26C22.6863 95 20 92.3137 20 89V35Z" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                        <path d="M20 47.858C20 44.5437 22.6863 41.858 26 41.858H114C117.314 41.858 120 44.5437 120 47.858V89C120 92.3137 117.314 95 114 95H26C22.6863 95 20 92.3137 20 89V47.858Z" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                        <path d="M50 63L45 68L50 73" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                        <path d="M70 63L75 68L70 73" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                        <path d="M62 61L58 75" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
                        <circle cx="106" cy="80" r="20" fill="#020617" stroke="#10b981" strokeWidth="2" strokeDasharray="4 4" />
                        <g transform="translate(98, 72) scale(0.65)">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                        <path d="M15 22L17 24M17 22L15 24" stroke="#a855f7" strokeWidth="1.5" strokeLinecap="round" />
                        <path d="M135 32L137 34M137 32L135 34" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round" />

                        <defs>
                            <radialGradient id="glow-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(80 60) rotate(90) scale(60)">
                                <stop stopColor="#a855f7" />
                                <stop offset="1" stopColor="#a855f7" stopOpacity="0" />
                            </radialGradient>
                        </defs>
                    </svg>
                </div>

                <h2 className="text-xl font-semibold text-slate-100 mb-2">
                    No repository connected
                </h2>
                <p className="text-sm text-slate-400 max-w-sm mb-8 leading-relaxed">
                    Connect your GitHub account and add a repository to generate and run test cases.
                </p>

                <button
                    onClick={handleConnectGithub}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-semibold rounded-lg text-sm transition-all shadow-lg shadow-emerald-950/20 cursor-pointer"
                >
                    <Github className="w-4 h-4" />
                    Connect Repo
                </button>

                <a
                    href="#learn"
                    className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs font-semibold mt-6 transition-colors group"
                >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Learn how it works</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </a>
        </div>
    );
}