import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const isDemoMode = process.env.DEMO_MODE === 'true';
  const demoPassword = process.env.DEMO_PASSWORD ?? 'demo';

  async function handleLogin(formData: FormData) {
    'use server';
    try {
      await signIn('credentials', {
        password: formData.get('password'),
        redirectTo: '/',
      });
    } catch (err) {
      if (err instanceof AuthError) {
        redirect('/login?error=invalid');
      }
      throw err;
    }
  }

  async function handleDemoLogin() {
    'use server';
    await signIn('credentials', { password: demoPassword, redirectTo: '/' });
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Folio</h1>
          <p className="text-sm text-zinc-500 mt-1">Your personal finance command center</p>
        </div>

        <form action={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-zinc-400 mb-1.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoFocus
              data-testid="password-input"
              className="w-full px-3 py-2.5 rounded-lg bg-zinc-900 border border-white/[0.08] text-white placeholder-zinc-600 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="••••••••"
            />
          </div>

          <LoginError searchParams={searchParams} />

          <button
            type="submit"
            data-testid="login-btn"
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
          >
            Sign in
          </button>
        </form>

        {isDemoMode && (
          <div className="mt-4">
            <div className="relative flex items-center gap-3 my-4">
              <div className="flex-1 border-t border-white/[0.06]" />
              <span className="text-xs text-zinc-600">or</span>
              <div className="flex-1 border-t border-white/[0.06]" />
            </div>
            <form action={handleDemoLogin}>
              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-lg bg-zinc-800 border border-white/[0.08] hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                Try Demo
              </button>
            </form>
            <p className="text-xs text-zinc-600 text-center mt-2">Read-only · pre-seeded data</p>
          </div>
        )}
      </div>
    </div>
  );
}

async function LoginError({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  if (!params.error) return null;

  const message =
    params.error === 'rate-limited'
      ? 'Too many attempts. Please wait 15 minutes and try again.'
      : 'Incorrect password. Please try again.';

  return (
    <p
      data-testid="login-error"
      className="text-xs text-red-400 bg-red-950/40 border border-red-900/40 rounded-lg px-3 py-2"
    >
      {message}
    </p>
  );
}
