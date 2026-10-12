'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Unlink, AlertTriangle, Loader2 } from 'lucide-react';

type DisconnectGitHubButtonProps = {
  className?: string;
};

export default function DisconnectGitHubButton({ className }: DisconnectGitHubButtonProps) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/github/disconnect', {
        method: 'POST',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to disconnect GitHub account');
      }

      setIsConfirmOpen(false);

      // Notify any listeners across the app
      window.dispatchEvent(
        new CustomEvent('github-connection-changed', { detail: { connected: false } })
      );

      // Refresh server components and reload active workspace
      router.refresh();
      window.location.reload();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Disconnection failed');
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        className={
          className ||
          'inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-300 transition-all hover:border-rose-500/60 hover:bg-rose-950/30 hover:text-rose-200 active:scale-[0.98]'
        }
      >
        <Unlink className="h-4 w-4 text-slate-400 transition-colors" />
        <span>Disconnect GitHub</span>
      </button>

      {/* Confirmation Modal */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/50 text-rose-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Disconnect GitHub Account?
                </h3>
                <p className="text-xs text-slate-400">
                  Switch or revoke your current GitHub authorization
                </p>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-slate-300">
              This will clear your stored GitHub access token from this browser session. You will need to re-authenticate with GitHub to list repositories, inspect code trees, or run test analyses.
            </p>

            {errorMessage && (
              <div className="rounded-lg border border-rose-800/60 bg-rose-950/40 p-2.5 text-xs text-rose-300">
                {errorMessage}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isDisconnecting}
                className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors disabled:opacity-50 shadow-md shadow-rose-900/30"
              >
                {isDisconnecting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Disconnecting...</span>
                  </>
                ) : (
                  <>
                    <Unlink className="h-3.5 w-3.5" />
                    <span>Disconnect Account</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
