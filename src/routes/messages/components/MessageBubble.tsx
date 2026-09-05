import { CheckCheck } from 'lucide-react';
import { memo } from 'react';

import type { Message } from '@/features/messages/types';
import { SELF_AUTHOR_ID } from '@/features/messages/types';
import { cn } from '@/lib/cn';
import { clockTime } from '@/lib/relative-time';

interface MessageBubbleProps {
  message: Message;
}

/**
 * Sent bubbles are the light brand yellow with a squared bottom-right corner;
 * received bubbles are the neutral tonal surface with a squared bottom-left —
 * straight from the chat screen in the design system.
 */
export const MessageBubble = memo(function MessageBubble({ message }: MessageBubbleProps) {
  const isMine = message.authorId === SELF_AUTHOR_ID;

  return (
    <div className={cn('flex max-w-[85%] flex-col gap-1', isMine && 'items-end self-end')}>
      <div
        className={cn(
          'font-body text-body py-sm rounded-xl px-4',
          isMine
            ? 'bg-primary-fixed text-on-primary-fixed rounded-br-sm'
            : 'bg-surface-container-low text-on-surface border-outline-variant/20 rounded-bl-sm border',
        )}
      >
        {message.body}
      </div>
      <span className="font-small text-small text-on-surface-variant flex items-center gap-1">
        {clockTime(message.sentAt)}
        {isMine && message.status === 'read' && (
          <CheckCheck aria-label="Read" className="text-tertiary size-3.5" />
        )}
      </span>
    </div>
  );
});
