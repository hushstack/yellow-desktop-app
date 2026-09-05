import type { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}

/** The shared "nothing here yet" surface used across the dashboard. */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="border-outline-variant gap-md px-lg py-xl flex flex-col items-center rounded-xl border border-dashed text-center">
      <span
        aria-hidden
        className="bg-surface-container-low text-primary flex size-12 items-center justify-center rounded-xl"
      >
        {icon}
      </span>
      <div className="gap-xs flex flex-col">
        <h3 className="font-heading text-h3 text-on-surface">{title}</h3>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-copy">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}
