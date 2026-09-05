import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { Spinner } from '@/components/ui/Spinner';
import { useAuthStatus } from '@/features/auth/hooks';

/**
 * Gate for every authenticated route.
 *
 * While a remembered session is being restored the gate waits rather than
 * redirecting, so a valid session never bounces the user to the login screen on
 * a cold start.
 */
export function ProtectedRoute() {
  const status = useAuthStatus();
  const location = useLocation();

  if (status === 'restoring') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Restoring your session…" />
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
