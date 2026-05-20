import Topbar from './Topbar';
import Footer from './Footer';
import { auth, signOut } from '@/auth';

type NavKey = 'current' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'projects';

interface Props {
  active: NavKey;
  children: React.ReactNode;
}

export default async function PageShell({ active, children }: Props) {
  const session = await auth();
  const userLabel = session?.user?.name ?? null;

  /* server action — sign out and bounce home */
  async function doSignOut() {
    'use server';
    await signOut({ redirectTo: '/' });
  }

  return (
    <>
      <Topbar active={active} userLabel={userLabel} signOutAction={doSignOut} />
      <main
        className="mx-auto"
        style={{
          maxWidth: 1280,
          padding: 'var(--sp-10) var(--sp-8) var(--sp-16)',
        }}
      >
        {children}
        <Footer />
      </main>
    </>
  );
}
