import NextAuth, { type NextAuthConfig } from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';

const ALLOWED_GITHUB_USER = process.env.ALLOWED_GITHUB_USER ?? 'tb6009';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? '';
const GITHUB_ENABLED = !!(process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET);

const providers: NextAuthConfig['providers'] = [
  ...(GITHUB_ENABLED ? [GitHub({})] : []),
  Credentials({
    name: 'Password',
    credentials: {
      password: { label: 'Password', type: 'password' },
    },
    authorize: async (creds) => {
      if (!DASHBOARD_PASSWORD) return null;
      const input = typeof creds?.password === 'string' ? creds.password : '';
      if (input && input === DASHBOARD_PASSWORD) {
        return { id: 'owner', name: 'Owner' };
      }
      return null;
    },
  }),
];

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,

  callbacks: {
    signIn: async ({ account, profile }) => {
      if (account?.provider === 'github') {
        const ghLogin = (profile as { login?: string } | undefined)?.login;
        return ghLogin === ALLOWED_GITHUB_USER;
      }
      return true;
    },
  },

  pages: {
    signIn: '/login',
  },

  session: { strategy: 'jwt' },
});

export const isGithubEnabled = GITHUB_ENABLED;
