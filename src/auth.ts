import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Edge-safe constant-time string comparison (avoids Node.js crypto module
// which is incompatible with Next.js edge runtime used by middleware).
function safeEqual(a: string, b: string): boolean {
  const maxLen = Math.max(a.length, b.length);
  const paddedA = a.padEnd(maxLen, '\0');
  const paddedB = b.padEnd(maxLen, '\0');
  let diff = a.length !== b.length ? 1 : 0;
  for (let i = 0; i < maxLen; i++) {
    diff |= paddedA.charCodeAt(i) ^ paddedB.charCodeAt(i);
  }
  return diff === 0;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      authorize(credentials) {
        const submitted = String(credentials?.password ?? '');

        // Demo login — enabled only when DEMO_MODE=true
        if (process.env.DEMO_MODE === 'true') {
          const demoPassword = process.env.DEMO_PASSWORD ?? 'demo';
          if (submitted === demoPassword) {
            return { id: 'demo', name: 'Demo' };
          }
        }

        const expected = process.env.AUTH_PASSWORD;
        if (!submitted || !expected) return null;
        if (!safeEqual(submitted, expected)) return null;

        return { id: '1', name: 'Owner' };
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
});
