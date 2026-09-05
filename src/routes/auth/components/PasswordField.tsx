import { Eye, EyeOff, Lock } from 'lucide-react';
import { useId, useState } from 'react';

import { FormField } from '@/components/ui/FormField';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';

interface PasswordFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string | undefined;
  autoComplete: 'current-password' | 'new-password';
  showLeadingIcon?: boolean;
}

/** Password input with a visibility toggle, used by both auth screens. */
export function PasswordField({
  label,
  value,
  onChange,
  error,
  autoComplete,
  showLeadingIcon = false,
}: PasswordFieldProps) {
  const id = useId();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <FormField id={id} label={label} error={error}>
      <Input
        id={id}
        type={isVisible ? 'text' : 'password'}
        value={value}
        autoComplete={autoComplete}
        placeholder="••••••••"
        isInvalid={error !== undefined}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        leadingIcon={showLeadingIcon ? <Lock className="size-5" /> : undefined}
        trailingSlot={
          <IconButton
            label={isVisible ? 'Hide password' : 'Show password'}
            icon={isVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            onClick={() => {
              setIsVisible((current) => !current);
            }}
          />
        }
      />
    </FormField>
  );
}
