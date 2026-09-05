import type { ReactNode } from 'react';

import { cn } from '@/lib/cn';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string | undefined;
  hint?: string | undefined;
  children: ReactNode;
}

/** Label + control + one message slot. The error wins over the hint. */
export function FormField({ id, label, error, hint, children }: FormFieldProps) {
  const messageId = `${id}-message`;
  const message = error ?? hint;

  return (
    <div className="gap-xs flex flex-col">
      <label
        htmlFor={id}
        className={cn(
          'font-label text-label uppercase',
          error ? 'text-error' : 'text-on-surface-variant',
        )}
      >
        {label}
      </label>
      {children}
      {message !== undefined && (
        <p
          id={messageId}
          role={error !== undefined ? 'alert' : undefined}
          className={cn(
            'font-small text-small ml-xs',
            error ? 'text-error' : 'text-on-surface-variant',
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
