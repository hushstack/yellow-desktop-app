/**
 * Frameless-window chrome state.
 *
 * The renderer draws the title bar, so it has to know whether the window is
 * maximised to show the right control. That is genuinely global (the auth
 * layout and the app shell both render the controls) and unrelated to the
 * session, so it lives here rather than in a feature store.
 */
import { create } from 'zustand';

import { ipc } from '@/lib/ipc';

interface WindowStoreState {
  isMaximized: boolean;
  isFullScreen: boolean;
  /** Reads the current state from the main process. */
  sync: () => Promise<void>;
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<void>;
  close: () => Promise<void>;
}

type WindowOperation = () => ReturnType<typeof ipc.getWindowState>;

export const useWindowStore = create<WindowStoreState>((set) => {
  const apply = async (operation: WindowOperation): Promise<void> => {
    const result = await operation();
    if (result.ok) {
      set({ isMaximized: result.data.isMaximized, isFullScreen: result.data.isFullScreen });
    }
  };

  return {
    isMaximized: false,
    isFullScreen: false,
    sync: () => apply(ipc.getWindowState),
    minimize: () => apply(ipc.minimizeWindow),
    toggleMaximize: () => apply(ipc.toggleMaximizeWindow),
    close: () => apply(ipc.closeWindow),
  };
});
