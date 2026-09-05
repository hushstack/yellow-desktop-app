import type { HTMLAttributes, ReactNode } from 'react';

import { cn } from '@/lib/cn';

type CardElevation = 'flat' | 'floating' | 'canvas';

const ELEVATION_CLASSES: Record<CardElevation, string> = {
  flat: '',
  floating: 'shadow-floating',
  canvas: 'shadow-canvas',
};

/** Semantics vary by use (a post is an <article>), the surface does not. */
type CardElement = 'div' | 'article' | 'section';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: CardElevation;
  as?: CardElement;
  children: ReactNode;
}

/**
 * Level 1 surface: white on the off-white base with a 1px hairline. Depth comes
 * from tone and outline, not from heavy shadows.
 */
export function Card({
  elevation = 'flat',
  as: Element = 'div',
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <Element
      className={cn(
        'bg-surface-container-lowest border-outline-variant rounded-xl border',
        ELEVATION_CLASSES[elevation],
        className,
      )}
      {...rest}
    >
      {children}
    </Element>
  );
}
