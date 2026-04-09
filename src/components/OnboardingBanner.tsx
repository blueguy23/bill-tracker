'use client';

import { useState, useEffect } from 'react';

const DISMISSED_KEY = 'bill-tracker-onboarding-dismissed';

interface OnboardingBannerProps {
  simplefinConfigured: boolean;
  accountCount: number;
}

export function OnboardingBanner({ simplefinConfigured, accountCount }: OnboardingBannerProps) {
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === 'true');
  }, []);

  const needsSetup = !simplefinConfigured;
  const needsSync = simplefinConfigured && accountCount === 0;

  if (dismissed || (!needsSetup && !needsSync)) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, 'true');
    setDismissed(true);
  }

  if (needsSync) {
    return (
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.06] p-5 flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-300">SimpleFIN is configured — sync to import accounts</p>
          <p className="text-xs text-sky-500">
            Your access token is set. Click <span className="text-white font-medium">Sync Now</span> in the sidebar to pull in your accounts and transactions.
          </p>
        </div>
        <button onClick={handleDismiss} className="text-sky-700 hover:text-sky-300 transition-colors shrink-0" aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-amber-300">Connect your bank accounts to get started</p>
          <p className="text-xs text-sky-500 mt-0.5">Bill Tracker uses SimpleFIN to securely read your transaction data. No credentials stored.</p>
        </div>
        <button onClick={handleDismiss} className="text-sky-700 hover:text-sky-300 transition-colors shrink-0" aria-label="Dismiss">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <ol className="space-y-3">
        <li className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
          <p className="text-sm text-sky-300">
            Visit{' '}
            <a href="https://beta-bridge.simplefin.org/simplefin/create" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-blue-300 underline underline-offset-2">
              beta-bridge.simplefin.org
            </a>
            {' '}→ create a free account → copy your access token
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
          <p className="text-sm text-sky-300">
            Open your <code className="text-xs bg-depth-800 px-1.5 py-0.5 rounded font-mono">.env</code> file and add:{' '}
            <code className="text-xs bg-depth-800 px-1.5 py-0.5 rounded font-mono text-emerald-300">SIMPLEFIN_ACCESS_URL=&lt;paste token here&gt;</code>
          </p>
        </li>
        <li className="flex items-start gap-3">
          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
          <p className="text-sm text-sky-300">
            Restart the server, then click <span className="text-white font-medium">Sync Now</span> in the sidebar to import your accounts and transactions.
          </p>
        </li>
      </ol>
    </div>
  );
}
