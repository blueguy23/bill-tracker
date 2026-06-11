'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FolioLogo } from '@/components/FolioLogo';

interface WelcomeScreenProps {
  greeting: string;
  isDemo: boolean;
}

function StepItem({ number, title, description, children }: {
  number: number;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <span className="w-7 h-7 rounded-full bg-zinc-800 border border-white/[0.08] text-zinc-400 text-xs font-mono font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        {number < 3 && <div className="w-px flex-1 bg-white/[0.06] mt-2" />}
      </div>
      <div className="pb-6 flex-1 min-w-0">
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}

export function WelcomeScreen({ greeting, isDemo }: WelcomeScreenProps) {
  const [tokenValue, setTokenValue] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSaveToken() {
    if (!tokenValue.trim()) return;
    setSaveState('saving');
    setErrorMsg('');
    try {
      const res = await fetch('/api/v1/onboarding/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessUrl: tokenValue.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save token');
      }
      setSaveState('saved');
      window.location.reload();
    } catch (err) {
      setSaveState('error');
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div className="min-h-[calc(100vh-48px)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-8">

        {/* Logo + greeting */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <FolioLogo size={40} withWordmark={false} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-100 tracking-tight">{greeting}</h1>
            <p className="text-sm text-zinc-500 mt-1">
              Connect your bank accounts to start tracking your finances.
            </p>
          </div>
        </div>

        {/* Setup steps */}
        <Card className="border-white/[0.08]">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold text-zinc-100">Set up SimpleFIN</h2>
              <Badge variant="outline" className="text-[10px] border-blue-500/30 text-blue-400">
                ~3 min
              </Badge>
            </div>

            <p className="text-xs text-zinc-500 leading-relaxed mb-5">
              SimpleFIN is a privacy-focused service that gives Folio read-only access
              to your bank data. You&apos;ll create an account there, add your banks,
              then bring a token back here.
            </p>

            <StepItem
              number={1}
              title="Create a SimpleFIN Bridge account"
              description="Sign up and add your bank connections on their site."
            >
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.open('https://beta-bridge.simplefin.org', '_blank')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="mr-1.5">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                Open SimpleFIN Bridge
              </Button>
            </StepItem>

            <StepItem
              number={2}
              title="Generate an access URL"
              description='In SimpleFIN, go to your account and click "Create Token." Copy the full access URL it generates.'
            />

            <StepItem
              number={3}
              title="Paste it here"
              description="This URL lets Folio read your transactions. It never leaves your server."
            >
              <div className="space-y-2">
                <Label htmlFor="simplefin-token" className="text-[11px] text-zinc-500 font-mono">
                  SIMPLEFIN ACCESS URL
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="simplefin-token"
                    type="password"
                    placeholder="https://…@bridge.simplefin.org/simplefin"
                    value={tokenValue}
                    onChange={(e) => setTokenValue(e.target.value)}
                    className="font-mono text-xs bg-zinc-900 border-white/[0.08] placeholder:text-zinc-700"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveToken}
                    disabled={!tokenValue.trim() || saveState === 'saving'}
                    className="shrink-0"
                  >
                    {saveState === 'saving' ? 'Saving…' : 'Connect'}
                  </Button>
                </div>
                {saveState === 'error' && (
                  <p className="text-xs text-red-400">{errorMsg}</p>
                )}
              </div>
            </StepItem>
          </CardContent>
        </Card>

        {/* What happens next */}
        <div className="space-y-3 px-1">
          <p className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
            After connecting
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: '↕', label: 'Auto-sync', detail: 'Every 2 hours' },
              { icon: '↺', label: 'Bill detection', detail: 'Recurring charges found' },
              { icon: '◎', label: 'Insights', detail: 'Cash flow & budgets' },
            ].map((f) => (
              <div key={f.label} className="text-center p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                <span className="text-lg">{f.icon}</span>
                <p className="text-xs font-medium text-zinc-300 mt-1.5">{f.label}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">{f.detail}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Demo / explore link */}
        {!isDemo && (
          <>
            <Separator className="bg-white/[0.06]" />
            <p className="text-center text-xs text-zinc-600">
              Just want to look around?{' '}
              <Link href="/login" className="text-zinc-400 hover:text-zinc-300 underline underline-offset-2 transition-colors">
                Try the demo
              </Link>
              {' '}with sample data.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
