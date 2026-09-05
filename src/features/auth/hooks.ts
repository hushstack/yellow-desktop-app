/**
 * Auth hooks: the only way components touch session state.
 */
import type { Session, User } from '@shared/ipc-types';
import { useCallback, useEffect, useState } from 'react';

import { SESSION_EXPIRY_CHECK_MS } from '@/lib/constants';
import type { Result } from '@/lib/result';

import { login, register, verifyOtp, type AuthError } from './api';
import { useAuthStore, type AuthStatus } from './store';

export function useAuthStatus(): AuthStatus {
  return useAuthStore((state) => state.status);
}

export function useCurrentUser(): User | null {
  return useAuthStore((state) => state.user);
}

export function useIsAuthenticated(): boolean {
  return useAuthStore((state) => state.status === 'authenticated');
}

/**
 * Restores a remembered session once at startup, then re-checks expiry so a
 * lapsed session is noticed even while the window sits idle.
 */
export function useSessionLifecycle(): void {
  const restore = useAuthStore((state) => state.restore);
  const enforceExpiry = useAuthStore((state) => state.enforceExpiry);

  useEffect(() => {
    void restore();
  }, [restore]);

  useEffect(() => {
    const timer = setInterval(enforceExpiry, SESSION_EXPIRY_CHECK_MS);
    return () => {
      clearInterval(timer);
    };
  }, [enforceExpiry]);
}

interface Submission<TArgs extends unknown[], TData> {
  submit: (...args: TArgs) => Promise<Result<TData, AuthError> | null>;
  isSubmitting: boolean;
  error: AuthError | null;
  clearError: () => void;
}

function useSubmission<TArgs extends unknown[], TData>(
  operation: (...args: TArgs) => Promise<Result<TData, AuthError>>,
  onSuccess?: (data: TData) => void,
): Submission<TArgs, TData> {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const submit = useCallback(
    async (...args: TArgs) => {
      setIsSubmitting(true);
      setError(null);

      const result = await operation(...args);

      if (result.ok) {
        onSuccess?.(result.data);
      } else {
        setError(result.error);
      }

      setIsSubmitting(false);
      return result;
    },
    [operation, onSuccess],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return { submit, isSubmitting, error, clearError };
}

export function useLogin() {
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const onSuccess = useCallback(
    (session: Session | null) => {
      adoptSession(session);
    },
    [adoptSession],
  );
  return useSubmission(login, onSuccess);
}

export function useRegister() {
  return useSubmission(register);
}

export function useVerifyOtp() {
  const adoptSession = useAuthStore((state) => state.adoptSession);
  const onSuccess = useCallback(
    (session: Session | null) => {
      adoptSession(session);
    },
    [adoptSession],
  );
  return useSubmission(verifyOtp, onSuccess);
}

export function useSignOut(): () => Promise<void> {
  return useAuthStore((state) => state.signOut);
}
