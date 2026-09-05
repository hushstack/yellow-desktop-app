/**
 * Window controls for the frameless shell.
 *
 * The renderer draws its own title bar, so minimise / maximise / close arrive
 * over IPC. Each call resolves the window from the calling WebContents rather
 * than trusting an id from the payload (OWASP A01).
 */
import { BrowserWindow, type IpcMainInvokeEvent } from 'electron';

import { IPC_CHANNELS } from '../channels';
import { registerIpcHandler } from '../register';

import {
  emptyRequestSchema,
  ipcFail,
  ipcOk,
  windowStateSchema,
  type IpcResult,
  type WindowState,
} from '../../../shared/ipc-types';

type WindowAction = (window: BrowserWindow) => void;

function stateOf(window: BrowserWindow): WindowState {
  return windowStateSchema.parse({
    isMaximized: window.isMaximized(),
    isFullScreen: window.isFullScreen(),
  });
}

function withSenderWindow(event: IpcMainInvokeEvent, action: WindowAction): IpcResult<WindowState> {
  const window = BrowserWindow.fromWebContents(event.sender);
  if (window === null || window.isDestroyed()) {
    return ipcFail('UNKNOWN', 'The requesting window no longer exists.');
  }

  action(window);

  // A closing window cannot be measured; report the last known state instead.
  if (window.isDestroyed()) {
    return ipcOk(windowStateSchema.parse({ isMaximized: false, isFullScreen: false }));
  }

  return ipcOk(stateOf(window));
}

const noop: WindowAction = () => undefined;

export function registerWindowHandlers(): void {
  registerIpcHandler(IPC_CHANNELS.WINDOW_MINIMIZE, emptyRequestSchema, (_payload, event) =>
    withSenderWindow(event, (window) => {
      window.minimize();
    }),
  );

  registerIpcHandler(IPC_CHANNELS.WINDOW_TOGGLE_MAXIMIZE, emptyRequestSchema, (_payload, event) =>
    withSenderWindow(event, (window) => {
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
    }),
  );

  registerIpcHandler(IPC_CHANNELS.WINDOW_CLOSE, emptyRequestSchema, (_payload, event) =>
    withSenderWindow(event, (window) => {
      window.close();
    }),
  );

  registerIpcHandler(IPC_CHANNELS.WINDOW_GET_STATE, emptyRequestSchema, (_payload, event) =>
    withSenderWindow(event, noop),
  );
}
