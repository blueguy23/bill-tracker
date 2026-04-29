import { auth } from '@/auth';
import { signOut } from '@/auth';

export async function DemoBanner() {
  const session = await auth();
  if (session?.user?.name !== 'Demo') return null;

  return (
    <div className="w-full bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between gap-4 text-xs">
      <span className="text-amber-300 font-medium">
        {"You're viewing demo data. "}
        <a
          href="/settings"
          className="underline underline-offset-2 hover:text-amber-200 transition-colors"
        >
          Connect SimpleFIN to see your real accounts
        </a>
      </span>
      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
      >
        <button
          type="submit"
          className="text-amber-400 hover:text-amber-200 underline underline-offset-2 transition-colors"
        >
          Exit demo
        </button>
      </form>
    </div>
  );
}
