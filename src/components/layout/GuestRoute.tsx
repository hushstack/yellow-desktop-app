import { Navigate, Outlet } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
import { useAuthStatus } from '@/features/auth/hooks';

/**
 * The mirror of ProtectedRoute: an authenticated user has no business on the
 * login or register screens, and a successful sign-in leaves them through here.
 */
export function GuestRoute() {
  const status = useAuthStatus();

  if (status === 'restoring') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Starting Yello…" />
      </div>
    );
  }

  if (status === 'authenticated') {
    return <Navigate to="/feed" replace />;
  }

  return <Outlet />;
}
