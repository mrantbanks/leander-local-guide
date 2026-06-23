import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

const ADMINS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET }),
  ],
  callbacks: {
    async session({ session }) {
      (session.user as { isAdmin?: boolean }).isAdmin = ADMINS.includes((session.user?.email || '').toLowerCase());
      return session;
    },
  },
});

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMINS.includes(email.toLowerCase());
}
