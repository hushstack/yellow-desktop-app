/**
 * Chat state.
 *
 * Conversations, the loaded threads and the active selection are all read by
 * more than one component, so they sit in one store. Threads are kept in a map
 * keyed by conversation id: a thread is only ever appended to, so this stays
 * cheap as the seed grows.
 */
import { create } from 'zustand';

import { fetchConversations, fetchMessages, sendMessage } from './api';
import type { ComposeMessageInput, Conversation, Message } from './types';

export type MessagesStatus = 'idle' | 'loading' | 'ready' | 'error';

interface MessagesState {
  conversations: Conversation[];
  messagesByConversation: Record<string, Message[]>;
  activeConversationId: string | null;
  status: MessagesStatus;
  error: string | null;
  isSending: boolean;
  load: () => Promise<void>;
  selectConversation: (conversationId: string) => void;
  send: (input: ComposeMessageInput) => Promise<boolean>;
}

function groupByConversation(messages: Message[]): Record<string, Message[]> {
  const grouped: Record<string, Message[]> = {};

  for (const message of messages) {
    const thread = grouped[message.conversationId] ?? [];
    thread.push(message);
    grouped[message.conversationId] = thread;
  }

  for (const thread of Object.values(grouped)) {
    thread.sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  }

  return grouped;
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  messagesByConversation: {},
  activeConversationId: null,
  status: 'idle',
  error: null,
  isSending: false,

  load: async () => {
    set({ status: 'loading', error: null });

    const [conversationsResult, messagesResult] = await Promise.all([
      fetchConversations(),
      fetchMessages(),
    ]);

    if (!conversationsResult.ok || !messagesResult.ok) {
      const message = conversationsResult.ok
        ? 'Messages could not be loaded.'
        : conversationsResult.error.message;
      set({ status: 'error', error: message });
      return;
    }

    set({
      conversations: conversationsResult.data,
      messagesByConversation: groupByConversation(messagesResult.data),
      activeConversationId: get().activeConversationId ?? conversationsResult.data[0]?.id ?? null,
      status: 'ready',
    });
  },

  selectConversation: (conversationId) => {
    set({
      activeConversationId: conversationId,
      // Opening a conversation clears its unread badge.
      conversations: get().conversations.map((conversation) =>
        conversation.id === conversationId ? { ...conversation, unreadCount: 0 } : conversation,
      ),
    });
  },

  send: async (input) => {
    const conversationId = get().activeConversationId;
    if (conversationId === null) {
      return false;
    }

    set({ isSending: true });
    const result = await sendMessage(conversationId, input);
    set({ isSending: false });

    if (!result.ok) {
      set({ error: result.error.message });
      return false;
    }

    const thread = get().messagesByConversation[conversationId] ?? [];
    set({
      messagesByConversation: {
        ...get().messagesByConversation,
        [conversationId]: [...thread, result.data],
      },
      conversations: get().conversations.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, lastMessageAt: result.data.sentAt }
          : conversation,
      ),
      error: null,
    });
    return true;
  },
}));
