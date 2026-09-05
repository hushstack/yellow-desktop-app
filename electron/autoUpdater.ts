/**
 * Auto-update wiring.
 *
 * electron-updater verifies the publisher signature of an update before it is
 * staged, which is the integrity control this feature exists to preserve
 * (OWASP A08). Two guards keep that meaningful:
 *   - updates are never checked for in a development runtime;
 *   - an unconfigured feed is a no-op, not a crash (A10).
 *
 * Downloads are opt-in rather than automatic so an update cannot be applied
 * without the user having been told.
 */
import { app } from 'electron';

import { createLogger } from '../shared/logger';
import { isDevRuntime } from './security/origins';

const log = createLogger('updater');

export function initialiseAutoUpdater(): void {
  if (isDevRuntime()) {
    log.info('updater_skipped', { reason: 'development_runtime' });
    return;
  }

  if (!app.isPackaged) {
    log.info('updater_skipped', { reason: 'unpackaged_build' });
    return;
  }

  void (async () => {
    try {
      const { autoUpdater } = await import('electron-updater');

      autoUpdater.autoDownload = false;
      autoUpdater.autoInstallOnAppQuit = true;
      autoUpdater.logger = null;

      autoUpdater.on('update-available', (info: { version: string }) => {
        log.info('update_available', { version: info.version });
      });
      autoUpdater.on('update-not-available', () => {
        log.info('update_not_available', {});
      });
      autoUpdater.on('error', (error: Error) => {
        log.error('update_check_failed', { error });
      });

      await autoUpdater.checkForUpdates();
    } catch (error) {
      // No publish provider configured is the expected case for now.
      log.info('updater_unavailable', { error });
    }
  })();
}
