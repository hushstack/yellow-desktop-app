import { useCallback, useState } from 'react';
import type { z } from 'zod';

import type { Result } from '@/lib/result';

export type FieldErrors<TDraft> = Partial<Record<keyof TDraft & string, string>>;

export interface ZodForm<TDraft, TOutput> {
  values: TDraft;
  errors: FieldErrors<TDraft>;
  setField: <TKey extends keyof TDraft>(key: TKey, value: TDraft[TKey]) => void;
  /** Validates the draft, publishing field errors as a side effect. */
  validate: () => Result<TOutput, FieldErrors<TDraft>>;
  reset: () => void;
}

function toFieldErrors<TDraft>(issues: readonly z.core.$ZodIssue[]): FieldErrors<TDraft> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const field = issue.path[0];
    // First message per field wins: the form shows one line under each control.
    if (typeof field === 'string' && !(field in errors)) {
      errors[field] = issue.message;
    }
  }
  return errors as FieldErrors<TDraft>;
}

/**
 * Form state validated by a zod schema.
 *
 * The schema is the only place the rules live, so a control cannot drift from
 * the contract it is collecting input for (OWASP A05).
 */
export function useZodForm<TDraft extends Record<string, unknown>, TOutput>(
  schema: z.ZodType<TOutput>,
  initialValues: TDraft,
): ZodForm<TDraft, TOutput> {
  const [values, setValues] = useState<TDraft>(initialValues);
  const [errors, setErrors] = useState<FieldErrors<TDraft>>({});

  const setField = useCallback<ZodForm<TDraft, TOutput>['setField']>((key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const remaining = Object.entries(current).filter(([field]) => field !== key);
      return Object.fromEntries(remaining) as FieldErrors<TDraft>;
    });
  }, []);

  const validate = useCallback<ZodForm<TDraft, TOutput>['validate']>(() => {
    const result = schema.safeParse(values);

    if (result.success) {
      setErrors({});
      return { ok: true, data: result.data };
    }

    const fieldErrors = toFieldErrors<TDraft>(result.error.issues);
    setErrors(fieldErrors);
    return { ok: false, error: fieldErrors };
  }, [schema, values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
  }, [initialValues]);

  return { values, errors, setField, validate, reset };
}
