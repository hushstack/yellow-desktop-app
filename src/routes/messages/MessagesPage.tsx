import { MessagesSquare, TriangleAlert } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import {
  useActiveConversation,
  useConversations,
  useSelectConversation,
} from '@/features/messages/hooks';

import { ConversationList } from './components/ConversationList';
import { MessageThread } from './components/MessageThread';

/** Two-column chat: conversations on the left, the active thread on the right. */
export default function MessagesPage() {
  const { summaries, status, error } = useConversations();
  const { summary, thread } = useActiveConversation();
  const selectConversation = useSelectConversation();

  if (status === 'loading' || status === 'idle') {
    return (
      <div className="flex h-full items-center justify-center">
        <Spinner label="Loading conversations…" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="p-lg">
        <p
          role="alert"
          className="text-on-error-container bg-error-container/40 font-body-sm text-body-sm gap-sm px-md py-sm flex items-center rounded-lg"
        >
          <TriangleAlert aria-hidden className="size-4 shrink-0" />
          {error ?? 'Conversations could not be loaded.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0">
      <div className="border-outline-variant w-[320px] shrink-0 overflow-y-auto border-r">
        <div className="px-md py-md gap-xs flex flex-col">
          <h1 className="font-heading text-h2 text-on-surface">Messages</h1>
          <Badge tone="warning">Sample data</Badge>
          <p className="font-small text-small text-on-surface-variant">
            The Yello API has no messaging endpoints yet, so these conversations are local samples.
          </p>
        </div>
        {summaries.length === 0 ? (
          <div className="p-md">
            <EmptyState
              icon={<MessagesSquare className="size-6" />}
              title="No conversations"
              description="Start a chat from someone's profile and it will show up here."
            />
          </div>
        ) : (
          <ConversationList
            summaries={summaries}
            activeId={summary?.conversation.id ?? null}
            onSelect={selectConversation}
          />
        )}
      </div>

      {summary === null ? (
        <div className="p-lg flex flex-1 items-center justify-center">
          <EmptyState
            icon={<MessagesSquare className="size-6" />}
            title="Pick a conversation"
            description="Choose someone on the left to read and reply to your thread."
          />
        </div>
      ) : (
        <MessageThread summary={summary} thread={thread} />
      )}
    </div>
  );
}
