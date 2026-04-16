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
        const expected = process.env.AUTH_PASSWORD;

        if (!submitted || !expected) return null;

        const a = Buffer.from(String(submitted));
        const b = Buffer.from(expected);

        // Lengths must match before timingSafeEqual
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
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
});
