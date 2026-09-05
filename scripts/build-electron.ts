/**
 * Production build for the main process and preload bundles.
 * The renderer is built separately by `vite build`.
 */
import { build } from 'esbuild';

import { electronBuildOptions } from './electron-build-config';

async function main(): Promise<void> {
  await build(electronBuildOptions(false));
  process.stdout.write('electron bundles written to dist-electron/\n');
}

main().catch((error: unknown) => {
  process.stderr.write(`electron build failed: ${String(error)}\n`);
  process.exitCode = 1;
});
