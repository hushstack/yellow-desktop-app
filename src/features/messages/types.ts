/**
 * Chat shapes: conversations, messages and the composer contract.
 */
import { z } from 'zod';

export const MESSAGE_MAX_LENGTH = 2000;

/** The signed-in user's own messages are seeded under this sentinel author id. */
export const SELF_AUTHOR_ID = 'me';

/**
 * Chat is the one mocked surface: the Yello API has no messaging endpoints yet,
 * so conversations are seeded locally and carry their own participant rather
 * than resolving one against the real user directory.
 */
export const CHAT_IS_MOCKED = true;

export const messageStatusSchema = z.enum(['sending', 'sent', 'delivered', 'read']);

export const messageSchema = z.object({
  id: z.string().min(1).max(64),
  conversationId: z.string().min(1).max(64),
  authorId: z.string().min(1).max(64),
  body: z.string().min(1).max(MESSAGE_MAX_LENGTH),
  sentAt: z.iso.datetime(),
  status: messageStatusSchema,
});

export const conversationSchema = z.object({
  id: z.string().min(1).max(64),
  participantName: z.string().min(1).max(120),
  participantUsername: z.string().min(1).max(64),
  lastMessageAt: z.iso.datetime(),
  unreadCount: z.number().int().min(0).max(999),
  isOnline: z.boolean(),
});

export const messageListSchema = z.array(messageSchema);
export const conversationListSchema = z.array(conversationSchema);

export const composeMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, 'Type a message before sending.')
    .max(MESSAGE_MAX_LENGTH, `Keep it under ${MESSAGE_MAX_LENGTH} characters.`),
});

export type Message = z.infer<typeof messageSchema>;
export type MessageStatus = z.infer<typeof messageStatusSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type ComposeMessageInput = z.infer<typeof composeMessageSchema>;

/** A conversation with the last line of its thread, ready to render. */
export interface ConversationSummary {
  conversation: Conversation;
  participantName: string;
  participantInitials: string;
  preview: string;
}
