import { Mail } from 'lucide-react';
import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { forgotPassword, type AuthError } from '@/features/auth/api';
import { EMAIL_MAX_LENGTH } from '@/features/auth/types';
import { useZodForm } from '@/hooks/use-zod-form';

import { ApiErrorNotice } from './components/ApiErrorNotice';
import { AuthBrand } from './components/AuthBrand';

const forgotPasswordFormSchema = z.object({
  email: z.email('Enter a valid email address.').max(EMAIL_MAX_LENGTH),
});

const INITIAL_VALUES = { email: '' };

/**
 * Step one of a password reset.
 *
 * The API answers `200` whether or not the address is registered, so this
 * screen must not imply the account was found — saying "if that address is
 * registered" is what keeps the endpoint from being an account-enumeration
 * oracle (OWASP A01/A07).
 */
export function ForgotPasswordPage() {
  const emailId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const form = useZodForm<typeof INITIAL_VALUES, { email: string }>(
    forgotPasswordFormSchema,
    INITIAL_VALUES,
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const validated = form.validate();
    if (!validated.ok) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    void forgotPassword(validated.data.email).then((result) => {
      setIsSubmitting(false);
      if (result.ok) {
        setIsSent(true);
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <AuthLayout>
      <main className="max-w-auth-canvas flex w-full flex-col">
        <AuthBrand tagline="Let's get you back in." />

        <Card elevation="floating" className="p-lg md:p-xl rounded-3xl">
          {isSent ? (
            <div className="gap-md flex flex-col">
              <h2 className="font-heading text-h3 text-on-surface">Check your email</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                If that address is registered, a reset link is on its way. Open the email, copy the
                token it contains, and continue below.
              </p>
              <Link to="/reset-password">
                <Button size="lg" fullWidth>
                  I have a reset token
                </Button>
              </Link>
            </div>
          ) : (
            <form className="gap-lg flex flex-col" onSubmit={handleSubmit} noValidate>
              <div className="gap-xs flex flex-col">
                <h2 className="font-heading text-h3 text-on-surface">Forgot your password?</h2>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  Enter the email you signed up with and we&apos;ll send a reset link.
                </p>
              </div>

              <FormField id={emailId} label="Email" error={form.errors.email}>
                <Input
                  id={emailId}
                  type="email"
                  autoComplete="username"
                  placeholder="name@example.com"
                  value={form.values.email}
                  isInvalid={form.errors.email !== undefined}
                  leadingIcon={<Mail className="size-5" />}
                  onChange={(event) => {
                    form.setField('email', event.target.value);
                  }}
                />
              </FormField>

              {error !== null && <ApiErrorNotice error={error} />}

              <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
                {isSubmitting ? 'Sending…' : 'Send reset link'}
              </Button>
            </form>
          )}
        </Card>

        <p className="font-body-sm text-body-sm text-on-surface-variant mt-lg text-center">
          Remembered it?{' '}
          <Link
            to="/login"
            className="font-label text-label text-primary hover:text-primary-fixed-dim ml-xs transition-colors"
          >
            Back to sign in
          </Link>
        </p>
      </main>
    </AuthLayout>
  );
}
