/**
 * Mock chat API: seeded conversations and threads behind a simulated round
 * trip, each parsed through its schema before use (OWASP A08).
 */
import { MOCK_LATENCY_MS } from '@/lib/constants';
import { delay } from '@/lib/delay';
import { createLogger } from '@/lib/logger';
import { fail, ok, type Result } from '@/lib/result';
import seedConversations from '@/mocks/data/conversations.json';
import seedMessages from '@/mocks/data/messages.json';

import {
  conversationListSchema,
  messageListSchema,
  messageSchema,
  SELF_AUTHOR_ID,
  type ComposeMessageInput,
  type Conversation,
  type Message,
} from './types';

const log = createLogger('messages.api');

export interface MessagesError {
  message: string;
}

export async function fetchConversations(): Promise<Result<Conversation[], MessagesError>> {
  await delay(MOCK_LATENCY_MS);

  const parsed = conversationListSchema.safeParse(seedConversations);
  if (!parsed.success) {
    log.error('conversation_seed_rejected', { issues: parsed.error.issues.length });
    return fail({ message: 'Conversations could not be loaded.' });
  }

  const conversations = [...parsed.data].sort((a, b) =>
    b.lastMessageAt.localeCompare(a.lastMessageAt),
  );
  return ok(conversations);
}

export async function fetchMessages(): Promise<Result<Message[], MessagesError>> {
  await delay(MOCK_LATENCY_MS);

  const parsed = messageListSchema.safeParse(seedMessages);
  if (!parsed.success) {
    log.error('message_seed_rejected', { issues: parsed.error.issues.length });
    return fail({ message: 'Messages could not be loaded.' });
  }

  return ok(parsed.data);
}

/** Stands in for POST /v1/conversations/:id/messages. */
export async function sendMessage(
  conversationId: string,
  input: ComposeMessageInput,
): Promise<Result<Message, MessagesError>> {
  await delay(MOCK_LATENCY_MS);

  const parsed = messageSchema.safeParse({
    id: `msg_local_${Date.now().toString(36)}`,
    conversationId,
    authorId: SELF_AUTHOR_ID,
    body: input.body,
    sentAt: new Date().toISOString(),
    status: 'sent',
  });

  if (!parsed.success) {
    log.error('message_rejected', { issues: parsed.error.issues.length });
    return fail({ message: 'That message could not be sent.' });
  }

  log.info('message_sent', { conversationId });
  return ok(parsed.data);
}
