import { Copy, Minus, Square, X } from 'lucide-react';
import { useEffect } from 'react';

import { IconButton } from '@/components/ui/IconButton';
import { useWindowStore } from '@/stores/window-store';

const ICON_CLASS = 'size-4';

/**
 * Title-bar controls for the frameless window. Each action is one allowlisted
 * IPC call; the renderer never touches a window object directly.
 */
export function WindowControls() {
  const isMaximized = useWindowStore((state) => state.isMaximized);
  const sync = useWindowStore((state) => state.sync);
  const minimize = useWindowStore((state) => state.minimize);
  const toggleMaximize = useWindowStore((state) => state.toggleMaximize);
  const close = useWindowStore((state) => state.close);

  useEffect(() => {
    void sync();
  }, [sync]);

  return (
    <div className="app-no-drag gap-xs flex items-center">
      <IconButton
        label="Minimise window"
        icon={<Minus className={ICON_CLASS} />}
        onClick={() => {
          void minimize();
        }}
      />
      <IconButton
        label={isMaximized ? 'Restore window' : 'Maximise window'}
        icon={isMaximized ? <Copy className={ICON_CLASS} /> : <Square className={ICON_CLASS} />}
        onClick={() => {
          void toggleMaximize();
        }}
      />
      <IconButton
        label="Close window"
        tone="danger"
        icon={<X className={ICON_CLASS} />}
        onClick={() => {
          void close();
        }}
      />
    </div>
  );
}
