'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    Mail,
    MessageSquare,
    Send,
    CheckCircle2,
    HelpCircle,
    ChevronDown,
    Clock,
    Sparkles,
} from 'lucide-react';
import WorkspaceHeader from '@/components/custom/WorkspaceHeader';

const GitHubIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
        <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
        />
    </svg>
);

type FaqItem = {
    question: string;
    answer: string;
};

const FAQS: FaqItem[] = [
    {
        question: 'How do I report a browser automation bug or execution timeout?',
        answer: 'You can open an issue directly on our GitHub repository with your execution logs and session URL, or email support@testpilot.dev with your repository name.',
    },
    {
        question: 'What frameworks does TestPilot support out-of-the-box?',
        answer: 'TestPilot natively analyzes Next.js, Express, Fastify, React, Vue, Svelte, and standard HTML/EJS template applications to extract routes, forms, and API endpoints.',
    },
    {
        question: 'Are my private repository files stored on your servers?',
        answer: 'No. TestPilot only inspects AST structures in ephemeral memory during test synthesis and does not store raw proprietary repository code.',
    },
    {
        question: 'How fast can I expect a response to support inquiries?',
        answer: 'Our engineering team responds to all Developer and Pro tier inquiries within 12 business hours, and Enterprise tickets within 1 hour.',
    },
];

export default function ContactPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !message.trim()) return;
        setIsSubmitted(true);
    };

    const toggleFaq = (index: number) => {
        setOpenFaqIndex((prev) => (prev === index ? null : index));
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
            <WorkspaceHeader />

            <main className="flex-1 px-4 py-12 sm:px-6 md:px-12 lg:py-16">
                <div className="mx-auto max-w-6xl space-y-16">
                    {/* Header */}
                    <div className="text-center space-y-4 max-w-2xl mx-auto">
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                            <Sparkles className="h-3.5 w-3.5" />
                            Direct Engineering Support
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
                            We&apos;re here to help you test better.
                        </h1>
                        <p className="text-base text-slate-400 leading-relaxed">
                            Have questions about Playwright runners, AST code extraction, or enterprise integration? Get in touch with our team.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 items-start">
                        {/* Left Column: Quick Channels & Information (5 cols) */}
                        <div className="lg:col-span-5 space-y-6">
                            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 space-y-6 backdrop-blur-sm shadow-xl">
                                <h2 className="text-lg font-semibold text-white">Contact Channels</h2>

                                <div className="space-y-4">
                                    {/* Email Channel */}
                                    <a
                                        href="mailto:support@testpilot.dev"
                                        className="flex items-start gap-4 p-4 rounded-2xl border border-slate-800/80 bg-slate-950/50 hover:border-emerald-500/40 hover:bg-slate-900/60 transition group"
                                    >
                                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-2.5 text-emerald-400 group-hover:scale-105 transition-transform">
                                            <Mail className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Email Support</div>
                                            <div className="text-sm font-semibold text-slate-200 mt-0.5 group-hover:text-emerald-300 transition-colors">
                                                support@testpilot.dev
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">Average response time: &lt; 12 hours</div>
                                        </div>
                                    </a>

                                    {/* GitHub Issues Channel */}
                                    <a
                                        href="https://github.com/Sandesh-PG/TestPilot/issues"
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-start gap-4 p-4 rounded-2xl border border-slate-800/80 bg-slate-950/50 hover:border-slate-700 hover:bg-slate-900/60 transition group"
                                    >
                                        <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-2.5 text-slate-300 group-hover:scale-105 transition-transform">
                                            <GitHubIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">GitHub Community</div>
                                            <div className="text-sm font-semibold text-slate-200 mt-0.5 group-hover:text-white transition-colors">
                                                github.com/Sandesh-PG/TestPilot
                                            </div>
                                            <div className="text-xs text-slate-500 mt-1">Public bug tracking & feature requests</div>
                                        </div>
                                    </a>

                                    {/* Office / Response Hours */}
                                    <div className="flex items-start gap-4 p-4 rounded-2xl border border-slate-800/80 bg-slate-950/50">
                                        <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 text-slate-400">
                                            <Clock className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-medium uppercase tracking-wider text-slate-400">Operating Hours</div>
                                            <div className="text-sm font-medium text-slate-200 mt-0.5">Monday – Friday: 24/5</div>
                                            <div className="text-xs text-slate-500 mt-1">Global coverage across UTC, EST, and IST</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Interactive Inquiry Form (7 cols) */}
                        <div className="lg:col-span-7">
                            <div className="rounded-3xl border border-slate-800 bg-slate-900/40 p-6 sm:p-8 backdrop-blur-sm shadow-xl">
                                {isSubmitted ? (
                                    <div className="py-12 text-center space-y-4">
                                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                            <CheckCircle2 className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-2xl font-bold text-white">Inquiry received</h3>
                                        <p className="text-sm text-slate-400 max-w-md mx-auto">
                                            Thank you for reaching out! A member of our test engineering team will follow up at <strong className="text-slate-200">{email}</strong> shortly.
                                        </p>
                                        <div className="pt-4">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsSubmitted(false);
                                                    setMessage('');
                                                    setSubject('');
                                                }}
                                                className="rounded-xl bg-slate-800 px-5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition"
                                            >
                                                Send Another Message
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-4">
                                            <MessageSquare className="h-4 w-4 text-emerald-400" />
                                            <h2 className="text-lg font-semibold text-white">Send a Message</h2>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label htmlFor="contact-name" className="text-xs font-medium text-slate-400">
                                                    Your Name
                                                </label>
                                                <input
                                                    id="contact-name"
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    placeholder="Alex Rivers"
                                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label htmlFor="contact-email" className="text-xs font-medium text-slate-400">
                                                    Work Email <span className="text-rose-400">*</span>
                                                </label>
                                                <input
                                                    id="contact-email"
                                                    type="email"
                                                    required
                                                    value={email}
                                                    onChange={(e) => setEmail(e.target.value)}
                                                    placeholder="alex@company.com"
                                                    className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="contact-subject" className="text-xs font-medium text-slate-400">
                                                Subject
                                            </label>
                                            <input
                                                id="contact-subject"
                                                type="text"
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                                placeholder="Question regarding custom runners or billing"
                                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="contact-message" className="text-xs font-medium text-slate-400">
                                                Message <span className="text-rose-400">*</span>
                                            </label>
                                            <textarea
                                                id="contact-message"
                                                required
                                                rows={5}
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder="Describe your question, repository setup, or inquiry..."
                                                className="w-full rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-100 placeholder-slate-600 outline-none transition focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/10 resize-none"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-400 active:scale-[0.99]"
                                        >
                                            <Send className="h-4 w-4" />
                                            <span>Send Message</span>
                                        </button>
                                    </form>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FAQ Accordion Section */}
                    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/30 p-6 sm:p-10 space-y-6 backdrop-blur-sm max-w-4xl mx-auto">
                        <div className="flex items-center gap-3">
                            <div className="rounded-xl border border-slate-800 bg-slate-800/60 p-2.5 text-slate-300">
                                <HelpCircle className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white">Support Knowledge Base</h3>
                                <p className="text-xs text-slate-400">Quick answers to common troubleshooting inquiries.</p>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            {FAQS.map((faq, idx) => {
                                const isOpen = openFaqIndex === idx;
                                return (
                                    <div
                                        key={idx}
                                        className="rounded-2xl border border-slate-800/80 bg-slate-950/40 overflow-hidden transition"
                                    >
                                        <button
                                            type="button"
                                            onClick={() => toggleFaq(idx)}
                                            className="flex w-full items-center justify-between p-4 text-left text-sm font-semibold text-slate-200 hover:text-white transition"
                                        >
                                            <span>{faq.question}</span>
                                            <ChevronDown
                                                className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                                                    isOpen ? 'rotate-180 text-emerald-400' : ''
                                                }`}
                                            />
                                        </button>
                                        {isOpen && (
                                            <div className="px-4 pb-4 pt-1 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60">
                                                {faq.answer}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
