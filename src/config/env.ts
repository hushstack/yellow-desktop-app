/**
 * Build-time configuration for the renderer, validated once at module load.
 *
 * Note what is not here: the API base URL. All HTTP happens in the main
 * process, so the renderer neither knows nor needs the service address — it
 * reads it back from `readAppInfo()` purely to display it in Settings.
 */
import { z } from 'zod';

const envSchema = z.object({
  VITE_APP_ENV: z.enum(['development', 'production', 'test']),
  VITE_ENABLE_DEVTOOLS: z.enum(['true', 'false']),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ');
  // Names only — never the values, which is where a misplaced secret would sit.
  throw new Error(`Invalid renderer environment configuration: ${fields}`);
}

export const env = {
  appEnv: parsed.data.VITE_APP_ENV,
  enableDevtools: parsed.data.VITE_ENABLE_DEVTOOLS === 'true',
  isDevelopment: parsed.data.VITE_APP_ENV === 'development',
} as const;
