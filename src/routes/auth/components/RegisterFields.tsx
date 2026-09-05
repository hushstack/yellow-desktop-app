import { AtSign, Contact, IdCard, Lock } from 'lucide-react';
import { useId } from 'react';

import { Checkbox } from '@/components/ui/Checkbox';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { REGISTER_PASSWORD_MIN_LENGTH, type RegisterFormValues } from '@/features/auth/types';
import type { ZodForm } from '@/hooks/use-zod-form';

import { PasswordField } from './PasswordField';

export interface RegisterDraft extends Record<string, unknown> {
  fullName: string;
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface RegisterFieldsProps {
  form: ZodForm<RegisterDraft, RegisterFormValues>;
}

const SECTION_ICON_CLASS = 'size-4';

/**
 * The grouped Identity / Contact / Security sections from the Register screen,
 * kept out of the page so the page stays a shell.
 */
export function RegisterFields({ form }: RegisterFieldsProps) {
  const ids = { name: useId(), username: useId(), email: useId(), terms: useId() };

  return (
    <>
      <section className="gap-md flex flex-col">
        <SectionHeading icon={<IdCard className={SECTION_ICON_CLASS} />}>Identity</SectionHeading>
        <div className="gap-md grid grid-cols-1 md:grid-cols-2">
          <FormField id={ids.name} label="Full name" error={form.errors.fullName} hint="Optional">
            <Input
              id={ids.name}
              autoComplete="name"
              placeholder="Jane Doe"
              value={form.values.fullName}
              isInvalid={form.errors.fullName !== undefined}
              onChange={(event) => {
                form.setField('fullName', event.target.value);
              }}
            />
          </FormField>
          <FormField id={ids.username} label="Username" error={form.errors.username}>
            <Input
              id={ids.username}
              autoComplete="username"
              placeholder="janedoe"
              value={form.values.username}
              isInvalid={form.errors.username !== undefined}
              leadingIcon={<AtSign className="size-5" />}
              onChange={(event) => {
                form.setField('username', event.target.value);
              }}
            />
          </FormField>
        </div>
      </section>

      <section className="gap-md flex flex-col">
        <SectionHeading icon={<Contact className={SECTION_ICON_CLASS} />}>Contact</SectionHeading>
        <FormField
          id={ids.email}
          label="Email address"
          error={form.errors.email}
          hint="We send a six-digit code here to finish setting up your account."
        >
          <Input
            id={ids.email}
            type="email"
            autoComplete="email"
            placeholder="jane@example.com"
            value={form.values.email}
            isInvalid={form.errors.email !== undefined}
            onChange={(event) => {
              form.setField('email', event.target.value);
            }}
          />
        </FormField>
      </section>

      <section className="gap-md flex flex-col">
        <SectionHeading icon={<Lock className={SECTION_ICON_CLASS} />}>Security</SectionHeading>
        <div className="gap-md grid grid-cols-1 md:grid-cols-2">
          <PasswordField
            label={`Password (${REGISTER_PASSWORD_MIN_LENGTH}+ characters)`}
            autoComplete="new-password"
            value={form.values.password}
            error={form.errors.password}
            onChange={(value) => {
              form.setField('password', value);
            }}
          />
          <PasswordField
            label="Confirm password"
            autoComplete="new-password"
            value={form.values.confirmPassword}
            error={form.errors.confirmPassword}
            onChange={(value) => {
              form.setField('confirmPassword', value);
            }}
          />
        </div>
      </section>

      <div className="gap-xs flex flex-col">
        <Checkbox
          id={ids.terms}
          label="I accept the terms of service"
          checked={form.values.acceptTerms}
          onChange={(event) => {
            form.setField('acceptTerms', event.target.checked);
          }}
        />
        {form.errors.acceptTerms !== undefined && (
          <p role="alert" className="font-small text-small text-error ml-xs">
            {form.errors.acceptTerms}
          </p>
        )}
      </div>
    </>
  );
}
