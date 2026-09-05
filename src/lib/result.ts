/**
 * A Result type for operations that are expected to fail.
 *
 * Chosen over throwing so a caller cannot ignore the failure branch: the data
 * is only reachable after `ok` has been narrowed. Errors that are *not*
 * expected (bugs) still throw and are caught by the route error boundary.
 */
export type Result<TData, TError> = { ok: true; data: TData } | { ok: false; error: TError };

export function ok<TData, TError = never>(data: TData): Result<TData, TError> {
  return { ok: true, data };
}

export function fail<TError, TData = never>(error: TError): Result<TData, TError> {
  return { ok: false, error };
}
