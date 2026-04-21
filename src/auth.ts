import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { timingSafeEqual } from 'crypto';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        password: { label: 'Password', type: 'password' },
      },
      authorize(credentials) {
        const submitted = credentials?.password;

        // Demo login — enabled only when DEMO_MODE=true
        if (process.env.DEMO_MODE === 'true') {
          const demoPassword = process.env.DEMO_PASSWORD ?? 'demo';
          if (submitted === demoPassword) {
            return { id: 'demo', name: 'Demo' };
          }
        }

        const expected = process.env.AUTH_PASSWORD;
        if (!submitted || !expected) return null;

        const a = Buffer.from(String(submitted));
        const b = Buffer.from(expected);

        if (a.length !== b.length) return null;
        if (!timingSafeEqual(a, b)) return null;

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
