import { useState } from 'react';

import { cn } from '@/lib/cn';

type AvatarSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'size-8 text-small',
  md: 'size-10 text-body-sm',
  lg: 'size-12 text-body',
};

interface AvatarProps {
  initials: string;
  name: string;
  imageUrl?: string | undefined;
  size?: AvatarSize;
}

/**
 * Shows the profile image when the API has one, and falls back to initials —
 * also the fallback when the image fails to load, so a broken or CSP-blocked
 * URL never leaves an empty circle.
 */
export function Avatar({ initials, name, imageUrl, size = 'md' }: AvatarProps) {
  // Track the URL that failed rather than a bare flag, so a new imageUrl retries
  // instead of inheriting the previous one's failure.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showImage = imageUrl !== undefined && failedUrl !== imageUrl;

  return (
    <span
      title={name}
      aria-label={name}
      role="img"
      className={cn(
        'bg-primary-fixed text-on-primary-fixed font-label inline-flex items-center justify-center',
        'border-primary-container/40 overflow-hidden rounded-full border uppercase',
        SIZE_CLASSES[size],
      )}
    >
      {showImage ? (
        <img
          src={imageUrl}
          alt=""
          className="size-full object-cover"
          onError={() => {
            setFailedUrl(imageUrl);
          }}
        />
      ) : (
        initials
      )}
    </span>
  );
}
