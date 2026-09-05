import type { YelloBridge } from '@shared/ipc-types';

declare global {
  interface Window {
    /**
     * Injected by electron/preload.ts. Optional on purpose: the renderer also
     * runs in a plain browser during design work, where no bridge exists.
     */
    readonly yello?: YelloBridge;
  }
}

export {};
