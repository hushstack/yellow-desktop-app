/**
 * Development runner.
 *
 * Starts Vite for the renderer, keeps the main-process bundles in an esbuild
 * watch, and restarts Electron whenever they change. `VITE_DEV_SERVER_URL` is
 * the single flag that puts the app into its development posture — the relaxed
 * CSP and the devtools menu both key off it, and no packaged build ever has it.
 */
import { spawn, type ChildProcess } from 'node:child_process';

import electronModule from 'electron';
import { context } from 'esbuild';
import { createServer } from 'vite';

import { electronBuildOptions } from './electron-build-config';

const RESTART_DEBOUNCE_MS = 120;

/**
 * Imported from Node rather than from inside Electron, where the package's
 * default export is the path to the Electron binary rather than its API.
 */
const electronBinary = electronModule as unknown as string;

let electronProcess: ChildProcess | null = null;
let restartTimer: NodeJS.Timeout | null = null;

function startElectron(devServerUrl: string): void {
  electronProcess = spawn(electronBinary, ['.'], {
    stdio: 'inherit',
    env: { ...process.env, VITE_DEV_SERVER_URL: devServerUrl, NODE_ENV: 'development' },
  });

  electronProcess.on('exit', (code) => {
    // Quitting the app ends the dev session.
    process.exit(code ?? 0);
  });
}

function restartElectron(devServerUrl: string): void {
  if (restartTimer !== null) {
    clearTimeout(restartTimer);
  }
  restartTimer = setTimeout(() => {
    if (electronProcess !== null) {
      electronProcess.removeAllListeners('exit');
      electronProcess.kill();
      electronProcess = null;
    }
    startElectron(devServerUrl);
  }, RESTART_DEBOUNCE_MS);
}

async function main(): Promise<void> {
  const viteServer = await createServer();
  await viteServer.listen();
  viteServer.printUrls();

  const devServerUrl = viteServer.resolvedUrls?.local[0];
  if (devServerUrl === undefined) {
    throw new Error('Vite did not report a local dev server URL.');
  }

  let started = false;
  const restartPlugin = {
    name: 'restart-electron',
    setup(builder: { onEnd: (callback: () => void) => void }) {
      builder.onEnd(() => {
        if (!started) {
          started = true;
          startElectron(devServerUrl);
          return;
        }
        restartElectron(devServerUrl);
      });
    },
  };

  const options = electronBuildOptions(true);
  const buildContext = await context({
    ...options,
    plugins: [...(options.plugins ?? []), restartPlugin],
  });

  await buildContext.watch();
}

main().catch((error: unknown) => {
  process.stderr.write(`dev runner failed: ${String(error)}\n`);
  process.exitCode = 1;
});
