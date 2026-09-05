import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning';

const TONE_CLASSES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-container-high text-on-surface-variant border-outline-variant',
  brand: 'bg-primary-fixed/40 text-on-primary-fixed-variant border-primary-container/40',
  success: 'bg-tertiary-container/40 text-on-tertiary-container border-tertiary/30',
  warning: 'bg-error-container/50 text-on-error-container border-error/30',
};

interface BadgeProps {
  tone?: BadgeTone;
  children: string;
}

/** Pill-shaped chip, per the design system's shape rules. */
export function Badge({ tone = 'neutral', children }: BadgeProps) {
  return (
    <span
      className={cn(
        'font-label text-label px-sm inline-flex items-center rounded-full border py-1 uppercase',
        TONE_CLASSES[tone],
      )}
    >
      {children}
    </span>
  );
}
