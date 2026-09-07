import { KeyRound } from 'lucide-react';
import { useId, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { resetPassword, type AuthError } from '@/features/auth/api';
import { PASSWORD_MAX_LENGTH, REGISTER_PASSWORD_MIN_LENGTH } from '@/features/auth/types';
import { useZodForm } from '@/hooks/use-zod-form';

import { ApiErrorNotice } from './components/ApiErrorNotice';
import { AuthBrand } from './components/AuthBrand';
import { PasswordField } from './components/PasswordField';

/** Mirrors the API's own rule: the reset token is opaque, the password is 12+. */
const resetPasswordFormSchema = z
  .object({
    token: z.string().trim().min(1, 'Paste the token from the email.').max(512),
    newPassword: z
      .string()
      .min(REGISTER_PASSWORD_MIN_LENGTH, `Use at least ${REGISTER_PASSWORD_MIN_LENGTH} characters.`)
      .max(PASSWORD_MAX_LENGTH, 'That password is too long.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordFormSchema>;

const INITIAL_VALUES = { token: '', newPassword: '', confirmPassword: '' };

/**
 * Step two of a password reset.
 *
 * The token arrives by email and cannot be read back from the API, so it is
 * pasted here. It is a single-use secret: it goes straight through IPC to the
 * main process and is never logged (OWASP A09).
 */
export function ResetPasswordPage() {
  const tokenId = useId();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);
  const form = useZodForm<typeof INITIAL_VALUES, ResetPasswordFormValues>(
    resetPasswordFormSchema,
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

    void resetPassword(validated.data.token, validated.data.newPassword).then((result) => {
      setIsSubmitting(false);
      if (result.ok) {
        // Straight to sign-in: the reset does not issue a session.
        void navigate('/login', { replace: true });
      } else {
        setError(result.error);
      }
    });
  };

  return (
    <AuthLayout>
      <main className="max-w-auth-canvas flex w-full flex-col">
        <AuthBrand tagline="Choose a new password." />

        <Card elevation="floating" className="p-lg md:p-xl rounded-3xl">
          <form className="gap-lg flex flex-col" onSubmit={handleSubmit} noValidate>
            <div className="gap-xs flex flex-col">
              <h2 className="font-heading text-h3 text-on-surface">Reset your password</h2>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Paste the token from the reset email, then pick a new password of at least{' '}
                {REGISTER_PASSWORD_MIN_LENGTH} characters.
              </p>
            </div>

            <div className="gap-md flex flex-col">
              <FormField id={tokenId} label="Reset token" error={form.errors.token}>
                <Input
                  id={tokenId}
                  type="text"
                  autoComplete="one-time-code"
                  spellCheck={false}
                  placeholder="Paste the token from your email"
                  value={form.values.token}
                  isInvalid={form.errors.token !== undefined}
                  leadingIcon={<KeyRound className="size-5" />}
                  onChange={(event) => {
                    form.setField('token', event.target.value);
                  }}
                />
              </FormField>

              <PasswordField
                label="New password"
                showLeadingIcon
                autoComplete="new-password"
                value={form.values.newPassword}
                error={form.errors.newPassword}
                onChange={(value) => {
                  form.setField('newPassword', value);
                }}
              />

              <PasswordField
                label="Confirm password"
                showLeadingIcon
                autoComplete="new-password"
                value={form.values.confirmPassword}
                error={form.errors.confirmPassword}
                onChange={(value) => {
                  form.setField('confirmPassword', value);
                }}
              />
            </div>

            {error !== null && <ApiErrorNotice error={error} />}

            <Button type="submit" size="lg" fullWidth isLoading={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Set new password'}
            </Button>
          </form>
        </Card>

        <p className="font-body-sm text-body-sm text-on-surface-variant mt-lg text-center">
          Need a new link?{' '}
          <Link
            to="/forgot-password"
            className="font-label text-label text-primary hover:text-primary-fixed-dim ml-xs transition-colors"
          >
            Start again
          </Link>
        </p>
      </main>
    </AuthLayout>
  );
}
