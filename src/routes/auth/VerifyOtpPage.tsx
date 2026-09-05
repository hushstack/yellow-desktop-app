import { MailCheck } from 'lucide-react';
import { useId } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useVerifyOtp } from '@/features/auth/hooks';
import { OTP_LENGTH, verifyOtpFormSchema, type VerifyOtpFormValues } from '@/features/auth/types';
import { useZodForm } from '@/hooks/use-zod-form';

import { ApiErrorNotice } from './components/ApiErrorNotice';
import { AuthBrand } from './components/AuthBrand';

const INITIAL_VALUES = { code: '', rememberMe: false };

interface VerifyLocationState {
  email?: string;
}

/**
 * The second half of registration: the API leaves an account
 * PENDING_VERIFICATION until the emailed code is exchanged for tokens.
 */
export function VerifyOtpPage() {
  const codeId = useId();
  const location = useLocation();
  const email = (location.state as VerifyLocationState | null)?.email;
  const { submit, isSubmitting, error } = useVerifyOtp();
  const form = useZodForm<typeof INITIAL_VALUES, VerifyOtpFormValues>(
    verifyOtpFormSchema,
    INITIAL_VALUES,
  );

  // Reached directly, with no address to verify against.
  if (email === undefined) {
    return <Navigate to="/register" replace />;
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const validated = form.validate();
    if (validated.ok) {
      void submit(email, validated.data.code, form.values.rememberMe);
    }
  };

  return (
    <AuthLayout>
      <main className="max-w-auth-canvas flex w-full flex-col">
        <AuthBrand tagline="One code and you're in." />

        <Card elevation="floating" className="p-lg md:p-xl rounded-3xl">
          <div className="mb-lg gap-sm flex flex-col items-center text-center">
            <span
              aria-hidden
              className="bg-surface-container-low text-primary flex size-12 items-center justify-center rounded-xl"
            >
              <MailCheck className="size-6" />
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              We sent a {OTP_LENGTH}-digit code to{' '}
              <strong className="text-on-surface">{email}</strong>.
            </p>
          </div>

          <form className="gap-lg flex flex-col" onSubmit={handleSubmit} noValidate>
            <FormField id={codeId} label="Verification code" error={form.errors.code}>
              <Input
                id={codeId}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                placeholder="000000"
                value={form.values.code}
                isInvalid={form.errors.code !== undefined}
                className="text-center tracking-[0.5em]"
                onChange={(event) => {
                  form.setField('code', event.target.value);
                }}
              />
            </FormField>

            <Checkbox
              label="Keep me signed in on this device"
              checked={form.values.rememberMe}
              onChange={(event) => {
                form.setField('rememberMe', event.target.checked);
              }}
            />

            {error !== null && <ApiErrorNotice error={error} />}

            <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
              {isSubmitting ? 'Verifying…' : 'Verify and continue'}
            </Button>
          </form>
        </Card>

        <p className="font-body-sm text-body-sm text-on-surface-variant mt-lg text-center">
          Wrong address?{' '}
          <Link
            to="/register"
            className="font-label text-label text-primary hover:text-primary-fixed-dim ml-xs transition-colors"
          >
            Start over
          </Link>
        </p>
      </main>
    </AuthLayout>
  );
}
