import { TriangleAlert } from 'lucide-react';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { createLogger } from '@/lib/logger';

const log = createLogger('ui.error-boundary');

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render-time failures so a bug in one route cannot blank the window.
 *
 * Only the error's name reaches the log — never its message or stack, which can
 * carry user data (OWASP A09) — and the user sees a fixed, non-technical
 * message rather than the exception (A10).
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    log.error('render_failed', {
      errorName: error.name,
      hasComponentStack: info.componentStack !== null,
    });
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="gap-md px-lg flex h-full flex-col items-center justify-center text-center">
        <span aria-hidden className="text-error">
          <TriangleAlert className="size-8" />
        </span>
        <h1 className="font-heading text-h2 text-on-surface">Something went wrong</h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-copy">
          This screen could not be displayed. You can try again — your session is unaffected.
        </p>
        <Button variant="secondary" onClick={this.handleRetry}>
          Try again
        </Button>
      </div>
    );
  }
}

/** Layout route wrapper: puts a boundary around a whole route tree. */
export function ErrorBoundaryOutlet() {
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  );
}
