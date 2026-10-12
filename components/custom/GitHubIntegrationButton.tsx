'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';

const GitHubIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
    />
  </svg>
);

type GitHubUserData = {
  username?: string;
  avatarUrl?: string;
  name?: string;
};

export default function GitHubIntegrationButton() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'disconnected'>('loading');
  const [githubUser, setGithubUser] = useState<GitHubUserData | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/github/status', {
        method: 'GET',
        cache: 'no-store',
      });

      if (!res.ok) {
        setStatus('disconnected');
        setGithubUser(null);
        return;
      }

      const data = await res.json();
      if (data.connected) {
        setStatus('connected');
        setGithubUser({
          username: data.username,
          avatarUrl: data.avatarUrl,
          name: data.name,
        });
      } else {
        setStatus('disconnected');
        setGithubUser(null);
      }
    } catch {
      setStatus('disconnected');
      setGithubUser(null);
    }
  };

  useEffect(() => {
    void fetchStatus();

    const handleConnectionChanged = () => {
      void fetchStatus();
    };

    window.addEventListener('github-connection-changed', handleConnectionChanged);
    return () => {
      window.removeEventListener('github-connection-changed', handleConnectionChanged);
    };
  }, []);

  const handleConnect = () => {
    window.location.href = '/api/github';
  };

  if (status === 'loading') {
    return (
      <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 animate-pulse">
        <GitHubIcon className="h-3.5 w-3.5 opacity-60" />
        <span>Checking GitHub...</span>
      </div>
    );
  }

  if (status === 'disconnected') {
    return (
      <button
        onClick={handleConnect}
        type="button"
        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/90 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all hover:border-emerald-500/50 hover:bg-slate-800 hover:text-white shadow-sm"
      >
        <GitHubIcon className="h-3.5 w-3.5 text-slate-300" />
        <span>Connect GitHub</span>
      </button>
    );
  }

  return (
    /* Clean, sleek info badge in the top navbar */
    <div className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1 text-xs text-slate-200 shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        {githubUser?.avatarUrl ? (
          <Image
            src={githubUser.avatarUrl}
            alt={githubUser.username || 'GitHub User'}
            width={18}
            height={18}
            unoptimized
            className="rounded-full border border-slate-700"
          />
        ) : (
          <GitHubIcon className="h-3.5 w-3.5 text-slate-300" />
        )}
        <span className="font-medium text-slate-200 max-w-[120px] truncate">
          {githubUser?.username ? `@${githubUser.username}` : 'GitHub'}
        </span>
      </div>

      {/* Green Connected Badge */}
      <div className="flex items-center gap-1 rounded bg-emerald-950/70 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </span>
        <span>Connected</span>
      </div>
    </div>
  );
}
