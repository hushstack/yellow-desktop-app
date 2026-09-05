/**
 * Chat hooks. The join between a conversation and the person on the other end
 * happens here so the chat components stay presentational.
 */
import { useEffect, useMemo } from 'react';

import { initialsOf } from '@/lib/user-display';

import { useMessagesStore } from './store';
import type { ConversationSummary, Message } from './types';

const NO_MESSAGES_PREVIEW = 'No messages yet';

export function useConversations() {
  const status = useMessagesStore((state) => state.status);
  const error = useMessagesStore((state) => state.error);
  const load = useMessagesStore((state) => state.load);
  const conversations = useMessagesStore((state) => state.conversations);
  const messagesByConversation = useMessagesStore((state) => state.messagesByConversation);

  useEffect(() => {
    if (status === 'idle') {
      void load();
    }
  }, [status, load]);

  const summaries = useMemo<ConversationSummary[]>(() => {
    return conversations.map((conversation) => {
      const thread = messagesByConversation[conversation.id] ?? [];
      const latest = thread[thread.length - 1];

      return {
        conversation,
        participantName: conversation.participantName,
        participantInitials: initialsOf({
          username: conversation.participantUsername,
          fullName: conversation.participantName,
        }),
        preview: latest?.body ?? NO_MESSAGES_PREVIEW,
      };
    });
  }, [conversations, messagesByConversation]);

  return { summaries, status, error };
}

export function useActiveConversation(): {
  summary: ConversationSummary | null;
  thread: Message[];
} {
  const activeId = useMessagesStore((state) => state.activeConversationId);
  const { summaries } = useConversations();
  const messagesByConversation = useMessagesStore((state) => state.messagesByConversation);

  return useMemo(() => {
    if (activeId === null) {
      return { summary: null, thread: [] };
    }
    return {
      summary: summaries.find((item) => item.conversation.id === activeId) ?? null,
      thread: messagesByConversation[activeId] ?? [],
    };
  }, [activeId, summaries, messagesByConversation]);
}

export function useMessageComposer() {
  const send = useMessagesStore((state) => state.send);
  const isSending = useMessagesStore((state) => state.isSending);
  const hasConversation = useMessagesStore((state) => state.activeConversationId !== null);
  return { send, isSending, hasConversation };
}

export function useSelectConversation() {
  return useMessagesStore((state) => state.selectConversation);
}
