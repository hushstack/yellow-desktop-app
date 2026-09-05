/**
 * Joins class names, dropping anything falsy.
 *
 * A three-line helper instead of a dependency: the app never needs conditional
 * class merging beyond this.
 */
export type ClassValue = string | false | null | undefined;

export function cn(...values: ClassValue[]): string {
  return values.filter((value): value is string => Boolean(value)).join(' ');
}
