/**
 * Profile editing contract.
 *
 * Mirrors the API's own limits (full name 100, bio 500, username 3–32 matching
 * ^[a-zA-Z0-9_.]+$) so an edit that would be rejected server-side is caught
 * first (OWASP A05). The server still validates — this is a courtesy.
 */
import { PROFILE_LIMITS } from '@shared/ipc-types';
import { z } from 'zod';

export const editProfileSchema = z.object({
  fullName: z.string().trim().max(PROFILE_LIMITS.fullNameMax, 'That name is too long.'),
  bio: z.string().trim().max(PROFILE_LIMITS.bioMax, 'Keep your bio under 500 characters.'),
  username: z
    .string()
    .trim()
    .min(PROFILE_LIMITS.usernameMin, `Use at least ${PROFILE_LIMITS.usernameMin} characters.`)
    .max(PROFILE_LIMITS.usernameMax, 'That username is too long.')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Letters, numbers, dots and underscores only.'),
});

export type EditProfileValues = z.infer<typeof editProfileSchema>;

export { PROFILE_LIMITS };
