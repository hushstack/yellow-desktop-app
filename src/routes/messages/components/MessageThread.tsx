import { useEffect, useRef } from 'react';

import { Avatar } from '@/components/ui/Avatar';
import type { ConversationSummary, Message } from '@/features/messages/types';
import { calendarDay } from '@/lib/relative-time';

import { MessageBubble } from './MessageBubble';
import { MessageComposer } from './MessageComposer';

interface MessageThreadProps {
  summary: ConversationSummary;
  thread: Message[];
}

/** Header, scrolling transcript and composer for one conversation. */
export function MessageThread({ summary, thread }: MessageThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const lastMessageId = thread[thread.length - 1]?.id;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [lastMessageId]);

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <header className="border-outline-variant bg-surface-container-lowest/90 gap-md px-md py-sm flex shrink-0 items-center border-b backdrop-blur-md">
        <span className="relative">
          <Avatar initials={summary.participantInitials} name={summary.participantName} />
          {summary.conversation.isOnline && (
            <span className="bg-tertiary border-surface-container-lowest absolute right-0 bottom-0 size-3 rounded-full border-2" />
          )}
        </span>
        <div>
          <h2 className="font-heading text-h3 text-on-surface leading-tight">
            {summary.participantName}
          </h2>
          <p className="font-small text-small text-on-surface-variant">
            {summary.conversation.isOnline ? 'Active now' : 'Offline'}
          </p>
        </div>
      </header>

      <div className="gap-lg p-md flex min-h-0 flex-1 flex-col overflow-y-auto">
        {thread.length > 0 && (
          <div className="flex justify-center">
            <span className="bg-surface-container-low text-on-surface-variant font-label text-label border-outline-variant/30 rounded-full border px-3 py-1">
              {calendarDay(thread[0]?.sentAt ?? new Date().toISOString())}
            </span>
          </div>
        )}

        {thread.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        <div ref={endRef} />
      </div>

      <MessageComposer />
    </section>
  );
}
