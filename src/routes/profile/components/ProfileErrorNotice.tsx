import { TriangleAlert } from 'lucide-react';

import type { ProfileError } from '@/features/profile/api';

/** API codes worth wording better than the server's own message. */
const FRIENDLY_MESSAGES: Record<string, string> = {
  USERNAME_ALREADY_USED: 'That username is taken. Try another.',
  INVALID_IMAGE: 'That file could not be read as an image. Use a JPEG, PNG or GIF.',
  PAYLOAD_TOO_LARGE: 'That image is over the 5 MB limit.',
  NETWORK: 'Could not reach Yello. Check your connection and try again.',
};

interface ProfileErrorNoticeProps {
  error: ProfileError;
}

export function ProfileErrorNotice({ error }: ProfileErrorNoticeProps) {
  const friendly =
    (error.apiCode === undefined ? undefined : FRIENDLY_MESSAGES[error.apiCode]) ??
    FRIENDLY_MESSAGES[error.code];

  return (
    <p
      role="alert"
      className="text-on-error-container bg-error-container/40 font-body-sm text-body-sm gap-sm px-md py-sm flex items-center rounded-lg"
    >
      <TriangleAlert aria-hidden className="size-4 shrink-0" />
      {friendly ?? error.message}
    </p>
  );
}
