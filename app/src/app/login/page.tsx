import { Suspense } from 'react';
import { isGithubEnabled } from '@/auth';
import LoginForm from './LoginForm';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm githubEnabled={isGithubEnabled} />
    </Suspense>
  );
}
