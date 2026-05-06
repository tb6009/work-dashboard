import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Credentials from 'next-auth/providers/credentials';

const ALLOWED_GITHUB_USER = process.env.ALLOWED_GITHUB_USER ?? 'tb6009';
const DASHBOARD_PASSWORD = process.env.DASHBOARD_PASSWORD ?? '';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    /* B안 — GitHub OAuth (본인 계정만 화이트리스트) */
    GitHub({
      // env vars: AUTH_GITHUB_ID, AUTH_GITHUB_SECRET (NextAuth v5 reads automatically)
    }),
    /* A안 — 비밀번호 1개 (env DASHBOARD_PASSWORD) */
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
  ],

  callbacks: {
    /* GitHub 로그인이면 username 화이트리스트 검증.
       Credentials는 authorize() 단계에서 이미 검증됨. */
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
