import type { ReactNode } from 'react';

interface SectionHeadingProps {
  icon: ReactNode;
  children: string;
}

/**
 * The grouped-form heading from the Register screen: icon, uppercase label and
 * a hairline that separates the group from what came before it.
 */
export function SectionHeading({ icon, children }: SectionHeadingProps) {
  return (
    <div className="border-surface-container-highest gap-sm pb-xs flex items-center border-b">
      <span aria-hidden className="text-outline-variant flex items-center">
        {icon}
      </span>
      <h2 className="font-label text-label text-on-surface-variant uppercase">{children}</h2>
    </div>
  );
}
