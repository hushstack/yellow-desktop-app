import type { ReactNode } from 'react';

import { WindowControls } from './WindowControls';

interface AuthLayoutProps {
  children: ReactNode;
}

/**
 * The centred canvas the Login and Register screens sit on. The window is
 * frameless, so this layout also carries the drag region and controls.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="bg-background flex h-full flex-col">
      <div className="app-drag h-topbar px-lg flex shrink-0 items-center justify-end">
        <WindowControls />
      </div>
      <div className="px-margin-desktop pb-xl flex min-h-0 flex-1 items-center justify-center overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
